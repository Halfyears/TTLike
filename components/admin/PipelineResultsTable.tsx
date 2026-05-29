'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ExternalLink, Zap, GitBranch, Clock, Trash2, RotateCcw,
  Loader2, ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react'
import { LocalDate } from '@/components/ui/LocalDate'
import type { ViralPipeline } from '@/lib/types/intelligence'
import { ViralPipelinePanel } from './ViralPipelinePanel'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineRow {
  id:         string          // breakdown id
  video_id:   string | null
  created_at: string
  pipeline:   ViralPipeline
  tiktok_videos: {
    id:           string
    title:        string | null
    product_name: string | null
    niche:        string | null
    cover_url:    string | null
  } | null
}

interface Filters { niche: string; structure: string }

const PAGE_SIZE = 10
const LS_KEY    = 'ttlike_pipeline_results_filters'

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: {
  page: number; total: number; onChange: (p: number) => void
}) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
      <span className="text-xs text-gray-500">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onChange(page + 1)} disabled={page === pages}
          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineResultsTable({ rows: initial }: { rows: PipelineRow[] }) {
  const [rows,       setRows]       = useState(initial)
  const [filters,    setFilters]    = useState<Filters>(() => {
    if (typeof window === 'undefined') return { niche: '', structure: '' }
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return { niche: '', structure: '' } }
  })
  const [pending,    setPending]    = useState<Filters>(filters)
  const [page,       setPage]       = useState(1)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [rerunId,    setRerunId]    = useState<string | null>(null)

  // Persist filters
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(filters)) } catch {}
  }, [filters])

  const niches     = useMemo(() => [...new Set(rows.map(r => r.tiktok_videos?.niche).filter(Boolean))] as string[], [rows])
  const structures = useMemo(() => [...new Set(rows.map(r =>
    r.pipeline.reasoning?.structure_match?.structure_id ?? r.pipeline.final_script?.structure_id
  ).filter(Boolean))] as string[], [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filters.niche     && r.tiktok_videos?.niche !== filters.niche)     return false
    const sid = r.pipeline.reasoning?.structure_match?.structure_id ?? r.pipeline.final_script?.structure_id
    if (filters.structure && sid !== filters.structure) return false
    return true
  }), [rows, filters])

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  function applyFilters() { setFilters(pending); setPage(1) }
  function clearFilters()  { const f = { niche: '', structure: '' }; setPending(f); setFilters(f); setPage(1) }

  const deleteRow = useCallback(async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/pipeline/clear/${id}`, { method: 'DELETE' })
      if (res.ok) { setRows(p => p.filter(r => r.id !== id)); setConfirmDel(null) }
      else { const j = await res.json(); alert(j.error ?? 'Delete failed') }
    } finally { setDeleting(null) }
  }, [])

  const rerunRow = rows.find(r => r.id === rerunId)

  return (
    <>
      <div className="bg-gray-800 rounded-xl border border-violet-700/40 overflow-hidden">

        {/* Header + filters */}
        <div className="px-5 py-3.5 border-b border-violet-700/40 bg-violet-900/10 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Pipeline Results</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 uppercase tracking-wide">
                {filtered.length} / {rows.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(filters.niche || filters.structure) && (
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Niche</label>
              <select
                value={pending.niche}
                onChange={e => setPending(p => ({ ...p, niche: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 min-w-[120px]"
              >
                <option value="">All niches</option>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Structure</label>
              <select
                value={pending.structure}
                onChange={e => setPending(p => ({ ...p, structure: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 min-w-[180px]"
              >
                <option value="">All structures</option>
                {structures.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={applyFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
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
                <th className="text-left px-4 py-3">Structure</th>
                <th className="text-left px-4 py-3">Hook Line</th>
                <th className="text-right px-4 py-3">Lines</th>
                <th className="text-right px-4 py-3">Generated</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500 text-sm">No pipeline results match filters.</td></tr>
              ) : paged.map(b => {
                const video    = b.tiktok_videos
                const pipeline = b.pipeline
                const name     = video
                  ? String(video.product_name ?? video.title ?? 'Untitled').replace(/#[\w一-龥]+\s*/g, '').trim()
                  : `(url-only) ${b.id.slice(0, 8)}`
                const videoId  = b.video_id ?? video?.id
                const isDel    = deleting === b.id
                const isConf   = confirmDel === b.id
                const sid      = pipeline.reasoning?.structure_match?.structure_id ?? pipeline.final_script?.structure_id

                return (
                  <tr key={b.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {video?.cover_url ? (
                          <img src={video.cover_url} alt={name} className="h-9 w-16 object-cover rounded-md shrink-0 bg-gray-700" />
                        ) : (
                          <div className="h-9 w-16 bg-gray-700 rounded-md shrink-0 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-gray-200 text-xs font-medium line-clamp-2 max-w-[160px]">{name}</p>
                          {pipeline.input?.product_schema && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {String(pipeline.input.product_schema['category'] ?? '')}
                              {pipeline.input.product_schema['price_point'] ? ` · $${pipeline.input.product_schema['price_point']}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3 text-violet-400 shrink-0" />
                        <span className="text-xs text-violet-300 font-mono truncate max-w-[130px]">{sid ?? '—'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-gray-300 italic line-clamp-2">
                        {pipeline.final_script?.hook_line ? `"${pipeline.final_script.hook_line}"` : '—'}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-400 tabular-nums">{pipeline.final_script?.lines?.length ?? '—'}</span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <LocalDate date={pipeline.generated_at} className="text-xs text-gray-500 whitespace-nowrap" />
                      {pipeline.pipeline_ms && (
                        <p className="text-[10px] text-gray-600 flex items-center justify-end gap-0.5 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />{(pipeline.pipeline_ms / 1000).toFixed(1)}s
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* View */}
                        {videoId && (
                          <Link href={`/admin/pipeline-results/${videoId}`} target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded bg-violet-900/30 hover:bg-violet-900/50 transition-colors">
                            <ExternalLink className="h-3 w-3" /> View
                          </Link>
                        )}

                        {/* Re-run */}
                        {videoId && (
                          <button
                            onClick={() => setRerunId(b.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" /> Re-run
                          </button>
                        )}

                        {/* Delete pipeline */}
                        {!isConf ? (
                          <button onClick={() => setConfirmDel(b.id)} disabled={isDel}
                            className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                            title="Clear pipeline result">
                            {isDel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteRow(b.id)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white">
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDel(null)} className="text-[10px] text-gray-400 hover:text-gray-200">Cancel</button>
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

      {/* Re-run modal */}
      {rerunRow && rerunRow.video_id && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl mt-8 mb-8">
            <div className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-t-xl px-5 py-3.5">
              <p className="text-white font-semibold text-sm">Re-run Viral Pipeline</p>
              <button onClick={() => setRerunId(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-gray-800 border border-gray-600 border-t-0 rounded-b-xl overflow-hidden">
              <ViralPipelinePanel
                videoId={rerunRow.video_id}
                productName={rerunRow.tiktok_videos?.product_name ?? null}
                niche={rerunRow.tiktok_videos?.niche ?? null}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
