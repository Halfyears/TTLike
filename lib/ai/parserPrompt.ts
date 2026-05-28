import 'server-only'

import type { ViralFormula, TimelineScene } from '@/lib/types/intelligence'
import { compileVideoPayload }              from '@/lib/ai/payloadCompiler'
import { createServiceClient }             from '@/lib/supabase/server'
import { runAIWaterfall }                  from '@/lib/ai/providers'

// ── Prompt hot-update: reads admin_config at call time ────────────────────────
// If admin sets a non-empty override in /admin/videos (Prompt Manager panel),
// that override is used instead of the hardcoded PARSER_SYSTEM_PROMPT.
// Falls back silently on any DB error.
async function getActiveSystemPrompt(): Promise<string> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('admin_config')
      .select('value')
      .eq('key', 'ai_prompt_override')
      .maybeSingle()
    if (data?.value?.trim()) return data.value.trim()
  } catch { /* non-fatal — use hardcoded default */ }
  return PARSER_SYSTEM_PROMPT
}

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

"timestamp": The approximate moment in the video where this formula is used. Format: "00:XX". Estimate from context if exact data unavailable.

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
      "timestamp": "00:03",
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

export type VideoBreakdownResult = GeminiResult & { ai_provider: string }

export async function callVideoBreakdown(meta: VideoMeta): Promise<VideoBreakdownResult> {
  const productLabel = meta.product_name ?? meta.title
  const nicheLabel   = meta.niche ?? 'E-Commerce'

  const productReminder = [
    `REMINDER: "your_version" in viral_formulas must reference "${productLabel}" (${nicheLabel}) by name.`,
    `DO NOT output generic [bracket] placeholders in "your_version".`,
  ].join('\n')

  const userContent  = compileVideoPayload(meta, productReminder)
  const systemPrompt = await getActiveSystemPrompt()

  const { text, provider } = await runAIWaterfall(
    systemPrompt,
    `---\nVIDEO DATA:\n${userContent}`,
    { groqTimeoutMs: 10_000, geminiTimeoutMs: 20_000, githubTimeoutMs: 15_000 },
  )

  try {
    const parsed = JSON.parse(text) as GeminiResult
    return { ...parsed, ai_provider: provider }
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
  }
}
