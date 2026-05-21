import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface UsageStats {
  total_generations: number
  total_scripts:     number
  total_tokens:      number
  this_week:         number
  daily_trend:       Array<{ date: string; count: number; scripts: number }>
  top_niches:        Array<{ niche: string; count: number }>
  top_hooks:         Array<{ hook_type: string; count: number }>
  recent_events:     Array<{
    sequence_id: number
    product_name: string
    niche: string
    hook_type: string
    script_count: number
    from_cache: boolean
    emitted_at: string
  }>
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Fetch all COMPLETE events for this user ────────────────────────────────
    const { data: events, error } = await supabase
      .from('ledger_event_kernel')
      .select('sequence_id, payload, emitted_at')
      .eq('user_id', user.id)
      .eq('event_type', 'COMPLETE')
      .order('emitted_at', { ascending: false })
      .limit(500)   // cap for safety; snapshots will paginate in Phase 2

    if (error) throw error

    const rows = events ?? []

    // ── Aggregate stats ────────────────────────────────────────────────────────
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400_000)

    let total_scripts  = 0
    let total_tokens   = 0
    let this_week      = 0

    const nicheMap:    Map<string, number> = new Map()
    const hookMap:     Map<string, number> = new Map()
    const dayMap:      Map<string, { count: number; scripts: number }> = new Map()
    const recentEvents: UsageStats['recent_events'] = []

    for (const row of rows) {
      const p        = (row.payload ?? {}) as Record<string, unknown>
      const scripts  = Number(p.script_count  ?? 1)
      const tokens   = Number(p.tokens_consumed ?? 1)
      const niche    = String(p.niche       ?? 'General')
      const hookType = String(p.hook_type   ?? '')
      const fromCache = Boolean(p.from_cache)
      const emitted  = new Date(row.emitted_at as string)
      const dayKey   = emitted.toISOString().slice(0, 10)

      total_scripts += scripts
      total_tokens  += tokens
      if (emitted >= weekAgo) this_week++

      // Niche tally
      nicheMap.set(niche, (nicheMap.get(niche) ?? 0) + 1)

      // Hook tally (hook_type can be "SURPRISE+QUESTION" etc.)
      for (const h of hookType.split('+').filter(Boolean)) {
        hookMap.set(h, (hookMap.get(h) ?? 0) + 1)
      }

      // Daily trend (last 14 days only)
      const dayData = dayMap.get(dayKey) ?? { count: 0, scripts: 0 }
      dayMap.set(dayKey, { count: dayData.count + 1, scripts: dayData.scripts + scripts })

      // Recent events (last 20)
      if (recentEvents.length < 20) {
        recentEvents.push({
          sequence_id:  row.sequence_id as number,
          product_name: String(p.product_name ?? ''),
          niche,
          hook_type:    hookType,
          script_count: scripts,
          from_cache:   fromCache,
          emitted_at:   row.emitted_at as string,
        })
      }
    }

    // ── Build daily trend for last 14 days (fill gaps with 0) ─────────────────
    const daily_trend: UsageStats['daily_trend'] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000)
      const key = d.toISOString().slice(0, 10)
      const slot = dayMap.get(key) ?? { count: 0, scripts: 0 }
      daily_trend.push({ date: key, count: slot.count, scripts: slot.scripts })
    }

    // ── Top niches / hooks (sorted desc) ──────────────────────────────────────
    const top_niches = [...nicheMap.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([niche, count]) => ({ niche, count }))

    const top_hooks = [...hookMap.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([hook_type, count]) => ({ hook_type, count }))

    const stats: UsageStats = {
      total_generations: rows.length,
      total_scripts,
      total_tokens,
      this_week,
      daily_trend,
      top_niches,
      top_hooks,
      recent_events: recentEvents,
    }

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[Ledger Usage API]', err)
    return NextResponse.json({ error: 'Failed to load usage data' }, { status: 500 })
  }
}
