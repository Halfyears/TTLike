/**
 * trigger/viralAnalysisPipeline.ts — Viral Pipeline Async Task (Trigger.dev v4)
 *
 * Runs the full 6-stage viral pipeline in Trigger.dev cloud (up to 10 minutes).
 * Called by POST /api/admin/viral-analysis-async — returns immediately with run_id.
 * Frontend polls GET /api/admin/viral-analysis-async/status?video_id=...
 *
 * State machine:
 *   PENDING → PROCESSING → COMPLETED | FAILED
 *   (tracked in video_breakdowns.viral_status)
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { runViralPipeline } from '@/lib/engines'
import type { ProductSchemaInput } from '@/lib/engines/types'

export interface ViralAnalysisPayload {
  video_id:       string
  product_schema: ProductSchemaInput
  top_n?:         number
  breakdown_id?:  string // pre-created row id (optional)
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth:     { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: -1 } },
    },
  )
}

export const viralAnalysisPipelineTask = task({
  id:          'viral-analysis-pipeline',
  maxDuration: 600, // 10 minutes — 5× LLM chain needs breathing room

  run: async (payload: ViralAnalysisPayload) => {
    const { video_id, product_schema, top_n = 3, breakdown_id } = payload
    const supabase = makeServiceClient()

    logger.info('Viral pipeline started', { video_id, breakdown_id })

    // ── Mark PROCESSING ────────────────────────────────────────────────────────
    if (breakdown_id) {
      await supabase
        .from('video_breakdowns')
        .update({ viral_status: 'PROCESSING', viral_error: null })
        .eq('id', breakdown_id)
    }

    // ── Run the full pipeline ──────────────────────────────────────────────────
    let result
    try {
      result = await runViralPipeline({ videoId: video_id, productSchema: product_schema, topN: top_n })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Pipeline threw', { error: msg })

      if (breakdown_id) {
        await supabase
          .from('video_breakdowns')
          .update({ viral_status: 'FAILED', viral_error: msg })
          .eq('id', breakdown_id)
      }
      throw err
    }

    if (!result.ok) {
      const msg = `[${result.stage}] ${result.error}`
      logger.error('Pipeline failed', { stage: result.stage, error: result.error })

      if (breakdown_id) {
        await supabase
          .from('video_breakdowns')
          .update({ viral_status: 'FAILED', viral_error: msg })
          .eq('id', breakdown_id)
      }
      throw new Error(msg)
    }

    const { viralObject } = result
    logger.info('Pipeline completed', { pipeline_ms: viralObject.pipeline_ms })

    // ── Merge payload and persist ──────────────────────────────────────────────
    const mergedPayload = (await (async () => {
      let existing: Record<string, unknown> = {}
      if (breakdown_id) {
        const { data } = await supabase
          .from('video_breakdowns')
          .select('payload')
          .eq('id', breakdown_id)
          .maybeSingle()
        if (data?.payload && typeof data.payload === 'object') {
          existing = data.payload as Record<string, unknown>
        }
      } else {
        const { data } = await supabase
          .from('video_breakdowns')
          .select('payload')
          .eq('video_id', video_id)
          .maybeSingle()
        if (data?.payload && typeof data.payload === 'object') {
          existing = data.payload as Record<string, unknown>
        }
      }
      return {
        ...existing,
        viral_pipeline: {
          generation_id:     crypto.randomUUID(),
          generated_at:      viralObject.created_at,
          generator_version: 'v2.5',
          input: {
            product_schema:  viralObject.product_schema,
            video_metadata: {
              title:       viralObject.ingestion.title,
              niche:       viralObject.ingestion.niche,
              viral_score: viralObject.ingestion.viral_score,
              views:       viralObject.ingestion.views,
              likes:       viralObject.ingestion.likes,
            },
          },
          reasoning: {
            spike_result:     viralObject.spike_result,
            structure_match:  viralObject.structure_match,
            router:           viralObject.router,
            language_profile: viralObject.language_profile,
            emotion_curve:    viralObject.emotion_curve,
          },
          final_script: viralObject.final_script,
          learning: {
            user_feedback:       null,
            engagement_metrics:  null,
            was_published:       false,
            published_video_url: null,
          },
          ai_providers: viralObject.ai_providers,
          pipeline_ms:  viralObject.pipeline_ms,
        },
      }
    })())

    if (breakdown_id) {
      const { error } = await supabase
        .from('video_breakdowns')
        .update({
          payload:      mergedPayload,
          viral_status: 'COMPLETED',
          viral_error:  null,
        })
        .eq('id', breakdown_id)

      if (error) logger.error('Supabase update error', { error: error.message })
    } else {
      // Upsert by video_id
      const { data: existing } = await supabase
        .from('video_breakdowns')
        .select('id')
        .eq('video_id', video_id)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from('video_breakdowns')
          .update({ payload: mergedPayload, viral_status: 'COMPLETED', viral_error: null })
          .eq('id', existing.id)
      } else {
        const urlHash = Buffer.from(video_id).toString('base64url').slice(0, 32)
        const { error: insertErr } = await supabase
          .from('video_breakdowns')
          .insert({
            video_id,
            url_hash:     urlHash,
            payload:      mergedPayload,
            blog_status:  'NOT_SENT',
            viral_status: 'COMPLETED',
          })
        if (insertErr?.code === '23505') {
          await supabase.from('video_breakdowns').insert({
            video_id,
            url_hash:     `${urlHash}-${Date.now().toString(36)}`,
            payload:      mergedPayload,
            blog_status:  'NOT_SENT',
            viral_status: 'COMPLETED',
          })
        }
      }
    }

    logger.info('Breakdown persisted', { video_id })

    return {
      success:      true,
      pipeline_ms:  viralObject.pipeline_ms,
      structure_id: viralObject.structure_match?.structure_id,
      hook_line:    viralObject.final_script?.hook_line,
      total_lines:  viralObject.final_script?.lines.length,
      providers:    viralObject.ai_providers,
    }
  },
})
