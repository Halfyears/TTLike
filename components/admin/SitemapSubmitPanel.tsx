'use client'

/**
 * SitemapSubmitPanel
 *
 * Admin widget that submits the sitemap to Bing + IndexNow with a single click.
 * Shows the last submission timestamp and per-engine results.
 */

import { useEffect, useState, useCallback } from 'react'

interface EngineResult {
  engine:   string
  ok:       boolean
  status?:  number
  skipped?: boolean
  reason?:  string
}

interface StatusData {
  last_submitted_at: string | null
  results:           EngineResult[] | null
}

export function SitemapSubmitPanel() {
  const [status,      setStatus]      = useState<StatusData | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; results: EngineResult[]; submitted_at: string } | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  // ── Load last submission status ──────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/sitemap/status')
      const json = await res.json() as StatusData
      setStatus(json)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { queueMicrotask(() => void loadStatus()) }, [loadStatus])

  // ── Submit handler ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    setSubmitResult(null)
    try {
      const res  = await fetch('/api/admin/sitemap/submit', { method: 'POST' })
      const json = await res.json() as { ok: boolean; results: EngineResult[]; submitted_at: string; error?: string }
      if (json.error) {
        setError(json.error)
      } else {
        setSubmitResult(json)
        // Refresh persisted status
        await loadStatus()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(iso: string | null) {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const displayResults = submitResult?.results ?? status?.results ?? null
  const displayTime    = submitResult?.submitted_at ?? status?.last_submitted_at ?? null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">🗺️ Sitemap 自动提交</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            提交至 Bing Webmaster API + IndexNow，加速新页面收录
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     bg-pink-600 hover:bg-pink-500 text-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中…' : '立即提交'}
        </button>
      </div>

      {/* Last submission timestamp */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="shrink-0">上次提交：</span>
        <span className={displayTime ? 'text-gray-200' : 'text-gray-500'}>
          {formatDate(displayTime)}
        </span>
      </div>

      {/* Engine results */}
      {displayResults && displayResults.length > 0 && (
        <div className="space-y-2">
          {displayResults.map(r => (
            <div key={r.engine} className="flex items-center gap-3 text-xs">
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                r.skipped ? 'bg-gray-500' : r.ok ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-300 w-20 shrink-0">{r.engine}</span>
              {r.skipped ? (
                <span className="text-gray-500">未配置 ({r.reason})</span>
              ) : r.ok ? (
                <span className="text-green-400">
                  成功 {r.status ? `(HTTP ${r.status})` : ''}
                </span>
              ) : (
                <span className="text-red-400">
                  失败 {r.status ? `(HTTP ${r.status})` : ''} {r.reason ? `— ${r.reason.slice(0, 60)}` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
