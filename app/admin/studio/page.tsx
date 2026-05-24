/**
 * /admin/studio — Drama Breakdown Management
 *
 * Displays all drama generations across all users.
 * Uses service client to bypass RLS (admin view).
 */

import { createServiceClient } from '@/lib/supabase/server'
import { Clapperboard, CheckCircle2, XCircle, Clock, Users } from 'lucide-react'

export const metadata = { title: 'Studio Management · TTLike Admin' }
export const dynamic  = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DramaRow {
  id:          number
  user_id:     string
  title:       string
  status:      'PENDING' | 'COMPLETED' | 'FAILED'
  scene_count: number | null
  raw_script:  string | null
  created_at:  string
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getDramas(): Promise<DramaRow[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('dramas')
      .select('id, user_id, title, status, scene_count, raw_script, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as DramaRow[]
  } catch (e) {
    console.error('[admin/studio]', e)
    return []
  }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DramaRow['status'] }) {
  if (status === 'COMPLETED') return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
      <CheckCircle2 className="h-3 w-3" /> COMPLETED
    </span>
  )
  if (status === 'FAILED') return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800">
      <XCircle className="h-3 w-3" /> FAILED
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-800">
      <Clock className="h-3 w-3" /> PENDING
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StudioAdminPage() {
  const dramas = await getDramas()

  const total     = dramas.length
  const completed = dramas.filter(d => d.status === 'COMPLETED').length
  const failed    = dramas.filter(d => d.status === 'FAILED').length
  const pending   = dramas.filter(d => d.status === 'PENDING').length
  const avgScenes = completed > 0
    ? Math.round(dramas.filter(d => d.status === 'COMPLETED' && d.scene_count).reduce((s, d) => s + (d.scene_count ?? 0), 0) / completed)
    : 0
  const uniqueUsers = new Set(dramas.map(d => d.user_id)).size

  const KPI_CARDS = [
    { label: 'Total Dramas',   value: total,       icon: Clapperboard, color: 'text-indigo-400' },
    { label: 'Completed',      value: completed,   icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Failed',         value: failed,      icon: XCircle,      color: 'text-red-400' },
    { label: 'Pending',        value: pending,     icon: Clock,        color: 'text-yellow-400' },
    { label: 'Avg Scenes',     value: avgScenes,   icon: Clapperboard, color: 'text-cyan-400' },
    { label: 'Unique Users',   value: uniqueUsers, icon: Users,        color: 'text-pink-400' },
  ]

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Studio Management</h1>
        <p className="text-gray-400 text-sm">All drama breakdown generations — across all users</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {dramas.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <Clapperboard className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No dramas generated yet.</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Scenes</th>
                  <th className="px-4 py-3 text-left">Script Preview</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {dramas.map((d, i) => (
                  <tr key={d.id}
                    className={`border-b border-gray-700/50 last:border-0 hover:bg-gray-750 transition-colors ${
                      d.status === 'FAILED' ? 'bg-red-950/10' : ''
                    }`}>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{d.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium text-xs line-clamp-1 max-w-[180px] block">
                        {d.title || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 font-mono text-[10px]">
                        {d.user_id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 text-xs">
                      {d.scene_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-gray-500 text-[11px] line-clamp-1 italic">
                        {d.raw_script ? `${d.raw_script.slice(0, 80)}…` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
            Showing {dramas.length} most recent dramas
          </div>
        </div>
      )}
    </div>
  )
}
