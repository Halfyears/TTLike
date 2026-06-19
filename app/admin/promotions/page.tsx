'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LocalDate } from '@/components/ui/LocalDate'
import {
  Plus, Search, RefreshCw, ExternalLink, Pencil, Trash2,
  X, ChevronDown, TrendingUp, Link2, Package, Check,
  ToggleLeft, ToggleRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface VideoHit {
  id: string
  product_name: string | null
  title: string | null
  cover_url: string | null
  author: string | null
  viral_score: number
}

interface Promotion {
  id: string
  video_id: string | null
  product_name: string
  description: string | null
  supplier_name: string | null
  supplier_url: string | null
  platform: string | null
  affiliate_code: string | null
  affiliate_username: string | null
  affiliate_url: string | null
  commission_rate: number
  clicks: number
  conversions: number
  revenue: number
  is_active: boolean
  created_at: string
  video: VideoHit | null
}

type FormData = Omit<Promotion, 'id' | 'created_at' | 'clicks' | 'conversions' | 'revenue' | 'video'>

const PLATFORMS = [
  { value: 'amazon',      label: 'Amazon Associates' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
  { value: 'shareasale',  label: 'ShareASale' },
  { value: 'cj',          label: 'CJ Affiliate' },
  { value: 'rakuten',     label: 'Rakuten' },
  { value: 'custom',      label: 'Custom / Other' },
]

const EMPTY: FormData = {
  video_id: null,
  product_name: '',
  description: '',
  supplier_name: '',
  supplier_url: '',
  platform: '',
  affiliate_code: '',
  affiliate_username: '',
  affiliate_url: '',
  commission_rate: 0,
  is_active: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function platformLabel(p: string | null) {
  return PLATFORMS.find(x => x.value === p)?.label ?? p ?? '—'
}
function convRate(clicks: number, conv: number) {
  return clicks > 0 ? ((conv / clicks) * 100).toFixed(1) + '%' : '0%'
}

// ── Video search autocomplete ─────────────────────────────────────────────────
function VideoSearch({
  value, label, onChange,
}: {
  value: string | null
  label: string
  onChange: (id: string | null) => void
}) {
  const [q, setQ]           = useState(label)
  const [hits, setHits]     = useState<VideoHit[]>([])
  const [open, setOpen]     = useState(false)
  const [loading, setLoad]  = useState(false)
  const timer               = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supabase            = useMemo(() => createClient(), [])

  async function search(term: string) {
    if (!term.trim()) { setHits([]); return }
    setLoad(true)
    const { data } = await supabase
      .from('tiktok_videos')
      .select('id, product_name, title, cover_url, author, viral_score')
      .is('deleted_at', null)
      .or(`product_name.ilike.%${term}%,title.ilike.%${term}%`)
      .order('viral_score', { ascending: false })
      .limit(8)
    setHits((data ?? []) as VideoHit[])
    setLoad(false)
  }

  function handleInput(v: string) {
    setQ(v)
    setOpen(true)
    if (v === '') { onChange(null); setHits([]) }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v), 300)
  }

  function pick(hit: VideoHit) {
    const name = hit.product_name ?? hit.title ?? hit.id
    setQ(name)
    setOpen(false)
    onChange(hit.id)
  }

  function clear() {
    setQ('')
    setOpen(false)
    onChange(null)
    setHits([])
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus-within:ring-2 focus-within:ring-violet-500">
        <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <input
          value={q}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => q && setOpen(true)}
          placeholder="Search videos by product/title…"
          className="flex-1 bg-transparent outline-none placeholder-gray-500 min-w-0"
        />
        {value && (
          <button onClick={clear} className="text-gray-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && <span className="text-xs text-gray-500">…</span>}
      </div>

      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {hits.map(h => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => pick(h)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
              >
                {h.cover_url ? (
                  <img src={h.cover_url} alt="" className="h-10 w-7 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-7 rounded bg-gray-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3 w-3 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white truncate font-medium">
                    {h.product_name ?? h.title ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{h.author}</p>
                </div>
                <span className="ml-auto text-xs text-gray-500 shrink-0">
                  {h.viral_score.toFixed(0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Form field helpers ────────────────────────────────────────────────────────
function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-pink-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPromotionsPage() {
  const [items,    setItems]    = useState<Promotion[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [platform, setPlatform] = useState('')

  // Slide-over form
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form,    setForm]    = useState<FormData>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  // Delete confirm
  const [delId, setDelId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/admin/promotions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.promotions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(() => void fetchAll()) }, [fetchAll])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:      items.length,
    active:     items.filter(p => p.is_active).length,
    clicks:     items.reduce((s, p) => s + p.clicks, 0),
    revenue:    items.reduce((s, p) => s + Number(p.revenue), 0),
    conversions: items.reduce((s, p) => s + p.conversions, 0),
  }), [items])

  // ── Filtered ──────────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = items
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        (p.supplier_name ?? '').toLowerCase().includes(q) ||
        (p.affiliate_code ?? '').toLowerCase().includes(q) ||
        (p.affiliate_username ?? '').toLowerCase().includes(q)
      )
    }
    if (platform) list = list.filter(p => p.platform === platform)
    return list
  }, [items, search, platform])

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setFormErr(null)
    setOpen(true)
  }

  function openEdit(p: Promotion) {
    setEditing(p)
    setForm({
      video_id:           p.video_id,
      product_name:       p.product_name,
      description:        p.description ?? '',
      supplier_name:      p.supplier_name ?? '',
      supplier_url:       p.supplier_url ?? '',
      platform:           p.platform ?? '',
      affiliate_code:     p.affiliate_code ?? '',
      affiliate_username: p.affiliate_username ?? '',
      affiliate_url:      p.affiliate_url ?? '',
      commission_rate:    p.commission_rate,
      is_active:          p.is_active,
    })
    setFormErr(null)
    setOpen(true)
  }

  function closePanel() { setOpen(false); setEditing(null); setForm(EMPTY) }

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_name.trim()) { setFormErr('Product name is required'); return }
    setSaving(true); setFormErr(null)

    try {
      const url    = editing ? `/api/admin/promotions/${editing.id}` : '/api/admin/promotions'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchAll()
      closePanel()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(p: Promotion) {
    // Optimistic update
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    const res = await fetch(`/api/admin/promotions/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    // Roll back on failure
    if (!res.ok) setItems(prev => prev.map(x => x.id === p.id ? { ...x, is_active: p.is_active } : x))
  }

  async function handleDelete() {
    if (!delId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/promotions/${delId}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(x => x.id !== delId))
        setDelId(null)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Delete failed')
        setDelId(null)
      }
    } catch {
      setError('Delete failed — network error')
      setDelId(null)
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">Promotion Management</h1>
          <p className="text-gray-400 text-sm">{kpis.total} promotions · {kpis.active} active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Add Promotion
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total',       value: kpis.total },
          { label: 'Active',      value: kpis.active },
          { label: 'Clicks',      value: kpis.clicks.toLocaleString() },
          { label: 'Conversions', value: kpis.conversions.toLocaleString() },
          { label: 'Revenue',     value: `$${kpis.revenue.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-black text-white tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search product, supplier, code…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="relative">
          <select value={platform} onChange={e => setPlatform(e.target.value)}
            className="appearance-none bg-gray-800 border border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500">
            <option value="">All platforms</option>
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
        <span className="self-center text-xs text-gray-500">{visible.length} shown</span>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            {items.length === 0
              ? 'No promotions yet — click "+ Add Promotion" to create one.'
              : 'No results match your filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700 text-xs font-medium text-gray-400 uppercase">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Code / Username</th>
                  <th className="px-4 py-3 text-right">Comm%</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conv%</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {visible.map(p => (
                  <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">

                    {/* Product + linked video */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        {p.video?.cover_url ? (
                          <img src={p.video.cover_url} alt="" className="h-9 w-6 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-9 w-6 rounded bg-gray-700 flex items-center justify-center shrink-0">
                            <Package className="h-3 w-3 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{p.product_name}</p>
                          {p.video && (
                            <p className="text-[10px] text-violet-400 truncate">
                              🎬 {p.video.product_name ?? p.video.title ?? '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3 text-sm text-gray-300 max-w-[140px]">
                      {p.supplier_url ? (
                        <a href={p.supplier_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 truncate">
                          {p.supplier_name ?? '—'}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="truncate block">{p.supplier_name ?? '—'}</span>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                      {platformLabel(p.platform)}
                    </td>

                    {/* Code / Username */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {p.affiliate_code && (
                        <p className="font-mono text-xs text-pink-400 truncate">{p.affiliate_code}</p>
                      )}
                      {p.affiliate_username && (
                        <p className="text-xs text-gray-400 truncate">@{p.affiliate_username}</p>
                      )}
                      {p.affiliate_url && (
                        <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-0.5">
                          <Link2 className="h-2.5 w-2.5" />Link
                        </a>
                      )}
                      {!p.affiliate_code && !p.affiliate_username && <span className="text-gray-600">—</span>}
                    </td>

                    {/* Commission */}
                    <td className="px-4 py-3 text-sm text-gray-300 text-right tabular-nums">
                      {Number(p.commission_rate) > 0 ? `${Number(p.commission_rate).toFixed(1)}%` : '—'}
                    </td>

                    {/* Clicks */}
                    <td className="px-4 py-3 text-sm text-gray-300 text-right tabular-nums">
                      {p.clicks.toLocaleString()}
                    </td>

                    {/* Conv% */}
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      <span className={p.conversions > 0 ? 'text-emerald-400' : 'text-gray-600'}>
                        {convRate(p.clicks, p.conversions)}
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      <span className={Number(p.revenue) > 0 ? 'text-emerald-400 font-semibold' : 'text-gray-600'}>
                        ${Number(p.revenue).toFixed(2)}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'}>
                        {p.is_active
                          ? <ToggleRight className="h-6 w-6 text-emerald-400" />
                          : <ToggleLeft  className="h-6 w-6 text-gray-600" />}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <LocalDate date={p.created_at} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-600 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDelId(p.id)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over form panel ────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white">
                {editing ? 'Edit Promotion' : 'Add Promotion'}
              </h2>
              <button onClick={closePanel} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Section: Product ───────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">Product Info</p>

                <Field label="Product Name" required>
                  <input
                    value={form.product_name}
                    onChange={e => set('product_name', e.target.value)}
                    placeholder="e.g. Posture Corrector Pro"
                    className={inputCls}
                  />
                </Field>

                <Field label="Link to TikTok Video">
                  <VideoSearch
                    value={form.video_id}
                    label={
                      editing?.video
                        ? (editing.video.product_name ?? editing.video.title ?? '')
                        : ''
                    }
                    onChange={(id) => set('video_id', id)}
                  />
                  {form.video_id && (
                    <p className="text-[11px] text-violet-400 mt-1 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Video linked
                    </p>
                  )}
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description ?? ''}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Short product description for users…"
                    rows={3}
                    className={inputCls + ' resize-none'}
                  />
                </Field>
              </div>

              <hr className="border-gray-700" />

              {/* ── Section: Supplier ─────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Supplier / Brand</p>

                <Field label="Supplier Name">
                  <input
                    value={form.supplier_name ?? ''}
                    onChange={e => set('supplier_name', e.target.value)}
                    placeholder="e.g. Acme Health Co."
                    className={inputCls}
                  />
                </Field>

                <Field label="Supplier Website">
                  <input
                    type="url"
                    value={form.supplier_url ?? ''}
                    onChange={e => set('supplier_url', e.target.value)}
                    placeholder="https://supplier.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              <hr className="border-gray-700" />

              {/* ── Section: Affiliate ────────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">Affiliate Info</p>

                <Field label="Platform">
                  <div className="relative">
                    <select
                      value={form.platform ?? ''}
                      onChange={e => set('platform', e.target.value)}
                      className={inputCls + ' appearance-none pr-8'}
                    >
                      <option value="">Select platform…</option>
                      {PLATFORMS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Affiliate Code">
                    <input
                      value={form.affiliate_code ?? ''}
                      onChange={e => set('affiliate_code', e.target.value)}
                      placeholder="e.g. ttlike-20"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Username">
                    <input
                      value={form.affiliate_username ?? ''}
                      onChange={e => set('affiliate_username', e.target.value)}
                      placeholder="@handle"
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Full Affiliate URL">
                  <input
                    type="url"
                    value={form.affiliate_url ?? ''}
                    onChange={e => set('affiliate_url', e.target.value)}
                    placeholder="https://amzn.to/abc123"
                    className={inputCls}
                  />
                </Field>

                <Field label="Commission Rate (%)">
                  <input
                    type="number"
                    min={0} max={100} step={0.1}
                    value={form.commission_rate}
                    onChange={e => set('commission_rate', parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <hr className="border-gray-700" />

              {/* ── Section: Status ───────────────────────────────── */}
              <div>
                <button
                  type="button"
                  onClick={() => set('is_active', !form.is_active)}
                  className="flex items-center gap-3 group"
                >
                  {form.is_active
                    ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                    : <ToggleLeft  className="h-7 w-7 text-gray-600" />}
                  <span className="text-sm text-gray-300">
                    {form.is_active ? 'Active — visible to users' : 'Inactive — hidden from users'}
                  </span>
                </button>
              </div>

              {/* Form error */}
              {formErr && (
                <p className="text-red-400 text-sm">{formErr}</p>
              )}

              {/* Footer inside the form so Enter key & submit button both work */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Promotion'}
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-4 py-2.5 text-gray-400 hover:text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Delete confirm dialog ───────────────────────────────────────── */}
      {delId && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setDelId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Delete Promotion?</h3>
            <p className="text-gray-400 text-sm mb-5">
              This action cannot be undone. All stats for this promotion will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setDelId(null)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
