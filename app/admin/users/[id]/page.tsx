'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Mail, CreditCard, Zap, Clock, Brain,
  CheckCircle, XCircle, RefreshCw, Calendar, Tag,
  Cpu, BarChart2, AlertTriangle, Layers,
} from 'lucide-react'
import { timeAgo, fmtDateTime } from '@/lib/dateUtils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserDetail {
  user: {
    id:               string
    email:            string
    name:             string | null
    role:             string
    plan:             string
    sub_status:       string
    period_end:       string | null
    stripe_id:        string | null
    email_confirmed:  boolean
    created_at:       string
    last_sign_in:     string | null
    referral_source:  string | null
  }
  profile: {
    peak_hour:          number | null
    total_analyses:     number
    profile_label:      string | null
    time_segment_label: string | null
    niche_label:        string | null
    updated_at:         string | null
  }
  activity: {
    total_analyses:    number
    scripts_generated: number
  }
  recent_events: Array<{
    sequence_id: number
    event_type:  string
    tokens:      number | null
    from_cache:  boolean
    emitted_at:  string
  }>
  recent_analytics: Array<{
    event:        string
    feature_name: string | null
    context_data: Record<string, unknown> | null
    created_at:   string
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function planColor(plan: string) {
  if (plan === 'ENTERPRISE') return 'bg-violet-900/40 text-violet-300 border border-violet-700'
  if (plan === 'PRO')        return 'bg-pink-900/40 text-pink-300 border border-pink-700'
  return 'bg-gray-700 text-gray-400 border border-gray-600'
}

function profileLabelColor(label: string | null) {
  if (!label) return 'bg-gray-700 text-gray-500'
  const map: Record<string, string> = {
    '高频操作手':  'bg-red-900/40 text-red-300 border border-red-700',
    '重度用户':    'bg-amber-900/40 text-amber-300 border border-amber-700',
    '活跃用户':    'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    '轻度探索者':  'bg-gray-700 text-gray-400 border border-gray-600',
  }
  return map[label] ?? 'bg-gray-700 text-gray-400'
}

function fmt24h(hour: number | null) {
  if (hour === null) return '—'
  const suffix = hour < 12 ? 'AM' : 'PM'
  const h      = hour % 12 || 12
  return `${h}:00 ${suffix}`
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
    </div>
  )
}

// ── Niche Profile Card ────────────────────────────────────────────────────────
interface NicheRow { user_id: string; niche: string; analysis_count: number; percentage: number }

