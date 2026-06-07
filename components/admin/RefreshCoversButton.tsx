'use client'

/**
 * RefreshCoversButton
 *
 * Admin utility: calls POST /api/admin/blog/refresh-covers to backfill any
 * blog post whose cover_image is an expired TikTok CDN URL with the permanent
 * Supabase Storage URL from the linked video.
 */

import { useState } from 'react'
import { ImageIcon, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface RefreshResult {
  updated:     number
  skipped:     number
  total_posts: number
  details:     Array<{ id: string; slug: string; status: string; url?: string }>
  message?:    string
}

export function RefreshCoversButton() {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<RefreshResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function run() {
    setLoading(true)
    setResult(null)
    setError(null)

    const adminKey = (document.querySelector('meta[name="admin-key"]') as HTMLMetaElement | null)?.content
                  ?? prompt('Enter admin API key:')
                  ?? ''

    try {
      const res = await fetch('/api/admin/blog/refresh-covers', {
        method:  'POST',
        headers: { 'x-admin-key': adminKey },
      })
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Refresh Blog Cover Images</p>
            <p className="text-xs text-gray-400">Replace expired TikTok CDN URLs with permanent Supabase Storage URLs</p>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Run Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Result summary */}
      {result && !error && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {result.message ?? `Updated ${result.updated} cover${result.updated !== 1 ? 's' : ''}. Skipped ${result.skipped}. Total posts: ${result.total_posts}.`}
          </div>

          {result.details.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-gray-400 hover:text-gray-300 underline transition-colors"
              >
                {expanded ? 'Hide' : 'Show'} details ({result.details.length} rows)
              </button>

              {expanded && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-gray-900 p-3 space-y-1">
                  {result.details.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs font-mono">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        d.status === 'updated'        ? 'bg-emerald-400' :
                        d.status.startsWith('error')  ? 'bg-red-400' : 'bg-gray-500'
                      }`} />
                      <span className="text-gray-300 truncate w-40">{d.slug}</span>
                      <span className="text-gray-500">{d.status}</span>
                      {d.url && <span className="text-gray-600 truncate">{d.url.slice(0, 60)}…</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
