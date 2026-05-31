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

    if (target.length > 500) {
      setError('URL is too long. Please paste a standard TikTok video URL.')
      return
    }
    if (!/^https?:\/\//i.test(target) || !target.includes('tiktok.com')) {
      setError('Please enter a valid TikTok URL (https://www.tiktok.com/...)')
      return
    }

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
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
          Decode Any{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
            Viral Video
          </span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg">
          Paste a TikTok URL and get a ready-to-film script in ~20 seconds
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent backdrop-blur-sm"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity shadow-lg shadow-pink-500/30"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Analyzing...</span></>
          ) : (
            <><span className="hidden sm:inline">Analyze</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
