import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Use 303 (See Other) so the browser follows the redirect with GET, not POST.
  // 307 (the default) would re-POST to /auth/login which has no POST handler → 404.
  return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 })
}
