'use client'

import { useEffect, useState } from 'react'
import { Zap, TrendingUp, FileText, Clock, Tag, Hash, RefreshCw, Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { timeAgo, fmtDate } from '@/lib/dateUtils'
import type { UsageStats } from '@/app/api/ledger/usage/route'

// ── Helper (chart label — short "May 22" format) ──────────────────────────────
function fmtChartDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Sparkline bar chart ───────────────────────────────────────────────────────

function SparkBars({ data }: { data: Array<{ date: string; scripts: number }> }) {
  const max = Math.max(...data.map(d => d.scripts), 1)
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map(d => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm bg-pink-200 group-hover:bg-pink-400 transition-colors cursor-default"
            style={{ height: `${Math.max((d.scripts / max) * 100, 4)}%` }}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
            <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
              {fmtChartDate(d.date)}: {d.scripts} scripts
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-pink-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-20 text-gray-400">
      <Zap className="h-12 w-12 mx-auto mb-4 text-gray-200" />
      <p className="text-sm font-semibold text-gray-700 mb-1">No generation events yet</p>
      <p className="text-xs">Generate your first AI script — activity will appear here.</p>
      <a
        href="/dashboard/ai-scripts"
        className="inline-block mt-4 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors"
      >
        Generate Scripts
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsageClient() {
  const [stats, setStats]     = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/ledger/usage')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load usage data')
      setStats(data as UsageStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-28">
            <div className="h-9 w-9 bg-gray-100 rounded-lg mb-3" />
            <div className="h-7 w-16 bg-gray-100 rounded mb-1" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 h-36" />
    </div>
  )

  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
      {error}
    </div>
  )

  if (!stats || stats.total_generations === 0) return <EmptyState />

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Flame} label="Total Generations" value={stats.total_generations}
          sub="All time" color="text-pink-500 bg-pink-50"
        />
        <StatCard
          icon={FileText} label="Scripts Created" value={stats.total_scripts}
          sub="All time" color="text-violet-500 bg-violet-50"
        />
        <StatCard
          icon={Zap} label="This Week" value={stats.this_week}
          sub="generations" color="text-green-500 bg-green-50"
        />
        <StatCard
          icon={TrendingUp} label="Token Units" value={stats.total_tokens}
          sub="consumed" color="text-blue-500 bg-blue-50"
        />
      </div>

      {/* ── 14-day trend ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Scripts Generated — Last 14 Days</h3>
            <button
              onClick={load}
              className="text-xs text-gray-400 hover:text-pink-500 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <SparkBars data={stats.daily_trend} />
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>{fmtChartDate(stats.daily_trend[0].date)}</span>
            <span>{fmtChartDate(stats.daily_trend[stats.daily_trend.length - 1].date)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Top niches + hooks ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Niches */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Top Niches</h3>
            </div>
            {stats.top_niches.length === 0 ? (
              <p className="text-xs text-gray-400">No niche data yet</p>
            ) : (
              <div className="space-y-2">
                {stats.top_niches.map(({ niche, count }) => {
                  const pct = Math.round((count / stats.total_generations) * 100)
                  return (
                    <div key={niche}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium truncate max-w-[160px]">{niche}</span>
                        <span className="text-gray-400 shrink-0 ml-2">{count}×</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hooks */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-900">Hook Style Usage</h3>
            </div>
            {stats.top_hooks.length === 0 ? (
              <p className="text-xs text-gray-400">No hook data yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stats.top_hooks.map(({ hook_type, count }) => (
                  <span
                    key={hook_type}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200"
                  >
                    {hook_type}
                    <span className="bg-violet-200 text-violet-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent activity ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-2">
            {stats.recent_events.map(ev => (
              <div
                key={ev.sequence_id}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5 text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {ev.product_name || '(unnamed product)'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {ev.niche && <span className="text-blue-500">{ev.niche}</span>}
                      {ev.niche && ev.hook_type && <span className="mx-1">·</span>}
                      {ev.hook_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{ev.script_count} scripts</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(ev.emitted_at)}</p>
                  </div>
                  {ev.from_cache && (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                      CACHE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
