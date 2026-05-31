/**
 * lib/engines/index.ts
 *
 * Viral Pipeline Orchestrator
 *
 * Chains all 6 engines in dependency order:
 *   Ingestion → Spike → Structure → Router → Language → Emotion+Script
 *
 * Manages ViralObject state, records which AI provider handled each stage,
 * and measures total pipeline duration.
 *
 * Usage:
 *   import { runViralPipeline } from '@/lib/engines'
 *   const result = await runViralPipeline({ videoId, productSchema })
 */

import 'server-only'

import { loadIngestionSignal }  from '@/lib/engines/ingestion'
import { detectSpikes }          from '@/lib/engines/spike-detector'
import { inferStructure }        from '@/lib/engines/structure-inference'
import { routeStructure }        from '@/lib/engines/router'
import { buildLanguageProfile }  from '@/lib/engines/language-engine'
import { renderScript }          from '@/lib/engines/emotion-engine'
import { runDirectScript }       from '@/lib/engines/direct-script'
import {
  ViralObjectSchema,
  type ViralObject,
  type ProductSchemaInput,
} from '@/lib/engines/types'

// ── Pipeline input ────────────────────────────────────────────────────────────

export interface PipelineInput {
  /** tiktok_videos.id UUID */
  videoId:       string
  /** Caller-supplied product context */
  productSchema: ProductSchemaInput
  /** How many cosine candidates to pass through (default 3) */
  topN?:         number
}

// ── Pipeline output ───────────────────────────────────────────────────────────

export interface PipelineResult {
  ok:           true
  viralObject:  ViralObject
}

export interface PipelineError {
  ok:    false
  stage: string
  error: string
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Run the complete viral pipeline for a video + product.
 *
 * Each stage enriches the ViralObject.
 * If a stage throws unexpectedly, the error is caught and returned
 * as a PipelineError with the failed stage name.
 */
export async function runViralPipeline(
  input: PipelineInput,
): Promise<PipelineResult | PipelineError> {
  const { videoId, productSchema, topN = 3 } = input
  const startTime = Date.now()

  const providers: Record<string, string> = {}

  try {
    // ── Stage 0: Ingestion ──────────────────────────────────────────────────
    let ingestion
    try {
      ingestion = await loadIngestionSignal(videoId)
    } catch (e) {
      return {
        ok:    false,
        stage: 'ingestion',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // Override product_name with the user-supplied value when provided.
    // The title-regex extraction is unreliable; what the user types is authoritative.
    if (productSchema.product_name?.trim()) {
      ingestion = { ...ingestion, product_name: productSchema.product_name.trim() }
    }

    // ── Fast path: single LLM call when transcript is available ────────────
    // signal_quality === 'full' means real spoken content is in visual_timeline.
    // One comprehensive call replaces the 5-stage reasoning chain.
    if (ingestion.signal_quality === 'full') {
      let directResult
      try {
        directResult = await runDirectScript(ingestion, productSchema)
      } catch (e) {
        // Direct call failed → fall through to the 5-stage pipeline below
        console.warn('[pipeline] Direct script failed, falling back to 5-stage:', e instanceof Error ? e.message : e)
        directResult = null
      }

      if (directResult) {
        const viralObject = ViralObjectSchema.parse({
          video_id:         videoId,
          ingestion,
          product_schema:   productSchema,
          final_script:     directResult.finalScript,
          emotion_curve:    directResult.emotionCurve,
          language_profile: directResult.languageProfile,
          ai_providers:     { script: directResult.provider },
          created_at:       new Date().toISOString(),
          pipeline_ms:      Date.now() - startTime,
          signal_quality:   'full',
        })
        return { ok: true, viralObject }
      }
    }

    // ── Stage 1: Spike Detection ────────────────────────────────────────────
    let spikeResult
    try {
      const { result, provider } = await detectSpikes(ingestion)
      spikeResult    = result
      providers.spike = provider
    } catch (e) {
      return {
        ok:    false,
        stage: 'spike',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // ── Stage 2: Structure Inference ────────────────────────────────────────
    let structureMatch, candidates, vectorConfidence
    try {
      const { result, provider, candidates: c, vector_confidence } = await inferStructure(spikeResult, topN)
      structureMatch      = result
      candidates          = c
      vectorConfidence    = vector_confidence
      providers.structure = provider
    } catch (e) {
      return {
        ok:    false,
        stage: 'structure',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // ── Stage 3: Router ─────────────────────────────────────────────────────
    let router
    try {
      const { result, provider } = await routeStructure(productSchema, structureMatch, candidates)
      router           = result
      providers.router = provider
    } catch (e) {
      return {
        ok:    false,
        stage: 'router',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // ── Stage 4: Language Profile ───────────────────────────────────────────
    let languageProfile
    try {
      const { result, provider } = await buildLanguageProfile(
        router.top_structure,
        productSchema,
        ingestion.niche,
        router,
      )
      languageProfile      = result
      providers.language   = provider
    } catch (e) {
      return {
        ok:    false,
        stage: 'language',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // ── Stage 5: Emotion Curve + Script Rendering ───────────────────────────
    let emotionCurve, finalScript
    try {
      const { emotionCurve: ec, script, provider } = await renderScript(
        structureMatch,
        languageProfile,
        productSchema,
        ingestion,
      )
      emotionCurve     = ec
      finalScript      = script
      providers.emotion = provider
      providers.script  = provider
    } catch (e) {
      return {
        ok:    false,
        stage: 'render',
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // ── Assemble ViralObject ────────────────────────────────────────────────
    const viralObject = ViralObjectSchema.parse({
      video_id:          videoId,
      ingestion,
      product_schema:    productSchema,
      spike_result:      spikeResult,
      structure_match:   structureMatch,
      router,
      language_profile:  languageProfile,
      emotion_curve:     emotionCurve,
      final_script:      finalScript,
      ai_providers:      providers,
      created_at:        new Date().toISOString(),
      pipeline_ms:       Date.now() - startTime,
      vector_confidence: vectorConfidence,
      signal_quality:    ingestion.signal_quality,
    })

    return { ok: true, viralObject }

  } catch (e) {
    // Catch-all for unexpected errors (Zod validation failures, etc.)
    return {
      ok:    false,
      stage: 'pipeline',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ── Re-export types from types.ts for convenience ────────────────────────────
export type { ViralObject, ProductSchemaInput } from '@/lib/engines/types'
export { IngestionSignalSchema } from '@/lib/engines/types'
// PipelineInput is already exported above as `export interface PipelineInput`
