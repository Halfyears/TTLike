import { createServiceClient } from '@/lib/supabase/server'
import { FileText, TrendingUp, Users, BarChart2, Database, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScriptRow {
  id: string
  user_id: string
  product_name: string | null
  niche: string | null
  hook_type: string | null
  script_count: number | null
  keywords: string | null
  brand_name: string | null
  offer: string | null
  created_at: string
  deleted_at: string | null
  source_video_id: string | null
  tiktok_videos: { id: string; title: string | null; product_name: string | null } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtNum(n: number | null | undefined) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function hookBadgeColor(hook: string) {
  const map: Record<string, string> = {
    SURPRISE:     'bg-pink-900/40 text-pink-300',
    QUESTION:     'bg-blue-900/40 text-blue-300',
    EMOTIONAL:    'bg-purple-900/40 text-purple-300',
    FOMO:         'bg-orange-900/40 text-orange-300',
    CONTRARIAN:   'bg-red-900/40 text-red-300',
    STORY:        'bg-teal-900/40 text-teal-300',
    EDUCATIONAL:  'bg-green-900/40 text-green-300',
  }
  return map[hook] ?? 'bg-gray-700 text-gray-400'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminScriptsPage() {
  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('generated_scripts')
    .select('id, user_id, product_name, niche, hook_type, script_count, keywords, brand_name, offer, created_at, deleted_at, source_video_id, tiktok_videos!left(id, title, product_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return (
      <div className="p-6 text-red-400 text-sm">
        Failed to load scripts: {error.message}
      </div>
    )
  }

  const scripts = (rows ?? []) as unknown as ScriptRow[]

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total        = scripts.length
  const weekAgo      = Date.now() - 7 * 86_400_000
  const thisWeek     = scripts.filter(s => new Date(s.created_at).getTime() > weekAgo).length
  const deleted      = scripts.filter(s => s.deleted_at !== null).length
  const uniqueUsers  = new Set(scripts.map(s => s.user_id)).size
  const withVideo    = scripts.filter(s => s.source_video_id !== null).length

  // ── Hook breakdown ─────────────────────────────────────────────────────────
  const hookCounts: Record<string, number> = {}
  for (const s of scripts) {
    const hooks = (s.hook_type ?? '').split('+').filter(Boolean)
    for (const h of hooks) hookCounts[h] = (hookCounts[h] ?? 0) + 1
  }
  const topHook = Object.entries(hookCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-pink-400" /> AI Scripts
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          User-generated TikTok UGC scripts · Gemini 2.5 Flash engine
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Database,   label: 'Total',         value: fmtNum(total),       sub: `${deleted} soft-deleted` },
          { icon: TrendingUp, label: 'This Week',      value: fmtNum(thisWeek),    sub: 'new generations' },
          { icon: Users,      label: 'Unique Users',   value: fmtNum(uniqueUsers), sub: 'generated at least 1' },
          { icon: BarChart2,  label: 'Top Hook',       value: topHook?.[0] ?? '—', sub: topHook ? `${topHook[1]} uses` : 'no data' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-pink-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-black text-white truncate">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Hook usage bar */}
      {Object.keys(hookCounts).length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Hook Style Usage</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(hookCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([hook, count]) => (
                <span key={hook} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${hookBadgeColor(hook)}`}>
                  {hook}
                  <span className="opacity-70 font-normal">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Scripts table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">All Generated Scripts</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{total} total</span>
            <span className="text-gray-600">·</span>
            <span>{withVideo} from video</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Niche</th>
                <th className="text-left px-4 py-3">Hooks</th>
                <th className="text-right px-4 py-3">Scripts</th>
                <th className="text-right px-4 py-3">Generated</th>
                <th className="text-center px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No scripts generated yet.
                  </td>
                </tr>
              ) : scripts.map(s => {
                const hooks   = (s.hook_type ?? '').split('+').filter(Boolean)
                const isDeleted = s.deleted_at !== null
                const productLabel = s.product_name
                  ? s.product_name.replace(/#[\w一-龥＀-￯]+\s*/g, '').trim() || s.product_name
                  : '—'

                return (
                  <tr key={s.id} className={`hover:bg-gray-700/30 transition-colors ${isDeleted ? 'opacity-40' : ''}`}>

                    {/* User */}
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-gray-400">{shortId(s.user_id)}</span>
                      {isDeleted && (
                        <span className="ml-1.5 text-[10px] text-red-400 font-semibold">[deleted]</span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-200 line-clamp-2 max-w-[180px]">{productLabel}</span>
                      {(s.brand_name || s.offer) && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[180px]">
                          {[s.brand_name, s.offer].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>

                    {/* Niche */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{s.niche ?? '—'}</span>
                    </td>

                    {/* Hooks */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {hooks.map(h => (
                          <span key={h} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hookBadgeColor(h)}`}>
                            {h.slice(0, 3)}
                          </span>
                        ))}
                        {hooks.length === 0 && <span className="text-xs text-gray-600">—</span>}
                      </div>
                    </td>

                    {/* Script count */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-pink-300 tabular-nums">{s.script_count ?? '—'}</span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(s.created_at)}</span>
                    </td>

                    {/* Source video */}
                    <td className="px-4 py-3 text-center">
                      {s.source_video_id ? (
                        <Link
                          href={`/products/${s.source_video_id}`}
                          target="_blank"
                          className="inline-flex items-center gap-0.5 text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Video
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-600">manual</span>
                      )}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
