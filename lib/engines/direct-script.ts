/**
 * lib/engines/direct-script.ts
 *
 * Direct Script Engine — single LLM call when transcript is available.
 *
 * Used when signal_quality === 'full' (Whisper transcript in visual_timeline).
 * Replaces the 5-call reasoning chain with one comprehensive generation call:
 *   spike → structure → router → language → script  ==>  ONE CALL
 *
 * The transcript gives the AI everything it needs:
 *   - Real emotional moments (replaces spike detection)
 *   - Narrative structure (replaces structure-inference)
 *   - Speaking style and energy (replaces language-engine)
 *   - Actual timing (replaces hardcoded 45s ÷ beats formula)
 *
 * Output is compatible with ViralObject so no downstream changes are needed.
 */

import 'server-only'

import { z }              from 'zod'
import { runAIWaterfall } from '@/lib/ai/providers'
import {
  FinalScriptSchema,
  EmotionCurveSchema,
  LanguageProfileSchema,
  type IngestionSignal,
  type ProductSchemaInput,
  type FinalScript,
  type EmotionCurve,
  type LanguageProfile,
} from '@/lib/engines/types'

// ── System prompt ─────────────────────────────────────────────────────────────

const DIRECT_SCRIPT_SYSTEM = `You are an expert TikTok scriptwriter with deep knowledge of viral content mechanics.

You receive:
1. A complete timestamped transcript of a viral TikTok video (real spoken words)
2. Product information from the advertiser
3. Engagement metrics showing this video's viral performance

Your task:
- Analyse the transcript to extract emotional structure, language style, and timing
- Write a NEW 4-track TikTok script that mirrors the viral formula of the original
- Adapt ALL content to promote the advertiser's specific product
- Keep the same sentence rhythm, energy, and emotional beats as the original

OUTPUT — strict JSON, no other text:
{
  "structure_id": string,            // e.g. "HOOK-CHAOS-DEMO-CTA" (uppercase beats joined by hyphens)
  "overall_arc": string,             // EXACTLY one of: tension_release | curiosity_reveal | pain_solution | story_arc
  "language_profile": {
    "sentence_energy":  number,      // 0-1  (1 = punchy ≤8-word sentences)
    "compression":      number,      // 0-1  (1 = zero filler words)
    "emotion_variance": number,      // 0-1  (1 = wide emotional range)
    "tone":             string,      // EXACTLY one of: friend_talk | authority | storyteller | challenger
    "vocabulary_level": string,      // EXACTLY one of: casual | semi_formal | technical
    "cta_style":        string       // EXACTLY one of: direct | soft | urgency | curiosity
  },
  "beats": [                         // 3–6 emotional beats mapping the arc
    { "beat": string, "emotions": [string, string], "duration_hint": string }
  ],
  "lines": [                         // one line per beat minimum, 3–8 lines total
    {
      "sequence":   number,          // 0-indexed integer starting at 0
      "time_range": string,          // "MM:SS-MM:SS" using actual transcript timecodes
      "beat":       string,          // must match a beat in the beats array above
      "say":        string,          // exact spoken words — ready to read from teleprompter
      "do":         string,          // camera angle, body language, prop, edit direction
      "emotion":    string           // target viewer emotion at this moment
    }
  ],
  "total_duration": string,          // "MM:SS" of the final line's end time
  "hook_line":      string           // exact copy of lines[0].say
}

RULES:
- beat values must be from: HOOK CHAOS DEMO PAYOFF PROOF PROBLEM AGITATE SOLVE STORY RESULT REVEAL CTA SHOCK REFRAME COMPARISON WINNER TREND PIVOT
- Use the transcript's actual timestamps for time_range — do not invent timing
- The "say" text must be PRODUCT-SPECIFIC — mention the product by name at least once
- Match the energy of the original: if the speaker is fast and punchy, your script must be too

SAY QUALITY RULES (non-negotiable):
- Every "say" must be a complete spoken sentence with subject + verb. Minimum 6 words.
- "Comfortable. Fast." is WRONG. "This fixes your back pain in one week." is RIGHT.
- Always include a specific benefit, problem, or product name — never abstract filler.
- Read every say line aloud mentally — it must sound natural as speech.`

