'use client'

/**
 * BatchClient — Batch Analysis UI (Creator+ feature)
 *
 * Processes up to 10 TikTok URLs sequentially:
 *   resolve-url → GET context → analyze-video → poll status → done
 *
 * Each item is processed one at a time to respect quota and Trigger.dev limits.
 */

import { useState, useRef } from 'react'
import { Plus, X, Zap, Loader2, CheckCircle2, XCircle, ExternalLink, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemStatus =
  | 'idle'
  | 'resolving'
  | 'queued'
  | 'analyzing'
  | 'done'
  | 'failed'

interface BatchItem {
  id:           string   // local UI id
  url:          string
  status:       ItemStatus
  error?:       string
  video_id?:    string
  breakdown_id?: string
  product_name?: string
  category?:    string
}

interface Props {
  tier:      string
  remaining: number   // server-rendered; we track live remaining in state
  limit:     number
}

const MAX_BATCH  = 10
const POLL_MS    = 3000
const MAX_POLLS  = 60   // 3 min max per item

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, error }: { status: ItemStatus; error?: string }) {
  if (status === 'idle')      return <span className="text-xs text-gray-400">Waiting</span>
  if (status === 'resolving') return <span className="flex items-center gap-1 text-xs text-blue-500"><Loader2 className="h-3 w-3 animate-spin" />Resolving</span>
  if (status === 'queued')    return <span className="flex items-center gap-1 text-xs text-amber-500"><Loader2 className="h-3 w-3 animate-spin" />Queued</span>
  if (status === 'analyzing') return <span className="flex items-center gap-1 text-xs text-violet-500"><Loader2 className="h-3 w-3 animate-spin" />Analyzing</span>
  if (status === 'done')      return <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>
  if (status === 'failed')    return (
    <span className="flex items-center gap-1 text-xs text-red-500" title={error}>
      <XCircle className="h-3.5 w-3.5" />
      {error ? error.slice(0, 40) : 'Failed'}
    </span>
  )
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export function BatchClient({ tier, remaining: remainingInit, limit }: Props) {
  const [items,     setItems]     = useState<BatchItem[]>([{ id: '1', url: '', status: 'idle' }])
  const [running,   setRunning]   = useState(false)
  const [remaining, setRemaining] = useState(remainingInit)
  const abortRef = useRef(false)

  const isFree = tier === 'free'

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<BatchItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function addRow() {
    if (items.length >= MAX_BATCH) return
    const id = String(Date.now())
    setItems(prev => [...prev, { id, url: '', status: 'idle' }])
  }

  function removeRow(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text  = e.clipboardData.getData('text')
    const lines = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (lines.length <= 1) return   // single URL: let normal input handle it

    e.preventDefault()
    setItems(prev => {
      // Keep existing filled rows; replace only empty ones, then append remainder
      const filled  = prev.filter(it => it.url.trim())
      const merged  = [...filled, ...lines.map((url, i) => ({
        id:     String(Date.now() + i),
        url,
        status: 'idle' as ItemStatus,
      }))]
      return merged.slice(0, MAX_BATCH)
    })
  }

  // ── Pipeline per item ─────────────────────────────────────────────────────────

  async function processItem(item: BatchItem): Promise<boolean> {
    if (abortRef.current) return false

    // Step 1: resolve URL
    updateItem(item.id, { status: 'resolving' })
    let video_id: string
    let product_name: string | undefined
    let category: string | undefined

    try {
      const res  = await fetch('/api/studio/resolve-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: item.url }),
      })
      const json = await res.json()
      if (!res.ok || !json.video_id) throw new Error(json.error ?? 'Could not resolve URL')
      video_id = json.video_id

      // Step 2: get context (product_name, category) — best-effort
      const ctxRes = await fetch(`/api/studio/context/${video_id}`)
      if (ctxRes.ok) {
        const ctx = await ctxRes.json()
        product_name = ctx.product_name ?? undefined
        category     = ctx.category     ?? undefined
      }

      updateItem(item.id, { video_id, product_name, category, status: 'queued' })
    } catch (e) {
      updateItem(item.id, { status: 'failed', error: e instanceof Error ? e.message : 'Resolve failed' })
      return false   // quota was NOT spent — resolve failed before analyze-video
    }

    if (abortRef.current) return false

    // Step 3: trigger analysis
    let breakdown_id: string
    try {
      const res  = await fetch('/api/studio/analyze-video', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          video_id,
          product_schema: {
            category:     category    ?? 'General',
            price_point:  29,
            pain_points:  [],
            product_name: product_name ?? undefined,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.breakdown_id) throw new Error(json.message ?? json.error ?? 'Analysis failed to queue')
      breakdown_id = json.breakdown_id
      updateItem(item.id, { breakdown_id, status: 'analyzing' })
    } catch (e) {
      updateItem(item.id, { status: 'failed', error: e instanceof Error ? e.message : 'Queue failed' })
      return false   // analyze-video rejected (e.g. 402); quota was NOT spent
    }

    // Quota was spent — poll for result
    if (abortRef.current) return true

    // Step 4: poll status
    let polls = 0
    while (polls < MAX_POLLS) {
      if (abortRef.current) return true
      await new Promise(r => setTimeout(r, POLL_MS))
      polls++

      try {
        const res  = await fetch(`/api/studio/status?breakdown_id=${breakdown_id}`)
        const json = await res.json()
        const vs   = json.viral_status as string

        if (vs === 'COMPLETED') {
          updateItem(item.id, { status: 'done' })
          return true
        }
        if (vs === 'FAILED') {
          updateItem(item.id, { status: 'failed', error: json.viral_error ?? 'Pipeline failed' })
          return true
        }
      } catch { /* network blip — keep polling */ }
    }

    updateItem(item.id, { status: 'failed', error: 'Timed out after 3 minutes' })
    return true
  }

  // ── Run batch ─────────────────────────────────────────────────────────────────

  async function runBatch() {
    const allValid   = items.filter(it => it.url.trim())
    // Pre-flight: only process up to the quota remaining
    const toProcess  = allValid.slice(0, remaining)
    if (!toProcess.length) return

    abortRef.current = false
    setRunning(true)

    // Reset all to idle
    setItems(prev => prev.map(it =>
      it.url.trim() ? { ...it, status: 'idle', error: undefined, video_id: undefined, breakdown_id: undefined } : it
    ))

    let consumed = 0
    for (const item of toProcess) {
      if (abortRef.current) break
      const quotaSpent = await processItem(item)
      if (quotaSpent) consumed++
    }

    // Decrement only by analyses that actually hit the server
    setRemaining(r => Math.max(0, r - consumed))
    setRunning(false)
  }

  function stopBatch() {
    abortRef.current = true
    setRunning(false)
  }

  // ── Upgrade gate ──────────────────────────────────────────────────────────────

  if (isFree) {
    return (
      <div className="border-2 border-dashed border-pink-200 rounded-2xl p-8 text-center bg-pink-50/30">
        <Lock className="h-10 w-10 mx-auto mb-3 text-pink-300" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Creator Plan Required</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-2">
          Batch Analysis lets you queue up to 10 TikTok URLs and process them automatically — one after another.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Free plan: 1 at a time · Creator plan: up to 10 per batch
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Upgrade to Creator — $29/mo
        </Link>
      </div>
    )
  }

  // ── Quota warning ─────────────────────────────────────────────────────────────

  const validCount = items.filter(it => it.url.trim()).length
  const quotaShort = validCount > remaining

  // ── Main UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Quota bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
        <span>Monthly quota: <span className="font-semibold text-gray-800">{remaining}</span> analyses remaining of {limit}</span>
        <Link href="/dashboard/usage" className="text-pink-500 hover:text-pink-600 font-medium">View usage →</Link>
      </div>

      {/* URL list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">TikTok URLs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add up to {MAX_BATCH} URLs · Paste multiple lines to auto-fill</p>
          </div>
          <span className="text-xs text-gray-400">{items.filter(it => it.url.trim()).length}/{MAX_BATCH}</span>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xs text-gray-300 font-mono w-4 shrink-0">{idx + 1}</span>

              <input
                type="text"
                value={item.url}
                onChange={e => updateItem(item.id, { url: e.target.value })}
                disabled={running}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="flex-1 text-sm text-gray-800 placeholder-gray-300 bg-transparent outline-none min-w-0"
                onPaste={idx === 0 ? handlePaste : undefined}
              />

              <div className="shrink-0 min-w-[100px] flex items-center justify-end gap-2">
                <StatusBadge status={item.status} error={item.error} />
                {item.status === 'done' && item.breakdown_id && (
                  <Link
                    href={`/dashboard/studio/${item.breakdown_id}`}
                    target="_blank"
                    className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {!running && item.status !== 'analyzing' && (
                  <button
                    onClick={() => removeRow(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add row */}
        {!running && items.length < MAX_BATCH && (
          <button
            onClick={addRow}
            className="w-full flex items-center gap-2 px-5 py-3 text-xs text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-colors border-t border-dashed border-gray-100"
          >
            <Plus className="h-3.5 w-3.5" /> Add URL
          </button>
        )}
      </div>

      {/* Quota warning */}
      {quotaShort && !running && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            You have <strong>{validCount}</strong> URLs but only <strong>{remaining}</strong> analyses remaining.
            Only the first {remaining} will be processed.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {running ? (
          <button
            onClick={stopBatch}
            className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={runBatch}
            disabled={!items.some(it => it.url.trim())}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4" />
            Analyze {validCount > 0 ? `${Math.min(validCount, remaining)} Video${Math.min(validCount, remaining) !== 1 ? 's' : ''}` : 'Videos'}
          </button>
        )}

        {!running && items.some(it => it.status === 'done' || it.status === 'failed') && (
          <button
            onClick={() => setItems(prev => prev.map(it => ({ ...it, status: 'idle', error: undefined, video_id: undefined, breakdown_id: undefined })))}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Summary when done */}
      {!running && items.some(it => it.status === 'done') && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">
              {items.filter(it => it.status === 'done').length} analysis completed
              {items.filter(it => it.status === 'failed').length > 0 && (
                <span className="text-red-500 ml-1">
                  · {items.filter(it => it.status === 'failed').length} failed
                </span>
              )}
            </p>
            <p className="text-xs text-green-600 mt-0.5">Click &quot;View&quot; next to each result to open the full breakdown.</p>
          </div>
          <Link href="/dashboard/usage" className="text-xs text-green-600 hover:text-green-800 font-medium">
            View all →
          </Link>
        </div>
      )}
    </div>
  )
}
