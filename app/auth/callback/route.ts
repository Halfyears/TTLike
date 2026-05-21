import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Prefer explicit site URL (set in Vercel env) to avoid localhost redirects
  // when the server-side request.url resolves to an internal or preview address.
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteOrigin}${next}`)
    }
  }

  return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
}
