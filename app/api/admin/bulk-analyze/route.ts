/**
 * POST /api/admin/bulk-analyze
 *
 * Batch-generate V2.5 Inspiration Engine breakdowns for tiktok_videos
 * that don't yet have a video_breakdowns record.
 *
 * Processes up to `limit` videos per call (default 5, max 10),
 * ordered by viral_score DESC so the best content gets analyzed first.
 *
 * Safe to call multiple times — already-cached videos are skipped.
 */

import { NextResponse }         from 'next/server'
import { revalidatePath }       from 'next/cache'
import { createServiceClient }  from '@/lib/supabase/server'
import { isCurrentUserAdmin }    from '@/lib/auth/admin'
import { generateViralSlug }    from '@/lib/seoSlug'
import { callVideoBreakdown }   from '@/lib/ai/parserPrompt'
import { createHash }           from 'crypto'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

export const maxDuration = 60   // seconds — Vercel Hobby safe

function urlHash(input: string): string {
  return createHash('md5').update(input).digest('hex')
}

export async function POST(req: Request) {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({})) as { limit?: number }
  const limit = Math.min(Math.max(1, Number(body.limit ?? 5)), 10)

  const service = createServiceClient()

  // ── 1. Find video_ids that already have breakdowns ──────────────────────────
  const { data: existing } = await service
    .from('video_breakdowns')
    .select('video_id')
    .not('video_id', 'is', null)

  const existingIds = new Set<string>(
    (existing ?? []).map(r => r.video_id as string).filter(Boolean)
  )

  // ── 2. Fetch top viral-score videos (overfetch, then filter) ────────────────
  const { data: videos, error: fetchErr } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche, views, likes, shares, author')
    .is('deleted_at', null)
    .order('viral_score', { ascending: false })
    .limit(50)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const toProcess = (videos ?? [])
    .filter(v => !existingIds.has(v.id))
    .slice(0, limit)

  const remaining = Math.max(0,
    (videos ?? []).filter(v => !existingIds.has(v.id)).length - toProcess.length
  )

  if (toProcess.length === 0) {
    return NextResponse.json({
      generated: 0,
      skipped:   existingIds.size,
      errors:    [],
      remaining: 0,
      message:   'All videos already have breakdowns.',
    })
  }

  // ── 3. Generate breakdowns sequentially ────────────────────────────────────
  let generated = 0
  const errors: string[] = []

  for (const video of toProcess) {
    const cacheKey = urlHash(`video:${video.id}`)

    // Double-check cache (race condition guard)
    const { data: already } = await service
      .from('video_breakdowns')
      .select('id')
      .eq('url_hash', cacheKey)
      .maybeSingle()

    if (already) {
      existingIds.add(video.id)
      continue
    }

    try {
      const geminiResult = await callVideoBreakdown({
        title:        String(video.title        ?? ''),
        product_name: video.product_name,
        niche:        video.niche,
        views:        Number(video.views        ?? 0),
        likes:        Number(video.likes        ?? 0),
        shares:       Number(video.shares       ?? 0),
        author:       String(video.author       ?? ''),
      })

      const payload: VideoBreakdownPayload = {
        url_hash: cacheKey,
        metrics: {
          views:  Number(video.views  ?? 0).toLocaleString(),
          likes:  Number(video.likes  ?? 0).toLocaleString(),
          shares: Number(video.shares ?? 0).toLocaleString(),
        },
        viral_formulas:  geminiResult.viral_formulas,
        visual_timeline: geminiResult.visual_timeline,
      }

      const seoSlug = generateViralSlug({
        productName:   String(video.product_name ?? video.title ?? ''),
        niche:         String(video.niche ?? 'general'),
        strategyTitle: geminiResult.viral_formulas?.[0]?.title ?? 'viral-strategy',
        videoId:       video.id,
      })

      const { error: insertErr } = await service
        .from('video_breakdowns')
        .insert({ url_hash: cacheKey, video_id: video.id, payload, seo_slug: seoSlug })

      if (insertErr) {
        errors.push(`${video.id}: ${insertErr.message}`)
        continue
      }

      // Trigger ISR for public SEO page (both slug and legacy UUID)
      try {
        revalidatePath(`/viral/${seoSlug}`)
        revalidatePath(`/viral/${video.id}`)
      } catch { /* non-fatal */ }

      generated++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[bulk-analyze] error for ${video.id}:`, msg)
      errors.push(`${String(video.product_name ?? video.title ?? video.id).slice(0, 40)}: ${msg}`)
    }
  }

  return NextResponse.json({
    generated,
    skipped: existingIds.size,
    errors,
    remaining,
  })
}
