import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Search, TrendingUp, BookOpen,
  Clapperboard, ArrowRight, ChevronRight,
} from 'lucide-react'
import { ViralStudioCard } from '@/components/dashboard/ViralStudioCard'
import { Greeting }  from '@/components/ui/Greeting'
import { DashboardTracker } from '@/components/DashboardTracker'

export const metadata = { title: 'Dashboard · TTLike' }

// ── Viral score bar ───────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round((score / 100) * 100))
  const color =
    pct >= 80 ? 'from-pink-500 to-rose-400' :
    pct >= 60 ? 'from-orange-400 to-amber-400' :
                'from-blue-400 to-cyan-400'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 tabular-nums w-8 text-right shrink-0">{score}</span>
    </div>
  )
}

// ── Niche pill ────────────────────────────────────────────────────────────────
const NICHE_COLORS: Record<string, string> = {
  'Beauty & Skincare': 'bg-pink-50 text-pink-700',
  'Tech & Gadgets':    'bg-blue-50 text-blue-700',
  'Health & Fitness':  'bg-green-50 text-green-700',
  'Fashion':           'bg-violet-50 text-violet-700',
  'Home & Garden':     'bg-amber-50 text-amber-700',
  'Food & Kitchen':    'bg-orange-50 text-orange-700',
}
function NichePill({ niche }: { niche: string }) {
  const cls = NICHE_COLORS[niche] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {niche}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Strip non-alphanumeric chars to prevent XSS in greeting display
  const rawName = (user?.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there'
  const firstName = rawName.replace(/[^a-zA-Z0-9一-龥_\- ]/g, '').slice(0, 30) || 'there'

  // ── Top products (5s timeout guard) ──────────────────────────────────────────
  let topProducts: Array<{ id: string; name: string; niche: string; score: number }> = []
  try {
    const timeout = new Promise<null>(r => setTimeout(() => r(null), 5000))
    const query   = supabase
      .from('tiktok_videos')
      .select('id, product_name, title, niche, viral_score')
      .order('viral_score', { ascending: false })
      .limit(5)
    const result = await Promise.race([query, timeout])
    const data = result && 'data' in result ? result.data : null
    if (data?.length) {
      topProducts = data.map(r => ({
        id:    r.id,
        name:  r.product_name ?? r.title ?? '',
        niche: r.niche ?? 'General',
        score: Math.round(r.viral_score ?? 0),
      }))
    }
  } catch { /* ignore — show empty state */ }

  // ── Ledger stats ──────────────────────────────────────────────────────────────
  let totalGenerations = 0
  let totalScripts     = 0
  let weekGenerations  = 0
  try {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const [{ count: total }, { count: week }, { data: payloads }] = await Promise.all([
      supabase.from('ledger_event_kernel').select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id ?? '').eq('event_type', 'COMPLETE'),
      supabase.from('ledger_event_kernel').select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id ?? '').eq('event_type', 'COMPLETE').gte('emitted_at', weekAgo),
      supabase.from('ledger_event_kernel').select('payload')
        .eq('user_id', user?.id ?? '').eq('event_type', 'COMPLETE'),
    ])
    totalGenerations = total ?? 0
    weekGenerations  = week  ?? 0
    totalScripts = (payloads ?? []).reduce(
      (acc, r) => acc + Number((r.payload as Record<string, unknown>)?.script_count ?? 1), 0,
    )
  } catch { /* ledger not yet seeded */ }

  return (
    <div className="space-y-5">
      <DashboardTracker page="dashboard" />

      {/* ── Greeting — lightweight, light background ── */}
      <div className="px-1 pt-1">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          <Greeting firstName={firstName ?? 'there'} />
        </h1>
        <p className="mt-0.5 text-sm text-gray-400">Your TikTok viral intelligence hub.</p>
      </div>

      {/* ── Viral Studio — primary action, full width ── */}
      <ViralStudioCard />

      {/* ── Create & Discover ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">Create & Discover</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Storyboard (Drama Studio) */}
          <Link href="/dashboard/studio" className="group" data-track-feature="ai-studio">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 overflow-hidden shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all">
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Clapperboard className="h-4 w-4 text-white" />
                </div>
                <p className="font-black text-white text-sm leading-tight">Storyboard</p>
                <p className="text-violet-100 text-xs mt-1 leading-snug">Characters + shot-by-shot breakdowns</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                  Open <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>

          {/* Hook Library */}
          <Link href="/hooks" className="group" data-track-feature="hook-library">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 overflow-hidden shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:scale-[1.02] transition-all">
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <p className="font-black text-white text-sm leading-tight">Hook Library</p>
                <p className="text-amber-100 text-xs mt-1 leading-snug">12 proven viral hook patterns</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                  Browse <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Discover row */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { href: '/products', icon: Search,     label: 'Products',  sub: '10K+ tracked',   color: 'text-blue-500',  bg: 'bg-blue-50',  border: 'border-blue-100', track: 'products' },
            { href: '/trending', icon: TrendingUp, label: 'Trending',  sub: 'Updated daily',  color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100', track: 'trending' },
          ].map(({ href, icon: Icon, label, sub, color, bg, border, track }) => (
            <Link
              key={href}
              href={href}
              data-track-feature={track}
              className={`flex items-center gap-3 p-3.5 rounded-xl border ${border} ${bg} hover:scale-[1.02] active:scale-[0.98] transition-all`}
            >
              <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 leading-tight">{label}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Today's Viral Products — card style ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">🔥 Today&apos;s Viral Products</p>
          <Link href="/products" className="flex items-center gap-1 text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {topProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No data yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Scraper runs at noon & midnight Pacific</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {topProducts.map((product, i) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-pink-200 hover:bg-pink-50/30 active:scale-[0.99] transition-all group"
              >
                <span className={`text-sm font-black w-5 shrink-0 tabular-nums ${
                  i === 0 ? 'text-pink-500' : i === 1 ? 'text-orange-400' : i === 2 ? 'text-amber-400' : 'text-gray-300'
                }`}>{i + 1}</span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate leading-tight group-hover:text-pink-600 transition-colors">
                    {product.name}
                  </p>
                  <NichePill niche={product.niche} />
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs font-black text-gray-700">{product.score}</div>
                  <div className="text-[10px] text-gray-400">viral score</div>
                </div>

                <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-pink-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
