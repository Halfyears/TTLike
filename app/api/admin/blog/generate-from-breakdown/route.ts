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
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { runAIWaterfall } from '@/lib/ai/providers'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

/** Strip hashtags, emoji, and stray symbols from a product/title string. */
function cleanProductName(text: string): string {
  return text
    .replace(/#[\wÀ-ɏḀ-ỿ一-鿿]+/g, '')         // #hashtags (incl. accented/CJK)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '') // emoji/dingbats/arrows
    .replace(/[|•@~_*^]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s.,!?:;\-]+|[\s.,!?:;\-]+$/g, '')
    .trim()
}

// ── Writer personas — picked at random per post for variety (avoid AI sameness) ─
const WRITER_ANGLES = [
  {
    voice: 'a skeptical reviewer who tested a lot of viral TikTok products and is wary of hype',
    structure: 'Open with the skepticism, walk through what actually makes this one different, then give a balanced verdict.',
  },
  {
    voice: 'a TikTok Shop seller writing for other sellers, focused on practical replication',
    structure: 'Open with a quick observation about the trend, then go straight into a numbered playbook sellers can copy.',
  },
  {
    voice: 'a short-form content strategist analyzing the creative mechanics of the video',
    structure: 'Open by describing the scene/hook of the video itself, then break down the creative structure scene-by-scene.',
  },
  {
    voice: 'a curious consumer-trends writer explaining why a product niche is having a moment',
    structure: 'Open with the broader trend or problem this product solves, then zoom into this specific example as a case study.',
  },
  {
    voice: 'a no-fluff dropshipping coach giving blunt, tactical advice',
    structure: 'Open with a direct claim or question, then use short punchy paragraphs and a clear action checklist.',
  },
  {
    voice: 'a copywriter breaking down the psychology and hook formula used in the video',
    structure: 'Open with the hook line itself as a quote, then dissect why it works psychologically before giving takeaways.',
  },
]

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

function buildSystemPrompt(angle: typeof WRITER_ANGLES[number], hasStats: boolean): string {
  const statsRule = hasStats
    ? `Engagement numbers ARE provided — you may reference them naturally (e.g. roughly how many views/likes), but don't over-rely on them.`
    : `No reliable engagement numbers are provided for this video. DO NOT invent or estimate view counts, like counts, percentages, or any other specific metrics. Instead describe virality qualitatively — momentum, repeat appearances in the niche, the kind of hook/format that tends to spread, audience reactions implied by the format, etc. Never write phrases like "with X views" or "garnered X likes" if X is not given.`

  return `You are writing a single article for a blog about TikTok Shop / UGC product trends. Write in the voice of ${angle.voice}.

Structure guidance: ${angle.structure} Do not follow this structure rigidly if a different flow fits the product better — use it as inspiration, not a template.

Hard requirements:
- This article must read as genuinely distinct from other posts on the site: vary your sentence rhythm, opening style, headings, and vocabulary. Avoid generic AI phrasing like "In today's fast-paced world", "Let's dive in", "In conclusion", "viral sensation", "game-changer", "unlock the secret".
- Avoid repeating the exact product name in every single heading — use synonyms, pronouns, or descriptive references ("this product", "the item", category terms) for variety.
- ${statsRule}
- Write naturally for a human reader first; good SEO follows from genuinely useful, specific, non-templated content (this matters because near-duplicate pages get filtered out of Google's index).
- Ground every claim in the actual data given (product name, niche, hook formulas, transcript/description if present) — don't pad with generic filler that could apply to any product.

Return ONLY valid JSON (no markdown code fences) with this exact structure:
{
  "title": "SEO title 50-70 chars, no emoji, must include the actual product name or a clear descriptor of it",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary, 120-160 chars",
  "category": "one of: Strategy | Research | Guide | AI",
  "tags": ["tag1","tag2","tag3","tag4"],
  "seo_title": "SEO title (same or slightly different)",
  "seo_desc": "Meta description 120-160 chars",
  "content": "Full article in Markdown. Use ## and ### headings that fit your chosen structure. 600-900 words."
}`
}

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
      tiktok_videos!left(id, title, product_name, niche, cover_url, cover_storage_url, views, likes, shares)
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
    niche: string | null; cover_url: string | null; cover_storage_url: string | null
    views: number | null; likes: number | null; shares: number | null
  }
  const video   = (bd as unknown as { tiktok_videos: VideoRow | null }).tiktok_videos
  const payload = bd.payload as {
    metrics?:        { views: string; likes: string; shares: string }
    viral_formulas?: Array<{ title: string; description?: string }>
  } | null

  const rawName       = video?.product_name ?? video?.title ?? 'Unknown Product'
  const productName   = cleanProductName(rawName) || rawName
  const niche         = video?.niche ?? 'General'
  const viewsNum      = Number(payload?.metrics?.views ?? video?.views ?? 0)
  const likesNum      = Number(payload?.metrics?.likes ?? video?.likes ?? 0)
  const hasStats      = viewsNum > 0 || likesNum > 0
  const topFormulas   = (payload?.viral_formulas ?? []).slice(0, 3).map(f => f.title).join('; ') || 'Unknown'

  // Pick a random writer angle so generated posts vary in voice/structure (avoid templated, near-duplicate pages)
  const angle = WRITER_ANGLES[Math.floor(Math.random() * WRITER_ANGLES.length)]!
  const SYSTEM_PROMPT = buildSystemPrompt(angle, hasStats)

  const userPrompt = `Product: ${productName}
Niche: ${niche}
${hasStats ? `Approximate stats: ${viewsNum} views, ${likesNum} likes` : 'No reliable engagement stats available — do not mention specific numbers.'}
Top hook formulas used: ${topFormulas}

Write a blog post analyzing why this product/video stands out and how sellers or creators can apply the same approach.`

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
  const existing = await d1Db.blogPost.findUnique({ where: { slug }, select: { id: true } })
  if (existing) slug = `${baseSlug}-${Date.now().toString(36)}`

  // ── 7. Save blog post to Prisma as PUBLISHED ──────────────────────────────────
  const VALID_CATEGORIES = ['Strategy', 'Research', 'Guide', 'AI']
  let post: { id: string; slug: string }
  try {
    post = await d1Db.blogPost.create({
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
        // Prefer permanent Supabase Storage URL; fall back to TikTok CDN (expires ~7 days)
        coverImage: video?.cover_storage_url ?? video?.cover_url ?? null,
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

  // ── 8. Update breakdown status → PUBLISHED + store slug in payload ───────────
  const updatedPayload = {
    ...(bd.payload as object ?? {}),
    blog_post_slug: post.slug,
  }
  await service
    .from('video_breakdowns')
    .update({
      blog_status:       'PUBLISHED',
      blog_published_at: new Date().toISOString(),
      payload:           updatedPayload,
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
