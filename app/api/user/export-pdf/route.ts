/**
 * GET /api/user/export-pdf?breakdown_id=<uuid>
 *
 * Streams a printable HTML document for a video breakdown.
 * Auth: user must be authenticated.
 * Gating:
 *   - Scale tier  → always allowed (unlimited)
 *   - Pass holder → allowed, 1 pass decremented per export
 *   - Others      → 403
 *
 * The client opens the URL in a new tab; the browser print dialog handles
 * the final PDF step (zero extra dependencies).
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                            from '@/lib/prisma'
import { generateBreakdownPdf }              from '@/lib/pdf/generateBreakdownPdf'
import type { VideoBreakdownPayload }        from '@/lib/types/intelligence'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // ── Param ─────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const breakdownId = searchParams.get('breakdown_id')
  if (!breakdownId) {
    return NextResponse.json({ error: 'breakdown_id required' }, { status: 400 })
  }

  const service = createServiceClient()

  // ── Fetch plan ────────────────────────────────────────────────────────────
  const { data: planRow } = await service
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()
  const plan    = ((planRow?.plan as string | null) ?? 'FREE').toLowerCase()
  const isScale = plan === 'scale'

  // ── Check pass balance (if not Scale tier) ────────────────────────────────
  let dbUser: { whitelabelPdfPasses: number } | null = null
  if (!isScale) {
    dbUser = await prisma.user.findUnique({
      where:  { email: user.email! },
      select: { whitelabelPdfPasses: true },
    })
    if (!dbUser || dbUser.whitelabelPdfPasses <= 0) {
      return NextResponse.json(
        { error: 'No PDF passes remaining. Upgrade to Scale or sign up via an affiliate link.' },
        { status: 403 },
      )
    }
  }

  // ── Fetch breakdown ───────────────────────────────────────────────────────
  const { data: breakdownRow, error: bErr } = await service
    .from('video_breakdowns')
    .select(`
      id,
      payload,
      tiktok_videos!left(title, product_name, niche, viral_score)
    `)
    .eq('id', breakdownId)
    .maybeSingle()

  if (bErr || !breakdownRow) {
    return NextResponse.json({ error: 'Breakdown not found' }, { status: 404 })
  }

  // ── Generate HTML first (before touching the pass balance) ──────────────
  // Generating before decrement ensures the user doesn't lose a pass if the
  // template function throws. Only decrement after we have valid HTML to serve.
  type VideoRow = { title?: string; product_name?: string; niche?: string; viral_score?: number } | null
  const video   = (breakdownRow as { tiktok_videos?: VideoRow }).tiktok_videos
  const payload = breakdownRow.payload as VideoBreakdownPayload

  let html: string
  try {
    html = generateBreakdownPdf(payload, {
      title:      video?.title ?? video?.product_name ?? 'Video Breakdown',
      niche:      video?.niche ?? '',
      viralScore: video?.viral_score,
    })
  } catch (e) {
    console.error('[export-pdf] HTML generation failed:', e)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // ── Decrement pass (non-Scale only, after successful HTML generation) ─────
  if (!isScale) {
    try {
      await prisma.user.update({
        where: { email: user.email! },
        data:  { whitelabelPdfPasses: { decrement: 1 } },
      })
    } catch (e) {
      console.error('[export-pdf] failed to decrement pass:', e)
      // Still serve the HTML — better to deliver than silently fail after generation
    }
  }

  return new Response(html, {
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="breakdown-${breakdownId.slice(0, 8)}.html"`,
      'X-PDF-Passes-Used':   isScale ? 'unlimited' : '1',
    },
  })
}
