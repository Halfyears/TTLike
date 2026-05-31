/**
 * lib/engines/emotion-engine.ts
 *
 * Emotion Engine + Script Renderer (combined rendering stage)
 *
 * Phase 1 — Pure TS state machine:
 *   pattern_sequence → EmotionCurve  (no LLM, deterministic lookup)
 *
 * Phase 2 — Rendering waterfall:
 *   EmotionCurve + LanguageProfile + product context → FinalScript
 *   (4-track [TIME][SAY][DO][EMOTION] format)
 *
 * This is the only "rendering" waterfall call — higher creative freedom,
 * longer timeouts than reasoning calls.
 */

import 'server-only'

import { runAIWaterfall } from '@/lib/ai/providers'
import { SCRIPT_RENDERER_SYSTEM } from '@/lib/ai/prompts/rendering-system'
import {
  BEAT_EMOTIONS,
  EmotionCurveSchema,
  FinalScriptSchema,
  type StructureMatch,
  type LanguageProfile,
  type ProductSchemaInput,
  type IngestionSignal,
  type EmotionCurve,
  type FinalScript,
} from '@/lib/engines/types'

// ── Phase 1: Pure state machine ───────────────────────────────────────────────

/**
 * Map a confirmed structure's pattern_sequence to an emotion curve.
 * Deterministic — no LLM, instant.
 */
export function buildEmotionCurve(structure: StructureMatch): EmotionCurve {
  const totalBeats = structure.pattern_sequence.length
  const avgDurationS = 45 / totalBeats  // assume ~45s total video

  const beats = structure.pattern_sequence.map((beat, i) => {
    const emotions = BEAT_EMOTIONS[beat as keyof typeof BEAT_EMOTIONS]
      ?? ['curiosity', 'engagement']   // safe fallback for unknown beats

    const startS = Math.round(i * avgDurationS)
    const endS   = Math.round((i + 1) * avgDurationS)

    return {
      beat,
      emotions: [...emotions],
      duration_hint: `${startS}–${endS}s`,
    }
  })

  // Classify overall arc from structure type
  const id = structure.structure_id
  const overall_arc =
    id.includes('STORY')                    ? 'story_arc'        :
    id.includes('PROBLEM') || id.includes('CHAOS') ? 'tension_release' :
    id.includes('CURIOSITY') || id.includes('REVEAL') ? 'curiosity_reveal' :
    'pain_solution'

  return EmotionCurveSchema.parse({
    structure_id: structure.structure_id,
    beats,
    overall_arc,
  })
}

// ── Phase 2: Script rendering ─────────────────────────────────────────────────

