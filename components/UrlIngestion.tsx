'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, AlertTriangle } from 'lucide-react'

/**
 * UrlIngestion — user pastes a TikTok video URL, we look it up in our DB
 * and redirect to its product detail page.
 *
 * V1: only works for videos already scraped into TTLike.
 * V2: will trigger live scrape + analysis.
 */
export default function UrlIngestion() {
  const router = useRouter()
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()

      if (res.status === 404) {
        setError('This video hasn\'t been scraped yet. Browse the Products section for existing videos, or check back after the next scheduled scrape.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed — please try again')
        setLoading(false)
        return
      }

      // Redirect to the video's product detail page
      if (data.video_id) {
        router.push(`/products/${data.video_id}`)
      } else {
        router.push(`/products?q=${encodeURIComponent(trimmed)}`)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
      <label className="block text-sm font-bold text-slate-700 mb-1">
        Paste any TikTok shop video URL to reverse-engineer its ad structure
      </label>
      <p className="text-xs text-slate-400 mb-3">
        AI identifies: opening hook · buying motivation · editing pace · conversion method
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder="https://www.tiktok.com/@creator/video/..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
