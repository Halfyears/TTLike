'use client'

/**
 * /admin/users/sources?source=xxx
 * Shows all users from a given referral source.
 * Each user row links to their detail page.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams }  from 'next/navigation'
import Link                 from 'next/link'
import {
  ArrowLeft, Users, RefreshCw, ExternalLink,
  AlertTriangle, ChevronRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SourceUser {
  id:              string
  email:           string
  name:            string | null
  role:            string
  plan:            string
  sub_status:      string
  referral_source: string | null
  account_status:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function planColor(plan: string) {
  if (plan === 'ENTERPRISE') return 'bg-violet-900/40 text-violet-300 border border-violet-700'
  if (plan === 'PRO')        return 'bg-pink-900/40 text-pink-300 border border-pink-700'
  return 'bg-gray-700 text-gray-300 border border-gray-600'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE:   'bg-emerald-900/40 text-emerald-300',
    PENDING:  'bg-yellow-900/40 text-yellow-300',
    INACTIVE: 'bg-gray-700 text-gray-400',
    DELETED:  'bg-red-900/40 text-red-300',
  }
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserSourcesPage() {
  const sp     = useSearchParams()
  const source = sp.get('source') ?? ''

  const [users,   setUsers]   = useState<SourceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ source })
      const res    = await fetch(`/api/admin/users/sources?${params}`)
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setUsers(data.users as SourceUser[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => { load() }, [load])

  const displaySource = source === '__direct__' ? '(direct / none)' : (source || 'All sources')

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Users
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Source: {displaySource}</h1>
          </div>
          {!loading && (
            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
              {users.length} users
            </span>
          )}
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
        <div className="px-4 py-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No users from this source.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {users.map(u => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/admin/users/${u.id}`}
                  >
                    {/* User name + email */}
                    <td className="px-5 py-3 max-w-[260px]">
                      <p className="text-sm font-medium text-white truncate">
                        {u.name ?? u.email}
                      </p>
                      {u.name && (
                        <p className="text-xs text-gray-500 truncate mt-0.5 font-mono">{u.email}</p>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${planColor(u.plan)}`}>
                        {u.plan}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusBadge(u.account_status)}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${u.role === 'ADMIN' ? 'text-red-400' : 'text-gray-400'}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Arrow */}
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Back link */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to all users
        </Link>
      </div>
    </div>
  )
}
