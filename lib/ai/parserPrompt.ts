import 'server-only'

import type { ViralFormula, TimelineScene } from '@/lib/types/intelligence'

// ── V2.5 Inspiration Engine System Prompt ────────────────────────────────────
// Key rules:
//   1. example_script MUST start with "Say:" / "Do:" / "Edit:" prefix
//   2. your_version MUST use the ACTUAL product name/niche — never generic [brackets]
//   3. visual_timeline: EXACTLY 4 scenes covering 00:00–00:35
//   4. viral_formulas: EXACTLY 3 high-impact entries
//   5. All output in English, dense and practical
export const PARSER_SYSTEM_PROMPT = `You are a direct-response ad architect. Convert TikTok video metadata into an immediately executable creative workbook for independent e-commerce sellers.

CRITICAL OUTPUT RULES:
1. RAW JSON ONLY. No markdown, no commentary, no preambles.
2. "viral_formulas": EXACTLY 3 entries.
3. "visual_timeline": EXACTLY 4 scene entries covering 00:00-00:35.
4. Every sentence: dense, punchy, zero marketing fluff.

FIELD-LEVEL REQUIREMENTS:

"example_script": Must begin with one of these prefixes: "Say:", "Do:", or "Edit:".
  - Say: for verbal hooks and spoken script lines
  - Do: for physical shooting or framing instructions
  - Edit: for cut, transition, or pacing directives
  Good: "Say: 'Stop scrolling if you have [specific problem]'"
  Good: "Do: Overhead shot, messy kitchen counter, no ring light."
  Good: "Edit: 0.5-second black screen right before the product appears."
  BAD: "Use a curiosity gap opener" (too abstract, no prefix)

"your_version": Must be COMPLETELY filled in using the actual product and niche from the video data.
  DO NOT output generic [bracket] templates.
  DO output a ready-to-record script line or shooting instruction for THIS specific product.
  Good: "Say: 'Stop scrolling if your kid's lunchbox always comes back full.'"
  Good: "Do: Film on your kitchen table, Sunday afternoon, window light on the left."
  BAD: "Say: 'Stop scrolling if you have [problem with your product].'" (brackets not allowed)

OPTIONAL BUYER SIGNALS: If "BUYER SIGNALS" are listed in the video data, mirror the exact
language buyers use in your_version. Their words are more persuasive than your inference.

Output this exact JSON structure:
{
  "viral_formulas": [
    {
      "title": "Memorable name for this viral strategy (3-5 words)",
      "example_script": "Say: / Do: / Edit: + exact instruction from original video",
      "mechanism": "One sentence: the psychology or algorithm trick that makes this work.",
      "your_version": "The fully filled-in version using the actual product name and niche context."
    }
  ],
  "visual_timeline": [
    {
      "timecode": "00:00-00:03",
      "visual": "Exact phone-shooting directive: angle, environment, framing.",
      "audio": "The exact spoken line for this scene window.",
      "why_this_works": "The micro-retention trigger keeping the viewer from swiping away."
    }
  ]
}`.trim()

// ── Gemini call for video breakdown ──────────────────────────────────────────
interface VideoMeta {
  title:        string
  product_name: string | null
  niche:        string | null
  views:        number
  likes:        number
  shares:       number
  author:       string
  /** Pre-filtered buyer-signal comments (≤15). Improves your_version specificity. */
  comments?:    string[]
}

type GeminiResult = {
  viral_formulas:  ViralFormula[]
  visual_timeline: TimelineScene[]
}

export async function callVideoBreakdown(meta: VideoMeta): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const productLabel = meta.product_name ?? meta.title
  const nicheLabel   = meta.niche ?? 'E-Commerce'

  const userContent = [
    `Video title: ${meta.title}`,
    `Product name: ${productLabel}`,
    `Niche: ${nicheLabel}`,
    `Author: @${meta.author}`,
    `Views: ${meta.views.toLocaleString()}`,
    `Likes: ${meta.likes.toLocaleString()}`,
    `Shares: ${meta.shares.toLocaleString()}`,
    `Like rate: ${meta.views > 0 ? ((meta.likes / meta.views) * 100).toFixed(2) : '0'}%`,
    ``,
    `REMINDER: "your_version" in viral_formulas must reference "${productLabel}" (${nicheLabel}) by name.`,
    `DO NOT output generic [bracket] placeholders in "your_version".`,
    // ── Optional buyer signals (pre-filtered, ≤ 15 comments) ──────────────
    ...(meta.comments?.length
      ? [
          ``,
          `BUYER SIGNALS (${meta.comments.length} high-intent comments — use to sharpen your_version language):`,
          ...meta.comments.map(c => `• ${c}`),
        ]
      : []),
  ].join('\n')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PARSER_SYSTEM_PROMPT}\n\n---\nVIDEO DATA:\n${userContent}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Gemini HTTP ${res.status}`)
  }

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini returned empty content')

  try {
    return JSON.parse(text) as GeminiResult
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`)
  }
}
