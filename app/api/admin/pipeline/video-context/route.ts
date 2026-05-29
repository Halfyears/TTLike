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

  const payload     = breakdown?.payload as VideoBreakdownPayload | null
  const formulas    = payload?.viral_formulas ?? []
  const hasTimeline = !!(payload?.visual_timeline?.length)

  // ── Niche-based default pain points (fallback when no formulas) ────────────
  const NICHE_DEFAULTS: Record<string, string[]> = {
    Fitness:  ['low energy', 'lack of motivation', 'slow fitness results'],
    Beauty:   ['dull skin', 'visible aging', 'uneven skin tone'],
    Kitchen:  ['meal prep takes too long', 'food waste', 'cooking stress'],
    Home:     ['clutter and disorganization', 'lack of storage', 'messy spaces'],
    Tech:     ['low productivity', 'slow devices', 'poor battery life'],
    Pets:     ['pet anxiety', 'behavioral issues', 'pet health concerns'],
    Travel:   ['travel discomfort', 'heavy luggage', 'jet lag'],
    Health:   ['poor sleep', 'chronic pain', 'high stress'],
    General:  ['time scarcity', 'stress', 'not seeing results'],
  }

  // ── Extract from viral_formulas.mechanism ─────────────────────────────────
  let painPoints: string[] = formulas
    .slice(0, 5)
    .map(f => extractPainPoint(f.mechanism))
    .filter(p => p.length >= 5)

  painPoints = [...new Set(painPoints)]

  // ── Fallback: use niche defaults if formulas empty or extraction failed ────
  if (painPoints.length === 0) {
    const niche  = String(video.niche ?? 'General')
    const defs   = NICHE_DEFAULTS[niche] ?? NICHE_DEFAULTS['General']!
    // Also try to extract pain hints from video title
    const title  = String(video.product_name ?? video.title ?? '')
    const titleHints = title
      .split(/[\s,]+/)
      .filter(w => /pain|stress|sleep|energy|weight|fat|skin|age|hair|care|clean|organi/i.test(w))
      .slice(0, 2)
      .map(w => w.toLowerCase())
    painPoints = titleHints.length >= 1
      ? [...titleHints, ...defs].slice(0, 3)
      : defs.slice(0, 3)
  }

  return NextResponse.json({
    ok:            true,
    product_name:  video.product_name,
    niche:         video.niche,
    category:      video.niche ?? '',
    pain_points:   painPoints,
    has_timeline:  hasTimeline,
    formula_count: formulas.length,
  })
}
