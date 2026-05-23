/**
 * POST /api/admin/blog/publish
 *
 * Triggers the n8n SEO Content Flywheel for a specific video breakdown.
 *
 * Flow:
 *   1. Validate admin session
 *   2. Fetch video_breakdown + tiktok_videos metadata from Supabase
 *   3. POST structured JSON to N8N_WEBHOOK_URL (fire-and-forget, <200ms)
 *   4. Mark breakdown as PROCESSING in DB
 *   5. Return { status: "processing" } immediately
 *
 * n8n then:
 *   → Builds Markdown blog post via Ghost Admin API
 *   → Distributes to social platforms via social-auto-upload
 *   → POSTs back to /api/admin/blog/publish/callback with the result
 */

import { NextResponse }        from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

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

  // ── Webhook URL check ───────────────────────────────────────────────────────
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 503 })
  }

  const service = createServiceClient()

  // ── Fetch breakdown + video metadata ────────────────────────────────────────
  const { data: bd, error: bdErr } = await service
    .from('video_breakdowns')
    .select('id, payload, blog_status, tiktok_videos!left(id, title, product_name, niche, author, video_url, cover_url, views, likes, shares)')
    .eq('id', breakdown_id)
    .maybeSingle()

  if (bdErr || !bd) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 })
  }

  // Guard: don't re-trigger if already processing or published
  if (bd.blog_status === 'PROCESSING' || bd.blog_status === 'PUBLISHED') {
    return NextResponse.json(
      { error: `Breakdown already in state: ${bd.blog_status}` },
      { status: 409 }
    )
  }

  const video = (bd as unknown as { tiktok_videos: Record<string, unknown> | null }).tiktok_videos
  const payload = bd.payload as {
    metrics?: { views: string; likes: string; shares: string }
    viral_formulas?: unknown[]
    visual_timeline?: unknown[]
  } | null

  // ── Build n8n webhook payload ────────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ttlike.com'
  const n8nPayload = {
    breakdown_id,
    video: video ? {
      id:          video.id,
      title:       video.title ?? video.product_name ?? 'Untitled',
      niche:       video.niche,
      author:      video.author,
      video_url:   video.video_url,
      cover_url:   video.cover_url,
    } : { id: null, title: 'Unknown Video' },
    metrics:          payload?.metrics ?? {},
    viral_formulas:   payload?.viral_formulas ?? [],
    visual_timeline:  payload?.visual_timeline ?? [],
    /** n8n POSTs back here when published — updates blog_status to PUBLISHED */
    callback_url: `${siteUrl}/api/admin/blog/publish/callback`,
    /** UTM params for Ghost post links back to TTLike */
    utm: { source: 'ghost', medium: 'seo_flywheel', campaign: 'ttlike_autopublish' },
  }

  // ── POST to n8n (fire-and-forget, 5s timeout) ───────────────────────────────
  try {
    const webhookRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(n8nPayload),
      signal:  AbortSignal.timeout(5_000),
    })
    if (!webhookRes.ok) {
      const text = await webhookRes.text().catch(() => '')
      console.error('[blog/publish] n8n webhook error:', webhookRes.status, text)
      return NextResponse.json(
        { error: `n8n webhook returned ${webhookRes.status}` },
        { status: 502 }
      )
    }
    // Capture n8n execution ID if returned
    const webhookJson = await webhookRes.json().catch(() => ({})) as Record<string, unknown>
    const executionId = (webhookJson.executionId ?? webhookJson.id ?? '') as string

    // ── Mark as PROCESSING ─────────────────────────────────────────────────────
    await service
      .from('video_breakdowns')
      .update({
        blog_status:      'PROCESSING',
        n8n_execution_id: executionId || null,
      })
      .eq('id', breakdown_id)

    console.log('[blog/publish] flywheel triggered — breakdown:', breakdown_id, 'n8n_id:', executionId || 'unknown')
    return NextResponse.json({ status: 'processing', execution_id: executionId || null })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[blog/publish] n8n fetch error:', msg)
    return NextResponse.json({ error: 'Failed to reach n8n webhook: ' + msg }, { status: 502 })
  }
}
