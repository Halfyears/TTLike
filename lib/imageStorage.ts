/**
 * Permanent TikTok cover image cache.
 *
 * Cloudflare target: upload covers to the `COVERS_BUCKET` R2 binding and serve
 * them through `/api/assets/covers/:key`.
 *
 * During migration, Supabase Storage remains as a fallback when R2 is not
 * available so the current production path keeps working.
 */
import 'server-only'
import { buildPublicCoverUrl, getCoversBucket } from '@/lib/cloudflare/env'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'covers'

export async function cacheCoverImage(
  storageKey: string,
  sourceUrl: string,
): Promise<string | null> {
  if (!sourceUrl.includes('tiktokcdn')) {
    return sourceUrl
  }

  try {
    const fetchRes = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!fetchRes.ok) {
      console.warn(`[imageStorage] TikTok CDN fetch failed ${fetchRes.status} for key ${storageKey}`)
      return null
    }

    const buffer = await fetchRes.arrayBuffer()
    const contentType = fetchRes.headers.get('content-type') ?? 'image/webp'
    const ext = contentType.includes('jpeg') ? 'jpg'
      : contentType.includes('png') ? 'png'
      : 'webp'
    const storagePath = `${storageKey}.${ext}`

    const useR2 = process.env.STORAGE_PROVIDER === 'cloudflare-r2'
    const bucket = useR2 ? await getCoversBucket() : null
    if (bucket) {
      await bucket.put(storagePath, buffer, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
      return buildPublicCoverUrl(storagePath)
    }

    const service = createServiceClient()
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      })

    if (uploadError) {
      console.error(`[imageStorage] Supabase upload failed for key ${storageKey}:`, uploadError.message)
      return null
    }

    const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(storagePath)
    return publicUrl
  } catch (e) {
    console.error(`[imageStorage] Error caching cover for key ${storageKey}:`, e)
    return null
  }
}

export async function saveCoverStorageUrl(
  videoId: string,
  storageUrl: string,
): Promise<boolean> {
  const service = createServiceClient()
  const { error } = await service
    .from('tiktok_videos')
    .update({ cover_storage_url: storageUrl })
    .eq('id', videoId)

  if (error) {
    console.error(`[imageStorage] DB update failed for video ${videoId}:`, error.message)
    return false
  }

  return true
}