// ── User prompt builder ───────────────────────────────────────────────────────

function buildDirectPrompt(
  signal:        IngestionSignal,
  productSchema: ProductSchemaInput,
): string {
  const transcriptLines = (signal.visual_timeline ?? [])
    .map(s => `  [${s.timecode}] ${s.audio}`)
    .join('\n')

  const productLines = [
    `Product name: ${productSchema.product_name ?? signal.product_name ?? signal.title}`,
    `Category:     ${productSchema.category}`,
    productSchema.price_point != null ? `Price:        $${productSchema.price_point}` : null,
    `Pain points:  ${productSchema.pain_points.join(', ')}`,
    productSchema.target_audience ? `Audience: ${productSchema.target_audience}` : null,
  ].filter(Boolean).join('\n')

  const statsLine = `${signal.metrics.views} views · ${signal.metrics.likes} likes · ${signal.metrics.shares} shares · viral score ${signal.viral_score}/100`

  return `=== REFERENCE VIDEO TRANSCRIPT (timestamped) ===
${transcriptLines || '  (no transcript)'}

=== VIDEO METADATA ===
Title:   ${signal.title}
Niche:   ${signal.niche ?? 'General'}
Stats:   ${statsLine}

=== YOUR PRODUCT ===
${productLines}

Analyse the transcript and write a new 4-track script for the product above.`
}

// ── Single-call result schema ─────────────────────────────────────────────────

const VALID_BEATS_ARRAY = [
  'HOOK','CHAOS','DEMO','PAYOFF','PROOF','PROBLEM','AGITATE','SOLVE',
  'STORY','RESULT','REVEAL','CTA','SHOCK','REFRAME','COMPARISON','WINNER',
  'TREND','PIVOT',
] as const

const DirectResultSchema = z.object({
  structure_id:     z.string(),
  overall_arc:      z.enum(['tension_release', 'curiosity_reveal', 'pain_solution', 'story_arc']),
  language_profile: LanguageProfileSchema,
  beats: z.array(z.object({
    beat:          z.enum(VALID_BEATS_ARRAY),
    emotions:      z.array(z.string()),
    duration_hint: z.string(),
  })).min(2),
  lines: z.array(z.object({
    sequence:   z.number().int().nonnegative(),
    time_range: z.string(),
    beat:       z.enum(VALID_BEATS_ARRAY),
    say:        z.string().min(1),
    do:         z.string().min(1),
    emotion:    z.string().min(1),
  })).min(3),
  total_duration: z.string(),
  hook_line:      z.string(),
})

type DirectResult = z.infer<typeof DirectResultSchema>

// ── Fallback builder (if LLM output fails Zod) ───────────────────────────────

