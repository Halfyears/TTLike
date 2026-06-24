import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

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

    const isAdmin = await isCurrentUserAdmin()

    return NextResponse.json({ data: { isAdmin, email: user.email } }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ data: null }, { headers: NO_STORE })
  }
}
