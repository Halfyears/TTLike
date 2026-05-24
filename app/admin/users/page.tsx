'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Users, CreditCard, Zap, ShieldCheck,
  ChevronDown, Search, CheckCircle, BarChart2,
  Brain, Clock, ChevronRight, RotateCcw, AlertTriangle,
} from 'lucide-react'
import Link           from 'next/link'
import { Badge }      from '@/components/ui/Badge'
import { timeAgo }    from '@/lib/dateUtils'
import { LocalDate }  from '@/components/ui/LocalDate'

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id:               string
  email:            string
  name:             string | null
  role:             string
  plan:             string
  sub_status:       string
  period_end:       string | null
  stripe_id:        string | null
  scripts_used:     number
  last_activity:    string | null
  last_sign_in:     string | null
  confirmed:        boolean
  created_at:       string
  referral_source:  string | null
}

interface OperatorProfile {
  user_id:        string
  email:          string
  plan:           string
  peak_hour:      number | null
  total_analyses: number
  profile_label:  string | null
  updated_at:     string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function planColor(plan: string) {
  if (plan === 'ENTERPRISE') return 'bg-violet-900/40 text-violet-300 border border-violet-700'
  if (plan === 'PRO')        return 'bg-pink-900/40 text-pink-300 border border-pink-700'
  return 'bg-gray-700 text-gray-300 border border-gray-600'
}

function statusDot(status: string, confirmed: boolean) {
  if (!confirmed)            return <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" title="Email not confirmed" />
  if (status === 'ACTIVE')   return <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" title="Active" />
  if (status === 'CANCELED') return <span className="h-2 w-2 rounded-full bg-red-400 inline-block" title="Canceled" />
  if (status === 'PAST_DUE') return <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" title="Past due" />
  return <span className="h-2 w-2 rounded-full bg-gray-500 inline-block" />
}

function profileLabelBadge(label: string | null) {
  if (!label) return <span className="text-gray-600 text-xs">—</span>
  const map: Record<string, string> = {
    '高频操作手':  'bg-red-900/40 text-red-300 border border-red-700',
    '重度用户':    'bg-amber-900/40 text-amber-300 border border-amber-700',
    '活跃用户':    'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    '轻度探索者':  'bg-gray-700 text-gray-400 border border-gray-600',
  }
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${map[label] ?? 'bg-gray-700 text-gray-400'}`}>
      {label}
    </span>
  )
}

function fmt24h(hour: number | null) {
  if (hour === null) return '—'
  const suffix = hour < 12 ? 'AM' : 'PM'
  const h      = hour % 12 || 12
  return `${h}:00 ${suffix}`
}

// ── Source Distribution (CSS bar chart) ───────────────────────────────────────
function SourceDistribution({ users }: { users: User[] }) {
  const dist = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const u of users) {
      const src = u.referral_source?.trim() || 'direct'
      tally[src] = (tally[src] ?? 0) + 1
    }
    return Object.entries(tally)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({
        source,
        count,
        pct: users.length > 0 ? Math.round((count / users.length) * 100) : 0,
      }))
  }, [users])

  if (users.length === 0) return null

  const COLORS = [
    'bg-pink-500', 'bg-violet-500', 'bg-blue-500',
    'bg-emerald-500', 'bg-amber-500', 'bg-gray-500',
  ]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-pink-400" />
        <h2 className="text-sm font-semibold text-white">User Source Attribution</h2>
        <span className="text-[10px] text-gray-500 ml-1">{users.length} total users</span>
      </div>
      <div className="space-y-2.5">
        {dist.slice(0, 8).map(({ source, count, pct }, i) => (
          <div key={source}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300 truncate max-w-[180px]" title={source}>
                {source === 'direct' ? '(direct / none)' : source}
              </span>
              <span className="text-xs text-gray-400 tabular-nums ml-2">
                {count} <span className="text-gray-600">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
              />
            </div>
          </div>
        ))}
        {dist.length > 8 && (
          <p className="text-[10px] text-gray-600 pt-1">+ {dist.length - 8} more sources</p>
        )}
      </div>
    </div>
  )
}

// ── Operator Profiles Panel ───────────────────────────────────────────────────
function OperatorProfilesPanel() {
  const [profiles,    setProfiles]    = useState<OperatorProfile[]>([])
  const [loading,     setLoading]     = useState(false)
  const [computing,   setComputing]   = useState(false)
  const [computeMsg,  setComputeMsg]  = useState<{ ok: boolean; text: string } | null>(null)
  const [expanded,    setExpanded]    = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/analytics/operator-profiles')
      const data = await res.json()
      if (res.ok) setProfiles(data.profiles ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  async function handleCompute() {
    setComputing(true)
    setComputeMsg(null)
    try {
      const res  = await fetch('/api/admin/analytics/operator-profiles', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setComputeMsg({ ok: true, text: data.message })
        await fetchProfiles()
      } else {
        setComputeMsg({ ok: false, text: data.error ?? 'Compute failed' })
      }
    } finally {
      setComputing(false)
    }
  }

  const labelCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of profiles) {
      const l = p.profile_label ?? 'unknown'
      map[l] = (map[l] ?? 0) + 1
    }
    return map
  }, [profiles])

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Operator Profiles</h2>
          {profiles.length > 0 && (
            <span className="text-[10px] text-gray-500">{profiles.length} profiled users</span>
          )}
          {/* Label summary chips */}
          <div className="flex items-center gap-1 ml-2">
            {Object.entries(labelCounts).map(([label, count]) => (
              <span key={label} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                {label}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleCompute() }}
            disabled={computing}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 disabled:opacity-50 transition-colors border border-violet-700/50"
          >
            <RotateCcw className={`h-3 w-3 ${computing ? 'animate-spin' : ''}`} />
            {computing ? 'Computing…' : 'Recompute'}
          </button>
          <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {computeMsg && (
        <div className={`mx-5 mb-3 px-3 py-2 rounded-lg text-xs ${
          computeMsg.ok
            ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/40 border border-red-700 text-red-300'
        }`}>
          {computeMsg.text}
        </div>
      )}

      {expanded && (
        <>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">Loading profiles…</div>
          ) : profiles.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">
              No profiles yet. Click <strong className="text-gray-400">Recompute</strong> to generate from AI usage data.
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-700">
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-right px-4 py-3">Analyses</th>
                    <th className="text-center px-4 py-3">Peak Hour</th>
                    <th className="text-center px-4 py-3">Profile</th>
                    <th className="text-right px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {profiles.map(p => (
                    <tr key={p.user_id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-5 py-2.5 max-w-[200px]">
                        <Link href={`/admin/users/${p.user_id}`} className="block group">
                          <p className="text-xs text-gray-300 font-mono truncate group-hover:text-pink-400 transition-colors">
                            {p.email}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${planColor(p.plan)}`}>
                          {p.plan}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/admin/users/${p.user_id}`} className="group inline-block">
                          <span className={`text-xs font-bold tabular-nums group-hover:text-pink-400 transition-colors ${
                            p.total_analyses >= 50 ? 'text-red-400' :
                            p.total_analyses >= 20 ? 'text-amber-400' :
                            p.total_analyses >= 5  ? 'text-emerald-400' : 'text-gray-400'
                          }`}>
                            {p.total_analyses}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" /> {fmt24h(p.peak_hour)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {profileLabelBadge(p.profile_label)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[10px] text-gray-600">
                        {timeAgo(p.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,        setUsers]        = useState<User[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [planFilter,   setPlanFilter]   = useState('')
  const [roleFilter,   setRoleFilter]   = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [changingRole, setChangingRole] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load users')
      setUsers(data.users as User[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // ── Role change ────────────────────────────────────────────────────────────
  async function changeRole(userId: string, newRole: string) {
    setChangingRole(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (e) {
      alert(`Failed to update role: ${e instanceof Error ? e.message : e}`)
    } finally {
      setChangingRole(null)
    }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:        users.length,
    confirmed:    users.filter(u => u.confirmed).length,
    pro:          users.filter(u => u.plan === 'PRO' || u.plan === 'ENTERPRISE').length,
    totalScripts: users.reduce((s, u) => s + u.scripts_used, 0),
  }), [users])

  // ── Unique sources for filter dropdown ─────────────────────────────────────
  const uniqueSources = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) if (u.referral_source) set.add(u.referral_source)
    return Array.from(set).sort()
  }, [users])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = users
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q)
      )
    }
    if (planFilter)   list = list.filter(u => u.plan === planFilter)
    if (roleFilter)   list = list.filter(u => u.role === roleFilter)
    if (sourceFilter) list = list.filter(u =>
      sourceFilter === '__direct__'
        ? !u.referral_source
        : u.referral_source === sourceFilter
    )
    return list
  }, [users, search, planFilter, roleFilter, sourceFilter])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">User Management</h1>
          <p className="text-gray-400 text-sm">{users.length} registered accounts · Behaviour & Trigger Insights</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users}       label="Total Users"       value={kpis.total}        color="text-blue-400" />
        <KpiCard icon={CheckCircle} label="Confirmed Email"   value={kpis.confirmed}    color="text-emerald-400" />
        <KpiCard icon={CreditCard}  label="Paid Subscribers"  value={kpis.pro}          color="text-pink-400" />
        <KpiCard icon={Zap}         label="Scripts Generated" value={kpis.totalScripts} color="text-violet-400" />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Source Distribution */}
      {!loading && users.length > 0 && (
        <SourceDistribution users={users} />
      )}

      {/* Operator Profiles (full-width, collapsible) */}
      {!loading && users.length > 0 && (
        <OperatorProfilesPanel />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email or name…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All plans</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All sources</option>
          <option value="__direct__">(direct / none)</option>
          {uniqueSources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="self-center text-xs text-gray-500 ml-1">
          {visible.length} / {users.length} shown
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading users…</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No users match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Status','Email / Name','Source','Role','Plan','Scripts','Last Active','Last Login','Joined','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-gray-400 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {visible.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">

                    {/* Status dot */}
                    <td className="px-4 py-3 text-center">
                      {statusDot(user.sub_status, user.confirmed)}
                    </td>

                    {/* Email / Name */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-sm text-white font-medium truncate">{user.email}</p>
                      {user.name && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{user.name}</p>
                      )}
                      {!user.confirmed && (
                        <p className="text-[10px] text-yellow-400 mt-0.5">⚠ email unconfirmed</p>
                      )}
                    </td>

                    {/* Referral Source */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.referral_source ? (
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 max-w-[100px] truncate" title={user.referral_source}>
                          {user.referral_source}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={user.role === 'ADMIN' ? 'danger' : 'default'}>
                        {user.role === 'ADMIN' && <ShieldCheck className="h-2.5 w-2.5 mr-1 inline" />}
                        {user.role}
                      </Badge>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${planColor(user.plan)}`}>
                        {user.plan}
                      </span>
                      {user.period_end && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          ends <LocalDate date={user.period_end} />
                        </p>
                      )}
                    </td>

                    {/* Scripts */}
                    <td className="px-4 py-3 text-sm text-gray-300 tabular-nums text-right whitespace-nowrap">
                      {user.scripts_used > 0 ? (
                        <span className="font-semibold text-violet-300">{user.scripts_used}</span>
                      ) : (
                        <span className="text-gray-600">0</span>
                      )}
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(user.last_activity)}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {timeAgo(user.last_sign_in)}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <LocalDate date={user.created_at} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={user.role}
                          disabled={changingRole === user.id}
                          onChange={e => changeRole(user.id, e.target.value)}
                          className="appearance-none bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer pr-5 disabled:opacity-50"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"/> Active</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block"/> Unconfirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400 inline-block"/> Canceled</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400 inline-block"/> Past due</span>
      </div>
    </div>
  )
}
