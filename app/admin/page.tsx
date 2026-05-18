import { createClient } from '@/lib/supabase/server'
import { Users, Video, FileText, Link2, TrendingUp, Zap, Activity } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Admin Dashboard · TTLike' }

async function getKpis() {
  try {
    const supabase = await createClient()
    const [videos, users, blogs, affiliates, scripts, scraper] = await Promise.all([
      supabase.from('tiktok_videos').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      supabase.from('affiliate_links').select('clicks').eq('is_active', true),
      supabase.from('user_analytics').select('*', { count: 'exact', head: true }).eq('event', 'script_generated'),
      supabase.from('tiktok_videos').select('*', { count: 'exact', head: true }).gte('viral_score', 70),
    ])
    const totalClicks = (affiliates.data ?? []).reduce((s: number, r: { clicks: number }) => s + (r.clicks ?? 0), 0)
    return {
      users: users.count ?? 0,
      videos: videos.count ?? 0,
      blogs: blogs.count ?? 0,
      affiliateClicks: totalClicks,
      scripts: scripts.count ?? 0,
      viralProducts: scraper.count ?? 0,
    }
  } catch {
    return { users: 0, videos: 0, blogs: 0, affiliateClicks: 0, scripts: 0, viralProducts: 0 }
  }
}

async function getRecentActivity() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('scraper_logs').select('status, message, videos_fetched, created_at').order('created_at', { ascending: false }).limit(5)
    return data ?? []
  } catch {
    return []
  }
}

export default async function AdminDashboardPage() {
  const [kpis, activity] = await Promise.all([getKpis(), getRecentActivity()])

  const KPI_CARDS = [
    { label: 'Total Users', value: kpis.users.toLocaleString(), icon: Users, change: 'Registered accounts', color: 'text-blue-400' },
    { label: 'Videos Tracked', value: kpis.videos.toLocaleString(), icon: Video, change: 'In database', color: 'text-green-400' },
    { label: 'Blog Posts', value: kpis.blogs.toLocaleString(), icon: FileText, change: 'Published', color: 'text-yellow-400' },
    { label: 'Affiliate Clicks', value: kpis.affiliateClicks.toLocaleString(), icon: Link2, change: 'Total clicks', color: 'text-pink-400' },
    { label: 'Scripts Generated', value: kpis.scripts.toLocaleString(), icon: Zap, change: 'By users', color: 'text-violet-400' },
    { label: 'Viral Products', value: kpis.viralProducts.toLocaleString(), icon: TrendingUp, change: 'Score ≥ 70', color: 'text-red-400' },
  ]

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scraper activity */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Scraper Runs</h2>
            <Link href="/admin/scraper" className="text-pink-400 hover:text-pink-300 text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" /> Monitor
            </Link>
          </div>
          <div className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No scraper runs yet.</p>
            ) : activity.map((a: { status: string; message: string; videos_fetched: number; created_at: string }, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-700 last:border-0">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.status === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {a.status === 'success' ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-300 flex-1 truncate">{a.message}</span>
                {a.status === 'success' && (
                  <span className="text-xs text-gray-500">{a.videos_fetched} videos</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Database', status: kpis.videos > 0 ? 'Connected' : 'Check SUPABASE keys', ok: kpis.videos > 0 },
              { label: 'Gemini AI', status: 'Set GEMINI_API_KEY', ok: false },
              { label: 'GitHub Actions', status: 'Runs every 6 hours', ok: true },
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
