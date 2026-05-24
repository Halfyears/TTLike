/**
 * lib/imageStorage.ts — Supabase Storage cover image cache
 *
 * Downloads a TikTok CDN cover image and uploads it to the "covers" bucket
 * in Supabase Storage, returning the permanent public URL.
 *
 * SETUP: Create a PUBLIC bucket named "covers" in the Supabase dashboard:
 *   Storage → New bucket → Name: covers → Public: ON
 *
 * The stored path is: covers/{videoId}.webp
 * The public URL never expires and has no CORS/hotlink restrictions.
 */
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'covers'

/**
 * Download a TikTok CDN image and upload it to Supabase Storage.
 *
 * @param storageKey  Filename stem for the stored object (e.g. tiktok_videos.id or url_hash)
 * @param sourceUrl   The TikTok CDN URL to download from
 * @returns           The permanent Supabase Storage public URL, or null on failure
 */
export async function cacheCoverImage(
  storageKey: string,
  sourceUrl:  string,
): Promise<string | null> {
  if (!sourceUrl.includes('tiktokcdn')) {
    // Not a TikTok CDN URL — return as-is
    return sourceUrl
  }

  try {
    // Download from TikTok CDN server-side (no Referer header = no hotlink block)
    const fetchRes = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        // Intentionally omit Referer so TikTok CDN hotlink check is bypassed
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!fetchRes.ok) {
      console.warn(`[imageStorage] TikTok CDN fetch failed ${fetchRes.status} for key ${storageKey}`)
      return null
    }

    const buffer      = await fetchRes.arrayBuffer()
    const contentType = fetchRes.headers.get('content-type') ?? 'image/webp'
    const ext         = contentType.includes('jpeg') ? 'jpg'
                      : contentType.includes('png')  ? 'png'
                      : 'webp'
    const storagePath = `${storageKey}.${ext}`

    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,   // overwrite if re-caching
        cacheControl: '31536000', // 1 year
      })

    if (uploadError) {
      console.error(`[imageStorage] Upload failed for key ${storageKey}:`, uploadError.message)
      return null
    }

    // Get the permanent public URL
    const { data: { publicUrl } } = service.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    return publicUrl
  } catch (e) {
    console.error(`[imageStorage] Error caching cover for key ${storageKey}:`, e)
    return null
  }
}

/**
 * Update tiktok_videos.cover_storage_url after a successful upload.
 */
export async function saveCoverStorageUrl(
  videoId:     string,
  storageUrl:  string,
): Promise<void> {
  const service = createServiceClient()
  const { error } = await service
    .from('tiktok_videos')
    .update({ cover_storage_url: storageUrl })
    .eq('id', videoId)

  if (error) {
    console.error(`[imageStorage] DB update failed for video ${videoId}:`, error.message)
  }
}
