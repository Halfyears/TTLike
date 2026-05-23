import 'server-only'

import type { ViralFormula, TimelineScene } from '@/lib/types/intelligence'

// ── V2.5 Inspiration Engine System Prompt ────────────────────────────────────
// Rules:
//   1. JSON-only output (enforced via Gemini responseMimeType:'application/json')
//   2. viral_formulas: EXACTLY 3 entries
//   3. visual_timeline: EXACTLY 4 scene entries covering 00:00–00:35
//   4. All text: dense, practical, zero marketing fluff
//   5. "your_version" must use [brackets] for pluggable variables
export const PARSER_SYSTEM_PROMPT = `You are a direct-response ad architect. Convert TikTok video metadata into an actionable, copy-pasteable creative workbook for independent e-commerce sellers.

CRITICAL PROCESSING RULES:
1. Output RAW JSON ONLY. No markdown blocks, no conversation, no preambles.
2. "viral_formulas" must contain EXACTLY 3 entries — no more, no less.
3. "visual_timeline" must contain EXACTLY 4 scene entries covering 00:00-00:35.
4. Every sentence: dense, practical, zero marketing fluff.
5. "your_version" must be a fill-in-the-blank template using [brackets] for variables.
6. All text fields output in English only.

Output this exact JSON structure:
{
  "viral_formulas": [
    {
      "title": "Strategy name (3-5 words)",
      "action_step": "Exact physical action or verbal pattern to execute right now.",
      "mechanism": "One sentence: why this spikes watch-time or tricks the recommendation algorithm.",
      "your_version": "Say: '[Your product] does X without Y — here is proof.'"
    }
  ],
  "visual_timeline": [
    {
      "timecode": "00:00-00:03",
      "visual": "Phone-shooting directive: angle, environment, framing.",
      "audio": "Exact spoken line for this time window.",
      "why_this_works": "The micro-retention trigger keeping the user from swiping away."
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
}

type GeminiResult = {
  viral_formulas:  ViralFormula[]
  visual_timeline: TimelineScene[]
}

export async function callVideoBreakdown(meta: VideoMeta): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const userContent = [
    `Video title: ${meta.title}`,
    `Product: ${meta.product_name ?? meta.title}`,
    `Niche: ${meta.niche ?? 'E-Commerce'}`,
    `Author: @${meta.author}`,
    `Views: ${meta.views.toLocaleString()}`,
    `Likes: ${meta.likes.toLocaleString()}`,
    `Shares: ${meta.shares.toLocaleString()}`,
    `Like rate: ${meta.views > 0 ? ((meta.likes / meta.views) * 100).toFixed(2) : '0'}%`,
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
