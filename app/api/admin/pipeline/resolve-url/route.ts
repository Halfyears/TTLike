/**
 * POST /api/admin/pipeline/resolve-url
 *
 * Resolves a TikTok video URL to a tiktok_videos.id UUID.
 * Supports standard URLs: https://www.tiktok.com/@user/video/1234567890
 *
 * Response (success):
 *   { ok: true, video_id, title, product_name, niche, has_timeline }
 * Response (error):
 *   { ok: false, error }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

function extractTikTokId(url: string): string | null {
  // Standard: https://www.tiktok.com/@username/video/7123456789012345678
  const match = url.match(/\/video\/(\d{10,20})/)
  return match ? match[1] : null
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { tiktok_url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { tiktok_url } = body
  if (!tiktok_url || typeof tiktok_url !== 'string') {
    return NextResponse.json({ ok: false, error: 'tiktok_url is required' }, { status: 400 })
  }

  const tiktokId = extractTikTokId(tiktok_url.trim())
  if (!tiktokId) {
    return NextResponse.json({
      ok: false,
      error: 'Could not parse TikTok video ID from URL. Use format: https://www.tiktok.com/@user/video/ID',
    }, { status: 400 })
  }

  const service = createServiceClient()

  // Look up video by tiktok_id
  const { data: video } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche')
    .eq('tiktok_id', tiktokId)
    .maybeSingle()

  if (!video) {
    return NextResponse.json({
      ok: false,
      error: `Video not found in database (TikTok ID: ${tiktokId}). The video must be scraped first.`,
    }, { status: 404 })
  }

  // Check if breakdown exists with timeline
  const { data: breakdown } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('video_id', video.id)
    .maybeSingle()

  const hasTimeline = !!(breakdown?.payload?.visual_timeline?.length)

  return NextResponse.json({
    ok:           true,
    video_id:     video.id,
    title:        video.title,
    product_name: video.product_name,
    niche:        video.niche,
    has_timeline: hasTimeline,
  })
}