function buildFallback(raw: unknown): DirectResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const lines = Array.isArray(r['lines'])
    ? (r['lines'] as unknown[]).filter((l): l is DirectResult['lines'][number] => {
        if (!l || typeof l !== 'object') return false
        const obj = l as Record<string, unknown>
        return (
          typeof obj['say'] === 'string' && obj['say'].length > 0 &&
          typeof obj['do'] === 'string'  && obj['do'].length > 0  &&
          typeof obj['time_range'] === 'string'
        )
      }).map((l, i) => ({
        sequence:   i,
        time_range: l.time_range ?? `00:0${i}-00:0${i + 5}`,
        beat:       (VALID_BEATS_ARRAY.includes(l.beat as typeof VALID_BEATS_ARRAY[number])
                     ? l.beat
                     : (i === 0 ? 'HOOK' : i === (Array.isArray(r['lines']) ? (r['lines'] as unknown[]).length - 1 : 1) ? 'CTA' : 'DEMO')) as typeof VALID_BEATS_ARRAY[number],
        say:        l.say,
        do:         l.do,
        emotion:    l.emotion ?? 'curiosity',
      }))
    : null

  if (!lines || lines.length < 3) return null

  const hookLine = typeof r['hook_line'] === 'string' ? r['hook_line'] : (lines[0]?.say ?? '')

  return {
    structure_id:  typeof r['structure_id'] === 'string' ? r['structure_id'] : 'HOOK-DEMO-CTA',
    overall_arc:   (['tension_release','curiosity_reveal','pain_solution','story_arc'] as const)
                     .includes(r['overall_arc'] as 'tension_release')
                   ? (r['overall_arc'] as DirectResult['overall_arc'])
                   : 'tension_release',
    language_profile: {
      sentence_energy:    typeof r['language_profile'] === 'object' ? Number((r['language_profile'] as Record<string, unknown>)['sentence_energy'] ?? 0.7) : 0.7,
      compression:        typeof r['language_profile'] === 'object' ? Number((r['language_profile'] as Record<string, unknown>)['compression'] ?? 0.7) : 0.7,
      emotion_variance:   typeof r['language_profile'] === 'object' ? Number((r['language_profile'] as Record<string, unknown>)['emotion_variance'] ?? 0.6) : 0.6,
      tone:               'friend_talk',
      vocabulary_level:   'casual',
      cta_style:          'urgency',
    },
    beats:          Array.isArray(r['beats']) ? r['beats'].filter(b => b && typeof b === 'object') as DirectResult['beats'] : [{ beat: 'HOOK', emotions: ['curiosity'], duration_hint: '0-5s' }],
    lines,
    total_duration: typeof r['total_duration'] === 'string' ? r['total_duration'] : '00:45',
    hook_line:      hookLine,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface DirectScriptOutput {
  finalScript:    FinalScript
  emotionCurve:   EmotionCurve
  languageProfile: LanguageProfile
  structureId:    string
  provider:       string
}

/**
 * Generate a complete TikTok script in a SINGLE LLM call using the real transcript.
 * Replaces the 5-stage reasoning chain when signal_quality === 'full'.
 *
 * @throws If all AI providers fail AND fallback parsing fails
 */
export async function runDirectScript(
  signal:        IngestionSignal,
  productSchema: ProductSchemaInput,
): Promise<DirectScriptOutput> {
  const userPrompt = buildDirectPrompt(signal, productSchema)

  const { text, provider } = await runAIWaterfall(
    DIRECT_SCRIPT_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 30_000, geminiTimeoutMs: 45_000, githubTimeoutMs: 30_000 },
  )

  let raw: unknown
  try { raw = JSON.parse(text) } catch { raw = null }

  // Try strict Zod parse first; fall back to lenient parser
  let result: DirectResult
  const strict = DirectResultSchema.safeParse(raw)
  if (strict.success) {
    result = strict.data
  } else {
    const lenient = buildFallback(raw)
    if (!lenient) throw new Error(`Direct script parse failed. Provider: ${provider}. Raw:\n${text.slice(0, 400)}`)
    result = lenient
  }

  // ── Build FinalScript ──────────────────────────────────────────────────────
  const finalScript = FinalScriptSchema.parse({
    video_id:         signal.video_id,
    structure_id:     result.structure_id,
    language_profile: result.language_profile,
    lines:            result.lines,
    total_duration:   result.total_duration,
    hook_line:        result.hook_line,
  })

  // ── Build EmotionCurve ─────────────────────────────────────────────────────
  const emotionCurve = EmotionCurveSchema.parse({
    structure_id: result.structure_id,
    beats:        result.beats,
    overall_arc:  result.overall_arc,
  })

  return {
    finalScript,
    emotionCurve,
    languageProfile: result.language_profile,
    structureId:     result.structure_id,
    provider,
  }
}
