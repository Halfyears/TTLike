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
import { prisma } from '@/lib/prisma'
import { fetchVideoStats } from '@/lib/tiktok/fetchVideoStats'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await prisma.user.findUnique({ where: { email: user.email! } })
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
    .select('id, tiktok_id, video_url')
    .or('views.is.null,views.eq.0')
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  let failed  = 0

  for (const row of (rows ?? []) as Array<{ id: string; tiktok_id: string; video_url: string | null }>) {
    const tiktokUrl = row.video_url ?? `https://www.tiktok.com/video/${row.tiktok_id}`
    const stats = await fetchVideoStats(row.tiktok_id, tiktokUrl)
    if (!stats) { failed++; continue }
    const { error: updErr } = await service.from('tiktok_videos').update(stats).eq('id', row.id)
    if (updErr) failed++; else updated++
  }

  return NextResponse.json({ updated, checked: (rows ?? []).length, failed })
}
