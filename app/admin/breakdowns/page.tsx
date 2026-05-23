import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ExternalLink, Zap, TrendingUp, BarChart2, Database } from 'lucide-react'
import { HOOK_TYPE_LABELS, EMOTION_DRIVER_LABELS, HookType, EmotionDriver } from '@/lib/types/intelligence'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

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

const HOOK_COLOR: Record<string, string> = {
  curiosity_gap:        'bg-indigo-100 text-indigo-700',
  contrarian_interrupt: 'bg-violet-100 text-violet-700',
  problem_interrupt:    'bg-rose-100 text-rose-700',
  authority_flex:       'bg-amber-100 text-amber-700',
}

const EMOTION_COLOR: Record<string, string> = {
  greed_lazy:       'bg-green-100 text-green-700',
  anxiety_relief:   'bg-orange-100 text-orange-700',
  vanity_status:    'bg-pink-100 text-pink-700',
  cost_effective:   'bg-blue-100 text-blue-700',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BreakdownsAdminPage() {
  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('video_breakdowns')
    .select('id, url_hash, video_id, payload, created_at, tiktok_videos(id, title, product_name, niche, cover_url, views, viral_score)')
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
  const total = breakdowns.length
  const weekAgo = Date.now() - 7 * 86_400_000
  const thisWeek = breakdowns.filter(b => new Date(b.created_at).getTime() > weekAgo).length

  const hookCounts: Record<string, number> = {}
  const emotionCounts: Record<string, number> = {}
  for (const b of breakdowns) {
    const hook    = b.payload?.analysis?.hook?.type      ?? 'unknown'
    const emotion = b.payload?.analysis?.emotion?.driver ?? 'unknown'
    hookCounts[hook]       = (hookCounts[hook]       ?? 0) + 1
    emotionCounts[emotion] = (emotionCounts[emotion] ?? 0) + 1
  }

  const topHook    = Object.entries(hookCounts).sort((a, b) => b[1] - a[1])[0]
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-pink-400" /> AI Breakdowns
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          All Gemini-generated ad structure analyses · SEO page auto-generated per entry
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Database,   label: 'Total',       value: String(total),    sub: 'breakdowns cached' },
          { icon: TrendingUp, label: 'This Week',   value: String(thisWeek), sub: 'new this week' },
          {
            icon: BarChart2, label: 'Top Hook',
            value: topHook ? (HOOK_TYPE_LABELS[topHook[0] as HookType]?.en ?? topHook[0]) : '—',
            sub: topHook ? `${topHook[1]} videos` : '',
          },
          {
            icon: Zap, label: 'Top Emotion',
            value: topEmotion ? (EMOTION_DRIVER_LABELS[topEmotion[0] as EmotionDriver]?.en ?? topEmotion[0]) : '—',
            sub: topEmotion ? `${topEmotion[1]} videos` : '',
          },
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

      {/* Hook distribution bar chart */}
      {Object.keys(hookCounts).length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-semibold text-white mb-3">Hook Type Distribution</h2>
          <div className="space-y-2.5">
            {Object.entries(hookCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const label = HOOK_TYPE_LABELS[type as HookType]
                const pct   = Math.round((count / total) * 100)
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 w-32 text-center ${HOOK_COLOR[type] ?? 'bg-gray-700 text-gray-300'}`}>
                      {label?.en ?? type}
                    </span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums w-16 text-right">{count} ({pct}%)</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

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
                <th className="text-left px-4 py-3">Hook</th>
                <th className="text-left px-4 py-3">Emotion</th>
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
                const video       = b.tiktok_videos
                const analysis    = b.payload?.analysis
                const hookType    = analysis?.hook?.type      as HookType    | undefined
                const emotionType = analysis?.emotion?.driver as EmotionDriver | undefined
                const hookLabel   = hookType    ? HOOK_TYPE_LABELS[hookType]           : null
                const emoLabel    = emotionType ? EMOTION_DRIVER_LABELS[emotionType]   : null
                const name        = video
                  ? cleanTitle(String(video.product_name ?? video.title ?? 'Untitled'))
                  : `(url-only) ${b.url_hash.slice(0, 8)}`
                const videoId = b.video_id ?? video?.id

                return (
                  <tr key={b.id} className="hover:bg-gray-700/30 transition-colors">
                    {/* Product */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {video?.cover_url ? (
                          <img
                            src={String(video.cover_url)}
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

                    {/* Hook */}
                    <td className="px-4 py-3">
                      {hookLabel ? (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${HOOK_COLOR[hookType!] ?? 'bg-gray-700 text-gray-300'}`}>
                          {hookLabel.en}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>

                    {/* Emotion */}
                    <td className="px-4 py-3">
                      {emoLabel ? (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${EMOTION_COLOR[emotionType!] ?? 'bg-gray-700 text-gray-300'}`}>
                          {emoLabel.en}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
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
