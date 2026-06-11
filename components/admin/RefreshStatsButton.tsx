'use client'

/**
 * RefreshStatsButton
 *
 * Admin utility: calls POST /api/admin/videos/refresh-stats to backfill
 * views/likes/shares/comments for tiktok_videos rows that still show 0
 * (typically videos saved via the user-paste flow when RapidAPI fell back
 * to oEmbed, which returns no engagement stats).
 */

import { useState } from 'react'
import { BarChart2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface RefreshResult {
  updated: number
  checked: number
  failed:  number
  sampleErrors?: Array<{ tiktok_id: string; video_url: string | null; error: string }>
}

export function RefreshStatsButton() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<RefreshResult | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/admin/videos/refresh-stats', { method: 'POST' })
      const json = await res.json() as RefreshResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Refresh Video Stats</p>
            <p className="text-xs text-gray-400">Backfill views/likes/shares for videos showing 0 (oEmbed fallback)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Run Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && !error && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Updated {result.updated} · Failed {result.failed} · Checked {result.checked}
          </div>
          {result.sampleErrors && result.sampleErrors.length > 0 && (
            <div className="rounded-lg bg-gray-900 p-3 space-y-1">
              {result.sampleErrors.map((e, i) => (
                <div key={i} className="text-[11px] font-mono text-gray-400">
                  <span className="text-gray-300">{e.tiktok_id}</span>
                  {e.video_url && <span className="text-gray-600"> · {e.video_url.slice(0, 50)}</span>}
                  <div className="text-red-400/80">{e.error}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
