import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ breakdown_id: string }> },
) {
  if (!await isCurrentUserAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { breakdown_id } = await params
  const service = createServiceClient()

  const { data: bd } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (!bd) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updatedPayload = { ...(bd.payload as object ?? {}), viral_pipeline: null }
  const { error } = await service
    .from('video_breakdowns')
    .update({ payload: updatedPayload })
    .eq('id', breakdown_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
