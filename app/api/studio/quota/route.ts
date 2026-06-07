/**
 * GET /api/studio/quota
 *
 * Returns the current user's video_analysis quota for the Studio.
 * Used by the URL-input screen to show a "X remaining" badge.
 * Returns 200 with { ok, tier, used, limit, remaining } or { ok: false } on error.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

    const service = createServiceClient()

    // Ensure billing row exists
    await service.rpc('ensure_billing_tier', { uid: user.id })

    const { data: tier, error } = await service
      .from('user_billing_tiers')
      .select('tier_name, video_analysis_used, video_analysis_limit')
      .eq('user_id', user.id)
      .single()

    if (error || !tier) {
      return NextResponse.json({ ok: false, error: 'Could not load quota' }, { status: 500 })
    }

    const used      = tier.video_analysis_used  ?? 0
    const limit     = tier.video_analysis_limit ?? 0
    const remaining = Math.max(0, limit - used)

    return NextResponse.json({
      ok:        true,
      tier:      tier.tier_name,
      used,
      limit,
      remaining,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
