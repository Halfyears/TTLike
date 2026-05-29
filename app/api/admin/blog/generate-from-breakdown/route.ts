/**
 * POST /api/admin/blog/generate-from-breakdown
 *
 * Directly generates a blog post from a video_breakdown using the
 * AI waterfall (Groq → Gemini → GitHub). No Trigger.dev or Ghost needed.
 *
 * Flow:
 *   1. Fetch breakdown + video metadata from Supabase
 *   2. Guard against re-generation (already PUBLISHED)
 *   3. Mark breakdown as PROCESSING
 *   4. Run AI waterfall with breakdown context
 *   5. Save blog post to blog_posts via Prisma (status=PUBLISHED)
 *   6. Update video_breakdowns: blog_status=PUBLISHED, blog_published_at=now
 *   7. Return { ok: true, post_id, slug, provider }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { runAIWaterfall } from '@/lib/ai/providers'

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

function toSlug(text: string): string {
  // Strip non-ASCII (handles Chinese/emoji product names), then slugify
  return text
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')  // replace non-ASCII with space (not empty) to preserve word breaks
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

const SYSTEM_PROMPT = `You are an expert TikTok content strategist and SEO blog writer.
You will be given data about a viral TikTok video: the product name, niche, viral hook formulas, and engagement metrics.
Write a comprehensive, SEO-optimized blog post that:
- Explains why this product went viral
- Breaks down the hook formula and what made it work
- Gives actionable advice for sellers/creators

Return ONLY valid JSON (no markdown code fences) with this exact structure:
{
  "title": "SEO title 50-70 chars, no emoji",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary, 120-160 chars",
  "category": "one of: Strategy | Research | Guide | AI",
  "tags": ["tag1","tag2","tag3","tag4"],
  "seo_title": "SEO title (same or slightly different)",
  "seo_desc": "Meta description 120-160 chars",
  "content": "Full article in Markdown. Use ## H2 and ### H3. Include: intro, why it went viral, hook breakdown, actionable tips, conclusion. 600-900 words."
}`

interface GeneratedPost {
  title:     string
  slug:      string
  excerpt:   string
  category:  string
  tags:      string[]
  seo_title: string
  seo_desc:  string
  content:   string
}

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { breakdown_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { breakdown_id } = body
  if (!breakdown_id) return NextResponse.json({ error: 'breakdown_id is required' }, { status: 400 })

  const service = createServiceClient()

  // ── 1. Fetch breakdown + video metadata ──────────────────────────────────────
  const { data: bd, error: bdErr } = await service
    .from('video_breakdowns')
    .select(`
      id,
      payload,
      blog_status,
      tiktok_videos!left(id, title, product_name, niche, cover_url, views, likes, shares)
    `)
    .eq('id', breakdown_id)
    .maybeSingle()

  if (bdErr || !bd) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 })
  }

  // ── 2. Guard: don't re-generate if already PUBLISHED ─────────────────────────
  if (bd.blog_status === 'PUBLISHED') {
    return NextResponse.json({ error: 'Blog post already generated for this breakdown' }, { status: 409 })
  }

  // ── 3. Mark as PROCESSING ────────────────────────────────────────────────────
  await service
    .from('video_breakdowns')
    .update({ blog_status: 'PROCESSING' })
    .eq('id', breakdown_id)

  type VideoRow = {
    id: string; title: string | null; product_name: string | null
    niche: string | null; cover_url: string | null
    views: number | null; likes: number | null; shares: number | null
  }
  const video   = (bd as unknown as { tiktok_videos: VideoRow | null }).tiktok_videos
  const payload = bd.payload as {
    metrics?:        { views: string; likes: string; shares: string }
    viral_formulas?: Array<{ title: string; description?: string }>
  } | null

  const productName   = video?.product_name ?? video?.title ?? 'Unknown Product'
  const niche         = video?.niche ?? 'General'
  const views         = payload?.metrics?.views ?? String(video?.views ?? 0)
  const likes         = payload?.metrics?.likes ?? String(video?.likes ?? 0)
  const topFormulas   = (payload?.viral_formulas ?? []).slice(0, 3).map(f => f.title).join('; ') || 'Unknown'

  const userPrompt = `Product: ${productName}
Niche: ${niche}
Viral stats: ${views} views, ${likes} likes
Top hook formulas used: ${topFormulas}

Write a blog post analyzing why this product went viral and how sellers can replicate it.`

  // ── 4. Run AI waterfall ──────────────────────────────────────────────────────
  let text: string
  let provider: string
  try {
    const result = await runAIWaterfall(SYSTEM_PROMPT, userPrompt, {
      groqTimeoutMs:   25_000,
      geminiTimeoutMs: 35_000,
      githubTimeoutMs: 25_000,
    })
    text     = result.text
    provider = result.provider
  } catch (e) {
    // All providers failed — mark breakdown as FAILED
    await service.from('video_breakdowns').update({ blog_status: 'FAILED' }).eq('id', breakdown_id)
    return NextResponse.json(
      { error: `AI generation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    )
  }

  // ── 5. Parse AI response ─────────────────────────────────────────────────────
  let parsed: GeneratedPost
  try {
    parsed = JSON.parse(text) as GeneratedPost
  } catch {
    console.error('[generate-from-breakdown] JSON parse failed | provider:', provider, '| raw:', text.slice(0, 300))
    await service.from('video_breakdowns').update({ blog_status: 'FAILED' }).eq('id', breakdown_id)
    return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 })
  }

  if (!parsed.title || !parsed.content) {
    await service.from('video_breakdowns').update({ blog_status: 'FAILED' }).eq('id', breakdown_id)
    return NextResponse.json({ error: 'AI response missing required fields' }, { status: 502 })
  }

  // Coerce tags
  if (!Array.isArray(parsed.tags)) parsed.tags = []
  parsed.tags = parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 10)

  // ── 6. Build unique slug ─────────────────────────────────────────────────────
  // Fallback: if title is all non-ASCII (e.g. Chinese), toSlug() may return "".
  // Use breakdown_id suffix so we always get a valid, non-empty slug.
  const baseSlug = parsed.slug?.trim() || toSlug(parsed.title) || `breakdown-${breakdown_id.slice(0, 8)}`
  let slug = baseSlug
  const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
  if (existing) slug = `${baseSlug}-${Date.now().toString(36)}`

  // ── 7. Save blog post to Prisma as PUBLISHED ──────────────────────────────────
  const VALID_CATEGORIES = ['Strategy', 'Research', 'Guide', 'AI']
  let post: { id: string; slug: string }
  try {
    post = await prisma.blogPost.create({
      data: {
        title:      parsed.title.slice(0, 200),
        slug,
        content:    parsed.content,
        excerpt:    parsed.excerpt?.slice(0, 500) ?? null,
        category:   VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Research',
        tags:       parsed.tags,
        seoTitle:   (parsed.seo_title || parsed.title).slice(0, 200),
        seoDesc:    parsed.seo_desc?.slice(0, 300) ?? null,
        authorName: 'TTLike Team',
        coverImage: video?.cover_url ?? null,
        status:     'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true, slug: true },
    })
  } catch (e) {
    await service.from('video_breakdowns').update({ blog_status: 'FAILED' }).eq('id', breakdown_id)
    return NextResponse.json(
      { error: `DB save failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }

  // ── 8. Update breakdown status → PUBLISHED ───────────────────────────────────
  await service
    .from('video_breakdowns')
    .update({
      blog_status:      'PUBLISHED',
      blog_published_at: new Date().toISOString(),
    })
    .eq('id', breakdown_id)

  console.log(`[generate-from-breakdown] Done | breakdown: ${breakdown_id} | post: ${post.id} | provider: ${provider}`)

  return NextResponse.json({
    ok:       true,
    post_id:  post.id,
    slug:     post.slug,
    provider,
    message:  `Blog post generated and published via ${provider}`,
  })
}
