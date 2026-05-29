/**
 * POST /api/admin/viral-analysis
 *
 * Runs the full viral pipeline for a video + product schema.
 * Stores the resulting ViralObject into video_breakdowns.payload
 * (merges with existing payload, keyed under "viral_pipeline").
 *
 * Request body:
 *   {
 *     video_id:      string           // tiktok_videos.id UUID
 *     product_schema: {
 *       category:         string
 *       price_point:      number
 *       pain_points:      string[]
 *       persuasion_style?: string
 *       target_audience?:  string
 *     }
 *     top_n?: number                  // cosine candidates (default 3)
 *   }
 *
 * Response (success):
 *   { ok: true, pipeline_ms, structure_id, hook_line, providers }
 *
 * Response (error):
 *   { ok: false, stage, error }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { runViralPipeline }     from '@/lib/engines'
import { productSchemaInputSchema } from '@/lib/engines/types'

async function isAdmin(): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    try {
      const u = await prisma.user.findUnique({ where: { email: user.email! } })
      if (u?.role === 'ADMIN') return true
    } catch {}
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse + validate request body ─────────────────────────────────────────
  let body: { video_id?: string; product_schema?: unknown; top_n?: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { video_id, product_schema, top_n } = body

  if (!video_id || typeof video_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'video_id is required' }, { status: 400 })
  }

  const parsedProduct = productSchemaInputSchema.safeParse(product_schema)
  if (!parsedProduct.success) {
    return NextResponse.json({
      ok:    false,
      error: 'Invalid product_schema',
      issues: parsedProduct.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, { status: 400 })
  }

  // ── Run pipeline ───────────────────────────────────────────────────────────
  const result = await runViralPipeline({
    videoId:       video_id,
    productSchema: parsedProduct.data,
    topN:          typeof top_n === 'number' ? top_n : 3,
  })

  if (!result.ok) {
    return NextResponse.json({
      ok:    false,
      stage: result.stage,
      error: result.error,
    }, { status: result.stage === 'ingestion' ? 404 : 502 })
  }

  const { viralObject } = result

  // ── Persist to video_breakdowns.payload ───────────────────────────────────
  // Merge under "viral_pipeline" key to preserve existing breakdown data
  const service = createServiceClient()

  const { data: existing } = await service
    .from('video_breakdowns')
    .select('id, payload')
    .eq('video_id', video_id)
    .maybeSingle()

  const mergedPayload = {
    ...(existing?.payload ?? {}),
    viral_pipeline: {
      structure_id:     viralObject.structure_match?.structure_id,
      top_structure:    viralObject.router?.top_structure,
      language_profile: viralObject.language_profile,
      emotion_curve:    viralObject.emotion_curve,
      final_script:     viralObject.final_script,
      ai_providers:     viralObject.ai_providers,
      pipeline_ms:      viralObject.pipeline_ms,
      generated_at:     viralObject.created_at,
    },
  }

  if (existing?.id) {
    await service
      .from('video_breakdowns')
      .update({ payload: mergedPayload })
      .eq('id', existing.id)
  } else {
    await service
      .from('video_breakdowns')
      .insert({ video_id, payload: mergedPayload, blog_status: 'NOT_SENT' })
  }

  // ── Return summary (not the full ViralObject — too large for HTTP response) ──
  return NextResponse.json({
    ok:          true,
    pipeline_ms: viralObject.pipeline_ms,
    structure_id: viralObject.structure_match?.structure_id,
    top_structure: viralObject.router?.top_structure,
    hook_line:   viralObject.final_script?.hook_line,
    total_lines: viralObject.final_script?.lines.length,
    providers:   viralObject.ai_providers,
  })
}
