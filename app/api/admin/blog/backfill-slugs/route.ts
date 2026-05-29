/**
 * POST /api/admin/blog/backfill-slugs
 *
 * For every PUBLISHED breakdown that has no payload.blog_post_slug,
 * finds the matching blog post (by cover_image = video.cover_url OR
 * by closest published_at) and writes the slug back into the payload.
 *
 * Response:
 *   { ok: true, updated: number, map: Record<breakdown_id, slug> }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // 1. All PUBLISHED breakdowns (with video cover_url + blog_published_at)
  const { data: rows } = await service
    .from('video_breakdowns')
    .select('id, payload, blog_published_at, video_id, tiktok_videos!left(cover_url)')
    .eq('blog_status', 'PUBLISHED')

  if (!rows?.length) return NextResponse.json({ ok: true, updated: 0, map: {} })

  // 2. Split: already have slug vs need lookup
  type Row = {
    id: string
    payload: Record<string, unknown> | null
    blog_published_at: string | null
    video_id: string | null
    tiktok_videos: { cover_url: string | null } | null
  }

  const needSlug = (rows as Row[]).filter(r => !r.payload?.blog_post_slug)
  if (!needSlug.length) return NextResponse.json({ ok: true, updated: 0, map: {} })

  // 3. All PUBLISHED blog posts (id, slug, coverImage, publishedAt)
  const allPosts = await prisma.blogPost.findMany({
    where:  { status: 'PUBLISHED' },
    select: { id: true, slug: true, coverImage: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  })

  const slugMap: Record<string, string> = {}

  for (const row of needSlug) {
    const coverUrl = row.tiktok_videos?.cover_url ?? null
    const publishedAt = row.blog_published_at ? new Date(row.blog_published_at).getTime() : null

    let matched = null

    // Strategy 1: match by cover_image
    if (coverUrl) {
      matched = allPosts.find(p => p.coverImage === coverUrl) ?? null
    }

    // Strategy 2: closest published_at within 10 minutes of blog_published_at
    if (!matched && publishedAt) {
      const candidates = allPosts.filter(p => p.publishedAt)
      let minDiff = Infinity
      for (const p of candidates) {
        const diff = Math.abs(p.publishedAt!.getTime() - publishedAt)
        if (diff < minDiff && diff < 10 * 60 * 1000) {
          minDiff = diff
          matched  = p
        }
      }
    }

    if (!matched) continue

    slugMap[row.id] = matched.slug

    // Write slug back into payload
    const updatedPayload = { ...(row.payload ?? {}), blog_post_slug: matched.slug }
    await service
      .from('video_breakdowns')
      .update({ payload: updatedPayload })
      .eq('id', row.id)
  }

  return NextResponse.json({ ok: true, updated: Object.keys(slugMap).length, map: slugMap })
}
