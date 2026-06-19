'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRight, Loader2, Link2 } from 'lucide-react'
import { tikTokUrlError } from '@/lib/urlValidation'

export function ViralStudioCard() {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const router   = useRouter()
  const pathname = usePathname()

  // Reset loading if user navigates back to dashboard without completing the flow
  useEffect(() => { queueMicrotask(() => setLoading(false)) }, [pathname])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    const urlErr = tikTokUrlError(trimmed)
    if (urlErr) { setError(urlErr); return }
    setError(null)
    setLoading(true)
    router.push(`/studio?url=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-5 sm:p-6">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] px-3 py-1 rounded-full mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
          Viral Studio · ~20s to generate
        </div>

        {/* Headline */}
        <h2 className="text-lg sm:text-xl font-black text-white leading-tight mb-1">
          Decode Any TikTok Video
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm mb-4">
          Paste a URL → get hook structure, emotion arc & ready-to-film script
        </p>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
              placeholder="https://www.tiktok.com/@creator/video/..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/25"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><span className="hidden sm:inline">Analyze</span><ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </div>
    </div>
  )
}
