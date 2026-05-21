import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Zap, Search, TrendingUp, BookOpen,
  Clapperboard, ArrowRight, Flame, BarChart2,
  Sparkles, ChevronRight,
} from 'lucide-react'
import { IS_BETA_PHASE } from '@/lib/constants'

export const metadata = { title: 'Dashboard · TTLike' }

// ── Greeting by time-of-day (server-side) ─────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

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

  const firstName = (user?.user_metadata?.name as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there'

  // ── Top products ─────────────────────────────────────────────────────────────
  let topProducts: Array<{ id: string; name: string; niche: string; score: number }> = []
  try {
    const { data } = await supabase
      .from('tiktok_videos')
      .select('id, product_name, title, niche, viral_score')
      .order('viral_score', { ascending: false })
      .limit(5)
    if (data?.length) {
      topProducts = data.map(r => ({
        id:    r.id,
        name:  r.product_name ?? r.title,
        niche: r.niche ?? 'General',
        score: Math.round(r.viral_score ?? 0),
      }))
    }
  } catch { /* ignore */ }

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

  const greeting = getGreeting()

  return (
    <div className="space-y-6">

      {/* ── Hero greeting ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-6 sm:px-8 sm:py-8">
        {/* subtle glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative">
          {IS_BETA_PHASE && (
            <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/30">
              <Sparkles className="h-3 w-3 text-pink-400" />
              <span className="text-[11px] font-bold text-pink-300 uppercase tracking-wide">Beta — All Pro features free</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Your AI-powered TikTok command centre.
          </p>
        </div>

        {/* Inline mini-stats */}
        <div className="relative mt-5 flex items-center gap-4 flex-wrap">
          {[
            { label: 'Total generated',  value: totalGenerations, icon: Flame,    color: 'text-pink-400' },
            { label: 'Scripts created',  value: totalScripts,     icon: Zap,      color: 'text-violet-400' },
            { label: 'This week',        value: weekGenerations,  icon: BarChart2, color: 'text-cyan-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Link
              key={label}
              href="/dashboard/usage"
              className="flex items-center gap-2 group"
            >
              <Icon className={`h-4 w-4 ${color} shrink-0`} />
              <span className="text-xl font-black text-white tabular-nums">{value}</span>
              <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Primary CTAs — Create ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">Create</p>
        <div className="grid grid-cols-2 gap-3">
          {/* AI Scripts — primary */}
          <Link href="/dashboard/ai-scripts" className="group col-span-1">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 p-5 overflow-hidden shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 hover:scale-[1.02] transition-all">
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <p className="font-black text-white text-base leading-tight">AI Scripts</p>
                <p className="text-pink-100 text-xs mt-1 leading-snug">Generate viral UGC scripts in seconds</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                  Start creating <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>

          {/* AI Studio */}
          <Link href="/dashboard/studio" className="group col-span-1">
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 overflow-hidden shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all">
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
              <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Clapperboard className="h-5 w-5 text-white" />
                </div>
                <p className="font-black text-white text-base leading-tight">AI Studio</p>
                <p className="text-violet-100 text-xs mt-1 leading-snug">Storyboards with image & video prompts</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                  Open studio <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Secondary CTAs — Discover ── */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-0.5">Discover</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/products',  icon: Search,     label: 'Products',     color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100' },
            { href: '/trending',  icon: TrendingUp, label: 'Trending',     color: 'text-green-500',  bg: 'bg-green-50',  border: 'border-green-100' },
            { href: '/hooks',     icon: BookOpen,   label: 'Hook Library', color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100' },
          ].map(({ href, icon: Icon, label, color, bg, border }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border ${border} ${bg} hover:scale-[1.03] active:scale-[0.98] transition-all`}
            >
              <div className={`h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Today's Top Products ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Today's Top Products</p>
          <Link
            href="/products"
            className="flex items-center gap-1 text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors"
          >
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
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
            {topProducts.map((product, i) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 transition-colors group"
              >
                {/* Rank */}
                <span className={`text-sm font-black w-5 shrink-0 ${
                  i === 0 ? 'text-pink-500' : i === 1 ? 'text-orange-400' : 'text-gray-300'
                }`}>
                  {i + 1}
                </span>

                {/* Name + niche */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate leading-tight group-hover:text-pink-600 transition-colors">
                    {product.name}
                  </p>
                  <div className="mt-0.5">
                    <NichePill niche={product.niche} />
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-28 shrink-0">
                  <ScoreBar score={product.score} />
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-pink-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
