/**
 * lib/engines/ingestion.ts
 *
 * Loads and normalises a video's metadata into IngestionSignal —
 * the unified input shape for the viral pipeline.
 *
 * Data sources:
 *   - tiktok_videos   (Supabase) — core video metadata
 *   - video_breakdowns (Supabase) — viral_formulas + metrics payload
 *
 * Note: tiktok_videos uses snake_case columns (views, likes, shares,
 * product_name, cover_url, viral_score) — NOT the Prisma camelCase fields.
 * Always query via Supabase service client, not Prisma, for this table.
 */

import { createServiceClient } from '@/lib/supabase/server'
import {
  IngestionSignalSchema,
  type IngestionSignal,
} from '@/lib/engines/types'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

// ── Raw DB row shapes ─────────────────────────────────────────────────────────

// Must stay in sync with lib/supabase/videos.ts VideoRow + actual tiktok_videos columns
interface VideoRow {
  id:           string
  tiktok_id:    string
  title:        string
  author:       string | null
  views:        number
  likes:        number
  shares:       number
  comments:     number        // present in DB, not used in IngestionSignal but included for completeness
  viral_score:  number
  niche:        string | null
  product_name: string | null
  cover_url:    string | null
}

interface BreakdownRow {
  id:      string
  payload: VideoBreakdownPayload | null
}

// ── Main loader ───────────────────────────────────────────────────────────────

/**
 * Load and normalise a video into IngestionSignal.
 *
 * @param videoId  The `tiktok_videos.id` UUID (primary key).
 * @throws         If the video is not found.
 */
export async function loadIngestionSignal(videoId: string): Promise<IngestionSignal> {
  const service = createServiceClient()

  // ── 1. Load video metadata ─────────────────────────────────────────────────
  const { data: video, error: videoErr } = await service
    .from('tiktok_videos')
    .select('id, tiktok_id, title, author, views, likes, shares, comments, viral_score, niche, product_name, cover_url')
    .eq('id', videoId)
    .maybeSingle()

  if (videoErr) throw new Error(`tiktok_videos query failed: ${videoErr.message}`)
  if (!video)   throw new Error(`Video not found: ${videoId}`)

  const v = video as VideoRow

  // ── 2. Load breakdown payload (optional — degrade gracefully) ──────────────
  const { data: breakdown } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('video_id', videoId)
    .maybeSingle()

  const bd = breakdown as BreakdownRow | null
  const payload = bd?.payload ?? null

  // ── 3. Extract viral_formulas + visual_timeline + metrics from payload ────
  // These come from Gemini multimodal analysis of the actual TikTok video URL.
  // They ARE the real video content analysis — not metadata guesses.
  const viral_formulas  = payload?.viral_formulas  ?? []
  const visual_timeline = payload?.visual_timeline ?? undefined
  const metrics = payload?.metrics ?? {
    views:  String(v.views),
    likes:  String(v.likes),
    shares: String(v.shares),
  }

  // ── 4. Build and validate signal ──────────────────────────────────────────
  const signal_quality: 'full' | 'metadata_only' =
    viral_formulas.length > 0 && visual_timeline && visual_timeline.length > 0
      ? 'full'
      : 'metadata_only'

  const raw: IngestionSignal = {
    video_id:        v.id,
    title:           v.title,
    product_name:    v.product_name ?? null,
    niche:           v.niche ?? null,
    views:           Math.round(v.views ?? 0),
    likes:           Math.round(v.likes ?? 0),
    shares:          Math.round(v.shares ?? 0),
    viral_score:     Math.min(100, Math.max(0, v.viral_score ?? 0)),
    viral_formulas,
    visual_timeline,
    metrics,
    signal_quality,
  }

  // Validate with Zod — throws ZodError if shape is wrong
  return IngestionSignalSchema.parse(raw)
}

// ── Batch loader ──────────────────────────────────────────────────────────────

/**
 * Load multiple videos in parallel. Skips videos that fail to load.
 *
 * @param videoIds  Array of tiktok_videos.id UUIDs
 * @returns         Array of successfully loaded IngestionSignals
 */
export async function loadIngestionSignals(
  videoIds: string[],
): Promise<Array<{ signal: IngestionSignal; error?: never } | { signal?: never; error: string; videoId: string }>> {
  const results = await Promise.allSettled(
    videoIds.map(id => loadIngestionSignal(id)),
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { signal: result.value }
    }
    return {
      error:   result.reason instanceof Error ? result.reason.message : String(result.reason),
      videoId: videoIds[i]!,
    }
  })
}
