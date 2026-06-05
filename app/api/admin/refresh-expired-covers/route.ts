/**
 * POST /api/admin/refresh-expired-covers
 *
 * For videos that have no cover_storage_url AND whose cover_url has expired
 * (or is missing), fetches a fresh thumbnail via TikTok oEmbed, updates
 * cover_url in the DB, then immediately caches it to Supabase Storage.
 *
 * oEmbed endpoint (no auth required):
 *   https://www.tiktok.com/oembed?url=https://www.tiktok.com/video/{tiktok_id}
 *
 * Body params:
 *   limit  — max videos to process per call (default 50, max 200)
 */

import { NextResponse }                         from 'next/server'
import { createServiceClient, createClient }    from '@/lib/supabase/server'
import { cacheCoverImage, saveCoverStorageUrl } from '@/lib/imageStorage'
import { isTikTokUrlExpired }                   from '@/lib/tiktokImg'

const OEMBED_BASE = 'https://www.tiktok.com/oembed'

async function fetchFreshThumbnail(tiktokId: string): Promise<string | null> {
  const videoUrl = `https://www.tiktok.com/video/${tiktokId}`
  try {
    const res = await fetch(`${OEMBED_BASE}?url=${encodeURIComponent(videoUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TTLike/1.0)' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const data = await res.json() as { thumbnail_url?: string }
    return data.thumbnail_url ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  // ── Admin auth guard ──────────────────────────────────────────────────────
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

  let body: { limit?: number } = {}
  try { body = await req.json() } catch { /* empty body OK */ }

  const limit = Math.min(body.limit ?? 50, 200)
  const service = createServiceClient()

  // Fetch videos that need cover refresh:
  //   - no cover_storage_url (not yet permanently cached)
  //   - cover_url is null OR has an expired x-expires param
  const { data: videos, error: fetchErr } = await service
    .from('tiktok_videos')
    .select('id, tiktok_id, cover_url, cover_storage_url')
    .is('cover_storage_url', null)
    .not('tiktok_id', 'is', null)
    .limit(limit * 3) // over-fetch so we can filter by expired in JS

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!videos?.length) {
    return NextResponse.json({ refreshed: 0, cached: 0, failed: 0, message: 'No videos need cover refresh.' })
  }

  // Filter to only those where cover_url is missing or expired
  const needsRefresh = (videos as Array<{
    id: string
    tiktok_id: string
    cover_url: string | null
    cover_storage_url: string | null
  }>).filter(v => !v.cover_url || isTikTokUrlExpired(v.cover_url))
    .slice(0, limit)

  if (!needsRefresh.length) {
    return NextResponse.json({
      refreshed: 0,
      cached: 0,
      failed: 0,
      message: 'All videos with missing storage URLs still have valid CDN URLs — run Cache New Covers instead.',
    })
  }

  let refreshed = 0
  let cached    = 0
  let failed    = 0
  // 250ms between oEmbed calls to avoid rate limiting
  const DELAY_MS = 250

  for (let i = 0; i < needsRefresh.length; i++) {
    const video = needsRefresh[i]
    if (i > 0) await new Promise(r => setTimeout(r, DELAY_MS))

    const freshUrl = await fetchFreshThumbnail(video.tiktok_id)
    if (!freshUrl) {
      failed++
      continue
    }

    // Update cover_url with the fresh CDN URL
    await service
      .from('tiktok_videos')
      .update({ cover_url: freshUrl })
      .eq('id', video.id)

    refreshed++

    // Immediately cache to Supabase Storage
    const storageUrl = await cacheCoverImage(video.id, freshUrl)
    if (storageUrl) {
      await saveCoverStorageUrl(video.id, storageUrl)
      cached++
    }
  }

  console.log(`[refresh-expired-covers] needsRefresh:${needsRefresh.length} refreshed:${refreshed} cached:${cached} failed:${failed}`)

  return NextResponse.json({
    needsRefresh: needsRefresh.length,
    refreshed,
    cached,
    failed,
    message: `Refreshed ${refreshed} expired cover URLs via oEmbed. Cached ${cached} to Storage. ${failed} failed (video may be deleted or private).`,
  })
}
