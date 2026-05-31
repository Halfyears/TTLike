/**
 * POST /api/hooks
 *
 * TTLike Hook Machine v2.0 — Multi-provider waterfall
 *
 * Provider priority (mirrors backend_failover/main.py):
 *   1. Groq   — llama-3.3-70b-versatile   (fastest, free tier)
 *   2. Gemini — gemini-2.5-flash           (primary, highest quality)
 *   3. GitHub — gpt-4o-mini                (Azure inference, last resort)
 *
 * Circuit-breaking: each provider is skipped if its API key is absent.
 * Auto-switching: on any error, falls through to the next available provider.
 * Dev mode: returns mock response when no API keys are set.
 *
 * Request:  { text: string }
 * Response: TTLikeHookResponse JSON
 */

import { NextResponse }                         from 'next/server'
import type { TTLikeHookResponse, HookVariant } from '@/lib/types/hooks'

// Worst-case waterfall: Groq(8s) + Gemini(18s) + GitHub(12s) = 38s < 60s
export const maxDuration = 60   // seconds — Vercel Hobby max

// ── Shared prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a direct-response TikTok scroll-stop analyst for eCommerce media buyers.'

function buildHookPrompt(hookText: string): string {
  return `Analyse the provided hook and return a structured JSON response.

INPUT HOOK:
"${hookText}"

OUTPUT RULES:
- Return raw JSON only — no markdown, no code fences, no commentary.
- scroll_stop_score: 0–100 integer (100 = stops everyone)
- brutal_feedback: 1 cold operator sentence — what's weak or strong
- primary_pattern: the dominant hook mechanic detected
- dominant_emotions: up to 3 psychological drivers (e.g. "Fear of Missing Out", "Shame", "Curiosity")
- variants: exactly 4 objects, one per pattern below:
  1. pattern: "Shock Reversal"        emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  2. pattern: "Negative Interruption" emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  3. pattern: "Visual Peak"           emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  4. pattern: "Curiosity Gap"         emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
- Each variant.text must be ≤ 15 words, ready-to-record
- Each variant.visual_action must be a 1-sentence CapCut/phone-shoot directive
- Assign variant.id as 1, 2, 3, 4

JSON schema:
{
  "original_analysis": { "scroll_stop_score": <0-100>, "brutal_feedback": "<string>" },
  "hook_classification": { "primary_pattern": "<string>", "dominant_emotions": ["<string>"] },
  "variants": [
    { "id": 1, "pattern": "Shock Reversal",        "emotion": "<...>", "text": "<≤15 words>", "visual_action": "<directive>" },
    { "id": 2, "pattern": "Negative Interruption", "emotion": "<...>", "text": "<≤15 words>", "visual_action": "<directive>" },
    { "id": 3, "pattern": "Visual Peak",           "emotion": "<...>", "text": "<≤15 words>", "visual_action": "<directive>" },
    { "id": 4, "pattern": "Curiosity Gap",         "emotion": "<...>", "text": "<≤15 words>", "visual_action": "<directive>" }
  ]
}

Return only valid JSON.`
}

// ── Response parser ───────────────────────────────────────────────────────────

const VALID_PATTERNS = ['Shock Reversal', 'Negative Interruption', 'Visual Peak', 'Curiosity Gap']
const VALID_EMOTIONS = ['Status Anxiety', 'Time Scarcity', 'Vanity', 'Social Proof']

function parseAndValidate(raw: string): TTLikeHookResponse {
  // Strip markdown code fences some providers add despite instructions
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.split('\n').slice(1).join('\n')
    if (text.endsWith('```')) text = text.slice(0, -3).trimEnd()
  }

  let parsed: TTLikeHookResponse
  try {
    parsed = JSON.parse(text) as TTLikeHookResponse
  } catch {
    throw new Error('AI returned unparseable JSON')
  }

  if (typeof parsed.original_analysis?.scroll_stop_score !== 'number') {
    throw new Error('Missing scroll_stop_score in response')
  }
  if (!Array.isArray(parsed.variants) || parsed.variants.length < 4) {
    throw new Error(`Expected 4 variants, got ${parsed.variants?.length ?? 0}`)
  }

  // Clamp Literal fields — explicit per-field cast avoids spread type unsafety
  parsed.variants = parsed.variants.slice(0, 4).map((v, i): HookVariant => ({
    id:            i + 1,
    pattern:       (VALID_PATTERNS.includes(v.pattern) ? v.pattern : VALID_PATTERNS[i]) as HookVariant['pattern'],
    emotion:       (VALID_EMOTIONS.includes(v.emotion) ? v.emotion : VALID_EMOTIONS[0]) as HookVariant['emotion'],
    text:          String(v.text ?? '').slice(0, 200),
    visual_action: String(v.visual_action ?? '').slice(0, 400),
  }))

  return parsed
}

// ── Provider: Groq (llama-3.3-70b-versatile) ─────────────────────────────────

