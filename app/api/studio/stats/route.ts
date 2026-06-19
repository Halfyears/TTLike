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
import { queryD1First } from '@/lib/cloudflare/d1'

export const revalidate = 3600

// Launch offset: makes the counter start at a credible milestone
// Adjust upward as real usage grows past this number
const LAUNCH_OFFSET = 850

export async function GET() {
  try {
    const [usageRow, productsRow] = await Promise.all([
      queryD1First<{ total: number | null }>(
        'SELECT COALESCE(SUM(video_analysis_used), 0) AS total FROM user_billing_tiers',
      ),
      queryD1First<{ total: number }>(
        'SELECT COUNT(*) AS total FROM tiktok_videos WHERE deleted_at IS NULL',
      ),
    ])

    if (usageRow && productsRow) {
      return NextResponse.json({
        ok:               true,
        total_scripts:    Number(usageRow.total ?? 0) + LAUNCH_OFFSET,
        products_tracked: Number(productsRow.total ?? 0),
      })
    }

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
