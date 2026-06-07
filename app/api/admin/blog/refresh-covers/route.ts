/**
 * POST /api/admin/blog/refresh-covers
 *
 * Backfills blog_posts.cover_image for any post whose current cover_image looks
 * like an expiring TikTok CDN URL (contains "tiktokcdn" or "muscdn") and whose
 * source video has a permanent cover_storage_url in Supabase Storage.
 *
 * Also repairs any post where cover_image is NULL if the linked video has a
 * cover_storage_url available.
 *
 * Returns: { updated: number, skipped: number, details: [...] }
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Simple admin key guard — same pattern used elsewhere in this codebase
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? ''

function isCdnUrl(url: string | null): boolean {
  if (!url) return true  // null = definitely broken
  return url.includes('tiktokcdn') || url.includes('muscdn') || url.includes('tiktok.com')
}

export async function POST(req: Request) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const key = req.headers.get('x-admin-key') ?? new URL(req.url).searchParams.get('key') ?? ''
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const service = createServiceClient()

  // ── 1. Fetch all published blog posts ─────────────────────────────────────
  const { data: posts, error: postsErr } = await service
    .from('blog_posts')
    .select('id, slug, cover_image, video_breakdown_id')
    .eq('status', 'PUBLISHED')

  if (postsErr || !posts) {
    return NextResponse.json({ error: 'Failed to fetch posts', detail: postsErr?.message }, { status: 500 })
  }

  // ── 2. Narrow to posts that need repair ───────────────────────────────────
  const needsRepair = posts.filter(p => isCdnUrl(p.cover_image as string | null))

  if (needsRepair.length === 0) {
    return NextResponse.json({ updated: 0, skipped: posts.length, details: [], message: 'All covers look healthy.' })
  }

  // ── 3. For each broken post, look up cover_storage_url via breakdown → video
  const details: Array<{ id: string; slug: string; status: string; url?: string }> = []
  let updated = 0

  for (const post of needsRepair) {
    const breakdownId = (post as Record<string, unknown>).video_breakdown_id as string | null

    if (!breakdownId) {
      details.push({ id: post.id as string, slug: post.slug as string, status: 'skipped_no_breakdown' })
      continue
    }

    // Get video linked to this breakdown
    const { data: bd } = await service
      .from('video_breakdowns')
      .select('video_id')
      .eq('id', breakdownId)
      .maybeSingle()

    if (!bd?.video_id) {
      details.push({ id: post.id as string, slug: post.slug as string, status: 'skipped_no_video' })
      continue
    }

    const { data: video } = await service
      .from('tiktok_videos')
      .select('cover_storage_url, cover_url')
      .eq('id', bd.video_id)
      .maybeSingle()

    const newCover = (video as Record<string, string | null> | null)?.cover_storage_url
                  ?? (video as Record<string, string | null> | null)?.cover_url
                  ?? null

    if (!newCover || isCdnUrl(newCover)) {
      details.push({ id: post.id as string, slug: post.slug as string, status: 'skipped_no_storage_url' })
      continue
    }

    // Update via Prisma so updatedAt is bumped
    try {
      await prisma.blogPost.update({
        where: { id: post.id as string },
        data:  { coverImage: newCover },
      })
      details.push({ id: post.id as string, slug: post.slug as string, status: 'updated', url: newCover })
      updated++
    } catch (e) {
      details.push({ id: post.id as string, slug: post.slug as string, status: `error: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return NextResponse.json({
    updated,
    skipped: needsRepair.length - updated,
    total_posts: posts.length,
    details,
  })
}
