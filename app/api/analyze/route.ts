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
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { callVideoBreakdown }         from '@/lib/ai/parserPrompt'
import { fetchVideoComments }         from '@/lib/scraper'
import { filterHighValueComments, estimateTokens } from '@/lib/sentimentFilter'
import { createHash }                 from 'crypto'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

function urlHash(input: string): string {
  return createHash('md5').update(input).digest('hex')
}

// ── URL normalisation helpers ─────────────────────────────────────────────────

/**
 * Strip query-string and fragment from a TikTok URL.
 * e.g. https://www.tiktok.com/@x/video/123?_t=abc → https://www.tiktok.com/@x/video/123
 */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/$/, '')
  } catch {
    return raw
  }
}

/**
 * Extract the numeric TikTok video ID from any URL format.
 * Works for: /video/123456  and  vm.tiktok.com paths that contain a digit sequence.
 */
function extractVideoId(raw: string): string | null {
  const m = raw.match(/\/video\/(\d{10,25})/)
  return m ? m[1] : null
}

/** Known TikTok short-link hostnames that must be resolved via redirect. */
const SHORT_DOMAINS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'])

/**
 * Resolve a TikTok short URL to its canonical long-form URL by following the
 * redirect chain server-side.  Falls back to the original string on any error
 * so the rest of the pipeline can degrade gracefully.
 *
 * Only fires for short-link hostnames — standard www.tiktok.com URLs are
 * returned immediately with no network round-trip.
 */
async function resolveShortUrl(raw: string): Promise<string> {
  try {
    const hostname = new URL(raw).hostname
    if (!SHORT_DOMAINS.has(hostname)) return raw

    const res = await fetch(raw, {
      method:   'HEAD',
      redirect: 'follow',
      // 5-second ceiling — never block the analysis pipeline
      signal:   AbortSignal.timeout(5_000),
    })
    // res.url is the final URL after all redirects
    return res.url || raw
  } catch {
    return raw   // timeout, network error, invalid URL — continue with original
  }
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

  // ── Tier Guard — quota enforcement for authenticated users ──────────────────
  // Unauthenticated visitors (public product pages) are not blocked here;
  // quota is only enforced when a valid session is present.
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (user) {
      // Auto-provision free-tier row if this is user's first analysis
      await service.rpc('ensure_billing_tier', { uid: user.id })

      const { data: tierRow } = await service
        .from('user_billing_tiers')
        .select('video_analysis_used, video_analysis_limit')
        .eq('user_id', user.id)
        .maybeSingle()

      if (tierRow && tierRow.video_analysis_used >= tierRow.video_analysis_limit) {
        return NextResponse.json(
          {
            error:           'MONTHLY_ANALYSIS_LIMIT_EXCEEDED',
            upgradeRequired: true,
            used:            tierRow.video_analysis_used,
            limit:           tierRow.video_analysis_limit,
            hint:            'Upgrade to Creator ($29/mo) for 50 analyses per month.',
          },
          { status: 403 }
        )
      }
    }
  } catch (e) {
    // Auth/tier check failure is non-fatal — let analysis proceed
    console.warn('[analyze] tier guard error (non-fatal):', e)
  }

  // ── 0. Resolve short URLs before any cache or DB lookup ────────────────────
  // vm.tiktok.com / vt.tiktok.com → canonical www.tiktok.com URL (5 s timeout)
  const resolvedUrl = (!video_id && url) ? await resolveShortUrl(url) : undefined

  // ── 1. Zero-token DB deduplication ─────────────────────────────────────────
  // Use resolved URL so canonical and short-link callers share the same cache entry
  const cacheKey = video_id
    ? urlHash(`video:${video_id}`)
    : urlHash(resolvedUrl ?? url!)

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
    const rawUrl     = resolvedUrl ?? url!   // already resolved above
    const cleanUrl   = normalizeUrl(rawUrl)
    const tikVideoId = extractVideoId(rawUrl)

    // Pass 1 — exact match (canonical URL stored in DB)
    const { data: d1 } = await service
      .from('tiktok_videos')
      .select('id, title, product_name, niche, views, likes, shares, author')
      .eq('video_url', rawUrl)
      .is('deleted_at', null)
      .maybeSingle()

    // Pass 2 — normalised URL (strip tracking params)
    const { data: d2 } = !d1 ? await service
      .from('tiktok_videos')
      .select('id, title, product_name, niche, views, likes, shares, author')
      .eq('video_url', cleanUrl)
      .is('deleted_at', null)
      .maybeSingle()
    : { data: null }

    // Pass 3 — numeric video-ID substring match (handles any URL variant)
    const { data: d3 } = (!d1 && !d2 && tikVideoId) ? await service
      .from('tiktok_videos')
      .select('id, title, product_name, niche, views, likes, shares, author')
      .ilike('video_url', `%${tikVideoId}%`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    : { data: null }

    meta = (d1 ?? d2 ?? d3) as VideoRow | null
  }

  if (!meta) {
    return NextResponse.json(
      {
        error: 'Video not found in database. Only videos already scraped into TTLike can be analysed.',
        hint:  'Browse the Products section to find existing viral videos, or wait for the next scheduled scrape.',
      },
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

  // ── 6. Persist to DB ────────────────────────────────────────────────────────
  // Plain INSERT — cache check above already confirmed no existing record.
  // On the rare 23505 duplicate (race condition), the row already exists → OK.
  // Any other error is a genuine failure and must be logged.
  const { data: insertedRow, error: insertError } = await service
    .from('video_breakdowns')
    .insert({ url_hash: cacheKey, video_id: meta.id, payload })
    .select('id')
    .maybeSingle()

  let saved = true
  if (insertError) {
    if (insertError.code === '23505') {
      // Race-condition duplicate — record was written by a concurrent request; fine.
      console.log('[analyze] duplicate url_hash (race condition) — breakdown already exists:', cacheKey)
    } else {
      saved = false
      console.error('[analyze] DB INSERT FAILED — code:', insertError.code,
        '| message:', insertError.message,
        '| details:', insertError.details,
        '| hint:', insertError.hint)
    }
  } else {
    console.log('[analyze] breakdown saved OK — db_id:', insertedRow?.id)
  }

  // ── 6b. Increment quota usage for authenticated users ──────────────────────
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      await service.rpc('increment_analysis_credit', { uid: user.id })
    }
  } catch (e) {
    console.warn('[analyze] quota increment failed (non-fatal):', e)
  }

  // ── 7. Trigger SEO flywheel — invalidate public /viral/[id] page ────────────
  try {
    revalidatePath(`/viral/${meta.id}`)
  } catch (e) {
    console.warn('[analyze] revalidatePath failed (non-fatal):', e)
  }

  return NextResponse.json({
    breakdown:  payload,
    video_id:   meta.id,
    fromCache:  false,
    saved,   // true = written OK (or race-condition duplicate); false = genuine DB failure
  })
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
