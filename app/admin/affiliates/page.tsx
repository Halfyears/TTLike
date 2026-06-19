'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LocalDate } from '@/components/ui/LocalDate'
import {
  Plus, Search, RefreshCw, Copy, ExternalLink,
  Pencil, Trash2, X, ChevronDown, Link2,
  ToggleLeft, ToggleRight, CheckCircle, TrendingUp,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AffLink {
  id:          string
  code:        string
  destination: string
  userId:      string | null
  clicks:      number
  conversions: number
  revenue:     string   // Prisma Decimal → serialised as string
  isActive:    boolean
  createdAt:   string
  updatedAt:   string
}

type FormData = {
  code:        string
  destination: string
  userId:      string
  isActive:    boolean
}

const EMPTY: FormData = { code: '', destination: '', userId: '', isActive: true }

// ── Helpers ───────────────────────────────────────────────────────────────────
function convRate(clicks: number, conv: number) {
  return clicks > 0 ? ((conv / clicks) * 100).toFixed(1) + '%' : '0%'
}
function rev(r: string | number) {
  return `$${Number(r).toFixed(2)}`
}

// ── Inline editable stat cell ─────────────────────────────────────────────────
function StatEdit({
  value, onSave,
}: { value: number; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(String(value))

  function commit() {
    const n = parseFloat(draft)
    if (Number.isFinite(n) && n >= 0) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number" min={0} step={0.01}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-20 bg-gray-700 border border-violet-500 rounded px-2 py-0.5 text-sm text-white outline-none text-right tabular-nums"
      />
    )
  }
  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      title="Click to edit"
      className="tabular-nums hover:text-violet-400 transition-colors cursor-pointer"
    >
      {value.toLocaleString()}
    </button>
  )
}

