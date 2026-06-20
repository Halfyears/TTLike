/**
 * GET /api/user/profile
 * Returns the authenticated user's identity. Client components must call
 * this instead of the browser Supabase client's auth.getUser() — that client
 * has no real session under the Cloudflare/D1 auth path (no browser-side D1
 * access), so it always reports signed-out there. This route runs server-side
 * via lib/supabase/server.ts, which already picks Supabase vs the D1 facade
 * correctly based on AUTH_PROVIDER.
 *
 * PATCH /api/user/profile
 * Updates the authenticated user's display name in Supabase Auth metadata.
 * Body: { name: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({
    user: {
      id:         user.id,
      email:      user.email ?? null,
      name:       (user.user_metadata as Record<string, unknown> | null)?.name ?? null,
      avatar_url: (user.user_metadata as Record<string, unknown> | null)?.avatar_url ?? null,
      role:       (user.user_metadata as Record<string, unknown> | null)?.role ?? null,
    },
  })
}

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
