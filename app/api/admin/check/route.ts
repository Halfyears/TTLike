import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ data: null })

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

    return NextResponse.json({ data: { isAdmin, email: user.email } })
  } catch {
    return NextResponse.json({ data: null })
  }
}
