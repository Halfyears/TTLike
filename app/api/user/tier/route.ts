/**
 * GET /api/user/tier
 *
 * Returns the authenticated user's billing tier and quota state.
 * Creates a free-tier row on first call (auto-provision).
 *
 * Used by the useUserTier() client hook to gate UI features.
 */

import { NextResponse }        from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { TierName }       from '@/lib/constants'

export interface TierResponse {
  tier_name:            TierName
  video_analysis_used:  number
  video_analysis_limit: number
  strategy_audit_used:  number
  strategy_audit_limit: number
  custom_hook_used:     number
  custom_hook_limit:    number
  reset_at:             string | null
}

export async function GET() {
  // Requires authenticated session
  const auth    = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Auto-provision free tier row on first visit
  await service.rpc('ensure_billing_tier', { uid: user.id })

  const { data, error } = await service
    .from('user_billing_tiers')
    .select('tier_name, video_analysis_used, video_analysis_limit, strategy_audit_used, strategy_audit_limit, custom_hook_used, custom_hook_limit, reset_at')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    // Fallback: return free-tier defaults so the UI never breaks
    return NextResponse.json({
      tier_name:            'free',
      video_analysis_used:  0,
      video_analysis_limit: 5,
      strategy_audit_used:  0,
      strategy_audit_limit: 0,
      custom_hook_used:     0,
      custom_hook_limit:    0,
      reset_at:             null,
    } satisfies TierResponse)
  }

  return NextResponse.json(data as TierResponse)
}
