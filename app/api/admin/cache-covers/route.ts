/**
 * POST /api/admin/cache-covers
 *
 * Downloads TikTok CDN cover images and uploads them to Supabase Storage,
 * making them permanently accessible without signed-URL expiry or hotlink issues.
 *
 * Run this:
 *   1. After every scrape batch (to cache fresh URLs before they expire)
 *   2. Manually from the admin panel to refresh stale images
 *
 * Processes up to `limit` videos per call (default 50) to stay within
 * Vercel's 60-second function limit.
 *
 * PREREQUISITE: Create a PUBLIC bucket named "covers" in Supabase Storage.
 */

import { NextResponse }                      from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { cacheCoverImage, saveCoverStorageUrl } from '@/lib/imageStorage'
import { isTikTokUrlExpired }                from '@/lib/tiktokImg'

export async function POST(req: Request) {
  // ── Admin auth guard ────────────────────────────────────────────────────────
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    const adminEmail = process.env.ADMIN_EMAIL
    if (!user || (adminEmail && user.email !== adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 401 })
  }

  let body: { limit?: number; force?: boolean } = {}
  try { body = await req.json() } catch { /* empty body OK */ }

  const limit      = Math.min(body.limit ?? 50, 200)
  const forceRetry = body.force ?? false  // true = re-cache even if storage URL exists

  const service = createServiceClient()

  // Fetch videos that need cover caching
  let query = service
    .from('tiktok_videos')
    .select('id, cover_url, cover_storage_url')
    .not('cover_url', 'is', null)
    .limit(limit)

  if (!forceRetry) {
    // Only process videos without a storage URL
    query = query.is('cover_storage_url', null)
  }

  const { data: videos, error: fetchErr } = await query
  if (fetchErr) {
    // If cover_storage_url column doesn't exist yet (migration not run), return instructions
    if (fetchErr.code === '42703') {
      return NextResponse.json({
        error:  'cover_storage_url column missing',
        hint:   'Run migration: supabase/migrations/20260523_cover_storage.sql',
        detail: fetchErr.message,
      }, { status: 503 })
    }
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!videos?.length) {
    return NextResponse.json({ cached: 0, skipped: 0, message: 'All covers already cached.' })
  }

  let cached  = 0
  let skipped = 0
  let failed  = 0
  const errors: string[] = []

  for (const video of videos) {
    const url = video.cover_url as string | null
    if (!url) { skipped++; continue }

    // Skip if URL is expired — can't download from TikTok CDN anymore
    if (isTikTokUrlExpired(url)) {
      skipped++
      continue
    }

    const storageUrl = await cacheCoverImage(video.id as string, url)
    if (storageUrl) {
      await saveCoverStorageUrl(video.id as string, storageUrl)
      cached++
    } else {
      failed++
      errors.push(video.id as string)
    }
  }

  console.log(`[cache-covers] cached:${cached} skipped:${skipped} failed:${failed}`)

  return NextResponse.json({
    cached,
    skipped,  // already cached or URL expired
    failed,
    total:  videos.length,
    ...(errors.length ? { failedIds: errors.slice(0, 10) } : {}),
    message: `Cached ${cached} covers. ${skipped} skipped (already done or URL expired). ${failed} failed.`,
  })
}
