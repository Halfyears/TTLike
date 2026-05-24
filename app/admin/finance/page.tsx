'use client'

/**
 * /admin/finance — Financial Management Dashboard
 *
 * Sections:
 *   1. Stripe Account Status
 *   2. Subscription Revenue Analysis (Creator vs Scale, MRR, net after affiliate spend)
 *   3. Token FinOps (30-day cost chart vs MRR daily fraction)
 *   4. User LTV / COGS Ranking (top 100)
 */

import { useCallback, useEffect, useState } from 'react'
import {
  CreditCard, TrendingUp, Zap, Users, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Flame,
  DollarSign, BarChart2, ShieldCheck, ArrowUpDown,
} from 'lucide-react'
import { AdminKpiCard } from '@/components/admin/AdminKpiCard'
import type { FinanceData } from '@/lib/finance/types'
import { fmtUSD, fmtUSDShort } from '@/lib/finance/metrics'

// ── Helpers ───────────────────────────────────────────────────────────────────

function planBadge(plan: string) {
  const cls =
    plan === 'ENTERPRISE' ? 'bg-violet-900/40 text-violet-300 border border-violet-700' :
    plan === 'PRO'        ? 'bg-pink-900/40 text-pink-300 border border-pink-700' :
                            'bg-gray-700 text-gray-400 border border-gray-600'
  const label =
    plan === 'ENTERPRISE' ? 'Scale' :
    plan === 'PRO'        ? 'Creator' : 'Free'
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function labelBadge(label: FinanceData['ltv_ranking'][number]['label']) {
  const map = {
    whale:      { cls: 'bg-emerald-900/40 text-emerald-300', text: '🐋 Whale' },
    healthy:    { cls: 'bg-blue-900/40 text-blue-300',       text: '✓ Healthy' },
    at_risk:    { cls: 'bg-amber-900/40 text-amber-300',     text: '⚠ At Risk' },
    freeloader: { cls: 'bg-red-900/40 text-red-300',         text: '🦗 Freeloader' },
  }
  const { cls, text } = map[label]
  return <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>
}

// ── Mini bar chart (CSS-based, no dependencies) ───────────────────────────────
function MiniBarChart({ data }: {
  data: FinanceData['token_finops']['daily']
}) {
  const maxCost = Math.max(...data.map(d => d.cost_usd), 0.001)
  const maxMRR  = Math.max(...data.map(d => d.mrr_fraction), 0.001)
  const scale   = Math.max(maxCost, maxMRR)

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" /> AI Cost (daily)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> MRR ÷ 30
        </span>
      </div>

      {/* Bars — show last 14 days for readability */}
      <div className="flex items-end gap-0.5 h-24">
        {data.slice(-14).map((d, i) => {
          const costH  = Math.round((d.cost_usd      / scale) * 96)
          const mrrH   = Math.round((d.mrr_fraction  / scale) * 96)
          const label  = d.date.slice(5)   // MM-DD
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                  <div>{d.date}</div>
                  <div className="text-red-400">Cost: {fmtUSD(d.cost_usd, 4)}</div>
                  <div className="text-emerald-400">MRR/30: {fmtUSD(d.mrr_fraction, 2)}</div>
                  <div className="text-gray-400">{d.generations} generations</div>
                </div>
              </div>
              <div className="w-full flex items-end gap-px h-20">
                {/* MRR bar (green) */}
                <div
                  className="flex-1 bg-emerald-500/60 rounded-t-sm transition-all"
                  style={{ height: `${mrrH}px` }}
                />
                {/* Cost bar (red) */}
                <div
                  className="flex-1 bg-red-500/80 rounded-t-sm transition-all"
                  style={{ height: `${costH}px` }}
                />
              </div>
              <span className="text-[8px] text-gray-600 rotate-45 origin-left mt-1 block w-4">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [data,    setData]    = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/finance')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load finance data')
      setData(json as FinanceData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const d = data

  // Sort LTV ranking
  const ranking = d
    ? [...d.ltv_ranking].sort((a, b) =>
        sortAsc
          ? (a.net_usd - b.net_usd) || (a.cogs_usd - b.cogs_usd)
          : (b.net_usd - a.net_usd) || (a.cogs_usd - b.cogs_usd)
      )
    : []

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-400" /> Finance
          </h1>
          <p className="text-gray-400 text-sm">Revenue · Token FinOps · User LTV/COGS</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && !d && (
        <div className="py-20 text-center text-gray-500">Loading financial data…</div>
      )}

      {d && (
        <>
          {/* ── 1. Stripe Account ── */}
          <section>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              Payment Account
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    d.stripe.charges_enabled ? 'bg-emerald-900/40' : 'bg-gray-700'
                  }`}>
                    <CreditCard className={`h-5 w-5 ${d.stripe.charges_enabled ? 'text-emerald-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {d.stripe.account_name ?? 'Stripe Account'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {d.stripe.enabled ? 'Integration active' : 'Payments disabled (beta mode)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  {/* Stripe status */}
                  <div className="flex items-center gap-2">
                    {d.stripe.error ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : d.stripe.charges_enabled ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-500" />
                    )}
                    <span className={`text-xs font-semibold ${
                      d.stripe.error ? 'text-amber-300' :
                      d.stripe.charges_enabled ? 'text-emerald-300' : 'text-gray-500'
                    }`}>
                      {d.stripe.error
                        ? d.stripe.error
                        : d.stripe.enabled
                          ? (d.stripe.charges_enabled ? 'Charges enabled' : 'Charges disabled')
                          : 'PAYMENT_ENABLED = false'
                      }
                    </span>
                  </div>

                  {/* Config check */}
                  {[
                    { key: 'STRIPE_SECRET_KEY',       label: 'Secret Key' },
                    { key: 'STRIPE_PRO_PRICE_ID',      label: 'Creator Price' },
                    { key: 'STRIPE_ENTERPRISE_PRICE_ID', label: 'Scale Price' },
                  ].map(({ label }) => (
                    <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. Subscription Revenue ── */}
          <section>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              Subscription Revenue
            </p>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <AdminKpiCard icon={Users}      label="Total Paid"       value={d.subscriptions.total_paid}                  sub="active subscribers"     color="blue" />
              <AdminKpiCard icon={CreditCard} label="Creator (Pro)"    value={d.subscriptions.plan_creator}                sub={`$29/mo · $${d.subscriptions.plan_creator * 29}/mo`}  color="pink" />
              <AdminKpiCard icon={ShieldCheck} label="Scale (Ent.)"   value={d.subscriptions.plan_scale}                  sub={`$99/mo · $${d.subscriptions.plan_scale * 99}/mo`}    color="violet" />
              <AdminKpiCard icon={TrendingUp} label="Est. Net MRR"     value={fmtUSDShort(d.subscriptions.net_mrr)}        sub={`after $${d.subscriptions.affiliate_spend.toFixed(0)} aff. spend`} color="emerald" />
            </div>

            {/* Revenue breakdown card */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Revenue Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                {/* MRR bar */}
                <div className="sm:col-span-2">
                  {[
                    { label: 'Creator (PRO)', value: d.subscriptions.plan_creator * 29, color: 'bg-pink-500', total: d.subscriptions.est_mrr },
                    { label: 'Scale (ENT)',   value: d.subscriptions.plan_scale * 99,   color: 'bg-violet-500', total: d.subscriptions.est_mrr },
                    { label: 'Affiliate cost', value: -d.subscriptions.affiliate_spend, color: 'bg-red-500',   total: d.subscriptions.est_mrr },
                  ].map(({ label, value, color, total }) => {
                    const pct = total > 0 ? Math.abs(value) / total * 100 : 0
                    return (
                      <div key={label} className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className={`text-xs font-bold tabular-nums ${value < 0 ? 'text-red-400' : 'text-white'}`}>
                            {value < 0 ? '−' : '+'}{fmtUSD(Math.abs(value))}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Net MRR summary */}
                <div className="flex flex-col justify-center items-center bg-gray-700/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Est. Net MRR</p>
                  <p className="text-3xl font-black text-emerald-400 tabular-nums">
                    {fmtUSDShort(d.subscriptions.net_mrr)}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">after affiliate commissions</p>
                  <div className="mt-3 pt-3 border-t border-gray-600 w-full">
                    <p className="text-xs text-gray-500">Est. ARR</p>
                    <p className="text-lg font-black text-white tabular-nums">
                      {fmtUSDShort(d.subscriptions.net_mrr * 12)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. Token FinOps ── */}
          <section>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              Token FinOps — AI Cost vs Revenue
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <AdminKpiCard icon={Zap}      label="Total AI Cost"    value={fmtUSD(d.token_finops.total_cost_usd)}  sub="all time (est.)"         color="amber" />
              <AdminKpiCard icon={BarChart2} label="Generations"     value={d.token_finops.total_generations}       sub="COMPLETE events"          color="pink" />
              <AdminKpiCard icon={TrendingUp} label="Cost per Gen."  value={fmtUSD(d.token_finops.total_generations > 0 ? d.token_finops.total_cost_usd / d.token_finops.total_generations : 0, 5)} sub="avg. Gemini 2.5 Flash" color="gray" />
              <AdminKpiCard icon={DollarSign} label="COGS Ratio"     value={d.subscriptions.est_mrr > 0 ? `${((d.token_finops.total_cost_usd / 30 / (d.subscriptions.est_mrr / 30)) * 100).toFixed(1)}%` : '—'} sub="30-day cost / monthly MRR" color="red" />
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">
                Daily AI Cost vs Revenue (last 14 days)
              </h2>
              <MiniBarChart data={d.token_finops.daily} />
              <p className="text-[10px] text-gray-600 mt-3">
                Cost based on Gemini 2.5 Flash pricing: $0.075/M input tokens + $0.30/M output tokens · ~$0.000525/call estimate
              </p>
            </div>
          </section>

          {/* ── 4. User LTV / COGS Ranking ── */}
          <section>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              User LTV / COGS Ranking
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-400" />
                  <h2 className="text-sm font-semibold text-white">Net Contribution Ranking</h2>
                  <span className="text-[10px] text-gray-500">plan value − est. token cost</span>
                </div>
                <button
                  onClick={() => setSortAsc(a => !a)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortAsc ? 'Worst first' : 'Best first'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="text-left px-5 py-3">#</th>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Plan</th>
                      <th className="text-right px-4 py-3">Plan Value</th>
                      <th className="text-right px-4 py-3">Generations</th>
                      <th className="text-right px-4 py-3">Cache Hits</th>
                      <th className="text-right px-4 py-3">Est. COGS</th>
                      <th className="text-right px-4 py-3">Net Contrib.</th>
                      <th className="text-center px-4 py-3">Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {ranking.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                          No generation data yet.
                        </td>
                      </tr>
                    ) : ranking.map((u, i) => (
                      <tr key={u.user_id} className={`hover:bg-gray-700/30 transition-colors ${
                        u.label === 'freeloader' ? 'bg-red-950/10' :
                        u.label === 'at_risk'    ? 'bg-amber-950/10' :
                        u.label === 'whale'      ? 'bg-emerald-950/10' : ''
                      }`}>
                        <td className="px-5 py-3 text-xs text-gray-600 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-gray-300 truncate font-mono">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">{planBadge(u.plan)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-gray-300 tabular-nums">
                            {u.plan_value > 0 ? `$${u.plan_value}/mo` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold tabular-nums ${u.generations > 30 ? 'text-amber-400' : 'text-gray-300'}`}>
                            {u.generations}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-gray-400 tabular-nums">
                            {u.cache_hits > 0 ? (
                              <span className="text-emerald-400">{u.cache_hits}</span>
                            ) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs tabular-nums font-bold ${u.cogs_usd > u.plan_value * 0.5 ? 'text-red-400' : 'text-gray-400'}`}>
                            {fmtUSD(u.cogs_usd, 4)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-black tabular-nums ${
                            u.net_usd > 0 ? 'text-emerald-400' :
                            u.net_usd < 0 ? 'text-red-400' : 'text-gray-500'
                          }`}>
                            {u.net_usd > 0 ? '+' : ''}{fmtUSD(u.net_usd, 2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{labelBadge(u.label)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
