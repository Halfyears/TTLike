import { createServiceClient } from '@/lib/supabase/server'
import {
  Users, Video, FileText, Link2, TrendingUp, Zap,
  Activity, CreditCard, Flame, Star, BarChart2,
} from 'lucide-react'
import Link from 'next/link'
import { AdminKpiCard } from '@/components/admin/AdminKpiCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin Dashboard · TTLike' }

// ── Gemini ping ───────────────────────────────────────────────────────────────
async function checkGemini(): Promise<{ ok: boolean; latency_ms?: number; error?: string }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
    const res = await fetch(`${base}/api/admin/gemini-ping`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return await res.json() as { ok: boolean; latency_ms?: number; error?: string }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

// ── KPI data ──────────────────────────────────────────────────────────────────
async function getDashboardData() {
  try {
    const service = createServiceClient()
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    const [
      videosRes, usersRes, planRes, blogsRes,
      affRes, scriptsTotalRes, scriptsWeekRes,
      viralHitRes, breakdownsRes,
    ] = await Promise.all([
      service.from('tiktok_videos').select('*', { count: 'exact', head: true }),
      service.from('users').select('*', { count: 'exact', head: true }),
      service.from('user_subscriptions').select('plan'),  // plan lives in user_subscriptions, not users
      service.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      service.from('affiliate_links').select('clicks, conversions').eq('is_active', true),
      service.from('ledger_event_kernel').select('payload').eq('event_type', 'COMPLETE'),
      service.from('ledger_event_kernel').select('*', { count: 'exact', head: true })
        .eq('event_type', 'COMPLETE').gte('emitted_at', weekAgo),
      service.from('tiktok_videos').select('*', { count: 'exact', head: true }).eq('is_viral_hit', true),
      service.from('video_breakdowns').select('*', { count: 'exact', head: true }),
    ])

    // Plan split
    const planMap: Record<string, number> = {}
    for (const u of planRes.data ?? []) {
      const p = (u as { plan: string }).plan ?? 'FREE'
      planMap[p] = (planMap[p] ?? 0) + 1
    }

    const totalScripts = (scriptsTotalRes.data ?? []).reduce(
      (acc, r) => acc + Number((r.payload as Record<string, unknown>)?.script_count ?? 1), 0,
    )
    const affClicks      = (affRes.data ?? []).reduce((s, r) => s + ((r as { clicks: number }).clicks ?? 0), 0)
    const affConversions = (affRes.data ?? []).reduce((s, r) => s + ((r as { conversions: number }).conversions ?? 0), 0)

    return {
      videos:          videosRes.count      ?? 0,
      users:           usersRes.count       ?? 0,
      blogs:           blogsRes.count       ?? 0,
      viralHits:       viralHitRes.count    ?? 0,
      breakdowns:      breakdownsRes.count  ?? 0,
      planFree:        planMap['FREE']       ?? 0,
      planCreator:     planMap['PRO']        ?? 0,
      planScale:       planMap['ENTERPRISE'] ?? 0,
      totalScripts,
      scriptsThisWeek: scriptsWeekRes.count ?? 0,
      affClicks,
      affConversions,
    }
  } catch {
    return {
      videos: 0, users: 0, blogs: 0, viralHits: 0, breakdowns: 0,
      planFree: 0, planCreator: 0, planScale: 0,
      totalScripts: 0, scriptsThisWeek: 0, affClicks: 0, affConversions: 0,
    }
  }
}

async function getRecentActivity() {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('scraper_logs')
      .select('status, message, videos_fetched, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    return data ?? []
  } catch { return [] }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const [d, activity, gemini] = await Promise.all([
    getDashboardData(), getRecentActivity(), checkGemini(),
  ])

  const paidTotal = d.planCreator + d.planScale
  const estMRR    = d.planCreator * 29 + d.planScale * 99

  return (
    <div className="max-w-6xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">Platform overview · KPIs · System health</p>
      </div>

      {/* ── User Distribution ── */}
      <section>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">User Distribution</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKpiCard icon={Users}      label="Total Users"   value={d.users}       sub="registered accounts" color="blue"   href="/admin/users" />
          <AdminKpiCard icon={Zap}        label="Free Plan"     value={d.planFree}    sub="no subscription"     color="gray"   href="/admin/users" />
          <AdminKpiCard icon={CreditCard} label="Creator (Pro)" value={d.planCreator} sub="$29 / month"         color="pink"   href="/admin/users" />
          <AdminKpiCard icon={Star}       label="Scale (Ent.)"  value={d.planScale}   sub="$99 / month"         color="violet" href="/admin/users" />
        </div>
      </section>

      {/* ── AI Engine Usage ── */}
      <section>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">AI Engine · Usage</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKpiCard icon={Flame}      label="Scripts Generated" value={d.totalScripts}    sub="all time"        color="pink"   href="/admin/scripts" />
          <AdminKpiCard icon={BarChart2}  label="Scripts This Week" value={d.scriptsThisWeek} sub="last 7 days"     color="violet" href="/admin/scripts" />
          <AdminKpiCard icon={Zap}        label="AI Breakdowns"     value={d.breakdowns}      sub="cached analyses" color="amber"  href="/admin/breakdowns" />
          <AdminKpiCard icon={TrendingUp} label="Super Viral Hits"  value={d.viralHits}       sub="analysed ≥ 5×"   color="red"    href="/admin/videos" />
        </div>
      </section>

      {/* ── Content & Growth ── */}
      <section>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Content &amp; Growth</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKpiCard icon={Video}    label="Videos Tracked"   value={d.videos}         sub="in database"        color="emerald" href="/admin/videos" />
          <AdminKpiCard icon={FileText} label="Blog Posts"       value={d.blogs}          sub="published"          color="blue"    href="/admin/blog" />
          <AdminKpiCard icon={Link2}    label="Aff. Clicks"      value={d.affClicks}      sub="active links total" color="pink"    href="/admin/affiliates" />
          <AdminKpiCard icon={Link2}    label="Conversions"      value={d.affConversions} sub="affiliate sign-ups" color="emerald" href="/admin/affiliates" />
        </div>
      </section>

      {/* ── Revenue Summary ── */}
      <section>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-pink-400" /> Paid Subscribers &amp; Est. MRR
          </h2>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-3xl font-black text-white tabular-nums">{paidTotal}</p>
              <p className="text-xs text-gray-500 mt-0.5">total paid</p>
            </div>
            <div className="h-10 w-px bg-gray-700" />
            <div>
              <p className="text-xl font-black text-pink-300 tabular-nums">{d.planCreator}</p>
              <p className="text-xs text-gray-500 mt-0.5">Creator · $29</p>
            </div>
            <div>
              <p className="text-xl font-black text-violet-300 tabular-nums">{d.planScale}</p>
              <p className="text-xs text-gray-500 mt-0.5">Scale · $99</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Est. MRR</p>
              <p className="text-lg font-black text-emerald-400 tabular-nums">
                ${estMRR.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-600">assumes monthly billing</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Activity + System ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Scraper runs */}
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
            ) : (activity as Array<{ status: string; message: string; videos_fetched: number; created_at: string }>).map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-700 last:border-0">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.status === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {a.status === 'success' ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-300 flex-1 truncate">{a.message}</span>
                {a.status === 'success' && <span className="text-xs text-gray-500">{a.videos_fetched} videos</span>}
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {([
              { label: 'Database',       status: d.videos > 0 ? 'Connected' : 'Check SUPABASE keys', ok: d.videos > 0 },
              { label: 'GitHub Actions', status: 'Runs every 6 hours',   ok: true },
              { label: 'Stripe',         status: 'Configured', ok: true },
            ] as const).map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                  {status}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Gemini AI</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${gemini.ok ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {gemini.ok ? `OK · ${gemini.latency_ms}ms` : (gemini.error ?? 'Unreachable')}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