async function callGroq(hookText: string): Promise<TTLikeHookResponse> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(8_000),   // Groq LLaMA typically responds in <3s
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      messages:        [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildHookPrompt(hookText) }],
      response_format: { type: 'json_object' },
      temperature:     0.7,
      max_tokens:      1024,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`Groq ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  const raw  = (data.choices?.[0]?.message?.content ?? '') as string
  if (!raw) throw new Error('Groq returned empty content')
  return parseAndValidate(raw)
}

// ── Provider: Gemini 2.5 Flash ────────────────────────────────────────────────

async function callGemini(hookText: string): Promise<TTLikeHookResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(18_000),  // Gemini 2.5 Flash can take 10-15s
    body: JSON.stringify({
      contents:         [{ parts: [{ text: buildHookPrompt(hookText) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`Gemini ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  if (!data.candidates?.length) {
    const reason = data.promptFeedback?.blockReason ?? 'unknown'
    throw new Error(`Gemini no candidates (blockReason: ${reason})`)
  }
  const raw = (data.candidates[0]?.content?.parts?.[0]?.text ?? '') as string
  if (!raw) throw new Error('Gemini returned empty content')
  return parseAndValidate(raw)
}

// ── Provider: GitHub Models / Azure Inference (gpt-4o-mini) ──────────────────

async function callGitHub(hookText: string): Promise<TTLikeHookResponse> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not configured')

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(12_000),  // gpt-4o-mini typically 3-8s
    body: JSON.stringify({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildHookPrompt(hookText) }],
      response_format: { type: 'json_object' },
      temperature:     0.7,
      max_tokens:      1024,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`GitHub Models ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  const raw  = (data.choices?.[0]?.message?.content ?? '') as string
  if (!raw) throw new Error('GitHub Models returned empty content')
  return parseAndValidate(raw)
}

// ── Dev-mode mock (when no API keys present) ──────────────────────────────────

function buildMockResponse(hookText: string): TTLikeHookResponse {
  return {
    original_analysis: {
      scroll_stop_score: 78,
      brutal_feedback:   `[DEV MOCK] Hook has curiosity but lacks a price anchor — add a dollar figure to double the stop rate. Input: "${hookText.slice(0, 40)}…"`,
    },
    hook_classification: {
      primary_pattern:   'Curiosity Gap',
      dominant_emotions: ['Status Anxiety', 'Vanity'],
    },
    variants: [
      { id: 1, pattern: 'Shock Reversal',        emotion: 'Status Anxiety', text: 'Stop paying $300 when this $12 gadget does it better.',      visual_action: 'Overhead flat-lay unbox — hold price tag to lens at 0.5s.' },
      { id: 2, pattern: 'Negative Interruption', emotion: 'Time Scarcity',  text: 'Still wasting 2 hours on this? There is a smarter way.',    visual_action: 'POV countdown timer overlay — cut to solution reveal at 3s.' },
      { id: 3, pattern: 'Visual Peak',           emotion: 'Vanity',         text: 'My before vs after after 7 days shocked even me.',           visual_action: 'Split-screen jump-cut — zoom-punch on the after frame.' },
      { id: 4, pattern: 'Curiosity Gap',         emotion: 'Social Proof',   text: 'Everyone is buying this — here is why they are right.',      visual_action: 'Rapid montage of 4 micro-testimonials — text pop at each cut.' },
    ],
  }
}

// ── Waterfall dispatch ────────────────────────────────────────────────────────

const PROVIDERS: Array<{ name: string; fn: (t: string) => Promise<TTLikeHookResponse> }> = [
  { name: 'groq',   fn: callGroq   },
  { name: 'gemini', fn: callGemini },
  { name: 'github', fn: callGitHub },
]

const DEV_MODE = !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GITHUB_TOKEN

async function runWaterfall(hookText: string): Promise<{ result: TTLikeHookResponse; provider: string }> {
  if (DEV_MODE) {
    console.warn('[hooks] DEV MODE — no API keys set, returning mock response')
    return { result: buildMockResponse(hookText), provider: 'mock' }
  }

  const errors: string[] = []
  for (const { name, fn } of PROVIDERS) {
    try {
      const result = await fn(hookText)
      console.log(`[hooks] ✓ provider=${name}`)
      return { result, provider: name }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[hooks] ⚡ provider=${name} failed: ${msg} — trying next`)
      errors.push(`${name}: ${msg}`)
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { text?: string; source?: string }
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

  // Studio anti-dup variants require auth + Creator+ tier.
  // We detect this server-side by checking the session: if the user is authenticated
  // and the request carries source=studio, enforce the tier gate.
  // Unauthenticated requests (public Hook Machine) are allowed through.
  if (body.source === 'studio') {
    const { createClient, createServiceClient } = await import('@/lib/supabase/server')
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()

    // source=studio always requires a valid session — clients cannot bypass by forging the source
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const service = createServiceClient()
    await service.rpc('ensure_billing_tier', { uid: user.id })
    const { data: tierRow } = await service
      .from('user_billing_tiers')
      .select('tier_name, custom_hook_limit')
      .eq('user_id', user.id)
      .single()

    if ((tierRow?.custom_hook_limit ?? 0) === 0) {
      return NextResponse.json({ error: 'upgrade_required', tier: tierRow?.tier_name ?? 'free' }, { status: 403 })
    }
  } else if (body.source !== undefined && body.source !== null && body.source !== 'public') {
    // Reject unknown source values to prevent future bypass via unrecognised strings
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  try {
    const { result, provider } = await runWaterfall(text)
    return NextResponse.json(result, {
      headers: { 'X-TTLike-Provider': provider },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[hooks] all providers failed:', msg)
    return NextResponse.json({ error: 'AI service temporarily unavailable — try again' }, { status: 502 })
  }
}
