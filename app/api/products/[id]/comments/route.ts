/**
 * GET /api/products/[id]/comments
 *
 * Returns up to 5 top comments for a TikTok video.
 * Checks video_comments cache first; on miss, fetches from RapidAPI and caches.
 *
 * Requires RAPIDAPI_KEY env var to be set in Cloudflare.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { filterHighValueComments } from '@/lib/sentimentFilter'
import { queryD1First, queryD1Rows, runD1 } from '@/lib/cloudflare/d1'

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY  ?? ''
const RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com'

interface ParsedComment {
  comment_id: string | null
  text: string
  likes: number
  author: string
}

function str(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

function parseComments(body: Record<string, unknown>): ParsedComment[] {
  const candidates: unknown[] = [
    body?.data,
    (body?.data as Record<string, unknown>)?.comments,
    (body?.data as Record<string, unknown>)?.itemList,
    body?.comments,
    body?.result,
  ]

  let raw: Record<string, unknown>[] = []
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      raw = candidate as Record<string, unknown>[]
      break
    }
  }

  if (!raw.length) return []

  return raw
    .slice(0, 8)
    .map(comment => {
      const text = (
        str(comment.text) ||
        str(comment.comment_text) ||
        str(comment.content) ||
        str((comment.share_info as Record<string, unknown>)?.desc)
      ).trim()

      if (!text || text.length < 3) return null

      const comment_id = str(comment.cid) || str(comment.comment_id) || str(comment.id) || null
      const likes = Number(comment.digg_count ?? comment.like_count ?? comment.diggCount ?? 0)
      const user = (comment.user ?? comment.author ?? {}) as Record<string, unknown>
      const author = str(user.unique_id) || str(user.uniqueId) || str(user.nickname) || str(comment.nickname) || ''

      return { comment_id, text, likes, author } satisfies ParsedComment
    })
    .filter((comment): comment is ParsedComment => comment !== null)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5)
}

async function fetchFromRapidAPI(tiktokId: string): Promise<ParsedComment[]> {
  if (!RAPIDAPI_KEY) {
    console.warn('[comments] RAPIDAPI_KEY not set - skipping fetch')
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

function filteredCommentResponse(comments: ParsedComment[], source: 'cache' | 'api') {
  const texts = comments.map(comment => comment.text)
  const passing = new Set(filterHighValueComments(texts, 8))
  const buyerComments = comments.filter(comment => passing.has(comment.text))
  const result = buyerComments.length >= 2 ? buyerComments : comments

  return NextResponse.json({
    comments: result,
    source,
    filtered: buyerComments.length >= 2,
  })
}

async function resolveTikTokId(id: string): Promise<string | null> {
  const d1Video = await queryD1First<{ tiktok_id: string }>(
    'SELECT tiktok_id FROM tiktok_videos WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id],
  )
  if (d1Video?.tiktok_id) return d1Video.tiktok_id

  const supabase = createServiceClient()
  const { data: video } = await supabase
    .from('tiktok_videos')
    .select('tiktok_id')
    .eq('id', id)
    .single()

  return video?.tiktok_id ?? null
}

async function readCachedComments(tiktokId: string): Promise<ParsedComment[] | null> {
  const d1Cached = await queryD1Rows<ParsedComment>(
    `SELECT comment_id, text, likes, author
       FROM video_comments
      WHERE tiktok_id = ?
      ORDER BY likes DESC
      LIMIT 5`,
    [tiktokId],
  )

  if (d1Cached && d1Cached.length > 0) return d1Cached
  if (d1Cached) return []

  try {
    const supabase = createServiceClient()
    const { data: cached } = await supabase
      .from('video_comments')
      .select('comment_id, text, likes, author')
      .eq('tiktok_id', tiktokId)
      .order('likes', { ascending: false })
      .limit(5)

    return (cached ?? []) as ParsedComment[]
  } catch {
    return []
  }
}

async function cacheComments(tiktokId: string, comments: ParsedComment[]) {
  const toCache = comments.filter(comment => comment.comment_id !== null)
  if (toCache.length === 0) return

  const d1Results = await Promise.all(toCache.map(comment => runD1(
    `INSERT OR IGNORE INTO video_comments(comment_id, tiktok_id, text, likes, author)
     VALUES (?, ?, ?, ?, ?)`,
    [comment.comment_id, tiktokId, comment.text, comment.likes, comment.author],
  )))

  if (d1Results.some(Boolean)) return

  try {
    const supabase = createServiceClient()
    await supabase
      .from('video_comments')
      .upsert(toCache.map(comment => ({ ...comment, tiktok_id: tiktokId })), {
        onConflict: 'comment_id',
        ignoreDuplicates: true,
      })
  } catch (err) {
    console.warn('[comments] cache write failed:', err)
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const tiktokId = await resolveTikTokId(id)
  if (!tiktokId) return NextResponse.json({ comments: [], reason: 'video_not_found' })

  const cached = await readCachedComments(tiktokId)
  if (cached && cached.length > 0) return filteredCommentResponse(cached, 'cache')

  const fresh = await fetchFromRapidAPI(tiktokId)
  if (fresh.length > 0) await cacheComments(tiktokId, fresh)

  if (!RAPIDAPI_KEY) {
    return NextResponse.json({
      comments: [],
      reason: 'no_api_key',
      hint: 'Add RAPIDAPI_KEY to Cloudflare environment variables',
    })
  }

  return filteredCommentResponse(fresh, 'api')
}
