import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ExternalLink, Zap, TrendingUp, BarChart2, Database } from 'lucide-react'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'
import { BatchTrigger } from './BatchTrigger'
import { bestCoverUrl } from '@/lib/tiktokImg'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BreakdownRow {
  id: string
  url_hash: string
  video_id: string | null
  payload: VideoBreakdownPayload
  created_at: string
  tiktok_videos: {
    id: string
    title: string | null
    product_name: string | null
    niche: string | null
    cover_url: string | null
    views: number | null
    viral_score: number | null
  } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanTitle(text: string): string {
  return text.replace(/#[\w一-龥＀-￯]+\s*/g, '').replace(/\s{2,}/g, ' ').trim()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtNum(n: number | null | undefined) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

/** Get first formula title, or fall back to legacy hook type for old V2 records */
function getStrategy(payload: VideoBreakdownPayload): string {
  if (payload?.health_report) return '— (Health Report)'
  const formula = payload?.viral_formulas?.[0]
  if (formula?.title) return formula.title
  // Legacy V2 fallback
  const legacy = payload as unknown as { analysis?: { hook?: { type?: string } } }
  return legacy?.analysis?.hook?.type ?? '—'
}

type RowType = 'v25' | 'health' | 'legacy'

function getRowType(payload: VideoBreakdownPayload): RowType {
  if (payload?.viral_formulas?.length) return 'v25'
  if (payload?.health_report)          return 'health'
  return 'legacy'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BreakdownsAdminPage() {
  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('video_breakdowns')
    .select('id, url_hash, video_id, payload, created_at, tiktok_videos!left(id, title, product_name, niche, cover_url, views, viral_score)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return (
      <div className="p-6 text-red-400 text-sm">
        Failed to load breakdowns: {error.message}
      </div>
    )
  }

  const breakdowns = (rows ?? []) as unknown as BreakdownRow[]

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total         = breakdowns.length
  const weekAgo       = Date.now() - 7 * 86_400_000
  const thisWeek      = breakdowns.filter(b => new Date(b.created_at).getTime() > weekAgo).length
  const v25Count      = breakdowns.filter(b => getRowType(b.payload) === 'v25').length
  const healthCount   = breakdowns.filter(b => getRowType(b.payload) === 'health').length
  const legacyCount   = breakdowns.filter(b => getRowType(b.payload) === 'legacy').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-pink-400" /> AI Breakdowns
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Gemini-generated creative workbooks · SEO page auto-generated per entry
        </p>
      </div>

      {/* Batch generator */}
      <BatchTrigger />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Database,   label: 'Total',          value: String(total),       sub: 'all cached entries' },
          { icon: TrendingUp, label: 'This Week',       value: String(thisWeek),    sub: 'new this week' },
          { icon: BarChart2,  label: 'V2.5 Engine',    value: String(v25Count),    sub: 'inspiration engine' },
          { icon: Zap,        label: 'Health Reports', value: String(healthCount), sub: 'forensic audits' },
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

      {/* Breakdowns table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">All Breakdowns</h2>
          <span className="text-xs text-gray-500">{total} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-4 py-3">Niche</th>
                <th className="text-left px-4 py-3">Strategy</th>
                <th className="text-left px-4 py-3">Engine</th>
                <th className="text-right px-4 py-3">Views</th>
                <th className="text-right px-4 py-3">Score</th>
                <th className="text-right px-4 py-3">Generated</th>
                <th className="text-center px-4 py-3">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {breakdowns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No breakdowns yet. Generate one from any product page.
                  </td>
                </tr>
              ) : breakdowns.map(b => {
                const video    = b.tiktok_videos
                const strategy = getStrategy(b.payload)
                const rowType  = getRowType(b.payload)
                const name     = video
                  ? cleanTitle(String(video.product_name ?? video.title ?? 'Untitled'))
                  : `(url-only) ${b.url_hash.slice(0, 8)}`
                const videoId = b.video_id ?? video?.id

                return (
                  <tr key={b.id} className="hover:bg-gray-700/30 transition-colors">
                    {/* Product */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {bestCoverUrl(null, video?.cover_url) ? (
                          <img
                            src={bestCoverUrl(null, video?.cover_url)!}
                            alt=""
                            className="h-9 w-16 object-cover rounded-md shrink-0 bg-gray-700"
                          />
                        ) : (
                          <div className="h-9 w-16 bg-gray-700 rounded-md shrink-0 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <span className="text-gray-200 font-medium text-xs line-clamp-2 max-w-[180px] leading-snug">
                          {name}
                        </span>
                      </div>
                    </td>

                    {/* Niche */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{video?.niche ?? '—'}</span>
                    </td>

                    {/* Strategy */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300 line-clamp-2 max-w-[160px]">{strategy}</span>
                    </td>

                    {/* Engine version */}
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rowType === 'v25'    ? 'bg-pink-900/40 text-pink-300' :
                        rowType === 'health' ? 'bg-red-900/40 text-red-300' :
                                              'bg-gray-700 text-gray-400'
                      }`}>
                        {rowType === 'v25' ? 'V2.5' : rowType === 'health' ? '🔬 Health' : 'Legacy'}
                      </span>
                    </td>

                    {/* Views */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-300 tabular-nums">{fmtNum(video?.views)}</span>
                    </td>

                    {/* Viral score */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold tabular-nums ${
                        (video?.viral_score ?? 0) >= 80 ? 'text-pink-400' :
                        (video?.viral_score ?? 0) >= 60 ? 'text-orange-400' : 'text-gray-500'
                      }`}>
                        {video?.viral_score != null ? Number(video.viral_score).toFixed(0) : '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(b.created_at)}</span>
                    </td>

                    {/* Links */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        {videoId && (
                          <>
                            <Link
                              href={`/products/${videoId}`}
                              target="_blank"
                              className="text-[11px] text-gray-400 hover:text-white transition-colors"
                            >
                              Product
                            </Link>
                            <Link
                              href={`/viral/${videoId}`}
                              target="_blank"
                              className="inline-flex items-center gap-0.5 text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" /> SEO
                            </Link>
                          </>
                        )}
                      </div>
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
