'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'
import {
  RefreshCw, ExternalLink, Trash2, RotateCcw,
  GripVertical, Save, ArrowUpDown, TrendingUp,
  CheckCircle, Brain, ChevronDown, ChevronUp, Calendar,
  Flame,
} from 'lucide-react'
import { PromptManager }        from './PromptManager'
import { ViralRadarButton }    from './ViralRadarButton'
import { PromptQualityChecker } from './PromptQualityChecker'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Video {
  id: string
  tiktok_id: string
  title: string
  product_name: string | null
  author: string
  views: number
  likes: number
  shares: number
  comments: number | null
  viral_score:  number
  is_viral_hit: boolean
  video_url:    string | null
  cover_url:    string | null
  niche:        string | null
  sort_order:   number | null
  deleted_at: string | null
  created_at: string
  published_at: string | null
}

type SortKey = 'viral_score' | 'views' | 'like_rate' | 'share_rate' | 'eng_rate'
type Tab = 'active' | 'deleted'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'viral_score', label: 'Viral Score' },
  { key: 'views',       label: 'Views (most)' },
  { key: 'like_rate',   label: 'Like Rate %' },
  { key: 'share_rate',  label: 'Share Rate %' },
  { key: 'eng_rate',    label: 'Engagement Rate %' },
]

// ── Smart Recommendation Engine ───────────────────────────────────────────────
interface SmartWeights {
  views:    number   // 0–100
  likeRate: number
  shareRate: number
  engRate:  number
  recency:  number   // newer publish date = higher
}

const DEFAULT_WEIGHTS: SmartWeights = {
  views: 40, likeRate: 20, shareRate: 30, engRate: 30, recency: 30,
}

/**
 * Apply the smart recommendation engine to a list of active videos.
 *
 * 1. Videos in the date range are scored using weighted, normalised metrics.
 * 2. Videos outside the range are scored 0 and pushed to the end.
 * 3. Returns a new array sorted by descending smart score with sort_order
 *    values assigned.
 */
function applySmartSort(
  videos: Video[],
  weights: SmartWeights,
  dateFrom: string,
  dateTo: string,
): Video[] {
  const from = dateFrom ? new Date(dateFrom) : null
  const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null

  const inRange: Video[] = []
  const outRange: Video[] = []

  for (const v of videos) {
    const pub = v.published_at ? new Date(v.published_at) : null
    const inWindow =
      !pub ||
      ((!from || pub >= from) && (!to || pub <= to))
    if (inWindow) inRange.push(v)
    else outRange.push(v)
  }

  if (inRange.length === 0) return videos  // nothing changed

  // Compute max values for normalisation within the in-range set
  const maxViews     = Math.max(...inRange.map(v => v.views), 1)
  const maxLikeRate  = Math.max(...inRange.map(v => likeRate(v)), 0.001)
  const maxShareRate = Math.max(...inRange.map(v => shareRate(v)), 0.001)
  const maxEngRate   = Math.max(...inRange.map(v => engRate(v)), 0.001)

  const now = Date.now()
  const minPub = Math.min(
    ...inRange
      .filter(v => v.published_at)
      .map(v => new Date(v.published_at!).getTime()),
    now - 1
  )
  const pubSpan = now - minPub || 1

  // Score each in-range video
  const scored = inRange.map(v => {
    const sViews = (v.views / maxViews) * weights.views
    const sLike  = (likeRate(v)  / maxLikeRate)  * weights.likeRate
    const sShare = (shareRate(v) / maxShareRate) * weights.shareRate
    const sEng   = (engRate(v)   / maxEngRate)   * weights.engRate
    let   sRec   = 0
    if (v.published_at && weights.recency > 0) {
      const age = now - new Date(v.published_at).getTime()
      sRec = (1 - age / pubSpan) * weights.recency
    }
    return { v, score: sViews + sLike + sShare + sEng + sRec }
  })

  scored.sort((a, b) => b.score - a.score)

  const result: Video[] = [
    ...scored.map(({ v }, i) => ({ ...v, sort_order: i + 1 })),
    ...outRange.map((v, i) => ({ ...v, sort_order: scored.length + i + 1 })),
  ]

  return result
}

