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
import { generateViralSlug }          from '@/lib/seoSlug'
import { cacheCoverImage }            from '@/lib/imageStorage'

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

// ── TikTok oEmbed helper ──────────────────────────────────────────────────────

interface TikTokOembed {
  title?:         string
  author_name?:   string
  thumbnail_url?: string
}

/**
 * Fetch basic metadata for any public TikTok video via the public oEmbed API.
 * No auth required.  Returns null on any failure (private/deleted/timeout).
 * Timeout: 5 s — never blocks the main pipeline.
 */
async function fetchTikTokOembed(videoUrl: string): Promise<TikTokOembed | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(5_000),
      headers: { 'User-Agent': 'TTLike-Bot/1.0' },
    })
    if (!res.ok) return null
    const data = await res.json() as TikTokOembed
    // Require at least a title to consider this usable
    if (!data.title) return null
    return data
  } catch {
    return null
  }
}

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
    .select('payload, video_id, seo_slug')
    .eq('url_hash', cacheKey)
    .maybeSingle()

  if (cached?.payload) {
    const cachedPayload = cached.payload as VideoBreakdownPayload
    return NextResponse.json({
      breakdown:  cachedPayload,
      video_id:   cached.video_id  ?? null,
      seo_slug:   cached.seo_slug  ?? null,
      is_oembed:  cached.video_id == null && !!cachedPayload.source_meta,
      fromCache:  true,
    })
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

  // ── Pass 4 — oEmbed fallback for any public TikTok URL ────────────────────
  // If the video isn't in our DB, try the public TikTok oEmbed API.
  // On success we build a synthetic meta object and continue the normal
  // Gemini analysis pipeline.  The breakdown is saved with video_id = null.
  let isOembed             = false
  let oembedSourceUrl:     string | null = null
  let oembedRawThumb:      string | null = null   // raw TikTok CDN URL from oEmbed
  let oembedCachedThumb:   string | null = null   // permanent Supabase Storage URL

  if (!meta && !video_id && (resolvedUrl ?? url)) {
    const targetUrl = resolvedUrl ?? url!
    const oembed = await fetchTikTokOembed(targetUrl)

    if (oembed) {
      const tikId = extractVideoId(targetUrl) ?? urlHash(targetUrl).slice(0, 16)
      meta = {
        id:           tikId,
        title:        oembed.title ?? '',
        product_name: oembed.title ?? null,
        niche:        null,
        views:        0,
        likes:        0,
        shares:       0,
        author:       oembed.author_name ?? '',
      }
      isOembed        = true
      oembedSourceUrl = targetUrl
      oembedRawThumb  = oembed.thumbnail_url ?? null
      console.info('[analyze] oEmbed fallback succeeded for:', targetUrl)
    } else {
      return NextResponse.json(
        {
          error: 'Video not found in database. Only videos already scraped into TTLike can be analysed.',
          hint:  'Browse the Products section to find existing viral videos, or wait for the next scheduled scrape.',
        },
        { status: 404 }
      )
    }
  }

  if (!meta) {
    return NextResponse.json(
      { error: 'Video not found in database.', hint: 'Browse the Products section.' },
      { status: 404 }
    )
  }

  // ── 3. Fetch + filter buyer-signal comments (pre-LLM, zero token waste) ────
  // Skip comment fetch for oEmbed rows — meta.id is a TikTok numeric ID, not
  // a Supabase UUID, so the query would never match and wastes a round-trip.
  const rawComments      = isOembed ? [] : await fetchVideoComments(meta.id)
  const filteredComments = filterHighValueComments(rawComments)

  // Debug: log token budget impact (non-blocking)
  if (filteredComments.length > 0) {
    console.debug(
      `[analyze] comment signals: ${rawComments.length} raw → ${filteredComments.length} filtered`,
      `(~${estimateTokens(filteredComments)} tokens)`,
    )
  }

  // ── 4. Call Gemini (+ proxy oEmbed thumbnail in parallel) ───────────────────
  // For oEmbed rows, kick off the thumbnail upload alongside Gemini — both
  // are I/O-bound so they run concurrently with no latency cost.
  const thumbPromise: Promise<string | null> =
    isOembed && oembedRawThumb
      ? cacheCoverImage(`oembed-${cacheKey}`, oembedRawThumb).catch(() => null)
      : Promise.resolve(null)

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

  // Collect the thumbnail result (should already be resolved by now)
  oembedCachedThumb = await thumbPromise

  // ── 5. Build V2.5 payload ───────────────────────────────────────────────────
  const payload: VideoBreakdownPayload = {
    url_hash: cacheKey,
    metrics: {
      // oEmbed videos have no stats — use em-dash so the UI shows "—" not "0"
      views:  isOembed ? '—' : Number(meta.views  ?? 0).toLocaleString(),
      likes:  isOembed ? '—' : Number(meta.likes  ?? 0).toLocaleString(),
      shares: isOembed ? '—' : Number(meta.shares ?? 0).toLocaleString(),
    },
    viral_formulas:  geminiResult.viral_formulas,
    visual_timeline: geminiResult.visual_timeline,
    // Include source metadata for oEmbed-sourced breakdowns so the /viral page
    // can render without a tiktok_videos join.
    ...(isOembed && oembedSourceUrl ? {
      source_meta: {
        title:         meta.title ?? '',
        author:        meta.author ?? '',
        video_url:     oembedSourceUrl,
        // Permanent Supabase Storage URL (proxied from TikTok CDN during analysis).
        // Falls back to null if the upload failed — UI shows a placeholder icon.
        thumbnail_url: oembedCachedThumb,
      },
    } : {}),
  }

  // ── 6. Persist to DB ────────────────────────────────────────────────────────
  // Generate SEO slug from video metadata + first viral formula title
  const strategyTitle = geminiResult.viral_formulas?.[0]?.title ?? 'viral-strategy'
  const seoSlug = generateViralSlug({
    productName:   String(meta.product_name ?? meta.title ?? ''),
    niche:         String(meta.niche ?? 'general'),
    strategyTitle,
    videoId:       meta.id,
  })

  // Plain INSERT — cache check above already confirmed no existing record.
  // On the rare 23505 duplicate (race condition), the row already exists → OK.
  // Any other error is a genuine failure and must be logged.
  const { data: insertedRow, error: insertError } = await service
    .from('video_breakdowns')
    // oEmbed breakdowns have no tiktok_videos row — video_id stays null
    .insert({ url_hash: cacheKey, video_id: isOembed ? null : meta.id, payload, seo_slug: seoSlug })
    .select('id')
    .maybeSingle()

  let saved = true
  let dbError: string | undefined
  if (insertError) {
    if (insertError.code === '23505') {
      // Race-condition duplicate — record was written by a concurrent request; fine.
      console.log('[analyze] duplicate url_hash (race condition) — breakdown already exists:', cacheKey)
    } else {
      saved = false
      dbError = `${insertError.code}: ${insertError.message}`
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

  // ── 7. Trigger SEO flywheel — invalidate public /viral/[slug] page ──────────
  try {
    revalidatePath(`/viral/${seoSlug}`)
    revalidatePath(`/viral/${meta.id}`)  // also bust legacy UUID path
  } catch (e) {
    console.warn('[analyze] revalidatePath failed (non-fatal):', e)
  }

  return NextResponse.json({
    breakdown:  payload,
    video_id:   isOembed ? null : meta.id,
    seo_slug:   seoSlug,
    is_oembed:  isOembed,
    fromCache:  false,
    saved,
    ...(dbError ? { dbError } : {}),
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
