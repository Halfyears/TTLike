/**
 * GET /api/admin/pipeline/video-context?video_id=xxx
 *
 * Returns pre-extracted pipeline context for a video:
 * - pain_points: derived from viral_formulas[].mechanism (auto-extracted)
 * - category / niche / product_name from tiktok_videos
 * - has_timeline: whether visual_timeline exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

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

/**
 * Extract concise pain point phrases from a viral formula mechanism string.
 * e.g. "Creates urgency by targeting the audience's fear of missing out on a trending product"
 *   → "fear of missing out"
 */
function extractPainPoint(mechanism: string): string {
  const m = mechanism.toLowerCase()

  // Common pain patterns — extract the phrase after the trigger word
  const patterns = [
    /\b(?:fear of|afraid of|scared of)\s+([^,.;]{5,40})/,
    /\b(?:struggle with|struggling with)\s+([^,.;]{5,40})/,
    /\b(?:problem (?:of|with))\s+([^,.;]{5,40})/,
    /\b(?:pain of|pain point)\s+([^,.;]{5,40})/,
    /\b(?:frustrat(?:ed|ion) (?:with|by|about))\s+([^,.;]{5,40})/,
    /\b(?:worry about|worried about)\s+([^,.;]{5,40})/,
    /\b(?:lack of|lacking)\s+([^,.;]{5,40})/,
    /\btarget(?:ing)?\s+(?:the\s+)?(?:audience'?s?\s+)?([^,.;]{5,40})/,
  ]

  for (const pattern of patterns) {
    const match = m.match(pattern)
    if (match?.[1]) {
      return match[1].replace(/\s+/g, ' ').trim().slice(0, 45)
    }
  }

  // Fallback: strip generic opener phrases and return first meaningful clause
  const cleaned = mechanism
    .replace(/^(creates?|builds?|establishes?|triggers?|taps? into|leverages?|exploits?|uses?)\s+/i, '')
    .replace(/^(urgency|curiosity|trust|fomo|anxiety)\s+by\s+/i, '')
    .split(/[,.;]/)[0]!
    .trim()
    .slice(0, 50)

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const video_id = req.nextUrl.searchParams.get('video_id')
  if (!video_id) {
    return NextResponse.json({ ok: false, error: 'video_id required' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: video } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche')
    .eq('id', video_id)
    .maybeSingle()

  if (!video) {
    return NextResponse.json({ ok: false, error: 'Video not found' }, { status: 404 })
  }

  const { data: breakdown } = await service
    .from('video_breakdowns')
    .select('payload')
    .eq('video_id', video_id)
    .maybeSingle()

  const payload = breakdown?.payload as VideoBreakdownPayload | null
  const formulas = payload?.viral_formulas ?? []
  const hasTimeline = !!(payload?.visual_timeline?.length)

  // Extract one pain point per formula (max 5)
  const painPoints: string[] = formulas
    .slice(0, 5)
    .map(f => extractPainPoint(f.mechanism))
    .filter(p => p.length >= 5)

  // De-duplicate
  const uniquePainPoints = [...new Set(painPoints)]

  return NextResponse.json({
    ok:           true,
    product_name: video.product_name,
    niche:        video.niche,
    category:     video.niche ?? '',
    pain_points:  uniquePainPoints,
    has_timeline: hasTimeline,
    formula_count: formulas.length,
  })
}
