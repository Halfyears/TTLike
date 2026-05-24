/**
 * POST /api/analytics/upgrade-trigger
 *
 * Called client-side whenever a user clicks an upgrade CTA.
 * Records: which CTA was clicked, what video/insight was visible, and
 * an auto-classified trigger_type so admins can see which psychological
 * levers (loss aversion, FOMO, curiosity, social proof) are most effective.
 *
 * trigger_type classification rules (client-supplied, validated server-side):
 *   loss_aversion  — user was viewing a "this video is underperforming" insight
 *   fomo           — user saw "X users just unlocked this"
 *   curiosity      — generic "unlock full breakdown" CTA
 *   social_proof   — "used by 1,200 creators" etc.
 */

import { NextResponse }    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_TRIGGER_TYPES = ['loss_aversion', 'fomo', 'curiosity', 'social_proof'] as const
type TriggerType = typeof VALID_TRIGGER_TYPES[number]

interface TriggerPayload {
  trigger_type:  string
  cta_label?:    string
  page?:         string
  video_id?:     string
  insight_label?: string
  metadata?:     Record<string, unknown>
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as TriggerPayload
    const { trigger_type, cta_label, page, video_id, insight_label, metadata } = body

    const validType: TriggerType = VALID_TRIGGER_TYPES.includes(trigger_type as TriggerType)
      ? (trigger_type as TriggerType)
      : 'curiosity'  // default for unmapped CTAs

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: true, skipped: true })

    const service = createServiceClient()
    await service.from('upgrade_trigger_events').insert({
      user_id:       user.id,
      trigger_type:  validType,
      cta_label:     cta_label ?? null,
      page:          page ?? null,
      video_id:      video_id ?? null,
      insight_label: insight_label ?? null,
      triggered_at:  new Date().toISOString(),
      metadata:      metadata ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.warn('[upgrade-trigger] non-fatal error:', e)
    return NextResponse.json({ ok: true, warn: 'logged' })
  }
}
