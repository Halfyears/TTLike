/**
 * POST /api/admin/blog/refresh-covers
 *
 * Backfills blog_posts.cover_image for any post whose current cover_image looks
 * like an expiring TikTok CDN URL (contains "tiktokcdn" / "muscdn") and whose
 * source video has a permanent cover_storage_url in Supabase Storage.
 *
 * Lookup path: blog_posts.slug → video_breakdowns.payload->>'blog_post_slug'
 *              → video_breakdowns.video_id → tiktok_videos.cover_storage_url
 *
 * Note: blog_posts has NO video_breakdown_id column. The link lives in
 * video_breakdowns.payload (JSON field), stored as { blog_post_slug: "..." }
 * by the generate-from-breakdown API.
 *
 * Auth: same isAdmin() session check used across all admin routes.
 *
 * Returns: { updated, skipped, healthy, total_posts, details }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// ── Auth (same pattern used across all /api/admin/* routes) ──────────────────
async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await prisma.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isCdnUrl(url: string | null | undefined): boolean {
  if (!url) return true  // null → definitely broken
  return url.includes('tiktokcdn') || url.includes('muscdn') || url.includes('tiktok.com')
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // ── 1. Fetch all published blog posts ─────────────────────────────────────
  const { data: posts, error: postsErr } = await service
    .from('blog_posts')
    .select('id, slug, cover_image')
    .eq('status', 'PUBLISHED')

  if (postsErr || !posts) {
    return NextResponse.json({ error: 'Failed to fetch posts', detail: postsErr?.message }, { status: 500 })
  }

  const total   = posts.length
  const broken  = posts.filter(p => isCdnUrl(p.cover_image as string | null))
  const healthy = total - broken.length

  if (broken.length === 0) {
    return NextResponse.json({
      updated: 0, skipped: 0, healthy, total_posts: total,
      details: [], message: `All ${total} covers look healthy — nothing to repair.`,
    })
  }

  // ── 2. Fetch all video_breakdowns that have a blog_post_slug in payload ───
  //   payload is a JSONB column; the slug is stored by generate-from-breakdown
  //   as payload.blog_post_slug.
  const { data: breakdowns, error: bdErr } = await service
    .from('video_breakdowns')
    .select(`
      video_id,
      payload,
      tiktok_videos!left(cover_storage_url, cover_url)
    `)
    .not('payload', 'is', null)

  if (bdErr) {
    return NextResponse.json({ error: 'Failed to fetch breakdowns', detail: bdErr.message }, { status: 500 })
  }

  // ── 3. Build slug → best_cover_url map ───────────────────────────────────
  type VideoRow = { cover_storage_url: string | null; cover_url: string | null }
  type BdRow = {
    video_id: string | null
    payload: Record<string, unknown> | null
    // Supabase left-join returns an array (even for to-one joins)
    tiktok_videos: VideoRow[] | VideoRow | null
  }

  const slugToCover = new Map<string, string>()

  for (const bd of (breakdowns ?? []) as unknown as BdRow[]) {
    const slug = (bd.payload?.blog_post_slug ?? bd.payload?.slug) as string | undefined
    if (!slug) continue

    // Normalise: Supabase may return array or single object depending on join type
    const videoRow = Array.isArray(bd.tiktok_videos)
      ? bd.tiktok_videos[0] ?? null
      : bd.tiktok_videos
    const storageUrl = videoRow?.cover_storage_url
    const cdnUrl     = videoRow?.cover_url
    const best = !isCdnUrl(storageUrl) ? storageUrl
               : !isCdnUrl(cdnUrl)     ? cdnUrl
               : null

    if (best) slugToCover.set(slug, best)
  }

  // ── 4. Loop broken posts and apply repairs ────────────────────────────────
  const details: Array<{ id: string; slug: string; status: string; url?: string }> = []
  let updated = 0

  for (const post of broken) {
    const id   = post.id   as string
    const slug = post.slug as string

    const newCover = slugToCover.get(slug) ?? null

    if (!newCover) {
      details.push({ id, slug, status: 'skipped_no_storage_url' })
      continue
    }

    try {
      await prisma.blogPost.update({
        where: { id },
        data:  { coverImage: newCover },
      })
      details.push({ id, slug, status: 'updated', url: newCover })
      updated++
    } catch (e) {
      details.push({ id, slug, status: `error: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return NextResponse.json({
    updated,
    skipped:     broken.length - updated,
    healthy,
    total_posts: total,
    details,
  })
}
