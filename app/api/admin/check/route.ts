import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ data: null })

    let isAdmin = user.email === process.env.ADMIN_EMAIL

    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser) isAdmin = dbUser.role === 'ADMIN'
    } catch {
      // DB not connected - fall back to env check
    }

    return NextResponse.json({ data: { isAdmin, email: user.email } })
  } catch {
    return NextResponse.json({ data: null })
  }
}
