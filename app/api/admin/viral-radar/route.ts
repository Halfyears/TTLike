/**
 * POST /api/admin/viral-radar
 *
 * Finds all tiktok_videos that have been independently analysed ≥ N times
 * (default N=5) via video_breakdowns, then marks them is_viral_hit = true.
 *
 * Returns: { updated: number; video_ids: string[] }
 *
 * Safe to run repeatedly — idempotent (uses upsert / update).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/server'
import { isCurrentUserAdmin }        from '@/lib/auth/admin'

const DEFAULT_THRESHOLD = 5

export async function POST(req: NextRequest) {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body      = await req.json().catch(() => ({})) as { threshold?: number }
    const threshold = Math.max(1, Number(body.threshold ?? DEFAULT_THRESHOLD))

    const service = createServiceClient()

    // Count breakdowns per video_id (exclude oEmbed rows where video_id is null)
    const { data: counts, error: countErr } = await service
      .from('video_breakdowns')
      .select('video_id')
      .not('video_id', 'is', null)

    if (countErr) throw countErr

    // Tally in JS (Supabase PostgREST doesn't support GROUP BY directly)
    const tally: Record<string, number> = {}
    for (const row of counts ?? []) {
      if (row.video_id) tally[row.video_id] = (tally[row.video_id] ?? 0) + 1
    }
    const hotIds = Object.entries(tally)
      .filter(([, n]) => n >= threshold)
      .map(([id]) => id)

    if (hotIds.length === 0) {
      return NextResponse.json({ updated: 0, video_ids: [] })
    }

    // Mark as viral hits
    const { error: updateErr } = await service
      .from('tiktok_videos')
      .update({ is_viral_hit: true })
      .in('id', hotIds)

    if (updateErr) throw updateErr

    // Also clear stale flags: videos no longer meeting threshold
    const { error: clearErr } = await service
      .from('tiktok_videos')
      .update({ is_viral_hit: false })
      .eq('is_viral_hit', true)
      .not('id', 'in', `(${hotIds.join(',')})`)

    // clearErr is non-fatal — log and continue
    if (clearErr) console.warn('[viral-radar] clear stale flags error:', clearErr.message)

    return NextResponse.json({ updated: hotIds.length, video_ids: hotIds })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'viral-radar failed' },
      { status: 500 },
    )
  }
}
