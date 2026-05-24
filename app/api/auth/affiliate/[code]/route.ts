/**
 * GET /api/auth/affiliate/[code]
 *
 * Affiliate entry-point redirect.
 * Sets a short-lived `affiliate_ref` cookie then redirects to /auth/signup.
 *
 * Affiliate links should point here:
 *   https://app.com/api/auth/affiliate/MYCODE
 *
 * After the user signs up / logs in, the auth callback reads this cookie and
 * calls /api/auth/capture-affiliate to credit the referral.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    || new URL(request.url).origin

  // Validate: alphanumeric + hyphens/underscores, 4-32 chars
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
    return NextResponse.redirect(`${siteOrigin}/auth/signup`)
  }

  // Normalise to lowercase so lookup is case-insensitive
  const normalizedCode = code.toLowerCase()

  const response = NextResponse.redirect(`${siteOrigin}/auth/signup`)

  // 30-day cookie — survives multi-step sign-up flows
  response.cookies.set('affiliate_ref', normalizedCode, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30,
  })

  return response
}
