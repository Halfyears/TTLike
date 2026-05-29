/**
 * GET  /api/admin/blog — list all posts (admin)
 * POST /api/admin/blog — create a new blog post
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, title: true, slug: true, status: true,
        category: true, viewCount: true, publishedAt: true,
        excerpt: true, tags: true, authorName: true,
        createdAt: true, updatedAt: true,
      },
    })
    return NextResponse.json({ posts })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    title?: string; slug?: string; content?: string; excerpt?: string
    category?: string; tags?: string[]; status?: string
    seoTitle?: string; seoDesc?: string; authorName?: string
    coverImage?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, slug, content, excerpt, category, tags, status, seoTitle, seoDesc, authorName, coverImage } = body

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug, and content are required' }, { status: 400 })
  }

  // Ensure slug is URL-safe
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  try {
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug:       safeSlug,
        content,
        excerpt:    excerpt    ?? null,
        category:   category   ?? null,
        tags:       tags       ?? [],
        status:     (status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') ?? 'DRAFT',
        seoTitle:   seoTitle   ?? null,
        seoDesc:    seoDesc    ?? null,
        authorName: authorName ?? 'TTLike Team',
        coverImage: coverImage ?? null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint') || msg.includes('slug')) {
      return NextResponse.json({ error: 'Slug already exists, try a different one' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
