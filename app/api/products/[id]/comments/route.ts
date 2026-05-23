/**
 * GET /api/products/[id]/comments
 *
 * Returns up to 5 top comments for a TikTok video.
 * Checks video_comments cache first; on miss, fetches from RapidAPI and caches.
 *
 * Requires RAPIDAPI_KEY env var to be set in Vercel (same key used by the scraper).
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { filterHighValueComments } from '@/lib/sentimentFilter'

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY  ?? ''
const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com'

interface ParsedComment {
  comment_id: string | null
  text: string
  likes: number
  author: string
}

/** Safely extract a string from a possibly-nested API field */
function str(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

/**
 * Parse comments from any known tiktok-scraper7 response shape.
 * The endpoint returns wildly different shapes across API versions.
 */
function parseComments(body: Record<string, unknown>): ParsedComment[] {
  // Possible locations of the comment array
  const candidates: unknown[] = [
    body?.data,
    (body?.data as Record<string, unknown>)?.comments,
    (body?.data as Record<string, unknown>)?.itemList,
    body?.comments,
    body?.result,
  ]

  let raw: Record<string, unknown>[] = []
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      raw = c as Record<string, unknown>[]
      break
    }
  }

  if (!raw.length) return []

  return raw
    .slice(0, 8)
    .map(c => {
      // Comment text — several possible field names
      const text = (
        str(c.text) ||
        str(c.comment_text) ||
        str(c.content) ||
        str((c.share_info as Record<string, unknown>)?.desc)
      ).trim()

      if (!text || text.length < 3) return null

      // Comment ID
      const comment_id = str(c.cid) || str(c.comment_id) || str(c.id) || null

      // Likes
      const likes = Number(c.digg_count ?? c.like_count ?? c.diggCount ?? 0)

      // Author — nested user object or flat field
      const user = (c.user ?? c.author ?? {}) as Record<string, unknown>
      const author = str(user.unique_id) || str(user.uniqueId) || str(user.nickname) || str(c.nickname) || ''

      return { comment_id, text, likes, author } satisfies ParsedComment
    })
    .filter((c): c is ParsedComment => c !== null)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5)
}

async function fetchFromRapidAPI(tiktokId: string): Promise<ParsedComment[]> {
  if (!RAPIDAPI_KEY) {
    console.warn('[comments] RAPIDAPI_KEY not set — skipping fetch')
    return []
  }

  const url = new URL(`https://${RAPIDAPI_HOST}/video/comments`)
  url.searchParams.set('video_id', tiktokId)
  url.searchParams.set('count', '8')
  url.searchParams.set('cursor', '0')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`[comments] RapidAPI ${res.status} for ${tiktokId}`)
      return []
    }

    const body = await res.json() as Record<string, unknown>
    const comments = parseComments(body)
    console.log(`[comments] fetched ${comments.length} comments for ${tiktokId}`)
    return comments
  } catch (err) {
    console.error('[comments] fetch error:', err)
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // 1. Resolve UUID → tiktok_id
  const { data: video } = await supabase
    .from('tiktok_videos')
    .select('tiktok_id')
    .eq('id', id)
    .single()

  if (!video) return NextResponse.json({ comments: [], reason: 'video_not_found' })
  const tiktokId = video.tiktok_id

  // 2. Check cache in video_comments table
  try {
    const { data: cached } = await supabase
      .from('video_comments')
      .select('comment_id, text, likes, author')
      .eq('tiktok_id', tiktokId)
      .order('likes', { ascending: false })
      .limit(5)

    if (cached && cached.length > 0) {
      const texts   = cached.map(c => c.text as string)
      const passing = new Set(filterHighValueComments(texts, 8))
      const buyerComments = cached.filter(c => passing.has(c.text as string))
      const result  = buyerComments.length >= 2 ? buyerComments : cached
      return NextResponse.json({
        comments: result,
        source:   'cache',
        filtered: buyerComments.length >= 2,
      })
    }
  } catch {
    // Table may not exist yet — proceed to fetch
  }

  // 3. Fetch fresh from RapidAPI
  const fresh = await fetchFromRapidAPI(tiktokId)

  if (fresh.length > 0) {
    // 4. Cache: only insert rows with non-null comment_id to avoid duplicate nulls
    try {
      const toCache = fresh
        .filter(c => c.comment_id !== null)
        .map(c => ({ ...c, tiktok_id: tiktokId }))

      if (toCache.length > 0) {
        await supabase
          .from('video_comments')
          .upsert(toCache, { onConflict: 'comment_id', ignoreDuplicates: true })
      }
    } catch (err) {
      console.warn('[comments] cache write failed:', err)
    }
  }

  if (!RAPIDAPI_KEY) {
    return NextResponse.json({
      comments: [],
      reason: 'no_api_key',
      hint: 'Add RAPIDAPI_KEY to Vercel environment variables',
    })
  }

  // Apply buyer-signal filter to fresh comments too
  const texts        = fresh.map(c => c.text)
  const passing      = new Set(filterHighValueComments(texts, 8))
  const buyerFresh   = fresh.filter(c => passing.has(c.text))
  const result       = buyerFresh.length >= 2 ? buyerFresh : fresh
  return NextResponse.json({ comments: result, source: 'api', filtered: buyerFresh.length >= 2 })
}
