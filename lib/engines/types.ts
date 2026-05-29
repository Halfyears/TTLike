/**
 * lib/engines/types.ts
 *
 * Zod schemas + TypeScript types for every stage of the
 * Viral Pipeline: Spike → Structure → Router → Language → Emotion → Script
 *
 * These are the single source of truth for all engine I/O contracts.
 * All runAIWaterfall responses MUST be validated against these schemas
 * before passing to the next engine.
 */

import { z } from 'zod'

// ── 0. Ingestion Signal ───────────────────────────────────────────────────────
// Input to the pipeline. Loaded from tiktok_videos + video_breakdowns.

export const IngestionSignalSchema = z.object({
  video_id:       z.string(),
  title:          z.string(),
  product_name:   z.string().nullable(),
  niche:          z.string().nullable(),
  views:          z.number().int().nonnegative(),
  likes:          z.number().int().nonnegative(),
  shares:         z.number().int().nonnegative(),
  viral_score:    z.number().min(0).max(100),
  viral_formulas: z.array(z.object({
    title:          z.string(),
    timestamp:      z.string().optional(),
    example_script: z.string(),
    mechanism:      z.string(),
    your_version:   z.string(),
  })),
  metrics: z.object({
    views:  z.string(),
    likes:  z.string(),
    shares: z.string(),
  }),
})

export type IngestionSignal = z.infer<typeof IngestionSignalSchema>

// ── 1. Product Schema ─────────────────────────────────────────────────────────
// Caller-supplied product context for router scoring.

// Schema (lowercase for the Zod object) + type (uppercase, conventional)
export const productSchemaInputSchema = z.object({
  category:          z.string(),           // e.g. "skincare", "fitness", "tech"
  price_point:       z.number().positive(), // USD
  pain_points:       z.array(z.string()).min(1).max(5),
  persuasion_style:  z.enum(['ROI_PROOF', 'PAIN_INTERCEPT', 'CURIOSITY_LOOP', 'STATUS_ANXIETY']).optional(),
  target_audience:   z.string().optional(),
})

export type ProductSchemaInput = z.infer<typeof productSchemaInputSchema>

// ── 2. Spike Map ──────────────────────────────────────────────────────────────

export const SpikeItemSchema = z.object({
  t:        z.number().nonnegative(),                              // timestamp in seconds
  type:     z.enum(['hook', 'chaos', 'demo', 'payoff', 'emotion']),
  strength: z.number().min(0).max(1),                             // 0–1
  label:    z.string(),                                           // human-readable description
})

export const SpikeResultSchema = z.object({
  video_id: z.string(),
  spikes:   z.array(SpikeItemSchema).min(1),
  summary:  z.string(),  // one-line interpretation of the spike pattern
})

export type SpikeItem   = z.infer<typeof SpikeItemSchema>
export type SpikeResult = z.infer<typeof SpikeResultSchema>

// ── 3. Structure Match ────────────────────────────────────────────────────────

export const STRUCTURE_PATTERNS = [
  'HOOK-CHAOS-DEMO-PAYOFF',
  'HOOK-PROOF-CTA',
  'PROBLEM-AGITATE-SOLVE',
  'STORY-RESULT-CTA',
  'CURIOSITY-REVEAL-CTA',
  'COMPARISON-WINNER-CTA',
  'TREND-HIJACK-CTA',
  'SHOCK-REFRAME-CTA',
] as const

export type StructurePatternId = typeof STRUCTURE_PATTERNS[number]

// Valid beat names = all keys of BEAT_EMOTIONS (defined below)
const VALID_BEATS = [
  'HOOK','CHAOS','DEMO','PAYOFF','PROOF','PROBLEM','AGITATE','SOLVE',
  'STORY','RESULT','REVEAL','CTA','SHOCK','REFRAME','COMPARISON','WINNER',
  'TREND','PIVOT',
] as const

export type BeatName = typeof VALID_BEATS[number]

export const StructureMatchSchema = z.object({
  structure_id:     z.string(),
  pattern_sequence: z.array(z.enum(VALID_BEATS)).min(2), // enforces valid beat names
  similarity_score: z.number().min(0).max(1),
  description:      z.string(),
  reasoning:        z.string(),
})

export type StructureMatch = z.infer<typeof StructureMatchSchema>

// ── 4. Router Distribution ────────────────────────────────────────────────────

export const RouterCandidateSchema = z.object({
  structure_id: z.string(),
  probability:  z.number().min(0).max(1),
  fit_reason:   z.string(),  // why this structure suits the product
})

export const RouterDistributionSchema = z.object({
  top_structure: z.string(),
  candidates:    z.array(RouterCandidateSchema).min(1).max(4),
  product_fit_summary: z.string(),
})

