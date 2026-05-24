/**
 * trigger/blogEcosystem.ts — SEO Blog Flywheel (Trigger.dev v4)
 *
 * Pipeline (runs on Trigger.dev cloud, up to 10 minutes):
 *   1. Generate SEO blog article via Gemini 2.5 Flash (HTML output)
 *   2. Publish to Ghost CMS via Admin API v5
 *   3. Update video_breakdowns in Supabase (PUBLISHED + ghost_post_id)
 *
 * Required env vars (set in Vercel + synced to Trigger.dev):
 *   GEMINI_API_KEY          — Gemini API key
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GHOST_API_URL           — e.g. https://your-blog.ghost.io
 *   GHOST_ADMIN_API_KEY     — format: id:secret (from Ghost → Settings → Integrations)
 *
 * Cost: ~$0.0002 Gemini + Ghost plan compute per run.
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient }  from '@supabase/supabase-js'
import { createHmac }    from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogFlywheelPayload {
  breakdown_id:   string
  video: {
    title:        string | null
    product_name: string | null
    niche:        string | null
    author:       string | null
    cover_url:    string | null
  }
  metrics: {
    views:  string
    likes:  string
    shares: string
  }
  viral_formulas: Array<{
    title:          string
    timestamp?:     string
    example_script: string
    mechanism:      string
    your_version:   string
  }>
  visual_timeline: Array<{
    time:        string
    description: string
    hook_type?:  string
  }>
}

// ── Ghost JWT helper ──────────────────────────────────────────────────────────

/**
 * Generate a short-lived HS256 JWT from a Ghost Admin API key.
 * Ghost key format: "id:secret" (id=24-char hex, secret=64-char hex).
 */
function ghostJwt(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(':')
  if (!id || !secret) throw new Error('GHOST_ADMIN_API_KEY must be in "id:secret" format')

  const iat = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }))
    .toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' }))
    .toString('base64url')
  const sig = createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${sig}`
}

// ── Gemini blog content generator ────────────────────────────────────────────

async function generateBlogHtml(p: BlogFlywheelPayload): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const productName = p.video.product_name ?? p.video.title ?? 'this product'
  const niche       = p.video.niche ?? 'E-Commerce'

  const formulasSummary = p.viral_formulas.map((f, i) =>
    `${i + 1}. "${f.title}"${f.timestamp ? ` (at ${f.timestamp})` : ''}: ${f.mechanism}`
  ).join('\n')

  const timelineSummary = p.visual_timeline.map(s =>
    `[${s.time}] ${s.description}`
  ).join('\n')

  const prompt = `You are a direct-response copywriter targeting TikTok eCommerce Media Buyers and Matrix Studio Operators.
Write an analytical teardown article based on the provided video schema.
Output ONLY valid HTML (no markdown, no code fences, no commentary).

VIDEO DATA:
- Product: ${productName}
- Niche: ${niche}
- Author: ${p.video.author ?? 'unknown'}
- Metrics: ${p.metrics.views} views · ${p.metrics.likes} likes · ${p.metrics.shares} shares

VIRAL FORMULAS IDENTIFIED:
${formulasSummary}

VISUAL TIMELINE:
${timelineSummary}

CRITICAL POSITIONING:
The theme is NOT "how to create a video" — it is "How to Eliminate Workflow Friction."
Focus heavily on the manual-glue pain: the copy-paste loop between Claude, Pinterest, MakeUGC, and Postiz that bleeds studio operators' bandwidth.
Target keyword clusters: "makeugc workflow", "postiz automation friction", "tiktok ugc studio operations", "${niche.toLowerCase()} ugc scaling".

ARTICLE STRUCTURE:
- H1: Frame around workflow friction, e.g. "How This ${niche} TikTok Hit ${p.metrics.views} Views — And the Workflow Friction Killing Your Studio's Replication Speed"
- H2: Hook Anatomy (explain formula mechanism in operator language)
- H2: The Manual-Glue Bottleneck (name the copy-paste pain explicitly — Claude → Pinterest → MakeUGC → Postiz)
- H2: Storyboard Execution Layer (map timeline to MakeUGC slide structure)
- H2: Scaling This Formula (3 actionable operator-level instructions)

