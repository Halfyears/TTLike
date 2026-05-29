/**
 * POST /api/admin/blog/batch-generate
 *
 * Accepts an array of topics and uses the AI waterfall
 * (Groq → Gemini → GitHub) to generate a full blog post for each.
 * Posts are saved as DRAFT to blog_posts via Prisma.
 *
 * Request body:
 *   { topics: string[] }   — max 10 per call
 *
 * Response:
 *   { results: Array<{ topic, ok, slug?, id?, provider?, error? }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

/** Slugify a title. Non-ASCII chars (Chinese, emoji) are replaced with spaces
 *  to preserve word boundaries rather than collapsing them to nothing. */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ' ')  // non-ASCII → space, keeps word breaks
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

const SYSTEM_PROMPT = `You are an expert TikTok content strategist and SEO blog writer.
Write a comprehensive, SEO-optimized blog post about the given topic.
The post should be helpful, specific, and targeted at TikTok sellers, dropshippers, or UGC creators.

Return ONLY valid JSON with this exact structure (no markdown code block, raw JSON only):
{
  "title": "Compelling SEO title (50-70 chars, no emoji)",
  "slug": "url-friendly-slug-from-title",
  "excerpt": "2-3 sentence summary for meta description (120-160 chars)",
  "category": "one of: Strategy | Research | Guide | AI",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "seo_title": "SEO title (same as title or slightly different, no emoji)",
  "seo_desc": "Meta description 120-160 chars",
  "content": "Full article in Markdown. Use ## for H2, ### for H3. Include intro, 3-5 main sections, conclusion. 600-900 words. Plain text, no HTML."
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

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { topics?: string[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { topics } = body
  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json({ error: 'topics must be a non-empty array' }, { status: 400 })
  }
  if (topics.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 topics per request' }, { status: 400 })
  }

  const results: Array<{
    topic:     string
    ok:        boolean
    id?:       string
    slug?:     string
    title?:    string
    provider?: string
    error?:    string
  }> = []

  // Process topics sequentially to avoid rate limits
  for (const topic of topics) {
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      results.push({ topic, ok: false, error: 'Topic too short or invalid' })
      continue
    }

    try {
      // 1. Generate with AI waterfall
      const { text, provider } = await runAIWaterfall(
        SYSTEM_PROMPT,
        `Write a blog post about: ${topic.trim()}`,
        { groqTimeoutMs: 20_000, geminiTimeoutMs: 30_000, githubTimeoutMs: 20_000 },
      )

      // 2. Parse JSON
      let parsed: GeneratedPost
      try {
        parsed = JSON.parse(text) as GeneratedPost
      } catch {
        console.error('[batch-generate] JSON parse failed | topic:', topic, '| provider:', provider, '| raw preview:', text.slice(0, 300))
        results.push({ topic, ok: false, provider, error: 'AI returned invalid JSON' })
        continue
      }

      // 3. Validate required fields and coerce types
      if (!parsed.title || typeof parsed.title !== 'string') {
        results.push({ topic, ok: false, provider, error: 'AI response missing title' })
        continue
      }
      if (!parsed.content || typeof parsed.content !== 'string') {
        results.push({ topic, ok: false, provider, error: 'AI response missing content' })
        continue
      }
      // Ensure tags is always an array of strings (AI may return object or null)
      if (!Array.isArray(parsed.tags)) parsed.tags = []
      parsed.tags = parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 10)

      // 4. Ensure slug is unique — fallback covers all-non-ASCII titles (e.g. Chinese)
      const baseSlug = parsed.slug?.trim() || toSlug(parsed.title) || `post-${Date.now().toString(36)}`
      let slug = baseSlug
      const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
      if (existing) {
        slug = `${baseSlug}-${Date.now().toString(36)}`
      }

      // 5. Save to DB as DRAFT
      const validCategories = ['Strategy', 'Research', 'Guide', 'AI']
      const post = await prisma.blogPost.create({
        data: {
          title:      parsed.title.slice(0, 200),
          slug,
          content:    parsed.content,
          excerpt:    parsed.excerpt?.slice(0, 500) ?? null,
          category:   validCategories.includes(parsed.category) ? parsed.category : 'Guide',
          tags:       Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
          seoTitle:   (parsed.seo_title || parsed.title).slice(0, 200),
          seoDesc:    parsed.seo_desc?.slice(0, 300) ?? null,
          authorName: 'TTLike Team',
          status:     'DRAFT',
          publishedAt: null,
        },
      })

      results.push({ topic, ok: true, id: post.id, slug, title: post.title, provider })

    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.error('[batch-generate] topic failed:', topic, error)
      results.push({ topic, ok: false, error })
    }
  }

  const successCount = results.filter(r => r.ok).length
  return NextResponse.json({
    results,
    summary: { total: topics.length, success: successCount, failed: topics.length - successCount },
  })
}
