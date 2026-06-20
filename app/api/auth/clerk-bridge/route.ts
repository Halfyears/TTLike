/**
 * GET /api/auth/clerk-bridge
 *
 * Runs right after Clerk completes the Google OAuth flow (set as
 * redirectUrlComplete in ClerkGoogleButton). Clerk owns the OAuth dance and
 * its own session; this route bridges that identity into our own D1 schema
 * (auth_users / users / auth_sessions) so the rest of the app — which reads
 * the `ttlike_session` cookie via lib/cloudflare/supabaseFacade.ts — keeps
 * working unchanged.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getD1Database } from '@/lib/cloudflare/env'

const ALLOWED_NEXT = new Set(['/dashboard', '/studio', '/products', '/hooks', '/trending', '/blog', '/pricing'])
const SESSION_TTL_DAYS = 30

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = ALLOWED_NEXT.has(rawNext) ? rawNext : '/dashboard'
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || origin

  // currentUser() resolves the session itself — calling auth() separately
  // would re-verify the same JWT a second time, doubling CPU work per request.
  const user = await currentUser()
  const clerkUserId = user?.id
  const email = user?.emailAddresses?.[0]?.emailAddress
  if (!clerkUserId || !email) {
    return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
  }

  const db = await getD1Database()
  if (!db) {
    return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  const avatarUrl = user.imageUrl ?? null
  const metadata = JSON.stringify({ name, avatar_url: avatarUrl, clerk_user_id: clerkUserId })

  // auth_users.id is our own primary key — reuse the Clerk user id directly.
  await db.prepare(
    `INSERT INTO auth_users (id, email, raw_user_meta_data, provider, last_sign_in_at)
     VALUES (?, ?, ?, 'google', CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       raw_user_meta_data = excluded.raw_user_meta_data,
       last_sign_in_at = CURRENT_TIMESTAMP`,
  ).bind(clerkUserId, email, metadata).run()

  await db.prepare(
    `INSERT INTO users (id, email, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = COALESCE(excluded.name, users.name),
       avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(clerkUserId, email, name, avatarUrl).run()

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString()
  await db.prepare(
    `INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
  ).bind(sessionId, clerkUserId, expiresAt).run()

  const response = NextResponse.redirect(`${siteOrigin}${next}`)
  response.cookies.set('ttlike_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
  return response
}
