import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, Search, TrendingUp, BookOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { IS_BETA_PHASE } from '@/lib/constants'

export const metadata = { title: 'Dashboard · TTLike' }

const QUICK_ACTIONS = [
  { href: '/dashboard/ai-scripts', icon: Zap, label: 'Generate AI Scripts', desc: 'Create viral UGC scripts in seconds', color: 'text-pink-500 bg-pink-50' },
  { href: '/products', icon: Search, label: 'Browse Products', desc: 'Find your next winning product', color: 'text-blue-500 bg-blue-50' },
  { href: '/trending', icon: TrendingUp, label: 'View Trending', desc: 'See what\'s going viral today', color: 'text-green-500 bg-green-50' },
  { href: '/hooks', icon: BookOpen, label: 'Hook Library', desc: 'Browse proven hook patterns', color: 'text-violet-500 bg-violet-50' },
]


export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  // Top products from DB
  let topProducts: Array<{ id: string; name: string; niche: string; score: number }> = []
  try {
    const { data } = await supabase
      .from('tiktok_videos')
      .select('id, product_name, title, niche, viral_score')
      .order('viral_score', { ascending: false })
      .limit(3)
    if (data && data.length > 0) {
      topProducts = data.map(r => ({
        id: r.id,
        name: r.product_name ?? r.title,
        niche: r.niche ?? 'General',
        score: Math.round(r.viral_score),
      }))
    }
  } catch { /* ignore */ }

  // User script count
  let scriptCount = 0
  try {
    const { count } = await supabase
      .from('user_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id ?? '')
      .eq('event', 'script_generated')
    scriptCount = count ?? 0
  } catch { /* ignore */ }

  return (
    <div className="max-w-5xl">
      {IS_BETA_PHASE && (
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-100 rounded-xl">
          <p className="text-sm font-medium text-pink-700">
            🎉 You&apos;re in Beta! All Pro features are free. No credit card needed.
          </p>
        </div>
      )}

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5">Welcome back, {firstName}!</h1>
      <p className="text-gray-500 text-sm mb-6">What do you want to do today?</p>

      {/* Quick Actions — compact 2×2 on mobile, descriptive on desktop */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 h-full">
              <div className={`shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block leading-tight">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Your Activity — always 1×4 single row */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Activity</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Scripts', value: scriptCount.toString(), sub: 'Generated' },
          { label: 'Viewed', value: '—', sub: 'Products' },
          { label: 'Saved', value: '—', sub: 'Hooks' },
          { label: 'Plan', value: 'Free', sub: 'Beta' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-2.5 sm:p-4 text-center">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 leading-tight">{stat.label}</div>
            <div className="text-[10px] text-pink-400 leading-tight hidden sm:block">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's Top Products — compact rows */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Top Products</h2>
        <Link href="/products" className="text-pink-500 text-xs font-semibold flex items-center gap-0.5 hover:text-pink-600">
          All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {topProducts.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">No data yet — scraper runs at noon and midnight Pacific.</p>
      ) : (
        <div className="space-y-1.5">
          {topProducts.map((product, i) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 px-3 py-2.5 hover:shadow-sm transition-shadow">
                <span className="text-base font-black text-gray-200 w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-[10px] text-gray-400">{product.niche}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full shrink-0">
                  <Zap className="h-2.5 w-2.5" /> {product.score}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
