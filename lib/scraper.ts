/**
 * scraper.ts — Video comment fetcher
 *
 * Fetches raw comments from the local Supabase store.
 * Designed for graceful degradation: comments are enhancement-only.
 * If the table is absent or empty, returns [] and the pipeline continues.
 *
 * Future: swap the Supabase query for Apify/TikHub API when comment
 * ingestion is wired up in the scraper pipeline.
 */
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

// ── Comment row shape expected from DB ────────────────────────────────────────
interface CommentRow {
  text: string | null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch raw comment strings for a video by its tiktok_videos.id.
 *
 * Returns up to `limit` raw strings (before keyword filtering).
 * Always resolves — never throws. Empty array = graceful degradation.
 *
 * @param videoId  UUID from tiktok_videos.id
 * @param limit    Max raw comments to fetch before filtering (default 300)
 */
export async function fetchVideoComments(
  videoId: string,
  limit = 300,
): Promise<string[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('video_comments')
      .select('text')
      .eq('video_id', videoId)
      .not('text', 'is', null)
      .limit(limit)

    if (error) {
      // Table may not exist yet — expected during early pipeline stages
      console.debug('[scraper] video_comments unavailable:', error.message)
      return []
    }

    return (data as CommentRow[])
      .map(r => String(r.text ?? '').trim())
      .filter(t => t.length > 3)
  } catch (e) {
    console.debug('[scraper] fetchVideoComments failed (non-fatal):', e)
    return []
  }
}
