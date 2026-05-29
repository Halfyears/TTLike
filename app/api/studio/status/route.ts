/**
 * GET /api/studio/status?breakdown_id=...
 *
 * Polling endpoint for user-facing Studio pipeline status.
 * Returns viral_status and breakdown_id when done.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const breakdown_id = req.nextUrl.searchParams.get('breakdown_id')
  if (!breakdown_id) return NextResponse.json({ ok: false, error: 'breakdown_id is required' }, { status: 400 })

  const service = createServiceClient()

  const { data, error } = await service
    .from('video_breakdowns')
    .select('id, viral_status, viral_error')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ ok: true, viral_status: 'PENDING', breakdown_id: null })

  return NextResponse.json({
    ok:           true,
    breakdown_id: data.id,
    viral_status: data.viral_status ?? 'PENDING',
    viral_error:  data.viral_error  ?? null,
  })
}
