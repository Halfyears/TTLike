/**
 * PATCH /api/admin/videos/[id]
 *
 * Admin-only endpoint to soft-delete or restore a TikTok video.
 * Body: { action: 'delete' | 'restore' }
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as { action: 'delete' | 'restore' }

  const supabase = createServiceClient()

  const update =
    body.action === 'delete'
      ? { deleted_at: new Date().toISOString() }
      : { deleted_at: null }

  const { error } = await supabase
    .from('tiktok_videos')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[admin/videos] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: body.action, id })
}