// ── Weight slider component ───────────────────────────────────────────────────
function WeightSlider({
  label, value, onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <input
        type="range" min={0} max={100} step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-violet-500 h-1.5 cursor-pointer"
      />
      <span className="text-xs text-violet-300 w-8 text-right tabular-nums font-semibold">{value}</span>
    </div>
  )
}

// ── Computed rate helpers ─────────────────────────────────────────────────────
function likeRate(v: Video) {
  return v.views > 0 ? (v.likes / v.views) * 100 : 0
}
function shareRate(v: Video) {
  return v.views > 0 ? (v.shares / v.views) * 100 : 0
}
function engRate(v: Video) {
  return v.views > 0 ? ((v.likes + v.shares + (v.comments ?? 0)) / v.views) * 100 : 0
}
function getSortValue(v: Video, key: SortKey): number {
  if (key === 'viral_score') return v.viral_score
  if (key === 'views')       return v.views
  if (key === 'like_rate')   return likeRate(v)
  if (key === 'share_rate')  return shareRate(v)
  return engRate(v)
}

function rateFmt(n: number) {
  return n >= 10 ? n.toFixed(1) + '%' : n.toFixed(2) + '%'
}
function rateColor(n: number, high = 5) {
  if (n >= high)        return 'text-emerald-400 font-semibold'
  if (n >= high * 0.4)  return 'text-yellow-400'
  return 'text-gray-500'
}
function scoreColor(s: number) {
  if (s >= 90) return 'text-red-400'
  if (s >= 70) return 'text-orange-400'
  if (s >= 50) return 'text-yellow-400'
  return 'text-gray-400'
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableRow({
  video, index, tab,
  onDelete, onRestore,
}: {
  video: Video
  index: number
  tab: Tab
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: video.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  }

  const lr = likeRate(video)
  const sr = shareRate(video)
  const er = engRate(video)
  const displayName = (video.product_name ?? video.title ?? '').replace(/#[\w一-鿿]+\s*/g, '').trim()

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${isDragging ? 'bg-gray-700' : ''}`}
    >
      {/* Drag handle — only in active tab */}
      <td className="px-2 py-2 w-8">
        {tab === 'active' ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors p-1"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-6 block" />
        )}
      </td>

      {/* Sort order # */}
      <td className="px-2 py-2 w-10 text-xs text-gray-600 text-right tabular-nums">
        {tab === 'active' ? (video.sort_order ?? index + 1) : '—'}
      </td>

      {/* Cover */}
      <td className="px-2 py-2 w-10">
        {video.cover_url ? (
          <img src={video.cover_url} alt="" className="h-10 w-7 rounded object-cover" />
        ) : (
          <div className="h-10 w-7 rounded bg-gray-700 flex items-center justify-center">
            <TrendingUp className="h-3 w-3 text-gray-500" />
          </div>
        )}
      </td>

      {/* Title */}
      <td className="px-3 py-2 max-w-[220px]">
        <p className="text-sm text-white truncate font-medium">{displayName || '—'}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{video.author}</p>
      </td>

      {/* Niche */}
      <td className="px-3 py-2 whitespace-nowrap">
        {video.niche && <Badge>{video.niche}</Badge>}
      </td>

      {/* Views */}
      <td className="px-3 py-2 text-sm text-gray-300 text-right whitespace-nowrap tabular-nums">
        {formatNumber(video.views)}
      </td>

      {/* Like % */}
      <td className={`px-3 py-2 text-xs text-right whitespace-nowrap tabular-nums ${rateColor(lr, 3)}`}>
        {rateFmt(lr)}
      </td>

      {/* Share % */}
      <td className={`px-3 py-2 text-xs text-right whitespace-nowrap tabular-nums ${rateColor(sr, 1)}`}>
        {rateFmt(sr)}
      </td>

      {/* Eng % */}
      <td className={`px-3 py-2 text-xs text-right whitespace-nowrap tabular-nums ${rateColor(er, 5)}`}>
        {rateFmt(er)}
      </td>

      {/* Viral Score */}
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <span className={`text-sm font-bold tabular-nums ${scoreColor(video.viral_score)}`}>
          {video.viral_score.toFixed(0)}
        </span>
        {video.is_viral_hit && (
          <span title="Super Viral — analysed ≥ 5×">
            <Flame className="h-3 w-3 text-red-400 inline ml-1 mb-0.5" />
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2 w-20">
        <div className="flex items-center justify-end gap-1">
          {video.video_url && (
            <a
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-gray-500 hover:text-pink-400 transition-colors"
              title="Watch on TikTok"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {tab === 'active' ? (
            <button
              onClick={() => onDelete(video.id)}
              className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete (soft)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onRestore(video.id)}
              className="p-1.5 rounded text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
              title="Restore"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminVideosPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [active, setActive] = useState<Video[]>([])
  const [deleted, setDeleted] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('')
  const [autoSortKey, setAutoSortKey] = useState<SortKey>('viral_score')

  // Smart recommendation engine state
  const [smartOpen,    setSmartOpen]    = useState(false)
  const [smartWeights, setSmartWeights] = useState<SmartWeights>(DEFAULT_WEIGHTS)
  const [smartFrom,    setSmartFrom]    = useState('')
  const [smartTo,      setSmartTo]      = useState('')

  // Stable client — avoids re-creating on every render
  const supabase = useMemo(() => createClient(), [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setIsDirty(false)
    setFetchError(null)

    try {
      // ── Active videos ── (separate query chain — never share a builder)
      const { data: activeData, error: activeErr } = await supabase
        .from('tiktok_videos')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('viral_score', { ascending: false })
        .limit(500)

      if (activeErr) {
        console.error('[admin/videos] active fetch error:', activeErr)
        // Fallback: fetch without deleted_at filter (handles missing column case)
        const { data: fallback, error: fallbackErr } = await supabase
          .from('tiktok_videos')
          .select('*')
          .order('viral_score', { ascending: false })
          .limit(500)
        if (fallbackErr) {
          setFetchError(fallbackErr.message)
        } else {
          setActive((fallback ?? []) as Video[])
        }
      } else {
        setActive((activeData ?? []) as Video[])
      }

      // ── Deleted videos ──
      const { data: deletedData, error: deletedErr } = await supabase
        .from('tiktok_videos')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(200)

      if (deletedErr) {
        console.error('[admin/videos] deleted fetch error:', deletedErr)
      } else {
        setDeleted((deletedData ?? []) as Video[])
      }
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }, [supabase])

  useEffect(() => {
    fetchAll()

    // ── Supabase Realtime: re-fetch when rows are inserted or updated ──────
    const channel = supabase
      .channel('admin_videos_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tiktok_videos' },
        () => { fetchAll() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tiktok_videos' },
        () => { fetchAll() },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll, supabase])

  // ── Filtered view ──────────────────────────────────────────────────────────
  const visibleActive = useMemo(() => {
    const q = search.toLowerCase()
    return active.filter(v => {
      const matchSearch = !search || (v.product_name ?? v.title ?? '').toLowerCase().includes(q)
      const matchNiche  = !niche  || v.niche === niche
      return matchSearch && matchNiche
    })
  }, [active, search, niche])

  const visibleDeleted = useMemo(() => {
    const q = search.toLowerCase()
    return deleted.filter(v => {
      const matchSearch = !search || (v.product_name ?? v.title ?? '').toLowerCase().includes(q)
      const matchNiche  = !niche  || v.niche === niche
      return matchSearch && matchNiche
    })
  }, [deleted, search, niche])

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active: draggedId, over } = event
    if (!over || draggedId.id === over.id) return

    setActive(prev => {
      const oldIndex = prev.findIndex(v => v.id === draggedId.id)
      const newIndex = prev.findIndex(v => v.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      // Re-assign sort_order values to match new positions
      return reordered.map((v, i) => ({ ...v, sort_order: i + 1 }))
    })
    setIsDirty(true)
  }

  // ── Auto-sort ──────────────────────────────────────────────────────────────
  function applyAutoSort() {
    const sorted = [...active].sort((a, b) => getSortValue(b, autoSortKey) - getSortValue(a, autoSortKey))
    const withOrder = sorted.map((v, i) => ({ ...v, sort_order: i + 1 }))
    setActive(withOrder)
    setIsDirty(true)
  }

  // ── Smart recommendation engine ────────────────────────────────────────────
  function handleSmartSort() {
    const result = applySmartSort(active, smartWeights, smartFrom, smartTo)
    setActive(result)
    setIsDirty(true)
  }

  function resetSmartWeights() {
    setSmartWeights(DEFAULT_WEIGHTS)
    setSmartFrom('')
    setSmartTo('')
  }

  // ── Save order ─────────────────────────────────────────────────────────────
  async function saveOrder() {
    setSaving(true)
    try {
      const items = active.map(v => ({ id: v.id, sort_order: v.sort_order ?? 9999 }))
      const res = await fetch('/api/admin/videos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setIsDirty(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[saveOrder]', msg)
      alert(`Save failed: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const video = active.find(v => v.id === id)!
    setActive(prev => prev.filter(v => v.id !== id))
    setDeleted(prev => [{ ...video, deleted_at: new Date().toISOString() }, ...prev])

    const res = await fetch(`/api/admin/videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    if (!res.ok) {
      // Rollback
      setActive(prev => [video, ...prev])
      setDeleted(prev => prev.filter(v => v.id !== id))
      alert('Delete failed')
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────────
  async function handleRestore(id: string) {
    const video = deleted.find(v => v.id === id)!
    setDeleted(prev => prev.filter(v => v.id !== id))
    setActive(prev => [{ ...video, deleted_at: null }, ...prev])

    const res = await fetch(`/api/admin/videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    })
    if (!res.ok) {
      // Rollback
      setDeleted(prev => [video, ...prev])
      setActive(prev => prev.filter(v => v.id !== id))
      alert('Restore failed')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const currentList = useMemo(
    () => tab === 'active' ? visibleActive : visibleDeleted,
    [tab, visibleActive, visibleDeleted]
  )

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">Video Management</h1>
          <p className="text-gray-400 text-sm">
            {active.length} active · {deleted.length} deleted
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && !loading && (
            <span className="text-xs text-gray-600 hidden sm:block">
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Viral Radar + Prompt Manager + Quality Checker ──────────────────── */}
      <div className="mb-5 space-y-3">
        <ViralRadarButton />
        <PromptQualityChecker />
        <PromptManager />
      </div>

      {/* ── Smart Recommendation Engine panel ─────────────────────────────── */}
      <div className="mb-5 bg-gray-800 border border-violet-700/40 rounded-xl overflow-hidden">
        <button
          onClick={() => setSmartOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-700/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Brain className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Smart Recommendation Engine</span>
            <span className="text-xs text-gray-500 hidden sm:inline">
              — weight multiple metrics to compute a combined ranking score
            </span>
          </div>
          {smartOpen
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {smartOpen && (
          <div className="px-5 pb-5 border-t border-gray-700/60">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

              {/* Date range */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Publish Date Range
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 mb-1 block">From</label>
                    <input
                      type="date"
                      value={smartFrom}
                      onChange={e => setSmartFrom(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <span className="text-gray-600 mt-4">→</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 mb-1 block">To</label>
                    <input
                      type="date"
                      value={smartTo}
                      onChange={e => setSmartTo(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Videos outside this range are sorted to the end (score = 0).
                  Leave blank to include all videos.
                </p>
              </div>

              {/* Weights */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpDown className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Metric Weights (0 = ignore · 100 = max importance)
                  </span>
                </div>
                <div className="space-y-3">
                  <WeightSlider label="Views"           value={smartWeights.views}     onChange={v => setSmartWeights(w => ({ ...w, views: v }))} />
                  <WeightSlider label="Like Rate %"     value={smartWeights.likeRate}  onChange={v => setSmartWeights(w => ({ ...w, likeRate: v }))} />
                  <WeightSlider label="Share Rate %"    value={smartWeights.shareRate} onChange={v => setSmartWeights(w => ({ ...w, shareRate: v }))} />
                  <WeightSlider label="Engagement %"    value={smartWeights.engRate}   onChange={v => setSmartWeights(w => ({ ...w, engRate: v }))} />
                  <WeightSlider label="Recency"         value={smartWeights.recency}   onChange={v => setSmartWeights(w => ({ ...w, recency: v }))} />
                </div>
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-700/60">
              <button
                onClick={handleSmartSort}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Brain className="h-4 w-4" />
                Compute &amp; Apply
              </button>
              <button
                onClick={resetSmartWeights}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
              <p className="text-xs text-gray-500 ml-auto hidden sm:block">
                After applying, click{' '}
                <span className="text-emerald-400">Save Order</span> to publish to the products page.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          <strong>Query error:</strong> {fetchError}
          <span className="ml-2 text-red-400 text-xs">(check browser console for details)</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-800/60 rounded-xl p-1 w-fit">
        {(['active', 'deleted'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'active' ? `Active (${active.length})` : `Deleted (${deleted.length})`}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title…"
          className="flex-1 min-w-[180px] max-w-xs bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        {/* Niche */}
        <select
          value={niche}
          onChange={e => setNiche(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All niches</option>
          {['Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel', 'General'].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* Auto-sort — active tab only */}
        {tab === 'active' && (
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={autoSortKey}
              onChange={e => setAutoSortKey(e.target.value as SortKey)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={applyAutoSort}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              title="Auto-sort all videos by selected metric"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Apply Sort
            </button>
          </div>
        )}

        {/* Save order */}
        {tab === 'active' && isDirty && (
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        )}
        {saveOk && (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>

      {/* Hint bar */}
      {tab === 'active' && (
        <p className="text-xs text-gray-500 mb-3">
          Drag <GripVertical className="h-3 w-3 inline" /> to reorder manually, or pick a metric and click{' '}
          <span className="text-violet-400">Apply Sort</span> to auto-order. Click{' '}
          <span className="text-emerald-400">Save Order</span> to publish the order to the products page.
        </p>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : currentList.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            {tab === 'active' ? 'No active videos found.' : 'No deleted videos.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="w-8" />
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase text-right">#</th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase">Cover</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase">Title</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase">Niche</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Views</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Like%</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Share%</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Eng%</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Score</th>
                  <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Actions</th>
                </tr>
              </thead>

              {tab === 'active' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleActive.map(v => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {visibleActive.map((video, i) => (
                        <SortableRow
                          key={video.id}
                          video={video}
                          index={i}
                          tab="active"
                          onDelete={handleDelete}
                          onRestore={handleRestore}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
              ) : (
                <tbody>
                  {visibleDeleted.map((video, i) => (
                    <SortableRow
                      key={video.id}
                      video={video}
                      index={i}
                      tab="deleted"
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && currentList.length > 0 && (
        <p className="text-xs text-gray-600 mt-3 text-right">
          Showing {currentList.length} of {tab === 'active' ? active.length : deleted.length} videos
        </p>
      )}
    </div>
  )
}
