'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, Copy, Check, Trash2, Clock, Tag, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { HOOK_TYPES, NICHES } from '@/lib/constants'

interface Script {
  title: string
  hook: string
  body: string
  cta: string
  fullScript: string
}

interface HistoryItem {
  id: string
  product_name: string
  niche: string
  hook_type: string
  script_count: number
  keywords: string
  brand_name: string
  offer: string
  created_at: string
  scripts: Script[]
}

interface HistoryResponse {
  items: HistoryItem[]
  total: number
  page: number
  limit: number
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function HistoryCard({ item, onDelete }: { item: HistoryItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hookLabel = HOOK_TYPES.find(h => h.value === item.hook_type)?.label ?? item.hook_type

  async function handleDelete() {
    if (!confirm('Delete this script history entry?')) return
    setDeleting(true)
    try {
      await fetch('/api/ai/scripts/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      onDelete(item.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header row — always visible */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm truncate">{item.product_name}</span>
              <Badge>{item.niche || 'General'}</Badge>
              <span className="text-[10px] font-bold uppercase tracking-wide text-violet-500 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">
                {hookLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{timeAgo(item.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />{item.script_count} scripts
              </span>
              {item.keywords && (
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <Tag className="h-3 w-3 shrink-0" />{item.keywords}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDelete} disabled={deleting}
              className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-pink-500 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? 'Hide' : 'View scripts'}
            </button>
          </div>
        </div>

        {/* Expanded scripts */}
        {expanded && item.scripts?.length > 0 && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
            {item.scripts.map((script, i) => (
              <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Script header */}
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{script.title}</span>
                  </div>
                  <CopyButton text={script.fullScript} />
                </div>

                {/* Hook */}
                <div className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-pink-200 mb-0.5">Hook</p>
                  <p className="text-sm font-bold text-white leading-snug">&ldquo;{script.hook}&rdquo;</p>
                </div>

                {/* Body + CTA */}
                <div className="px-3 py-2 space-y-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Body</p>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{script.body}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-green-500 mb-0.5">CTA</p>
                    <p className="text-xs font-medium text-green-800">{script.cta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ScriptHistory() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterNiche, setFilterNiche] = useState('')
  const [filterHook, setFilterHook] = useState('')

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (search) params.set('search', search)
      if (filterNiche) params.set('niche', filterNiche)
      if (filterHook) params.set('hook', filterHook)

      const res = await fetch(`/api/ai/scripts/history?${params}`)
      const data: HistoryResponse = await res.json()
      if (p === 1) setItems(data.items)
      else setItems(prev => [...prev, ...data.items])
      setTotal(data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [search, filterNiche, filterHook])

  // Re-fetch when filters change
  useEffect(() => {
    fetchHistory(1)
  }, [fetchHistory])

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal(prev => prev - 1)
  }

  // Unique niches from history for filter chips
  const usedNiches = Array.from(new Set(items.map(i => i.niche).filter(Boolean)))

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Niche filter */}
        <select
          value={filterNiche} onChange={e => setFilterNiche(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-w-[160px]"
        >
          <option value="">All Niches</option>
          {[...new Set([...NICHES, ...usedNiches])].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* Hook type filter */}
        <select
          value={filterHook} onChange={e => setFilterHook(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-w-[160px]"
        >
          <option value="">All Hook Styles</option>
          {HOOK_TYPES.map(h => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-400">
          {total === 0 ? 'No scripts found' : `${total} generation${total === 1 ? '' : 's'}`}
          {(search || filterNiche || filterHook) && ' matching filters'}
        </p>
      )}

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium">No script history yet</p>
          <p className="text-xs mt-1">Generated scripts are saved automatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}

          {/* Load more */}
          {items.length < total && (
            <button
              onClick={() => fetchHistory(page + 1)}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : `Load more (${total - items.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