INLINE NATIVE INTERCEPT — insert verbatim between H2 sections 2 and 3:
<div class="ttlike-cta-intercept" style="border-left:3px solid #ec4899;padding:12px 16px;margin:24px 0;background:#fdf2f8;border-radius:6px;">
<strong>💡 Workflow Notice:</strong> Human copy-pasting is the most expensive operational leak in your studio. While tools like MakeUGC automate generation, TTLike™ automates the <em>thinking layer</em> before execution. <a href="https://ttlike.com/pricing">Unlock the TTLike™ Creator Pass ($29/mo)</a> to instantly output standardized Markdown layouts tailored for MakeUGC slide structure and auto-generate 3 anti-duplication hook variations. Protect your bandwidth for scaling, not pasting.
</div>

REQUIREMENTS:
- 650–850 words — dense, zero fluff, operator tone
- No [bracket] placeholders — use actual product and niche names throughout
- Tone: analytical operator briefing, NOT consumer marketing copy

Output only the HTML body content (start with <article>, end with </article>).`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const html = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!html.trim()) throw new Error('Gemini returned empty content')
  return html
}

// ── Ghost publisher ───────────────────────────────────────────────────────────

async function publishToGhost(
  html:    string,
  p:       BlogFlywheelPayload,
): Promise<{ id: string; url: string }> {
  const apiUrl    = process.env.GHOST_API_URL?.replace(/\/$/, '')
  const apiKey    = process.env.GHOST_ADMIN_API_KEY
  if (!apiUrl || !apiKey) throw new Error('GHOST_API_URL and GHOST_ADMIN_API_KEY are required')

  const productName = p.video.product_name ?? p.video.title ?? 'Viral Product'
  const niche       = p.video.niche ?? 'E-Commerce'
  const jwt         = ghostJwt(apiKey)

  const title = `TikTok Viral Breakdown: How This ${niche} Video Hit ${p.metrics.views} Views`
  const tags  = [
    { name: 'TikTok Viral' },
    { name: niche },
    { name: 'Viral Analysis' },
    { name: 'TTLike' },
  ]

  const res = await fetch(`${apiUrl}/ghost/api/admin/posts/`, {
    method:  'POST',
    headers: {
      'Authorization': `Ghost ${jwt}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      posts: [{
        title,
        html,
        status:    'published',
        tags,
        meta_title:       `${productName} TikTok Viral Formula Breakdown — TTLike`,
        meta_description: `Deep-dive analysis of what made this ${niche} TikTok video go viral: hooks, formulas, visual timeline, and actionable scripts.`,
        custom_excerpt:   `${p.metrics.views} views. Here's exactly why this ${niche} TikTok worked — and how to replicate it.`,
      }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ghost publish error ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json() as { posts?: Array<{ id: string; url: string }> }
  const post  = json.posts?.[0]
  if (!post?.id || !post?.url) throw new Error('Ghost response missing post id/url')

  return { id: post.id, url: post.url }
}

// ── Main Trigger.dev task ─────────────────────────────────────────────────────

export const seoBlogFlywheelTask = task({
  id:          'seo-blog-flywheel',
  maxDuration: 600, // 10 minutes

  run: async (payload: BlogFlywheelPayload) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // ── Step 1: Generate blog HTML via Gemini ──────────────────────────────────
    logger.info('Generating blog HTML via Gemini', { breakdown_id: payload.breakdown_id })
    const html = await generateBlogHtml(payload)
    logger.info('Blog HTML generated', { chars: html.length })

    // ── Step 2: Publish to Ghost CMS ───────────────────────────────────────────
    logger.info('Publishing to Ghost CMS')
    const ghost = await publishToGhost(html, payload)
    logger.info('Ghost post published', { id: ghost.id, url: ghost.url })

    // ── Step 3: Update Supabase — mark PUBLISHED ───────────────────────────────
    const { error } = await supabase
      .from('video_breakdowns')
      .update({
        blog_status:      'PUBLISHED',
        ghost_post_id:    ghost.id,
        blog_published_at: new Date().toISOString(),
      })
      .eq('id', payload.breakdown_id)

    if (error) {
      logger.error('Supabase update failed', { error: error.message })
      throw new Error(`Supabase update failed: ${error.message}`)
    }

    logger.info('Supabase updated — breakdown marked PUBLISHED', {
      breakdown_id: payload.breakdown_id,
      ghost_url:    ghost.url,
    })

    return { success: true, ghost_post_id: ghost.id, url: ghost.url }
  },
})