// ── Form field ────────────────────────────────────────────────────────────────
function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
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
export default function AdminAffiliatesPage() {
  const [items,   setItems]   = useState<AffLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'all' | 'active' | 'inactive'>('all')
  const [copied,  setCopied]  = useState<string | null>(null)

  // Slide-over
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState<AffLink | null>(null)
  const [form,    setForm]    = useState<FormData>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  // Delete confirm
  const [delId,    setDelId]    = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/admin/affiliates')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.links)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(() => void fetchAll()) }, [fetchAll])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:       items.length,
    active:      items.filter(l => l.isActive).length,
    clicks:      items.reduce((s, l) => s + l.clicks, 0),
    conversions: items.reduce((s, l) => s + l.conversions, 0),
    revenue:     items.reduce((s, l) => s + Number(l.revenue), 0),
  }), [items])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(l => {
      const matchSearch = !search ||
        l.code.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q) ||
        (l.userId ?? '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all'      ? true :
        filter === 'active'   ? l.isActive :
        !l.isActive
      return matchSearch && matchFilter
    })
  }, [items, search, filter])

  // ── Copy tracking URL ──────────────────────────────────────────────────────
  function copyLink(code: string) {
    const url = `${window.location.origin}/?ref=${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null); setForm(EMPTY); setFormErr(null); setOpen(true)
  }
  function openEdit(l: AffLink) {
    setEditing(l)
    setForm({ code: l.code, destination: l.destination, userId: l.userId ?? '', isActive: l.isActive })
    setFormErr(null); setOpen(true)
  }
  function closePanel() { setOpen(false); setEditing(null); setForm(EMPTY) }
  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.destination.trim()) { setFormErr('Destination URL is required'); return }
    setSaving(true); setFormErr(null)
    try {
      const url    = editing ? `/api/admin/affiliates/${editing.id}` : '/api/admin/affiliates'
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

  async function handleToggle(l: AffLink) {
    // Optimistic
    setItems(prev => prev.map(x => x.id === l.id ? { ...x, isActive: !x.isActive } : x))
    const res = await fetch(`/api/admin/affiliates/${l.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !l.isActive }),
    })
    if (!res.ok) setItems(prev => prev.map(x => x.id === l.id ? { ...x, isActive: l.isActive } : x))
  }

  async function handleStatSave(l: AffLink, field: 'clicks' | 'conversions' | 'revenue', value: number) {
    setItems(prev => prev.map(x => x.id === l.id ? { ...x, [field]: field === 'revenue' ? String(value) : value } : x))
    await fetch(`/api/admin/affiliates/${l.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  async function handleDelete() {
    if (!delId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/affiliates/${delId}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold text-white mb-0.5">Affiliate Links</h1>
          <p className="text-gray-400 text-sm">{kpis.total} links · {kpis.active} active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> New Link
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Links',  value: kpis.total },
          { label: 'Active',       value: kpis.active },
          { label: 'Total Clicks', value: kpis.clicks.toLocaleString() },
          { label: 'Conversions',  value: kpis.conversions.toLocaleString() },
          { label: 'Revenue',      value: rev(kpis.revenue) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-2xl font-black text-white tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search code, URL, user…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="relative">
          <select
            value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
            className="appearance-none bg-gray-800 border border-gray-600 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="all">All status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
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
              ? 'No affiliate links yet — click "+ New Link" to create one.'
              : 'No results match your filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700 text-xs font-medium text-gray-400 uppercase">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conv%</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {visible.map(l => (
                  <tr key={l.id} className="hover:bg-gray-700/30 transition-colors">

                    {/* Code + copy */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-pink-400 whitespace-nowrap">{l.code}</span>
                        <button
                          onClick={() => copyLink(l.code)}
                          title="Copy tracking URL"
                          className="text-gray-600 hover:text-gray-300 transition-colors"
                        >
                          {copied === l.code
                            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <a
                        href={l.destination} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 truncate"
                      >
                        <span className="truncate">{l.destination}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </td>

                    {/* User ID */}
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px]">
                      {l.userId ? (
                        <span className="font-mono truncate block">{l.userId}</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>

                    {/* Clicks — inline editable */}
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">
                      <StatEdit value={l.clicks} onSave={v => handleStatSave(l, 'clicks', v)} />
                    </td>

                    {/* Conv% */}
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      <span className={l.conversions > 0 ? 'text-emerald-400' : 'text-gray-600'}>
                        {convRate(l.clicks, l.conversions)}
                      </span>
                    </td>

                    {/* Revenue — inline editable */}
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={Number(l.revenue) > 0 ? 'text-emerald-400 font-semibold' : 'text-gray-600'}>
                        $<StatEdit value={Number(l.revenue)} onSave={v => handleStatSave(l, 'revenue', v)} />
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(l)} title={l.isActive ? 'Deactivate' : 'Activate'}>
                        {l.isActive
                          ? <ToggleRight className="h-6 w-6 text-emerald-400" />
                          : <ToggleLeft  className="h-6 w-6 text-gray-600" />}
                      </button>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <LocalDate date={l.createdAt} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(l)}
                          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-600 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDelId(l.id)}
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

      {/* Tracking URL hint */}
      {items.length > 0 && (
        <p className="text-xs text-gray-600 mt-3 text-right flex items-center justify-end gap-1">
          <Link2 className="h-3 w-3" />
          Tracking URL format: <span className="font-mono text-gray-500 ml-1">{typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/?ref=CODE</span>
        </p>
      )}

      {/* ── Slide-over form panel ────────────────────────────────────────── */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Link2 className="h-5 w-5 text-pink-400" />
                {editing ? 'Edit Link' : 'New Affiliate Link'}
              </h2>
              <button onClick={closePanel} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Destination */}
              <Field label="Destination URL" required>
                <input
                  type="url"
                  value={form.destination}
                  onChange={e => set('destination', e.target.value)}
                  placeholder="https://example.com/product"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Where clicks are redirected to. Can be a product page, landing page, etc.
                </p>
              </Field>

              {/* Code */}
              <Field label={editing ? 'Code (read-only)' : 'Custom Code (optional)'}>
                <input
                  value={form.code}
                  onChange={e => set('code', e.target.value.toUpperCase())}
                  placeholder={editing ? '' : 'Leave blank to auto-generate'}
                  disabled={!!editing}
                  className={inputCls + (editing ? ' opacity-50 cursor-not-allowed' : '')}
                />
                {!editing && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Auto-generates as <span className="font-mono text-pink-400">TTL-XXXXXX</span> if left blank.
                  </p>
                )}
              </Field>

              {/* User ID */}
              <Field label="User ID (optional)">
                <input
                  value={form.userId}
                  onChange={e => set('userId', e.target.value)}
                  placeholder="Paste user UUID to assign to a user"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Assign to a specific user for attribution. Leave blank for unassigned links.
                </p>
              </Field>

              <hr className="border-gray-700" />

              {/* Active toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className="flex items-center gap-3"
                >
                  {form.isActive
                    ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                    : <ToggleLeft  className="h-7 w-7 text-gray-600" />}
                  <span className="text-sm text-gray-300">
                    {form.isActive ? 'Active — link is live' : 'Inactive — link is disabled'}
                  </span>
                </button>
              </div>

              {formErr && <p className="text-red-400 text-sm">{formErr}</p>}

              {/* Footer inside form */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Link'}
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

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      {delId && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setDelId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Delete Link?</h3>
            <p className="text-gray-400 text-sm mb-5">
              The link and all its stats will be permanently removed.
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

      {/* Inline edit hint */}
      {!loading && items.length > 0 && (
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Click any Clicks or Revenue value to edit it inline.
        </p>
      )}
    </div>
  )
}
