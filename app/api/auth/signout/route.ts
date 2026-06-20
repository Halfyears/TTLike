import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAMES = ['ttlike_session', 'ttlike-session', 'session']

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use 303 (See Other) so the browser follows the redirect with GET, not POST.
  // 307 (the default) would re-POST to /auth/login which has no POST handler → 404.
  const response = NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 })

  // Clear the session cookie directly on the returned response. Under the
  // Cloudflare/D1 auth path, supabase.auth.signOut() deletes via next/headers'
  // cookies() store, which isn't guaranteed to attach to this separately
  // constructed redirect response — so do it explicitly here too.
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set(name, '', { path: '/', expires: new Date(0) })
  }

  return response
}
