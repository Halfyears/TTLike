/**
 * PATCH /api/admin/users/[id]
 * Body: { role: 'USER' | 'ADMIN' }
 *
 * Updates a user's role in the users table (creates row if missing).
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { role } = await req.json() as { role: string }

  if (!['USER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch auth user to get email
  const { data: { user: authUser }, error: authErr } = await service.auth.admin.getUserById(id)
  if (authErr || !authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Upsert into users table
  const { error } = await service.from('users').upsert({
    id:    authUser.id,
    email: authUser.email ?? '',
    role,
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id, role })
}
