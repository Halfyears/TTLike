import { Card, CardContent } from '@/components/ui/Card'
import { Users, Video, FileText, Link2, TrendingUp, Zap } from 'lucide-react'

export const metadata = { title: 'Admin Dashboard · TTLike' }

const KPI_CARDS = [
  { label: 'Total Users', value: '0', icon: Users, change: '+0 today', color: 'text-blue-400' },
  { label: 'Videos Tracked', value: '0', icon: Video, change: '0 new today', color: 'text-green-400' },
  { label: 'Blog Posts', value: '0', icon: FileText, change: '0 published', color: 'text-yellow-400' },
  { label: 'Affiliate Clicks', value: '0', icon: Link2, change: '0 this week', color: 'text-pink-400' },
  { label: 'Scripts Generated', value: '0', icon: Zap, change: '0 today', color: 'text-violet-400' },
  { label: 'Viral Products', value: '0', icon: TrendingUp, change: '>70 score', color: 'text-red-400' },
]

export default function AdminDashboardPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">Platform overview and KPIs</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {KPI_CARDS.map(({ label, value, icon: Icon, change, color }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="text-3xl font-black text-white mb-1">{value}</div>
            <div className="text-xs text-gray-500">{change}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {['No recent activity', 'Connect your database to see data'].map((msg, i) => (
              <div key={i} className="text-sm text-gray-400 py-2 border-b border-gray-700 last:border-0">{msg}</div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Database', status: 'Connect in .env.local', ok: false },
              { label: 'Claude AI', status: 'Set ANTHROPIC_API_KEY', ok: false },
              { label: 'Supabase', status: 'Set SUPABASE keys', ok: false },
              { label: 'Stripe', status: 'Disabled (Beta Phase)', ok: true },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
