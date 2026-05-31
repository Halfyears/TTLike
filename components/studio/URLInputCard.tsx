'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, ArrowRight, Loader2 } from 'lucide-react'

interface URLInputCardProps {
  // Returns a Promise so the card stays in loading state while parent fetches context
  onResolved: (videoId: string, title: string | null, productName: string | null, niche: string | null) => Promise<void>
  // Optional prefill from Dashboard ?url= param
  prefillUrl?: string
}

export function URLInputCard({ onResolved, prefillUrl }: URLInputCardProps) {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // ── Shared resolve logic — single source of truth ─────────────────────────
  const resolveUrl = useCallback(async (target: string) => {
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/studio/resolve-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tiktok_url: target }),
      })
      const data = await res.json()
      if (!data.ok) {
        // Surface specific server error when available
        setError(data.error ?? 'Could not resolve this URL. Please check it and try again.')
        return
      }
      await onResolved(data.video_id, data.title, data.product_name, data.niche)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [onResolved])

  // Auto-fill and auto-submit when prefillUrl is provided (from Dashboard)
  // Guard: only fire once per unique prefillUrl value
  useEffect(() => {
    if (!prefillUrl) return
    setUrl(prefillUrl)
    void resolveUrl(prefillUrl)
  }, [prefillUrl, resolveUrl])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    await resolveUrl(trimmed)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Studio</h1>
        <p className="text-gray-500 text-lg">Paste a TikTok URL → get a ready-to-film script</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
          ) : (
            <><span>Analyze</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="mt-4 text-center text-xs text-gray-400">
        Works with any public TikTok video URL
      </p>
    </div>
  )
}
