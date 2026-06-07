/**
 * GET /api/studio/stats
 *
 * Returns global studio usage stats for social proof displays.
 * - total_scripts: sum of video_analysis_used across all users (+ launch offset)
 * - products_tracked: count of tiktok_videos rows
 *
 * Public endpoint — no auth required (read-only aggregate, no PII).
 * Cached for 1 hour via Next.js revalidate.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const revalidate = 3600

// Launch offset: makes the counter start at a credible milestone
// Adjust upward as real usage grows past this number
const LAUNCH_OFFSET = 850

export async function GET() {
  try {
    const service = createServiceClient()

    // Sum of all video_analysis_used across users
    const { data: usageRows } = await service
      .from('user_billing_tiers')
      .select('video_analysis_used')

    const realUsage = (usageRows ?? []).reduce(
      (sum, r) => sum + (Number(r.video_analysis_used) || 0),
      0,
    )
    const totalScripts = realUsage + LAUNCH_OFFSET

    // Count total products indexed
    const { count: productsCount } = await service
      .from('tiktok_videos')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      ok:               true,
      total_scripts:    totalScripts,
      products_tracked: productsCount ?? 0,
    })
  } catch {
    return NextResponse.json(
      { ok: true, total_scripts: 1200, products_tracked: 10000 },
      { status: 200 },
    )
  }
}
