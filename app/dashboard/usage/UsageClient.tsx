'use client'

import { useEffect, useState } from 'react'
import {
  Zap, RefreshCw, ExternalLink, TrendingUp, Calendar,
  Eye, Clapperboard, RotateCcw, Lock, Settings,
} from 'lucide-react'
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

// ── Structure type badge ──────────────────────────────────────────────────────

// Normalise internal structure IDs to short user-friendly labels
function structureLabel(id: string | null): string | null {
  if (!id) return null
  const map: Record<string, string> = {
    AGITATE_SOLVE:    'Problem → Solution',
    STORY_SELL:       'Story Sell',
    COMPARISON:       'Comparison',
    TESTIMONIAL:      'Testimonial',
    DEMO_REVEAL:      'Demo Reveal',
    SHOCK_REVEAL:     'Shock Reveal',
    EDUCATIONAL:      'Educational',
    FOMO_URGENCY:     'FOMO',
    TRANSFORMATION:   'Transformation',
    SOCIAL_PROOF:     'Social Proof',
  }
  return map[id.toUpperCase()] ?? id.replace(/_/g, ' ')
}

function TypeBadge({ structure }: { structure: string | null }) {
  if (!structure) return null
  const label = structureLabel(structure)
  if (!label) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-semibold border border-violet-100">
      {label}
    </span>
  )
}

// ── Analysis row ──────────────────────────────────────────────────────────────

function AnalysisRow({ item, isPaid }: { item: AnalysisItem; isPaid: boolean }) {
  const title       = item.product_name ?? item.category
  const sub         = item.product_name ? item.category : null
  const storyboard  = encodeURIComponent(item.product_name ?? item.category)

  return (
    <div className="py-4 border-b border-gray-50 last:border-0">

      {/* Top row: icon + name + time */}
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="h-3.5 w-3.5 text-pink-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{title}</p>
            <p className="text-[11px] text-gray-400 shrink-0 pt-0.5">{timeAgo(item.created_at)}</p>
          </div>

          {/* Category + type tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {sub && (
              <span className="text-[11px] text-gray-400">{sub}</span>
            )}
            <TypeBadge structure={item.structure_type} />
            {item.pipeline_ms && (
              <span className="text-[10px] text-gray-300">{(item.pipeline_ms / 1000).toFixed(1)}s</span>
            )}
          </div>

          {/* Hook line preview */}
          {item.hook_line && (
            <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 italic leading-snug">
              &ldquo;{item.hook_line}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-2 mt-3 ml-11">
        {/* View — reopens result in Studio via ?bd= */}
        <a
          href={`/studio?bd=${item.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 text-xs font-semibold transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </a>

        {/* Re-analyse — paid only; free users see locked upsell */}
        {isPaid ? (
          <a
            href={`/studio?video_id=${item.video_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Re-analyse
          </a>
        ) : (
          <a
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-300 text-xs font-semibold transition-colors border border-dashed border-gray-200 hover:border-pink-300 hover:text-pink-400 group"
            title="Upgrade to re-analyse videos"
          >
            <Lock className="h-3 w-3 group-hover:hidden" />
            <RotateCcw className="h-3 w-3 hidden group-hover:block text-pink-400" />
            <span className="group-hover:text-pink-500">Re-analyse</span>
          </a>
        )}

        {/* Storyboard next step */}
        <a
          href={`/dashboard/studio?product=${storyboard}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 text-xs font-semibold transition-colors"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Storyboard
        </a>
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
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-xl border border-gray-100 p-5 h-36" />
      <div className="bg-white rounded-xl border border-gray-100 p-5 h-48" />
    </div>
  )

  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
      {error}
    </div>
  )

  const isFree  = !tier || tier.tier_name === 'free'
  const pctUsed = tier && tier.video_analysis_limit > 0
    ? Math.round((tier.video_analysis_used / tier.video_analysis_limit) * 100)
    : 0

  return (
    <div className="space-y-5">

      {/* ── Quota card ── */}
      <Card>
        <CardContent className="p-4 sm:p-5">

          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Monthly Quota</h3>
            <div className="flex items-center gap-3">
              <a
                href="/dashboard/account"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors"
              >
                <Settings className="h-3 w-3" /> Plan &amp; Billing
              </a>
              <button
                onClick={load}
                className="text-xs text-gray-400 hover:text-pink-500 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
          </div>

          {/* 3 stat chips — responsive font sizes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                {tier?.video_analysis_used ?? 0}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">used</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                {tier?.video_analysis_limit ?? 0}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">limit</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400" />
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  {tier?.reset_at
                    ? new Date(tier.reset_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500">reset</p>
            </div>
          </div>

          <QuotaBar
            used={tier?.video_analysis_used ?? 0}
            limit={tier?.video_analysis_limit ?? 0}
          />

          {/* Upgrade nudge */}
          {isFree && pctUsed >= 60 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-100 rounded-xl px-4 py-3">
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
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-pink-500" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Analyses</h3>
            {analyses.length > 0 && (
              <span className="text-xs text-gray-400 ml-auto">{analyses.length} total</span>
            )}
          </div>

          {analyses.length === 0 ? <EmptyAnalyses /> : (
            <div>
              {analyses.map(item => <AnalysisRow key={item.id} item={item} isPaid={!isFree} />)}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
