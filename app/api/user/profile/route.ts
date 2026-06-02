/**
 * PATCH /api/user/profile
 * Updates the authenticated user's display name in Supabase Auth metadata.
 * Body: { name: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let name: string
  try {
    const body = await req.json()
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 422 })
    }
    name = body.name.trim().slice(0, 60)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 422 })

  const { error } = await sb.auth.updateUser({ data: { name } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, name })
}
