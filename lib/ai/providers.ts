import 'server-only'

/**
 * lib/ai/providers.ts — Shared AI provider waterfall
 *
 * Implements the same Groq → Gemini → GitHub three-provider failover
 * used in /api/hooks, but as a generic utility for all AI-calling modules.
 *
 * All three providers are configured to return JSON-only output, which is
 * compatible with every prompt in the codebase.
 *
 * Usage:
 *   const rawJson = await runAIWaterfall(systemPrompt, userPrompt)
 *   const parsed  = JSON.parse(rawJson) as MyType
 */

export interface WaterfallOptions {
  /** Groq timeout in ms (default 10 000) */
  groqTimeoutMs?:   number
  /** Gemini timeout in ms (default 20 000) */
  geminiTimeoutMs?: number
  /** GitHub Models timeout in ms (default 12 000) */
  githubTimeoutMs?: number
}

// ── Provider: Groq (llama-3.3-70b-versatile) ─────────────────────────────────

async function tryGroq(system: string, user: string, ms: number): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(ms),
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      messages:        [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature:     0.7,
      max_tokens:      4096,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`Groq ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '') as string
  if (!text) throw new Error('Groq returned empty content')
  return text
}

// ── Provider: Gemini 2.5 Flash ────────────────────────────────────────────────

async function tryGemini(system: string, user: string, ms: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(ms),
    body: JSON.stringify({
      contents:         [{ parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`Gemini ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string
  if (!text) throw new Error('Gemini returned empty content')
  return text.trim()
}

// ── Provider: GitHub Models / Azure Inference (gpt-4o-mini) ──────────────────

async function tryGitHub(system: string, user: string, ms: number): Promise<string> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not configured')

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(ms),
    body: JSON.stringify({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature:     0.7,
      max_tokens:      4096,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`GitHub Models ${res.status}: ${err.error?.message ?? 'unknown'}`)
  }

  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '') as string
  if (!text) throw new Error('GitHub Models returned empty content')
  return text
}

// ── Waterfall runner ──────────────────────────────────────────────────────────

const PROVIDERS = [
  { name: 'groq',   fn: tryGroq   },
  { name: 'gemini', fn: tryGemini },
  { name: 'github', fn: tryGitHub },
] as const

/**
 * Run the AI waterfall: Groq → Gemini → GitHub.
 * Returns the raw JSON text from the first successful provider.
 * Throws an aggregated error only if all three fail.
 *
 * @param system  System prompt (role/persona)
 * @param user    User prompt (task/data)
 * @param options Per-provider timeout overrides
 */
export async function runAIWaterfall(
  system:  string,
  user:    string,
  options: WaterfallOptions = {},
): Promise<string> {
  const {
    groqTimeoutMs   = 10_000,
    geminiTimeoutMs = 20_000,
    githubTimeoutMs = 12_000,
  } = options

  const timeouts = { groq: groqTimeoutMs, gemini: geminiTimeoutMs, github: githubTimeoutMs }
  const errors: string[] = []

  for (const { name, fn } of PROVIDERS) {
    try {
      const result = await fn(system, user, timeouts[name])
      console.log(`[ai-waterfall] ✓ provider=${name}`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[ai-waterfall] ✗ provider=${name}: ${msg}`)
      errors.push(`${name}: ${msg}`)
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
}
