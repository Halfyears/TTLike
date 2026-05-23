/**
 * POST /api/admin/blog/trigger-flywheel
 *
 * Dispatches the SEO Blog Flywheel task to Trigger.dev cloud.
 * Replaces the old N8N webhook route (/api/admin/blog/publish).
 *
 * Flow:
 *   1. Admin auth guard
 *   2. Fetch breakdown + video metadata from Supabase
 *   3. Guard against re-trigger (PROCESSING / PUBLISHED)
 *   4. Dispatch to Trigger.dev (fire-and-forget, <200ms)
 *   5. Mark breakdown as PROCESSING + save trigger_run_id
 *   6. Return { status: "processing", run_id } immediately
 *
 * The Trigger.dev task (trigger/blogEcosystem.ts) then:
 *   → Generates HTML blog post via Gemini
 *   → Publishes to Ghost CMS Admin API
 *   → Updates video_breakdowns: blog_status=PUBLISHED, ghost_post_id, blog_published_at
 *
 * Required env vars:
 *   TRIGGER_SECRET_KEY    — from Trigger.dev dashboard (API Keys)
 *   GHOST_API_URL         — e.g. https://your-blog.ghost.io
 *   GHOST_ADMIN_API_KEY   — id:secret from Ghost Settings → Integrations
 */

import { NextResponse }                      from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { seoBlogFlywheelTask }               from '@/trigger/blogEcosystem'
import type { BlogFlywheelPayload }          from '@/trigger/blogEcosystem'

export async function POST(req: Request) {
  // ── Admin auth guard ────────────────────────────────────────────────────────
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    const adminEmail = process.env.ADMIN_EMAIL
    if (!user || (adminEmail && user.email !== adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 401 })
  }

  // ── Trigger.dev config check ────────────────────────────────────────────────
  if (!process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json({ error: 'TRIGGER_SECRET_KEY not configured' }, { status: 503 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { breakdown_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { breakdown_id } = body
  if (!breakdown_id) {
    return NextResponse.json({ error: 'breakdown_id is required' }, { status: 400 })
  }

  const service = createServiceClient()

  // ── Fetch breakdown + video metadata ────────────────────────────────────────
  const { data: bd, error: bdErr } = await service
    .from('video_breakdowns')
    .select(`
      id,
      payload,
      blog_status,
      tiktok_videos!left(id, title, product_name, niche, author, cover_url, views, likes, shares)
    `)
    .eq('id', breakdown_id)
    .maybeSingle()

  if (bdErr || !bd) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 })
  }

  // Guard: don't re-trigger if already in flight or done
  if (bd.blog_status === 'PROCESSING' || bd.blog_status === 'PUBLISHED') {
    return NextResponse.json(
      { error: `Breakdown already in state: ${bd.blog_status}` },
      { status: 409 }
    )
  }

  // ── Build typed task payload ────────────────────────────────────────────────
  type VideoRow = {
    id: string; title: string | null; product_name: string | null
    niche: string | null; author: string | null; cover_url: string | null
    views: number | null; likes: number | null; shares: number | null
  }
  const video   = (bd as unknown as { tiktok_videos: VideoRow | null }).tiktok_videos
  const payload = bd.payload as {
    metrics?:        { views: string; likes: string; shares: string }
    viral_formulas?: BlogFlywheelPayload['viral_formulas']
    visual_timeline?: BlogFlywheelPayload['visual_timeline']
  } | null

  const taskPayload: BlogFlywheelPayload = {
    breakdown_id,
    video: {
      title:        video?.title        ?? null,
      product_name: video?.product_name ?? null,
      niche:        video?.niche        ?? null,
      author:       video?.author       ?? null,
      cover_url:    video?.cover_url    ?? null,
    },
    metrics: payload?.metrics ?? {
      views:  String(video?.views  ?? 0),
      likes:  String(video?.likes  ?? 0),
      shares: String(video?.shares ?? 0),
    },
    viral_formulas:  payload?.viral_formulas  ?? [],
    visual_timeline: payload?.visual_timeline ?? [],
  }

  // ── Dispatch to Trigger.dev (fire-and-forget) ───────────────────────────────
  let runId: string | undefined
  try {
    const handle = await seoBlogFlywheelTask.trigger(taskPayload)
    runId = handle.id
    console.log('[trigger-flywheel] task dispatched — breakdown:', breakdown_id, 'run_id:', runId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[trigger-flywheel] Trigger.dev dispatch error:', msg)
    return NextResponse.json({ error: 'Failed to dispatch task: ' + msg }, { status: 502 })
  }

  // ── Mark as PROCESSING in DB ────────────────────────────────────────────────
  await service
    .from('video_breakdowns')
    .update({
      blog_status:    'PROCESSING',
      trigger_run_id: runId ?? null,
    })
    .eq('id', breakdown_id)

  return NextResponse.json({
    status:  'processing',
    run_id:  runId,
    message: 'Task dispatched to Trigger.dev cloud. Ghost post will be published within minutes.',
  })
}
