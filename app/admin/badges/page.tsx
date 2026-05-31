import { prisma } from '@/lib/prisma'
import { BADGE_LABELS } from '@/lib/behavior/badge-engine'
import type { BadgeType } from '@/lib/behavior/badge-engine'
import { fmtDateTime } from '@/lib/dateUtils'

export const metadata = { title: 'Badges · Admin' }

export default async function AdminBadgesPage() {
  const [distribution, recent] = await Promise.all([
    prisma.badgeLog.groupBy({
      by:      ['badgeType'],
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.badgeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    100,
      select:  { id: true, userId: true, badgeType: true, createdAt: true },
    }),
  ])

  const total = distribution.reduce((sum, d) => sum + d._count.id, 0)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Badge Distribution</h1>
        <p className="text-xs text-gray-500 mt-0.5">Read-only · {total} badges issued total</p>
      </div>

      {/* Distribution */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Badge</th>
              <th className="text-left px-4 py-3">Internal key</th>
              <th className="text-right px-4 py-3">Count</th>
              <th className="text-right px-4 py-3">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {distribution.map((d) => (
              <tr key={d.badgeType}>
                <td className="px-4 py-3 text-gray-800 font-medium">
                  {BADGE_LABELS[d.badgeType as BadgeType] ?? d.badgeType}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{d.badgeType}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{d._count.id}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                  {total > 0 ? `${Math.round((d._count.id / total) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent issuances */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Issuances (last 100)</h2>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Badge</th>
                <th className="text-left px-4 py-3">User ID</th>
                <th className="text-right px-4 py-3">Issued at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-gray-800 font-medium text-xs">
                    {BADGE_LABELS[r.badgeType as BadgeType] ?? r.badgeType}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 truncate max-w-[160px]">
                    {r.userId}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {fmtDateTime(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