function NicheProfileCard({ userId, nicheLabel }: { userId: string; nicheLabel: string | null }) {
  const [niches,  setNiches]  = useState<NicheRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/analytics/user-niches?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.niches) setNiches(d.niches as NicheRow[]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const NICHE_LABEL_COLORS: Record<string, string> = {
    '家居垂直大卖':  'bg-amber-900/40 text-amber-300 border border-amber-700',
    '美妆矩阵玩家':  'bg-pink-900/40 text-pink-300 border border-pink-700',
    '美食达人':      'bg-orange-900/40 text-orange-300 border border-orange-700',
    '健身达人':      'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    '科技极客':      'bg-blue-900/40 text-blue-300 border border-blue-700',
    '时尚玩家':      'bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-700',
    '宠物博主':      'bg-teal-900/40 text-teal-300 border border-teal-700',
    '多品类探索者':  'bg-gray-700 text-gray-300 border border-gray-600',
  }

  const NICHE_BAR_COLORS = [
    'bg-pink-500', 'bg-violet-500', 'bg-blue-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-gray-500',
  ]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Layers className="h-4 w-4 text-amber-400" /> Niche Profile
      </h2>

      {/* Label badge */}
      {nicheLabel ? (
        <div className="mb-4">
          <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${NICHE_LABEL_COLORS[nicheLabel] ?? 'bg-gray-700 text-gray-400'}`}>
            {nicheLabel}
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-600 mb-4">
          No niche profile yet — click Recompute on the Users page after a few analyses.
        </p>
      )}

      {/* Distribution bars */}
      {loading ? (
        <p className="text-xs text-gray-600">Loading niche data…</p>
      ) : niches.length === 0 ? (
        <p className="text-xs text-gray-600">No analysis_complete events found yet.</p>
      ) : (
        <div className="space-y-2.5">
          {niches.sort((a, b) => b.analysis_count - a.analysis_count).map((n, i) => (
            <div key={n.niche}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{n.niche}</span>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {n.analysis_count} <span className="text-gray-600">({n.percentage.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${NICHE_BAR_COLORS[i % NICHE_BAR_COLORS.length]}`}
                  style={{ width: `${n.percentage}%`, transition: 'width 0.5s ease' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const params = useParams()
  const userId = params.id as string

  const [data,    setData]    = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load user')
      setData(json as UserDetail)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl">
        <Link href="/admin/users" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="px-5 py-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error ?? 'User not found'}
        </div>
      </div>
    )
  }

  const { user, profile, activity, recent_events, recent_analytics } = data

  const cacheHits     = recent_events.filter(e => e.from_cache).length
  const cacheHitRate  = recent_events.length > 0
    ? Math.round((cacheHits / recent_events.length) * 100)
    : 0

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-3 text-xs transition-colors w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Users
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 flex-wrap">
            <Mail className="h-5 w-5 text-pink-400 shrink-0" />
            <span className="break-all">{user.email}</span>
          </h1>
          {user.name && (
            <p className="text-gray-400 text-sm">{user.name}</p>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Cpu}      label="AI Analyses"       value={activity.total_analyses}   color="text-violet-400" />
        <Stat icon={Zap}      label="Scripts Generated" value={activity.scripts_generated} color="text-pink-400" />
        <Stat icon={Clock}    label="Peak Hour"         value={fmt24h(profile.peak_hour)} color="text-blue-400" />
        <Stat icon={BarChart2} label="Cache Hit Rate"   value={`${cacheHitRate}%`}        color="text-emerald-400" />
      </div>

      {/* User info + profile side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Account details */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-pink-400" /> Account Details
          </h2>

          {[
            { label: 'Email',    value: user.email },
            { label: 'Role',     value: user.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs text-white font-mono">{value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
            <span className="text-xs text-gray-500">Plan</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planColor(user.plan)}`}>
              {user.plan}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
            <span className="text-xs text-gray-500">Email Status</span>
            <span className={`flex items-center gap-1 text-xs ${user.email_confirmed ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {user.email_confirmed
                ? <><CheckCircle className="h-3 w-3" /> Confirmed</>
                : <><XCircle className="h-3 w-3" /> Unconfirmed</>
              }
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
            <span className="text-xs text-gray-500">Source</span>
            <span className="text-xs text-blue-300">
              {user.referral_source ?? <span className="text-gray-600">direct</span>}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
            <span className="text-xs text-gray-500">Joined</span>
            <span className="text-xs text-gray-400">
              <Calendar className="h-3 w-3 inline mr-1" />
              {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-gray-500">Last Sign-in</span>
            <span className="text-xs text-gray-400">{timeAgo(user.last_sign_in)}</span>
          </div>

          {user.stripe_id && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-[10px] text-gray-600 font-mono break-all">Stripe: {user.stripe_id}</p>
            </div>
          )}
        </div>

        {/* Behaviour profile */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" /> Operator Profile
          </h2>

          {/* Label badge */}
          <div className="mb-4">
            {profile.profile_label ? (
              <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${profileLabelColor(profile.profile_label)}`}>
                {profile.profile_label}
              </span>
            ) : (
              <span className="text-xs text-gray-600">No profile computed yet — click Recompute on the Users page</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
              <span className="text-xs text-gray-500">Total Analyses</span>
              <span className={`text-sm font-black tabular-nums ${
                activity.total_analyses >= 50 ? 'text-red-400' :
                activity.total_analyses >= 20 ? 'text-amber-400' :
                activity.total_analyses >= 5  ? 'text-emerald-400' : 'text-gray-400'
              }`}>
                {activity.total_analyses}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
              <span className="text-xs text-gray-500">Peak Activity Hour</span>
              <span className="text-xs text-blue-300 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fmt24h(profile.peak_hour)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-700/50">
              <span className="text-xs text-gray-500">Cache Hit Rate</span>
              <span className={`text-xs font-bold ${cacheHitRate >= 50 ? 'text-emerald-400' : 'text-gray-400'}`}>
                {cacheHitRate}%
                <span className="text-gray-600 font-normal ml-1">({cacheHits}/{recent_events.length} recent)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-gray-500">Profile Updated</span>
              <span className="text-xs text-gray-500">
                {profile.updated_at ? timeAgo(profile.updated_at) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Niche Profile card */}
      <NicheProfileCard userId={userId} nicheLabel={profile.niche_label ?? null} />

      {/* Recent AI events */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Recent AI Calls</h2>
          <span className="text-[10px] text-gray-500 ml-1">last {recent_events.length} COMPLETE events</span>
        </div>

        {recent_events.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500 text-sm">No AI calls recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-semibold uppercase text-gray-500 border-b border-gray-700">
                  <th className="text-left px-5 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-right px-4 py-2.5">Tokens</th>
                  <th className="text-center px-4 py-2.5">Cache</th>
                  <th className="text-right px-4 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {recent_events.map((e, i) => (
                  <tr key={e.sequence_id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-2 text-gray-600 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${
                        e.event_type === 'COMPLETE' ? 'text-emerald-400' :
                        e.event_type === 'FAIL'     ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-300">
                      {e.tokens !== null ? e.tokens.toLocaleString() : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {e.from_cache
                        ? <span className="text-emerald-400 text-[10px] font-bold">HIT</span>
                        : <span className="text-gray-600 text-[10px]">—</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">
                      {fmtDateTime(e.emitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent analytics events (script_generated, feature clicks) */}
      {recent_analytics.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-700 flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">User Analytics Events</h2>
            <span className="text-[10px] text-gray-500 ml-1">last {recent_analytics.length}</span>
          </div>
          <div className="divide-y divide-gray-700/40 max-h-64 overflow-y-auto">
            {recent_analytics.map((e, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">
                    {e.event}
                  </span>
                  {e.feature_name && (
                    <span className="text-[10px] text-gray-400">{e.feature_name}</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
