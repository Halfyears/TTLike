import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // Auth: must be a logged-in admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let isAdmin = user.email === process.env.ADMIN_EMAIL
  try {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (dbUser) isAdmin = dbUser.role === 'ADMIN'
  } catch { /* DB not connected — fall back to env check */ }

  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.GH_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN not configured. Add it to your environment variables.' },
      { status: 503 }
    )
  }

  const res = await fetch(
    'https://api.github.com/repos/Halfyears/TTLike/actions/workflows/fetch_tiktok.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `GitHub API error ${res.status}: ${text}` },
      { status: 502 }
    )
  }

  // GitHub returns 204 No Content on success
  return NextResponse.json({ success: true })
}
