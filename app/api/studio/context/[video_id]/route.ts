/**
 * GET /api/studio/context/[video_id]
 *
 * Returns pre-extracted context for auto-filling the product form.
 * When the video has no prior analysis (viral_formulas empty), calls Groq
 * to extract accurate category + pain_points from the video title.
 * Price is no longer returned — it is optional and left for the user to fill.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
}

// ── Regex extractor (used when viral_formulas exist) ─────────────────────────

function extractPainPoint(mechanism: string): string {
  const m = mechanism.toLowerCase()
  const patterns = [
    /\b(?:fear of|afraid of|scared of)\s+([^,.;]{5,40})/,
    /\b(?:struggle with|struggling with)\s+([^,.;]{5,40})/,
    /\b(?:problem (?:of|with))\s+([^,.;]{5,40})/,
    /\b(?:pain of|pain point)\s+([^,.;]{5,40})/,
    /\b(?:frustrat(?:ed|ion) (?:with|by|about))\s+([^,.;]{5,40})/,
    /\b(?:worry about|worried about)\s+([^,.;]{5,40})/,
    /\b(?:lack of|lacking)\s+([^,.;]{5,40})/,
  ]
  for (const pattern of patterns) {
    const match = m.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim().slice(0, 45)
  }
  const cleaned = mechanism
    .replace(/^(creates?|builds?|establishes?|triggers?|taps? into|leverages?|exploits?|uses?)\s+/i, '')
    .replace(/^(urgency|curiosity|trust|fomo|anxiety)\s+by\s+/i, '')
    .split(/[,.;]/)[0]?.trim().slice(0, 50) ?? mechanism.slice(0, 50)
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

// ── LLM pre-fill (used when video has no prior analysis) ─────────────────────

interface LLMContext {
  category:    string
  pain_points: string[]
}

async function extractContextViaLLM(title: string, productName: string | null): Promise<LLMContext | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  const subject = (productName ?? title).trim()
  if (!subject) return null  // no usable signal — skip LLM, fall through to NICHE_DEFAULTS

  const system = `You are a TikTok product analyst. Given a video title or product name, extract:
1. A concise product category (2-4 words, e.g. "posture corrector", "LED face mask", "kitchen gadget")
2. 3 specific customer pain points this product solves (6-12 words each, concrete problems not abstract words)

Return ONLY valid JSON: { "category": "...", "pain_points": ["...", "...", "..."] }
Rules:
- category must be specific to THIS product, not a generic niche like "Health" or "Beauty"
- pain_points must be specific problems (e.g. "back pain from sitting at a desk all day"), not vague words (e.g. "discomfort")
- If you cannot determine specific pain points, return generic ones appropriate to the product`

  const user = `Video/product: "${subject.slice(0, 200)}"`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(8_000),
      body: JSON.stringify({
        model:           'llama-3.3-70b-versatile',
        messages:        [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        temperature:     0.4,
        max_tokens:      256,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.choices?.[0]?.message?.content ?? '') as string
    const parsed = JSON.parse(text) as { category?: string; pain_points?: unknown }
    if (
      typeof parsed.category === 'string' &&
      Array.isArray(parsed.pain_points) &&
      parsed.pain_points.length >= 1
    ) {
      return {
        category:    parsed.category.slice(0, 60),
        pain_points: (parsed.pain_points as unknown[])
          .filter((p): p is string => typeof p === 'string')
          .map(p => p.trim())
          .filter(p => p.length >= 5)
          .slice(0, 4),
      }
    }
    return null
  } catch {
    return null
  }
}

// ── NICHE_DEFAULTS — last-resort fallback only ────────────────────────────────

const NICHE_DEFAULTS: Record<string, string[]> = {
  Fitness:  ['back pain from sitting all day', 'low energy and no motivation to work out', 'slow progress despite working hard'],
  Beauty:   ['dull skin that looks tired and aged', 'uneven skin tone that makeup can\'t cover', 'spending too much on products that don\'t work'],
  Kitchen:  ['meal prep takes too long on busy days', 'wasting food before you can use it', 'cooking feels stressful and complicated'],
  Home:     ['home feels cluttered and disorganized', 'running out of storage space', 'spending hours cleaning with poor results'],
  Tech:     ['wasting hours on tasks that should be instant', 'devices dying too fast', 'poor focus and low daily productivity'],
  Pets:     ['dog anxiety during storms or alone time', 'pet behavioral issues that are hard to fix', 'worrying about pet health and nutrition'],
  Travel:   ['neck pain and poor sleep on long flights', 'heavy luggage that slows you down', 'exhaustion from jet lag ruining the trip'],
  Health:   ['waking up still tired after a full night\'s sleep', 'chronic pain that limits daily life', 'stress that never seems to go away'],
  General:  ['not getting results despite trying hard', 'wasting time and money on things that don\'t work', 'stress from juggling too many responsibilities'],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ video_id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { video_id } = await params
  if (!video_id) return NextResponse.json({ ok: false, error: 'video_id required' }, { status: 400 })

  const service = createServiceClient()

  const [{ data: video }, { data: breakdown }] = await Promise.all([
    service.from('tiktok_videos').select('id, title, product_name, niche').eq('id', video_id).maybeSingle(),
    service.from('video_breakdowns').select('payload').eq('video_id', video_id).maybeSingle(),
  ])
  if (!video) return NextResponse.json({ ok: false, error: 'Video not found' }, { status: 404 })

  const payload     = breakdown?.payload as VideoBreakdownPayload | null
  const formulas    = payload?.viral_formulas ?? []
  const hasTimeline = !!(payload?.visual_timeline?.length)

  let category:    string   = video.niche ?? 'General'
  let painPoints:  string[] = []

  if (formulas.length > 0) {
    // Video has been analyzed before — extract from LLM-generated viral_formulas
    painPoints = [...new Set(
      formulas.slice(0, 5).map(f => extractPainPoint(f.mechanism)).filter(p => p.length >= 5)
    )]
  }

  if (painPoints.length === 0) {
    // New video OR formulas exist but had no extractable pain points
    // Try a fast LLM call for accurate category + pain_points
    const llmCtx = await extractContextViaLLM(video.title ?? '', video.product_name)
    if (llmCtx && llmCtx.pain_points.length >= 1) {
      category   = llmCtx.category
      painPoints = llmCtx.pain_points
    } else {
      // Last resort: hardcoded niche defaults
      const niche = String(video.niche ?? 'General')
      painPoints = (NICHE_DEFAULTS[niche] ?? NICHE_DEFAULTS['General']!).slice(0, 3)
    }
  }

  return NextResponse.json({
    ok:           true,
    product_name: video.product_name,
    niche:        video.niche,
    category,
    pain_points:  painPoints,
    has_timeline: hasTimeline,
    // ref_price intentionally omitted — price is optional, let user fill or leave blank
  })
}
