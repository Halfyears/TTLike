'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Users, CreditCard, Zap, ShieldCheck,
  ChevronDown, Search, CheckCircle, XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  sub_status: string
  period_end: string | null
  stripe_id: string | null
  scripts_used: number
  last_activity: string | null
  last_sign_in: string | null
  confirmed: boolean
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ago(iso: string | null) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(d / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function planColor(plan: string) {
  if (plan === 'ENTERPRISE') return 'bg-violet-900/40 text-violet-300 border border-violet-700'
  if (plan === 'PRO')        return 'bg-pink-900/40 text-pink-300 border border-pink-700'
  return 'bg-gray-700 text-gray-300 border border-gray-600'
}

function statusDot(status: string, confirmed: boolean) {
  if (!confirmed) return <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" title="Email not confirmed" />
  if (status === 'ACTIVE')   return <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" title="Active" />
  if (status === 'CANCELED') return <span className="h-2 w-2 rounded-full bg-red-400 inline-block" title="Canceled" />
  if (status === 'PAST_DUE') return <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" title="Past due" />
  return <span className="h-2 w-2 rounded-full bg-gray-500 inline-block" />
}

// ── Stat card ─────────────────────────────────────────────────────────────────
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
  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [changingRole, setChangingRole] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
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
    if (planFilter) list = list.filter(u => u.plan === planFilter)
    if (roleFilter) list = list.filter(u => u.role === roleFilter)
    return list
  }, [users, search, planFilter, roleFilter])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">User Management</h1>
          <p className="text-gray-400 text-sm">{users.length} registered accounts</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Users}       label="Total Users"       value={kpis.total}        color="text-blue-400" />
        <KpiCard icon={CheckCircle} label="Confirmed Email"   value={kpis.confirmed}    color="text-emerald-400" />
        <KpiCard icon={CreditCard}  label="Paid Subscribers"  value={kpis.pro}          color="text-pink-400" />
        <KpiCard icon={Zap}         label="Scripts Generated" value={kpis.totalScripts} color="text-violet-400" />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
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
                  {['Status','Email / Name','Role','Plan','Scripts','Last Active','Last Login','Joined','Actions'].map(h => (
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
                          ends {new Date(user.period_end).toLocaleDateString()}
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
                      {ago(user.last_activity)}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {ago(user.last_sign_in)}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"/> Active</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block"/> Unconfirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400 inline-block"/> Canceled</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400 inline-block"/> Past due</span>
      </div>
    </div>
  )
}
