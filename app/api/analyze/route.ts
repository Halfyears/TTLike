/**
 * POST /api/analyze — V2.5 Inspiration Engine + Comment Signal Flywheel
 *
 * Pipeline:
 *   1. Zero-token DB deduplication (url_hash cache check)
 *   2. Fetch video metadata from tiktok_videos
 *   3. Fetch raw comments → keyword-filter to buyer signals (pre-LLM, zero waste)
 *   4. Compile dense LLM payload (metadata + filtered comments)
 *   5. Gemini 2.5 Flash → viral_formulas + visual_timeline
 *   6. Persist to video_breakdowns + revalidate /viral/[id] SEO page
 *
 * Cost: ~$0.0001 per uncached call. Never re-bills for same video_id/url.
 */

import { NextResponse }               from 'next/server'
import { revalidatePath }             from 'next/cache'
import { createServiceClient }        from '@/lib/supabase/server'
import { callVideoBreakdown }         from '@/lib/ai/parserPrompt'
import { fetchVideoComments }         from '@/lib/scraper'
import { filterHighValueComments, estimateTokens } from '@/lib/sentimentFilter'
import { createHash }                 from 'crypto'
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

  // ── 1. Zero-token DB deduplication ─────────────────────────────────────────
  const cacheKey = video_id ? urlHash(`video:${video_id}`) : urlHash(url!)

  const { data: cached } = await service
    .from('video_breakdowns')
    .select('payload')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (cached?.payload) {
    return NextResponse.json({ breakdown: cached.payload, fromCache: true })
  }

  // ── 2. Fetch video metadata ─────────────────────────────────────────────────
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

  // ── 3. Fetch + filter buyer-signal comments (pre-LLM, zero token waste) ────
  // fetchVideoComments: graceful degradation — returns [] if table unavailable
  // filterHighValueComments: keyword-dict scoring, hard-caps at 15 comments
  const rawComments      = await fetchVideoComments(meta.id)
  const filteredComments = filterHighValueComments(rawComments)

  // Debug: log token budget impact (non-blocking)
  if (filteredComments.length > 0) {
    console.debug(
      `[analyze] comment signals: ${rawComments.length} raw → ${filteredComments.length} filtered`,
      `(~${estimateTokens(filteredComments)} tokens)`,
    )
  }

  // ── 4. Call Gemini with enriched payload ────────────────────────────────────
  let geminiResult: Awaited<ReturnType<typeof callVideoBreakdown>>
  try {
    geminiResult = await callVideoBreakdown({
      title:        String(meta.title        ?? ''),
      product_name: meta.product_name,
      niche:        meta.niche,
      views:        Number(meta.views        ?? 0),
      likes:        Number(meta.likes        ?? 0),
      shares:       Number(meta.shares       ?? 0),
      author:       String(meta.author       ?? ''),
      comments:     filteredComments.length ? filteredComments : undefined,
    })
  } catch (e) {
    console.error('[analyze] Gemini error:', e)
    return NextResponse.json({ error: 'AI analysis failed — try again later' }, { status: 500 })
  }

  // ── 5. Build V2.5 payload ───────────────────────────────────────────────────
  const payload: VideoBreakdownPayload = {
    url_hash: cacheKey,
    metrics: {
      views:  Number(meta.views  ?? 0).toLocaleString(),
      likes:  Number(meta.likes  ?? 0).toLocaleString(),
      shares: Number(meta.shares ?? 0).toLocaleString(),
    },
    viral_formulas:  geminiResult.viral_formulas,
    visual_timeline: geminiResult.visual_timeline,
  }

  // ── 6. Persist to cache (fire-and-forget safe) ──────────────────────────────
  service
    .from('video_breakdowns')
    .insert({ url_hash: cacheKey, video_id: meta.id, payload })
    .then(({ error }) => {
      if (error) console.error('[analyze] cache write error:', error.message)
    })

  // ── 7. Trigger SEO flywheel — invalidate public /viral/[id] page ────────────
  try {
    revalidatePath(`/viral/${meta.id}`)
  } catch (e) {
    console.warn('[analyze] revalidatePath failed (non-fatal):', e)
  }

  return NextResponse.json({ breakdown: payload, video_id: meta.id, fromCache: false })
}

// ── GET /api/analyze?video_id=xxx — convenience alias ─────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const video_id = searchParams.get('video_id')
  if (!video_id) return NextResponse.json({ error: 'video_id required' }, { status: 400 })

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
