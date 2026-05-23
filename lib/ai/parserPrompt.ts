import 'server-only'

import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

// ── Token-lean system prompt ──────────────────────────────────────────────────
// Rules:
//   1. JSON-only output (enforced via Gemini responseMimeType:'application/json')
//   2. All enum values are locked — AI must pick from provided lists
//   3. Each string field is 1 sentence max — no filler
//   4. Advice targets home-studio sellers using CapCut (剪映)
export const PARSER_SYSTEM_PROMPT = `
You are a cold, rational TikTok ad infrastructure parser for small e-commerce sellers and housewives.
Translate the video metadata into a structured JSON payload. No markdown. No explanation. Raw JSON only.

ENUM CONSTRAINTS — use ONLY these values:
- hook.type: "curiosity_gap" | "contrarian" | "problem_first" | "authority_flex"
- emotion.driver: "greed_lazy" | "anxiety_relief" | "vanity_status" | "cost_effective"
- pacing.style: "fast_cut" | "demo_show" | "loop_replay"

OUTPUT SCHEMA (fill every field, no nulls):
{
  "category": "plain product category, e.g. 数码配件 / 家居小工具",
  "analysis": {
    "hook": {
      "type": "<hook enum>",
      "raw_text": "Inferred first-3-second hook line from the title/description",
      "mechanism": "1-sentence plain explanation of why this hook inflates watch-time",
      "actionable_advice": "1-sentence instruction for a seller shooting at home"
    },
    "emotion": {
      "driver": "<emotion enum>",
      "pain_point": "Precise user pain point this video exploits",
      "actionable_advice": "1-sentence guide to emphasize this motivation in their own video"
    },
    "pacing": {
      "style": "<pacing enum>",
      "raw_behavior": "Brief description of the editing style inferred from context",
      "actionable_advice": "1-sentence CapCut (剪映) instruction to replicate this pacing"
    },
    "cta": {
      "raw_behavior": "How the video likely drives traffic/sales at the end",
      "actionable_advice": "1-sentence instruction on how to close the sale"
    }
  }
}
`.trim()

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

export async function callVideoBreakdown(meta: VideoMeta): Promise<VideoBreakdownPayload['analysis'] & { category: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const userContent = `
Video title: ${meta.title}
Product name: ${meta.product_name ?? '(same as title)'}
Niche: ${meta.niche ?? 'General'}
Author: @${meta.author}
Views: ${meta.views.toLocaleString()}
Likes: ${meta.likes.toLocaleString()}
Shares: ${meta.shares.toLocaleString()}
Like rate: ${meta.views > 0 ? ((meta.likes / meta.views) * 100).toFixed(2) : '0'}%
`.trim()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${PARSER_SYSTEM_PROMPT}\n\n---\nVIDEO DATA:\n${userContent}` }],
      }],
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

  return JSON.parse(text) as VideoBreakdownPayload['analysis'] & { category: string }
}
