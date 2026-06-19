/**
 * POST /api/admin/videos/refresh-stats
 *
 * Backfills views/likes/shares/comments/viral_score for tiktok_videos rows
 * that have 0 stats (e.g. originally saved via oEmbed fallback when a user
 * pasted a TikTok URL and RapidAPI was unavailable).
 *
 * Returns: { updated, checked, failed }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { fetchVideoStatsDebug, deriveKeyword } from '@/lib/tiktok/fetchVideoStats'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export const maxDuration = 60

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('tiktok_videos')
    .select('id, tiktok_id, video_url, title, product_name')
    .or('views.is.null,views.eq.0')
    .limit(8)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  let failed  = 0
  const sampleErrors: Array<{ tiktok_id: string; video_url: string | null; error: string }> = []

  for (const row of (rows ?? []) as Array<{ id: string; tiktok_id: string; video_url: string | null; title: string | null; product_name: string | null }>) {
    const keyword = deriveKeyword(row.product_name) ?? deriveKeyword(row.title)
    const result = await fetchVideoStatsDebug(row.tiktok_id, keyword)
    if ('error' in result) {
      failed++
      if (sampleErrors.length < 5) sampleErrors.push({ tiktok_id: row.tiktok_id, video_url: row.video_url, error: result.error })
      continue
    }
    const { error: updErr } = await service.from('tiktok_videos').update(result.data).eq('id', row.id)
    if (updErr) {
      failed++
      if (sampleErrors.length < 5) sampleErrors.push({ tiktok_id: row.tiktok_id, video_url: row.video_url, error: `DB update: ${updErr.message}` })
    } else updated++
  }

  return NextResponse.json({ updated, checked: (rows ?? []).length, failed, sampleErrors })
}
