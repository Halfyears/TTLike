'use client'

/**
 * ViralPipelineLauncher
 *
 * Two modes:
 *  - URL mode  (default): paste TikTok URL → auto-resolve → run pipeline
 *  - UUID mode (advanced): paste tiktok_videos.id UUID directly
 */

import { useState } from 'react'
import { Zap, ChevronDown, ChevronUp, Link2, Hash, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ViralPipelinePanel } from '@/components/admin/ViralPipelinePanel'

type InputMode = 'url' | 'uuid'

interface ResolvedVideo {
  video_id:     string
  title:        string | null
  product_name: string | null
  niche:        string | null
  has_timeline: boolean
  scraped?:     boolean
  oembed?:      boolean
}

export function ViralPipelineLauncher() {
  const [open,      setOpen]      = useState(false)
  const [mode,      setMode]      = useState<InputMode>('url')
  const [input,     setInput]     = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveErr, setResolveErr] = useState<string | null>(null)
  const [resolved,  setResolved]  = useState<ResolvedVideo | null>(null)

  function handleReset() {
    setResolved(null)
    setInput('')
    setResolveErr(null)
  }

  async function handleResolve() {
    const val = input.trim()
    if (!val) return

    if (mode === 'uuid') {
      // UUID mode: treat input directly as video_id
      setResolved({ video_id: val, title: null, product_name: null, niche: null, has_timeline: false })
      return
    }

    // URL mode: call resolve API
    setResolving(true)
    setResolveErr(null)
    try {
      const res = await fetch('/api/admin/pipeline/resolve-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tiktok_url: val }),
      })
      const json = await res.json()
      if (!json.ok) {
        setResolveErr(json.error ?? 'Failed to resolve URL')
      } else {
        setResolved(json)
      }
    } catch {
      setResolveErr('Network error — check connection')
    } finally {
      setResolving(false)
    }
  }

  const placeholder = mode === 'url'
    ? 'https://www.tiktok.com/@username/video/7123456789012345678'
    : 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6'

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" />
            Viral Pipeline Generator
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-lg">
            Paste a TikTok URL → auto-resolve → generate a 4-track viral script via
            Spike → Structure → Router → Language → Emotion AI pipeline.
          </p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shrink-0"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? 'Collapse' : 'Open Pipeline'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">

          {!resolved ? (
            <>
              {/* Mode toggle */}
              <div className="flex gap-1 bg-gray-700/50 rounded-lg p-1 w-fit">
                {(['url', 'uuid'] as InputMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setInput(''); setResolveErr(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      mode === m
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m === 'url' ? <Link2 className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                    {m === 'url' ? 'TikTok URL' : 'Video UUID'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); setResolveErr(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleResolve()}
                  placeholder={placeholder}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={handleResolve}
                  disabled={!input.trim() || resolving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  {resolving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {mode === 'url' ? 'Resolve URL' : 'Load Video'}
                </button>
              </div>

              {resolveErr && (
                <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {resolveErr}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {/* Resolved video info */}
              <div className="flex items-start justify-between gap-3 bg-gray-700/40 border border-gray-600 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-300">Video resolved</span>
                    {resolved.scraped && !resolved.oembed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/50 text-blue-300 font-semibold">
                        Auto-scraped ✓
                      </span>
                    )}
                    {resolved.oembed && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-300 font-semibold" title="Stats unavailable via RapidAPI — basic metadata only">
                        oEmbed (no stats)
                      </span>
                    )}
                    {resolved.has_timeline && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-900/50 text-violet-300 font-semibold">
                        Has timeline
                      </span>
                    )}
                  </div>
                  {resolved.title && (
                    <p className="text-xs text-gray-300 truncate max-w-sm">{resolved.title}</p>
                  )}
                  <p className="text-[10px] text-gray-500 font-mono truncate">{resolved.video_id}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                >
                  ← Change
                </button>
              </div>

              <ViralPipelinePanel
                videoId={resolved.video_id}
                productName={resolved.product_name ?? null}
                niche={resolved.niche ?? null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
