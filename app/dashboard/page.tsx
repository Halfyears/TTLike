import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, Search, TrendingUp, BookOpen, ArrowRight, ChevronRight } from 'lucide-react'
import { IS_BETA_PHASE } from '@/lib/constants'

export const metadata = { title: 'Dashboard · TTLike' }

const QUICK_ACTIONS = [
  { href: '/dashboard/ai-scripts', icon: Zap,        label: 'AI Scripts',  color: 'bg-pink-500' },
  { href: '/products',             icon: Search,      label: 'Products',    color: 'bg-blue-500' },
  { href: '/trending',             icon: TrendingUp,  label: 'Trending',    color: 'bg-emerald-500' },
  { href: '/hooks',                icon: BookOpen,    label: 'Hook Library',color: 'bg-violet-500' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

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
    <div className="max-w-2xl mx-auto">

      {/* Beta banner */}
      {IS_BETA_PHASE && (
        <div className="mb-4 px-3 py-2.5 bg-pink-50 border border-pink-100 rounded-xl">
          <p className="text-xs font-medium text-pink-600">
            🎉 Beta — All Pro features free. No credit card needed.
          </p>
        </div>
      )}

      {/* Welcome */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
        <p className="text-sm text-gray-400 mt-0.5">What do you want to do today?</p>
      </div>

      {/* ── PRIMARY CTA ── */}
      <Link href="/dashboard/ai-scripts" className="block mb-3">
        <div className="w-full flex items-center justify-between bg-gradient-to-r from-pink-500 to-violet-600 text-white rounded-2xl px-5 py-4 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-base">Generate AI Scripts</p>
              <p className="text-xs text-pink-100 mt-0.5">Create 5 viral scripts with Claude AI</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-70 shrink-0" />
        </div>
      </Link>

      {/* ── SECONDARY ACTIONS — 3 compact tiles ── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {QUICK_ACTIONS.slice(1).map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 py-3 px-2 hover:shadow-sm transition-shadow">
              <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── YOUR ACTIVITY — horizontal scroll row ── */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Activity</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 mb-6 scrollbar-hide">
        {[
          { label: 'Scripts',  value: scriptCount.toString(), accent: 'text-pink-500' },
          { label: 'Products', value: '—',                   accent: 'text-blue-500' },
          { label: 'Hooks',    value: '—',                   accent: 'text-violet-500' },
          { label: 'Plan',     value: 'Free',                accent: 'text-emerald-500' },
        ].map(stat => (
          <div key={stat.label} className="shrink-0 w-20 sm:w-auto bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className={`text-xl font-black ${stat.accent}`}>{stat.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── TOP PRODUCTS ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Products</p>
        <Link href="/products" className="flex items-center gap-0.5 text-pink-500 text-xs font-semibold hover:text-pink-600">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {topProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-400">Scraper runs at noon &amp; midnight Pacific.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topProducts.map((product, i) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm transition-shadow">
                <span className="text-sm font-black text-gray-200 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.niche}</p>
                </div>
                <div className="flex items-center gap-1 bg-pink-50 text-pink-600 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                  <Zap className="h-3 w-3" />{product.score}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
