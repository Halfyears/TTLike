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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {firstName}!</h1>
      <p className="text-gray-600 mb-8">What do you want to do today?</p>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}>
            <Card hover className="h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`shrink-0 h-10 w-10 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Scripts Generated', value: scriptCount.toString(), sub: 'Total' },
          { label: 'Products Viewed', value: '—', sub: 'This week' },
          { label: 'Hooks Saved', value: '—', sub: 'Total' },
          { label: 'Plan', value: 'Free', sub: 'All features included' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              <div className="text-xs text-pink-500 mt-0.5">{stat.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top products */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Top Products</h2>
        <Link href="/products" className="text-pink-500 text-sm font-medium flex items-center gap-1 hover:text-pink-600">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {topProducts.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No data yet — the scraper runs at noon and midnight Pacific.</p>
      ) : (
        <div className="space-y-2">
          {topProducts.map((product, i) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card hover>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-200 w-6">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.niche}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                    <Zap className="h-3 w-3" /> {product.score}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
