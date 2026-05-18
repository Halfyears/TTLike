import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Affiliates · Admin · TTLike' }

export default async function AdminAffiliatesPage() {
  let links: Array<{ id: string; code: string; destination: string; clicks: number; conversions: number; revenue: unknown; isActive: boolean; createdAt: Date }> = []
  try {
    links = await prisma.affiliateLink.findMany({
      orderBy: { clicks: 'desc' },
      take: 100,
    })
  } catch {
    // DB not connected
  }

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)
  const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0)

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Affiliate Tracking</h1>
        <p className="text-gray-400 text-sm">{links.length} affiliate links</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Links', value: links.length.toString() },
          { label: 'Total Clicks', value: totalClicks.toLocaleString() },
          { label: 'Conversions', value: totalConversions.toLocaleString() },
          { label: 'Conv. Rate', value: totalClicks > 0 ? `${((totalConversions / totalClicks) * 100).toFixed(1)}%` : '0%' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {links.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No affiliate links found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {['Code', 'Destination', 'Clicks', 'Conversions', 'Revenue', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {links.map(link => (
                <tr key={link.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-pink-400">{link.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">{link.destination}</td>
                  <td className="px-4 py-3 text-sm text-white">{link.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-white">{link.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-green-400">${String(link.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(link.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
