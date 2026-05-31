'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Wand2, ArrowRight, Loader2 } from 'lucide-react'

export function ViralStudioCard() {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const router   = useRouter()
  const pathname = usePathname()

  // Reset loading if user navigates back to dashboard without completing the flow
  useEffect(() => { setLoading(false) }, [pathname])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    // Validate: must be a real https TikTok URL
    if (!trimmed.startsWith('https://') || !trimmed.includes('tiktok.com')) {
      setError('Please enter a valid TikTok video URL (https://www.tiktok.com/...)')
      return
    }
    setError(null)
    setLoading(true)
    router.push(`/studio?url=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-violet-50 border border-pink-100 p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
          <Wand2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-black text-gray-900 text-sm leading-tight">Viral Studio</p>
          <p className="text-[11px] text-gray-500 leading-tight">Paste any TikTok URL → script in ~20s</p>
        </div>
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@creator/video/..."
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-pink-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[11px] text-red-500">{error}</p>
      )}

      <p className="mt-2.5 text-[11px] text-gray-400">
        Analyzes hook structure · emotion arc · script blueprint · ready-to-film lines
      </p>
    </div>
  )
}
