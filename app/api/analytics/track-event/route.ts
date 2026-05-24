/**
 * POST /api/analytics/track-event
 *
 * Lightweight client-side event sink.
 * Accepts two event types:
 *   feature_click  → feature_click_events table
 *   page_dwell     → page_dwell_events table
 *
 * Auth: requires a valid session (anonymous users are silently ignored).
 * Errors are swallowed — tracking must never break the user experience.
 */

import { NextResponse }     from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface TrackPayload {
  event_type:   'feature_click' | 'page_dwell'
  feature_name?: string   // required for feature_click
  page?:         string
  dwell_seconds?: number  // required for page_dwell
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as TrackPayload
    const { event_type, feature_name, page = 'dashboard', dwell_seconds } = body

    if (!['feature_click', 'page_dwell'].includes(event_type)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Resolve authenticated user
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      // Anonymous — silently succeed (don't block UX)
      return NextResponse.json({ ok: true, skipped: true })
    }

    const service = createServiceClient()

    // Snapshot plan for segmentation (best-effort, non-fatal)
    let plan: string | null = null
    try {
      const { data } = await service
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle()
      plan = (data?.plan as string | null) ?? null
    } catch { /* ignore */ }

    if (event_type === 'feature_click') {
      if (!feature_name) return NextResponse.json({ ok: false, error: 'feature_name required' }, { status: 400 })
      // Truncate to guard against oversized/malformed inputs
      const safeName = feature_name.slice(0, 100)
      const safePage = page.slice(0, 100)
      await service.from('feature_click_events').insert({
        user_id:      user.id,
        feature_name: safeName,
        page:         safePage,
        plan,
        clicked_at:   new Date().toISOString(),
      })
    } else {
      // page_dwell
      if (!dwell_seconds || dwell_seconds <= 0) return NextResponse.json({ ok: true, skipped: true })
      await service.from('page_dwell_events').insert({
        user_id:       user.id,
        page:          page.slice(0, 100),
        dwell_seconds: Math.min(dwell_seconds, 3600), // cap at 1h to avoid runaway values
        plan,
        recorded_at:   new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    // Never surface tracking errors to the client
    console.warn('[track-event] non-fatal error:', e)
    return NextResponse.json({ ok: true, warn: 'logged' })
  }
}
