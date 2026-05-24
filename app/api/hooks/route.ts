/**
 * POST /api/hooks
 *
 * TTLike Hook Machine v1.0
 * Analyses a raw hook text and returns 4 anti-duplication variants via Gemini 2.5 Flash.
 *
 * Request:  { text: string }
 * Response: TTLikeHookResponse JSON
 */

import { NextResponse }                from 'next/server'
import type { TTLikeHookResponse }     from '@/lib/types/hooks'

export const maxDuration = 30   // seconds — Vercel Hobby safe

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(hookText: string): Promise<TTLikeHookResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const prompt = `You are a direct-response TikTok scroll-stop analyst for eCommerce media buyers.

Analyse the provided hook and return a structured JSON response.

INPUT HOOK:
"${hookText}"

OUTPUT RULES:
- Return raw JSON only — no markdown, no code fences, no commentary.
- scroll_stop_score: 0–100 integer (100 = stops everyone, 0 = zero attention)
- brutal_feedback: 1 cold operator sentence — what's weak or strong about this hook
- primary_pattern: the dominant hook mechanic detected
- dominant_emotions: up to 3 psychological drivers (e.g. "Fear of Missing Out", "Shame", "Curiosity")
- variants: exactly 4 objects, one per pattern below:
  1. pattern: "Shock Reversal"   — emotion: pick one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  2. pattern: "Negative Interruption" — emotion: pick one
  3. pattern: "Visual Peak"      — emotion: pick one
  4. pattern: "Curiosity Gap"    — emotion: pick one
- Each variant.text must be ≤ 15 words, ready-to-record, defeat platform de-duplication filters
- Each variant.visual_action must be a 1-sentence CapCut/phone-shoot directive
- Assign variant.id as 1, 2, 3, 4

JSON schema:
{
  "original_analysis": {
    "scroll_stop_score": <number 0-100>,
    "brutal_feedback": "<string>"
  },
  "hook_classification": {
    "primary_pattern": "<string>",
    "dominant_emotions": ["<string>", ...]
  },
  "variants": [
    {
      "id": 1,
      "pattern": "Shock Reversal",
      "emotion": "<Status Anxiety|Time Scarcity|Vanity|Social Proof>",
      "text": "<ready-to-record hook ≤15 words>",
      "visual_action": "<CapCut/phone framing directive>"
    },
    ...
  ]
}

Return only valid JSON.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(25_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature:      0.7,
        maxOutputTokens:  1024,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Gemini ${res.status}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) {
    const reason = data.promptFeedback?.blockReason ?? 'unknown'
    throw new Error(`Gemini returned no candidates (blockReason: ${reason})`)
  }

  const rawText: string = candidate.content?.parts?.[0]?.text?.trim() ?? ''
  if (!rawText) throw new Error('Gemini returned empty content')

  let parsed: TTLikeHookResponse
  try {
    parsed = JSON.parse(rawText) as TTLikeHookResponse
  } catch {
    console.error('[hooks] JSON parse failed, raw:', rawText.slice(0, 400))
    throw new Error('AI returned unparseable response — try again')
  }

  // ── Basic validation ────────────────────────────────────────────────────────
  if (
    typeof parsed.original_analysis?.scroll_stop_score !== 'number' ||
    !Array.isArray(parsed.variants) ||
    parsed.variants.length < 1
  ) {
    throw new Error('AI response missing required fields — try again')
  }

  return parsed
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length < 5) {
    return NextResponse.json({ error: 'text must be at least 5 characters' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: 'text must be under 500 characters' }, { status: 400 })
  }

  // ── Retry once on transient errors ─────────────────────────────────────────
  let result: TTLikeHookResponse
  try {
    result = await callGemini(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isTransient = /AbortError|no candidates|unparseable|fetch|504|503/i.test(msg)
    if (!isTransient) {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    console.warn('[hooks] transient error, retrying once:', msg)
    await new Promise(r => setTimeout(r, 1_500))
    try {
      result = await callGemini(text)
    } catch (retryErr) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      return NextResponse.json({ error: retryMsg }, { status: 500 })
    }
  }

  return NextResponse.json(result)
}