export type RouterCandidate    = z.infer<typeof RouterCandidateSchema>
export type RouterDistribution = z.infer<typeof RouterDistributionSchema>

// ── 5. Language Profile ───────────────────────────────────────────────────────

export const LanguageProfileSchema = z.object({
  sentence_energy:    z.number().min(0).max(1),  // short punchy sentences → 1.0
  compression:        z.number().min(0).max(1),  // information density → 1.0
  emotion_variance:   z.number().min(0).max(1),  // emotional range → 1.0
  tone:               z.enum(['friend_talk', 'authority', 'storyteller', 'challenger']),
  vocabulary_level:   z.enum(['casual', 'semi_formal', 'technical']),
  cta_style:          z.enum(['direct', 'soft', 'urgency', 'curiosity']),
})

export type LanguageProfile = z.infer<typeof LanguageProfileSchema>

// ── 6. Emotion Curve ──────────────────────────────────────────────────────────

export const BEAT_EMOTIONS = {
  HOOK:       ['curiosity', 'surprise'],
  CHAOS:      ['anxiety', 'curiosity'],
  DEMO:       ['relief', 'focus'],
  PAYOFF:     ['satisfaction', 'fomo'],
  PROOF:      ['trust', 'relief'],
  PROBLEM:    ['anxiety', 'recognition'],
  AGITATE:    ['anxiety', 'urgency'],
  SOLVE:      ['relief', 'confidence'],
  STORY:      ['empathy', 'curiosity'],
  RESULT:     ['inspiration', 'fomo'],
  REVEAL:     ['surprise', 'satisfaction'],
  CTA:        ['urgency', 'confidence'],
  SHOCK:      ['surprise', 'disbelief'],
  REFRAME:    ['curiosity', 'hope'],
  COMPARISON: ['evaluation', 'curiosity'],
  WINNER:     ['satisfaction', 'trust'],
  TREND:      ['fomo', 'curiosity'],
  PIVOT:      ['curiosity', 'focus'],
} as const

export const EmotionBeatSchema = z.object({
  beat:          z.enum(VALID_BEATS),    // must be a known beat name
  emotions:      z.array(z.string()),    // e.g. ["curiosity", "surprise"]
  duration_hint: z.string(),            // e.g. "0–3s"
})

export const EmotionCurveSchema = z.object({
  structure_id:  z.string(),
  beats:         z.array(EmotionBeatSchema),
  overall_arc:   z.enum(['tension_release', 'curiosity_reveal', 'pain_solution', 'story_arc']),
})

export type EmotionBeat  = z.infer<typeof EmotionBeatSchema>
export type EmotionCurve = z.infer<typeof EmotionCurveSchema>

// ── 7. Final Script (4-track format) ─────────────────────────────────────────

export const ScriptLineSchema = z.object({
  sequence:    z.number().int().nonnegative(),   // 0-indexed, must start at 0
  time_range:  z.string(),                       // e.g. "00:00–00:03"
  say:         z.string().min(1),                // spoken words (non-empty)
  do:          z.string().min(1),                // physical/visual direction
  emotion:     z.string().min(1),                // target viewer emotion
  beat:        z.enum(VALID_BEATS),              // must be a known beat name
})

export const FinalScriptSchema = z.object({
  video_id:         z.string(),
  structure_id:     z.string(),
  language_profile: LanguageProfileSchema,
  lines:            z.array(ScriptLineSchema).min(3),
  total_duration:   z.string(),  // e.g. "00:45"
  hook_line:        z.string(),  // the first SAY line (for quick preview)
})

export type ScriptLine  = z.infer<typeof ScriptLineSchema>
export type FinalScript = z.infer<typeof FinalScriptSchema>

// ── 8. ViralObject — full pipeline state ─────────────────────────────────────
// Passed through the pipeline; each engine fills its section.

export const ViralObjectSchema = z.object({
  video_id:         z.string(),
  ingestion:        IngestionSignalSchema,
  product_schema:   productSchemaInputSchema,
  spike_result:     SpikeResultSchema.optional(),
  structure_match:  StructureMatchSchema.optional(),
  router:           RouterDistributionSchema.optional(),
  language_profile: LanguageProfileSchema.optional(),
  emotion_curve:    EmotionCurveSchema.optional(),
  final_script:     FinalScriptSchema.optional(),
  // Which AI provider handled each stage
  ai_providers: z.record(
    z.enum(['spike', 'structure', 'router', 'language', 'emotion', 'script']),
    z.enum(['groq', 'gemini', 'github'])
  ).optional(),
  created_at:       z.string().datetime().optional(),
  pipeline_ms:      z.number().optional(),            // total pipeline duration
})

export type ViralObject = z.infer<typeof ViralObjectSchema>
