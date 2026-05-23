/**
 * POST /api/analyze
 *
 * Cache-first structured video breakdown using Gemini 2.5 Flash.
 * Accepts either:
 *   { video_id: string }   — looks up tiktok_videos, uses stored metadata
 *   { url: string }        — checks cache by URL hash, returns cached or limited analysis
 *
 * Cost: ~$0.0001 per uncached call (Gemini 2.5 Flash JSON mode)
 * Never re-bills for the same video_id/url.
 */

import { NextResponse }    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { callVideoBreakdown } from '@/lib/ai/parserPrompt'
import { createHash }      from 'crypto'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

function urlHash(input: string): string {
  return createHash('md5').update(input).digest('hex')
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  let body: { video_id?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { video_id, url } = body
  if (!video_id && !url) {
    return NextResponse.json({ error: 'video_id or url is required' }, { status: 400 })
  }

  const service = createServiceClient()

  // ── 1. Determine cache key ──────────────────────────────────────────────────
  const cacheKey = video_id ? urlHash(`video:${video_id}`) : urlHash(url!)

  // ── 2. Check cache ──────────────────────────────────────────────────────────
  const { data: cached } = await service
    .from('video_breakdowns')
    .select('payload')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (cached?.payload) {
    return NextResponse.json({ breakdown: cached.payload, fromCache: true })
  }

  // ── 3. Fetch video metadata ─────────────────────────────────────────────────
  type VideoRow = {
    id: string
    title: string
    product_name: string | null
    niche: string | null
    views: number
    likes: number
    shares: number
    author: string
  }
  let meta: VideoRow | null = null

  if (video_id) {
    const { data } = await service
      .from('tiktok_videos')
      .select('id, title, product_name, niche, views, likes, shares, author')
      .eq('id', video_id)
      .is('deleted_at', null)
      .maybeSingle()
    meta = data as VideoRow | null
  } else {
    // URL mode: try to find in tiktok_videos by video_url
    const { data } = await service
      .from('tiktok_videos')
      .select('id, title, product_name, niche, views, likes, shares, author')
      .eq('video_url', url!)
      .is('deleted_at', null)
      .maybeSingle()
    meta = data as VideoRow | null
  }

  if (!meta) {
    return NextResponse.json(
      { error: 'Video not found in database. Only videos already scraped into TTLike can be analysed.' },
      { status: 404 }
    )
  }

  // ── 4. Call Gemini ──────────────────────────────────────────────────────────
  let geminiResult: Awaited<ReturnType<typeof callVideoBreakdown>>
  try {
    geminiResult = await callVideoBreakdown({
      title:        String(meta.title ?? ''),
      product_name: meta.product_name,
      niche:        meta.niche,
      views:        Number(meta.views  ?? 0),
      likes:        Number(meta.likes  ?? 0),
      shares:       Number(meta.shares ?? 0),
      author:       String(meta.author ?? ''),
    })
  } catch (e) {
    console.error('[analyze] Gemini error:', e)
    return NextResponse.json({ error: 'AI analysis failed — try again later' }, { status: 500 })
  }

  // ── 5. Build payload ────────────────────────────────────────────────────────
  // geminiResult is { category, hook, emotion, pacing, cta } — destructure to split
  const { category, ...analysis } = geminiResult
  const payload: VideoBreakdownPayload = {
    url_hash: cacheKey,
    category,
    metrics: {
      views:  Number(meta.views  ?? 0).toLocaleString(),
      likes:  Number(meta.likes  ?? 0).toLocaleString(),
      shares: Number(meta.shares ?? 0).toLocaleString(),
    },
    analysis,
  }

  // ── 6. Persist to cache (fire-and-forget safe) ──────────────────────────────
  service
    .from('video_breakdowns')
    .insert({ url_hash: cacheKey, video_id: meta.id, payload })
    .then(({ error }) => {
      if (error) console.error('[analyze] cache write error:', error.message)
    })

  return NextResponse.json({ breakdown: payload, fromCache: false })
}

// ── GET /api/analyze?video_id=xxx — convenience alias ─────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const video_id = searchParams.get('video_id')
  if (!video_id) return NextResponse.json({ error: 'video_id required' }, { status: 400 })

  // Auth check — reading breakdown is public (anon RLS allows SELECT)
  const service = createServiceClient()
  const cacheKey = createHash('md5').update(`video:${video_id}`).digest('hex')

  const { data } = await service
    .from('video_breakdowns')
    .select('payload, created_at')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (!data) return NextResponse.json({ breakdown: null, fromCache: false })
  return NextResponse.json({ breakdown: data.payload, fromCache: true, cached_at: data.created_at })
}
