import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getD1Database } from '@/lib/cloudflare/env'

const SESSION_COOKIE_NAMES = ['ttlike_session', 'ttlike-session', 'session']

function hasSupabaseEnv() {
  // See lib/cloudflare/supabaseFacade.ts isSupabaseConfigured() — AUTH_PROVIDER
  // must win over the committed .env placeholder values for the Supabase vars.
  if (process.env.AUTH_PROVIDER === 'cloudflare-d1') return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!hasSupabaseEnv()) {
    const sessionCookie = SESSION_COOKIE_NAMES
      .map(name => request.cookies.get(name)?.value)
      .find(Boolean)

    // Mirror the real check in lib/cloudflare/supabaseFacade.ts auth.getUser()
    // — a cookie merely being present isn't enough; it must reference a
    // non-expired auth_sessions row, or middleware admits requests that the
    // page-level facade then rejects (visible as a redirect flash/loop).
    let user: { id: string } | null = null
    if (sessionCookie) {
      try {
        const db = await getD1Database()
        const row = await db?.prepare(
          `SELECT 1 FROM auth_sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
        ).bind(sessionCookie).first()
        if (row) user = { id: 'cloudflare-session' }
      } catch {
        user = null
      }
    }

    return { supabaseResponse, user }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
