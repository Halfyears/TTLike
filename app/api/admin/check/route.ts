import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'

// This response is keyed by the request's Cookie header but Cloudflare's edge
// cache keys on URL by default (no Vary: Cookie) — without an explicit
// no-store directive, an early anonymous/different-user response can get
// cached at the edge and served to every subsequent caller regardless of
// who's actually asking, including middleware's own self-fetch.
const NO_STORE = { 'Cache-Control': 'no-store, private' }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ data: null }, { headers: NO_STORE })

    let isAdmin = user.email === process.env.ADMIN_EMAIL

    try {
      const dbUser = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (dbUser) isAdmin = dbUser.role === 'ADMIN'
    } catch (e) {
      // DB not connected, or a real query/schema bug — log it so a silent
      // lockout (every ADMIN-role user failing closed to env-check-only,
      // which is unset on Cloudflare) is at least visible in Workers logs.
      console.error('[admin/check] d1Db.user.findUnique failed:', e instanceof Error ? e.message : e)
    }

    return NextResponse.json({ data: { isAdmin, email: user.email } }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ data: null }, { headers: NO_STORE })
  }
}
