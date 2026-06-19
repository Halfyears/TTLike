/**
 * GET /api/user/pdf-pass-balance
 *
 * Returns the authenticated user's white-label PDF pass balance and plan tier.
 * Used by VideoAnalysis to decide whether to show the Export PDF button.
 *
 * Response:
 *   { passes: number, plan: string, can_export: boolean }
 *
 * can_export = passes > 0 OR plan is 'scale' (unlimited)
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db }                            from '@/lib/cloudflare/d1Compat'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ passes: 0, plan: 'FREE', can_export: false })
    }

    // Fetch passes from Prisma (has affiliateCode / whitelabelPdfPasses)
    const dbUser = await d1Db.user.findUnique({
      where:  { email: user.email! },
      select: { whitelabelPdfPasses: true },
    })

    // Fetch plan from Supabase users table (source of truth for plan)
    const service = createServiceClient()
    const { data: planRow } = await service
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()

    const passes = dbUser?.whitelabelPdfPasses ?? 0
    const plan   = (planRow?.plan as string | null) ?? 'FREE'
    const isScale = plan.toLowerCase() === 'scale'

    return NextResponse.json({
      passes,
      plan,
      can_export: passes > 0 || isScale,
    })
  } catch (e) {
    console.warn('[pdf-pass-balance] error:', e)
    return NextResponse.json({ passes: 0, plan: 'FREE', can_export: false })
  }
}