function buildScriptPrompt(
  emotionCurve:    EmotionCurve,
  languageProfile: LanguageProfile,
  productSchema:   ProductSchemaInput,
  signal:          IngestionSignal,
): string {
  const beatLines = emotionCurve.beats
    .map(b => `  ${b.beat} (${b.duration_hint}): emotions → ${b.emotions.join(', ')}`)
    .join('\n')

  const langLines = [
    `sentence_energy:  ${languageProfile.sentence_energy}`,
    `compression:      ${languageProfile.compression}`,
    `emotion_variance: ${languageProfile.emotion_variance}`,
    `tone:             ${languageProfile.tone}`,
    `vocabulary:       ${languageProfile.vocabulary_level}`,
    `cta_style:        ${languageProfile.cta_style}`,
  ].join('\n')

  return `Video ID: ${signal.video_id}
Product: ${signal.product_name ?? signal.title}
Niche: ${signal.niche ?? 'general'}
Category: ${productSchema.category}
${productSchema.price_point ? `Price: $${productSchema.price_point}` : 'Price: not specified'}
Pain points: ${productSchema.pain_points.join(', ')}
Target: ${productSchema.target_audience ?? 'general TikTok audience'}

Structure: ${emotionCurve.structure_id}
Overall arc: ${emotionCurve.overall_arc}

Emotion curve (beat → emotions → timing):
${beatLines}

Language profile:
${langLines}

Reference viral formulas from this video:
${signal.viral_formulas.slice(0, 2).map(f =>
  `  "${f.title}": ${f.example_script.slice(0, 100)}`
).join('\n') || '  (none)'}

Write the complete 4-track script. Each beat in the emotion curve must have at least one line.`
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run the full rendering stage:
 *   1. Build EmotionCurve from structure (pure TS)
 *   2. Generate FinalScript via rendering waterfall
 *
 * @param structure      Confirmed structure from structure-inference
 * @param languageProfile From language-engine
 * @param productSchema  Caller-supplied product context
 * @param signal         Original ingestion signal (for product/niche context)
 */
export async function renderScript(
  structure:       StructureMatch,
  languageProfile: LanguageProfile,
  productSchema:   ProductSchemaInput,
  signal:          IngestionSignal,
): Promise<{
  emotionCurve: EmotionCurve
  script:       FinalScript
  provider:     string
}> {
  // Phase 1: emotion curve (instant, no LLM)
  const emotionCurve = buildEmotionCurve(structure)

  // Phase 2: script rendering (rendering waterfall — longer timeouts)
  const userPrompt = buildScriptPrompt(emotionCurve, languageProfile, productSchema, signal)

  const { text, provider } = await runAIWaterfall(
    SCRIPT_RENDERER_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 30_000, geminiTimeoutMs: 45_000, githubTimeoutMs: 30_000 },
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    console.error('[emotion-engine] Script JSON parse failed, provider:', provider, '| raw:', text.slice(0, 300))
    // Fallback: generate a minimal valid script from the emotion curve
    return {
      emotionCurve,
      script: buildFallbackScript(signal, structure, languageProfile, emotionCurve),
      provider: `${provider}:fallback`,
    }
  }

  // Inject required fields + always override language_profile with the validated object
  // (AI-returned language_profile frequently has invalid enum values — never trust it)
  if (typeof parsed === 'object' && parsed !== null) {
    const p = parsed as Record<string, unknown>
    p.video_id        = p.video_id     ?? signal.video_id
    p.structure_id    = p.structure_id ?? structure.structure_id
    p.language_profile = languageProfile  // always use the Zod-validated profile
  }

  const script = FinalScriptSchema.parse(parsed)
  return { emotionCurve, script, provider }
}

// ── Fallback script builder ───────────────────────────────────────────────────

function buildFallbackScript(
  signal:          IngestionSignal,
  structure:       StructureMatch,
  languageProfile: LanguageProfile,
  emotionCurve:    EmotionCurve,
): FinalScript {
  const product = signal.product_name ?? signal.title
  const beats   = emotionCurve.beats

  const lines = beats.map((beat, i) => ({
    sequence:   i,
    time_range: beat.duration_hint.replace('–', '–') || `00:${String(i * 8).padStart(2, '0')}–00:${String((i + 1) * 8).padStart(2, '0')}`,
    say:        i === 0
      ? `Wait — have you seen what ${product} does?`
      : i === beats.length - 1
        ? `Link in bio — grab yours before it sells out.`
        : `Here's what makes this different from everything else.`,
    do:         i === 0
      ? 'Point camera at product, shocked expression'
      : i === beats.length - 1
        ? 'Hold product to camera, direct eye contact'
        : 'Close-up product shot, slow pan',
    emotion:    beat.emotions[0] ?? 'curiosity',
    beat:       beat.beat,
  }))

  // Ensure last line is CTA beat
  const lastLine = lines[lines.length - 1]
  if (lastLine) lastLine.beat = 'CTA'

  return FinalScriptSchema.parse({
    video_id:         signal.video_id,
    structure_id:     structure.structure_id,
    language_profile: languageProfile,
    lines,
    total_duration:   `00:${String(beats.length * 8).padStart(2, '0')}`,
    hook_line:        lines[0]?.say ?? `Check out ${product}`,
  })
}
