/**
 * GET /api/products/[id]/comments
 *
 * Returns up to 5 top comments for a TikTok video.
 * Strategy: check video_comments cache first; if empty, fetch from RapidAPI
 * and populate the cache. This keeps API usage low — only triggers on first view.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY  ?? ''
const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com'

interface CachedComment {
  comment_id: string | null
  text: string
  likes: number
  author: string
}

async function fetchFromRapidAPI(tiktokId: string): Promise<CachedComment[]> {
  if (!RAPIDAPI_KEY) return []
  const url = new URL(`https://${RAPIDAPI_HOST}/video/comments`)
  url.searchParams.set('video_id', tiktokId)
  url.searchParams.set('count', '8')
  url.searchParams.set('cursor', '0')

  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []

  const body = await res.json()
  const raw: Record<string, unknown>[] =
    (body?.data?.comments ?? body?.comments ?? body?.data ?? []) as Record<string, unknown>[]

  return raw
    .filter(c => c.text || c.comment_text)
    .slice(0, 5)
    .map(c => ({
      comment_id: c.cid ? String(c.cid) : null,
      text:        String(c.text ?? c.comment_text ?? '').trim(),
      likes:       Number(c.digg_count ?? c.like_count ?? 0),
      author:      String((c.user as Record<string,unknown>)?.unique_id ?? c.nickname ?? ''),
    }))
    .filter(c => c.text.length > 2)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // 1. Lookup tiktok_id from UUID
  const { data: video } = await supabase
    .from('tiktok_videos')
    .select('tiktok_id')
    .eq('id', id)
    .single()

  if (!video) return NextResponse.json({ comments: [] })
  const tiktokId = video.tiktok_id

  // 2. Check cache
  const { data: cached } = await supabase
    .from('video_comments')
    .select('comment_id, text, likes, author')
    .eq('tiktok_id', tiktokId)
    .order('likes', { ascending: false })
    .limit(5)

  if (cached && cached.length > 0) {
    return NextResponse.json({ comments: cached, source: 'cache' })
  }

  // 3. Fetch from RapidAPI
  const fresh = await fetchFromRapidAPI(tiktokId)

  if (fresh.length > 0) {
    // 4. Cache to DB (ignore conflicts)
    await supabase.from('video_comments').upsert(
      fresh.map(c => ({ ...c, tiktok_id: tiktokId })),
      { onConflict: 'comment_id', ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ comments: fresh, source: 'api' })
}
