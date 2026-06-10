'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ExternalLink, Zap, Trash2, Loader2,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react'
import { LocalDate } from '@/components/ui/LocalDate'
import { BreakdownPipelineButton } from '@/app/admin/breakdowns/BreakdownPipelineButton'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserMapEntry { email: string; name: string | null }

export interface BreakdownRow {
  id:         string
  url_hash:   string
  video_id:   string | null
  seo_slug:   string | null
  payload:    VideoBreakdownPayload
  created_at: string
  user_id:    string | null
  tiktok_videos: {
    id:           string
    title:        string | null
    product_name: string | null
    niche:        string | null
    cover_url:    string | null
    views:        number | null
    viral_score:  number | null
  } | null
}

type Engine = 'all' | 'v25' | 'health' | 'legacy'
type HasPipeline = 'all' | 'yes' | 'no'
interface Filters { niche: string; engine: Engine; has_pipeline: HasPipeline }

const PAGE_SIZE = 25
const LS_KEY    = 'ttlike_breakdowns_filters'

function getEngine(payload: VideoBreakdownPayload): 'v25' | 'health' | 'legacy' {
  if (payload?.viral_formulas?.length) return 'v25'
  if (payload?.health_report)          return 'health'
  return 'legacy'
}

function cleanTitle(t: string) {
  return t.replace(/#[\w一-龥＀-￯]+\s*/g, '').replace(/\s{2,}/g, ' ').trim()
}

function fmtNum(n: number | null | undefined) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
      <span className="text-xs text-gray-500">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onChange(page + 1)} disabled={page === pages}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BreakdownsTable({ rows: initial, userMap = {} }: { rows: BreakdownRow[]; userMap?: Record<string, UserMapEntry> }) {
  const [rows,       setRows]       = useState(initial)
  const [filters,    setFilters]    = useState<Filters>(() => {
    if (typeof window === 'undefined') return { niche: '', engine: 'all', has_pipeline: 'all' }
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return { niche: '', engine: 'all', has_pipeline: 'all' } }
  })
  const [pending,    setPending]    = useState<Filters>(filters)
  const [page,       setPage]       = useState(1)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(filters)) } catch {}
  }, [filters])

  const niches = useMemo(() =>
    [...new Set(rows.map(r => r.tiktok_videos?.niche).filter(Boolean))] as string[],
  [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filters.niche && r.tiktok_videos?.niche !== filters.niche) return false
    if (filters.engine !== 'all' && getEngine(r.payload) !== filters.engine) return false
    const hp = !!(r.payload as VideoBreakdownPayload & { viral_pipeline?: unknown })?.viral_pipeline
    if (filters.has_pipeline === 'yes' && !hp) return false
    if (filters.has_pipeline === 'no'  && hp)  return false
    return true
  }), [rows, filters])

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  function applyFilters() { setFilters(pending); setPage(1) }
  function clearFilters()  {
    const f: Filters = { niche: '', engine: 'all', has_pipeline: 'all' }
    setPending(f); setFilters(f); setPage(1)
  }

  const deleteRow = useCallback(async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/blog/breakdowns/${id}`, { method: 'DELETE' })
      if (res.ok) { setRows(p => p.filter(r => r.id !== id)); setConfirmDel(null) }
      else { const j = await res.json(); alert(j.error ?? 'Delete failed') }
    } finally { setDeleting(null) }
  }, [])

  const hasActiveFilters = filters.niche || filters.engine !== 'all' || filters.has_pipeline !== 'all'

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">

      {/* Header + filters */}
      <div className="px-5 py-3.5 border-b border-gray-700 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">All Breakdowns</h2>
            <span className="text-xs text-gray-500">{filtered.length} / {rows.length}</span>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Niche</label>
            <select value={pending.niche} onChange={e => setPending(p => ({ ...p, niche: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500 min-w-[110px]">
              <option value="">All niches</option>
              {niches.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Engine</label>
            <select value={pending.engine} onChange={e => setPending(p => ({ ...p, engine: e.target.value as Engine }))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500">
              <option value="all">All</option>
              <option value="v25">V2.5</option>
              <option value="health">Health</option>
              <option value="legacy">Legacy</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Pipeline</label>
            <select value={pending.has_pipeline} onChange={e => setPending(p => ({ ...p, has_pipeline: e.target.value as HasPipeline }))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500">
              <option value="all">All</option>
              <option value="yes">Has Pipeline</option>
              <option value="no">No Pipeline</option>
            </select>
          </div>
          <button onClick={applyFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors">
            <Filter className="h-3 w-3" /> Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <th className="text-left px-5 py-3">Product</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Niche</th>
              <th className="text-left px-4 py-3">Engine</th>
              <th className="text-right px-4 py-3">Views</th>
              <th className="text-right px-4 py-3">Score</th>
              <th className="text-right px-4 py-3">Created</th>
              <th className="text-center px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500 text-sm">No breakdowns match filters.</td></tr>
            ) : paged.map(b => {
              const video    = b.tiktok_videos
              const userInfo   = b.user_id ? userMap[b.user_id] : null
              const userName   = userInfo?.name?.trim() || null
              const userEmail  = userInfo?.email || null
              const sourceMeta = (b.payload as VideoBreakdownPayload & { source_meta?: { title?: string; thumbnail_url?: string } })?.source_meta
              const name     = video
                ? cleanTitle(String(video.product_name ?? video.title ?? 'Untitled'))
                : sourceMeta?.title
                  ? cleanTitle(sourceMeta.title)
                  : `(url-only) ${b.url_hash.slice(0, 8)}`
              const coverSrc = video?.cover_url ?? sourceMeta?.thumbnail_url ?? null
              const videoId  = b.video_id ?? video?.id
              const seoTarget = b.seo_slug ?? videoId
              const engine   = getEngine(b.payload)
              const isDel    = deleting === b.id
              const isConf   = confirmDel === b.id
              const hasPipeline = !!(b.payload as VideoBreakdownPayload & { viral_pipeline?: unknown })?.viral_pipeline

              return (
                <tr key={b.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {coverSrc ? (
                        <img src={coverSrc} alt={name} className="h-9 w-16 object-cover rounded-md shrink-0 bg-gray-700" />
                      ) : (
                        <div className="h-9 w-16 bg-gray-700 rounded-md shrink-0 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-200 font-medium text-xs line-clamp-2 max-w-[180px] leading-snug">{name}</p>
                        {hasPipeline && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-violet-900/40 text-violet-300 font-semibold mt-0.5 inline-block">
                            Pipeline ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{video?.niche ?? '—'}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      engine === 'v25'    ? 'bg-pink-900/40 text-pink-300' :
                      engine === 'health' ? 'bg-red-900/40 text-red-300' :
                                           'bg-gray-700 text-gray-400'
                    }`}>
                      {engine === 'v25' ? 'V2.5' : engine === 'health' ? 'Health' : 'Legacy'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-gray-300 tabular-nums">{fmtNum(video?.views)}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold tabular-nums ${
                      (video?.viral_score ?? 0) >= 80 ? 'text-pink-400' :
                      (video?.viral_score ?? 0) >= 60 ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {video?.viral_score != null ? Number(video.viral_score).toFixed(0) : '—'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <LocalDate date={b.created_at} className="text-xs text-gray-500 whitespace-nowrap" />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {videoId && (
                        <BreakdownPipelineButton
                          videoId={videoId}
                          productName={video?.product_name ?? null}
                          niche={video?.niche ?? null}
                          hasTimeline={Array.isArray(b.payload?.visual_timeline) && b.payload.visual_timeline.length > 0}
                        />
                      )}
                      {videoId && (
                        <Link href={`/products/${videoId}`} target="_blank"
                          className="text-[11px] text-gray-400 hover:text-white transition-colors">
                          Product
                        </Link>
                      )}
                      {seoTarget && (
                        <Link href={`/viral/${seoTarget}`} target="_blank"
                          className="inline-flex items-center gap-0.5 text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors">
                          <ExternalLink className="h-3 w-3" /> SEO
                        </Link>
                      )}
                      {!isConf ? (
                        <button onClick={() => setConfirmDel(b.id)} disabled={isDel}
                          className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                          title="Delete breakdown">
                          {isDel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteRow(b.id)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white">
                            Confirm
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            className="text-[10px] text-gray-400 hover:text-gray-200">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={filtered.length} onChange={p => setPage(p)} />
    </div>
  )
}
