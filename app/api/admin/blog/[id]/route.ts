/**
 * GET    /api/admin/blog/[id] — fetch single post
 * PUT    /api/admin/blog/[id] — update post fields
 * DELETE /api/admin/blog/[id] — soft-delete (→ ARCHIVED)
 */

import { NextRequest, NextResponse } from 'next/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  if (!await isCurrentUserAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const post = await d1Db.blogPost.findUnique({ where: { id } })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ post })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  if (!await isCurrentUserAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let body: {
    title?: string; slug?: string; content?: string; excerpt?: string
    category?: string; tags?: string[]; status?: string
    seoTitle?: string; seoDesc?: string; authorName?: string; coverImage?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  if (body.title      !== undefined) data.title      = body.title
  if (body.slug       !== undefined) data.slug        = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (body.content    !== undefined) data.content    = body.content
  if (body.excerpt    !== undefined) data.excerpt    = body.excerpt
  if (body.category   !== undefined) data.category   = body.category
  if (body.tags       !== undefined) data.tags       = Array.isArray(body.tags) ? body.tags : []
  if (body.seoTitle   !== undefined) data.seoTitle   = body.seoTitle
  if (body.seoDesc    !== undefined) data.seoDesc    = body.seoDesc
  if (body.authorName !== undefined) data.authorName = body.authorName
  if (body.coverImage !== undefined) data.coverImage = body.coverImage
  if (body.status     !== undefined) {
    // Validate status enum
    const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
    type ValidStatus = typeof VALID_STATUSES[number]
    if (!VALID_STATUSES.includes(body.status as ValidStatus)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
    data.status = body.status
    // Set publishedAt when first transitioning to PUBLISHED
    if (body.status === 'PUBLISHED') {
      const existing = await d1Db.blogPost.findUnique({ where: { id }, select: { publishedAt: true } })
      if (!existing?.publishedAt) data.publishedAt = new Date()
    }
  }

  try {
    const post = await d1Db.blogPost.update({ where: { id }, data })
    return NextResponse.json({ post })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Prisma P2025: record not found
    if (msg.includes('P2025') || msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    // Prisma P2002: unique constraint (slug collision on update)
    if (msg.includes('P2002') || msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  if (!await isCurrentUserAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Soft-delete: set status to ARCHIVED
    await d1Db.blogPost.update({
      where: { id },
      data:  { status: 'ARCHIVED' },
    })
    return NextResponse.json({ ok: true, message: 'Post archived' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
