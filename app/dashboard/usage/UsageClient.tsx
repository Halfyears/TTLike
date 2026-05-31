'use client'

import { useEffect, useState } from 'react'
import { Zap, RefreshCw, ExternalLink, TrendingUp, Calendar, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { timeAgo } from '@/lib/dateUtils'
import type { TierResponse } from '@/app/api/user/tier/route'
import type { AnalysisItem } from '@/app/api/studio/analyses/route'

// ── Quota progress bar ────────────────────────────────────────────────────────

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
    'bg-gradient-to-r from-pink-500 to-violet-500'

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-600 font-medium">{used} of {limit} analyses used</span>
        <span className={pct >= 90 ? 'text-red-500 font-semibold' : 'text-gray-400'}>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ tier }: { tier: string }) {
  const config: Record<string, { label: string; color: string }> = {
    free:       { label: 'Free',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
    creator:    { label: 'Creator',    color: 'bg-pink-50 text-pink-700 border-pink-200' },
    scale:      { label: 'Scale',      color: 'bg-violet-50 text-violet-700 border-violet-200' },
    enterprise: { label: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const { label, color } = config[tier] ?? config.free!
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <Shield className="h-3 w-3" />
      {label}
    </span>
  )
}

// ── Reset date helper ────────────────────────────────────────────────────────

function fmtResetDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400_000)
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${label} (${diffDays > 0 ? `${diffDays}d` : 'today'})`
}

// ── Analysis row ──────────────────────────────────────────────────────────────

function AnalysisRow({ item }: { item: AnalysisItem }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0 mt-0.5">
        <Zap className="h-3.5 w-3.5 text-pink-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 truncate">{item.category}</p>
        {item.hook_line && (
          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 italic">
            "{item.hook_line}"
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-gray-400">{timeAgo(item.created_at)}</p>
        {item.pipeline_ms && (
          <p className="text-[10px] text-gray-300">{(item.pipeline_ms / 1000).toFixed(1)}s</p>
        )}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyAnalyses() {
  return (
    <div className="text-center py-10 text-gray-400">
      <Zap className="h-10 w-10 mx-auto mb-3 text-gray-200" />
      <p className="text-sm font-semibold text-gray-700 mb-1">No analyses yet</p>
      <p className="text-xs mb-4">Paste a TikTok URL in Viral Studio to get started.</p>
      <a
        href="/studio"
        className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Open Viral Studio
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsageClient() {
  const [tier,      setTier]      = useState<TierResponse | null>(null)
  const [analyses,  setAnalyses]  = useState<AnalysisItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [tierRes, analysesRes] = await Promise.all([
        fetch('/api/user/tier'),
        fetch('/api/studio/analyses'),
      ])
      if (!tierRes.ok) throw new Error('Failed to load plan data')
      const tierData = await tierRes.json() as TierResponse
      setTier(tierData)

      if (analysesRes.ok) {
        const data = await analysesRes.json()
        setAnalyses(data.items ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-5 h-36" />
      <div className="bg-white rounded-xl border border-gray-100 p-5 h-48" />
    </div>
  )

  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
      {error}
    </div>
  )

  const resetLabel = fmtResetDate(tier?.reset_at ?? null)
  const isFree     = !tier || tier.tier_name === 'free'
  const pctUsed    = tier && tier.video_analysis_limit > 0
    ? Math.round((tier.video_analysis_used / tier.video_analysis_limit) * 100)
    : 0

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Plan + Quota card ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Monthly Quota</h3>
              {tier && <PlanBadge tier={tier.tier_name} />}
            </div>
            <button
              onClick={load}
              className="text-xs text-gray-400 hover:text-pink-500 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {/* 3 stat chips */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-gray-900 tabular-nums">
                {tier?.video_analysis_used ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">used</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-gray-900 tabular-nums">
                {tier?.video_analysis_limit ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">limit</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-sm font-bold text-gray-900">
                  {resetLabel ? resetLabel.split(' ')[0] : '—'}
                </p>
              </div>
              <p className="text-[11px] text-gray-500">reset</p>
            </div>
          </div>

          <QuotaBar
            used={tier?.video_analysis_used ?? 0}
            limit={tier?.video_analysis_limit ?? 0}
          />

          {/* Upgrade nudge when free + > 60% used */}
          {isFree && pctUsed >= 60 && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  {pctUsed >= 100 ? 'Quota full — upgrade to continue' : 'Running low on analyses'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Creator plan: 50 analyses/month</p>
              </div>
              <a
                href="/pricing"
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Upgrade <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent analyses ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-pink-500" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Analyses</h3>
            {analyses.length > 0 && (
              <span className="text-xs text-gray-400 ml-auto">{analyses.length} total</span>
            )}
          </div>

          {analyses.length === 0 ? <EmptyAnalyses /> : (
            <div>
              {analyses.map(item => <AnalysisRow key={item.id} item={item} />)}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
