'use client'

/**
 * SEOFlywheelPanel — Admin component for the n8n SEO Content Flywheel.
 *
 * Displays recent video_breakdowns and lets admins publish them to Ghost
 * via n8n. Status badge updates optimistically on click.
 */

import { useState } from 'react'
import { Zap, Send, CheckCircle, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export interface BreakdownForFlywheel {
  id:               string
  video_id:         string | null
  blog_status:      string | null  // NOT_SENT | PROCESSING | PUBLISHED | FAILED
  ghost_post_id:    string | null
  blog_published_at: string | null
  created_at:       string
  tiktok_videos: {
    id:           string
    title:        string | null
    product_name: string | null
    niche:        string | null
    cover_url:    string | null
    views:        number | null
    viral_score:  number | null
  } | null
  payload: {
    metrics?: { views: string; likes: string; shares: string }
    viral_formulas?: Array<{ title: string }>
  } | null
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'NOT_SENT'
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    NOT_SENT:   { label: 'Not Sent',   className: 'bg-gray-700 text-gray-300',    icon: null },
    PROCESSING: { label: 'Processing', className: 'bg-amber-900/60 text-amber-300', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    PUBLISHED:  { label: 'Published',  className: 'bg-emerald-900/60 text-emerald-300', icon: <CheckCircle className="h-3 w-3" /> },
    FAILED:     { label: 'Failed',     className: 'bg-red-900/60 text-red-300',    icon: <AlertTriangle className="h-3 w-3" /> },
  }
  const cfg = map[s] ?? map['NOT_SENT']
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function cleanTitle(text: string): string {
  return text.replace(/#[\w一-鿿＀-￯]+\s*/g, '').replace(/\s{2,}/g, ' ').trim()
}

function fmtNum(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}K`
  return String(n)
}

export function SEOFlywheelPanel({ breakdowns: initial }: { breakdowns: BreakdownForFlywheel[] }) {
  const [rows, setRows] = useState(initial)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function publish(breakdownId: string) {
    setLoading(p => ({ ...p, [breakdownId]: true }))
    // Optimistic update
    setRows(prev => prev.map(r =>
      r.id === breakdownId ? { ...r, blog_status: 'PROCESSING' } : r
    ))
    try {
      const res = await fetch('/api/admin/blog/trigger-flywheel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ breakdown_id: breakdownId }),
      })
      const json = await res.json()
      if (!res.ok) {
        // Roll back on error
        setRows(prev => prev.map(r =>
          r.id === breakdownId ? { ...r, blog_status: 'FAILED' } : r
        ))
        console.error('[SEOFlywheelPanel] publish error:', json.error)
      }
    } catch (e) {
      setRows(prev => prev.map(r =>
        r.id === breakdownId ? { ...r, blog_status: 'FAILED' } : r
      ))
      console.error('[SEOFlywheelPanel] fetch error:', e)
    } finally {
      setLoading(p => ({ ...p, [breakdownId]: false }))
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
        No video breakdowns available yet. Generate some from the Products section.
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-white">SEO Content Flywheel</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-900/40 text-pink-300 uppercase tracking-wide">
            n8n → Ghost → Social
          </span>
        </div>
        <span className="text-xs text-gray-500">{rows.length} breakdowns</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <th className="text-left px-5 py-3">Video</th>
              <th className="text-left px-4 py-3">Niche</th>
              <th className="text-left px-4 py-3">Top Formula</th>
              <th className="text-right px-4 py-3">Views</th>
              <th className="text-center px-4 py-3">Blog Status</th>
              <th className="text-center px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {rows.map(row => {
              const video  = row.tiktok_videos
              const name   = video
                ? cleanTitle(String(video.product_name ?? video.title ?? 'Untitled'))
                : `(url-only) ${row.id.slice(0, 8)}`
              const topFormula = row.payload?.viral_formulas?.[0]?.title ?? '—'
              const status = row.blog_status ?? 'NOT_SENT'
              const isActive = loading[row.id]
              const canPublish = status === 'NOT_SENT' || status === 'FAILED'

              return (
                <tr key={row.id} className="hover:bg-gray-700/30 transition-colors">

                  {/* Video */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {video?.cover_url ? (
                        <img src={String(video.cover_url)} alt="" className="h-9 w-16 object-cover rounded-md shrink-0 bg-gray-700" />
                      ) : (
                        <div className="h-9 w-16 bg-gray-700 rounded-md shrink-0 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-200 font-medium text-xs line-clamp-2 max-w-[180px] leading-snug">{name}</p>
                        {row.ghost_post_id && (
                          <span className="text-[10px] text-emerald-400">ghost: {row.ghost_post_id.slice(0, 8)}…</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Niche */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{video?.niche ?? '—'}</span>
                  </td>

                  {/* Top formula */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-300 line-clamp-2 max-w-[160px]">{topFormula}</span>
                  </td>

                  {/* Views */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-gray-300 tabular-nums">
                      {row.payload?.metrics?.views ?? fmtNum(video?.views)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={status} />
                    {row.blog_published_at && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(row.blog_published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canPublish ? (
                        <button
                          onClick={() => publish(row.id)}
                          disabled={isActive}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all"
                        >
                          {isActive
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
                            : <><Send className="h-3 w-3" /> Publish</>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600 italic">
                          {status === 'PROCESSING' ? 'n8n running…' : '—'}
                        </span>
                      )}
                      {video?.id && (
                        <Link href={`/products/${video.id}`} target="_blank" className="text-gray-500 hover:text-gray-300">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
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
  )
}
