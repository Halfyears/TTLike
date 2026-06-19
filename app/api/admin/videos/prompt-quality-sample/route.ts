/**
 * GET /api/admin/videos/prompt-quality-sample
 *
 * Returns 5 random recent video_breakdowns for admin quality review.
 * Each sample includes:
 *   - breakdown id, url_hash, created_at
 *   - linked video title / niche (if video_id is not null)
 *   - the full payload for quality inspection
 *
 * Quality red flags detected automatically:
 *   - payload.formulas every item contains "Emotional Hook" or "Pattern Interrupt"
 *     (generic filler → indicates prompt degradation)
 */

import { NextResponse }                    from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { d1Db }                           from '@/lib/cloudflare/d1Compat'

export const dynamic = 'force-dynamic'

const GENERIC_KEYWORDS = [
  'emotional hook', 'pattern interrupt', 'call to action', 'social proof',
  'urgency', 'scarcity', 'authority', 'trust signal',
]

function detectGenericContent(payload: Record<string, unknown>): string[] {
  const warnings: string[] = []
  const text = JSON.stringify(payload).toLowerCase()
  for (const kw of GENERIC_KEYWORDS) {
    const count = (text.match(new RegExp(kw, 'g')) ?? []).length
    if (count >= 3) {
      warnings.push(`"${kw}" appears ${count}× — possibly generic output`)
    }
  }
  return warnings
}

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await d1Db.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* D1 not available */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // Fetch 50 recent breakdowns, then pick 5 at random for a fair sample
  const { data: rows, error } = await service
    .from('video_breakdowns')
    .select('id, url_hash, video_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ samples: [] })
  }

  // Random sample of 5
  const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, 5)
  const videoIds  = shuffled.map(r => r.video_id).filter(Boolean)

  // Fetch linked video titles & niches
  const videoMeta = new Map<string, { title: string; niche: string | null }>()
  if (videoIds.length > 0) {
    const { data: videos } = await service
      .from('tiktok_videos')
      .select('id, title, niche')
      .in('id', videoIds as string[])

    for (const v of (videos ?? []) as Array<{ id: string; title: string; niche: string | null }>) {
      videoMeta.set(v.id, { title: v.title, niche: v.niche })
    }
  }

  const samples = shuffled.map(row => {
    const payload  = (row.payload ?? {}) as Record<string, unknown>
    const meta     = row.video_id ? videoMeta.get(row.video_id) : null
    const warnings = detectGenericContent(payload)

    return {
      id:           row.id as string,
      url_hash:     row.url_hash as string,
      video_id:     row.video_id as string | null,
      video_title:  meta?.title ?? null,
      video_niche:  meta?.niche ?? null,
      created_at:   row.created_at as string,
      payload,
      warnings,
      quality_ok:   warnings.length === 0,
    }
  })

  const totalWarnings = samples.filter(s => !s.quality_ok).length

  return NextResponse.json({
    samples,
    total_sampled: shuffled.length,
    quality_alerts: totalWarnings,
    hint: totalWarnings >= 3
      ? '⚠ Majority of samples show generic content. Consider updating the AI prompt.'
      : null,
  })
}
