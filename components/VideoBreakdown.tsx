'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Zap, AlertTriangle, ExternalLink } from 'lucide-react'
import { VideoAnalysis } from '@/components/VideoAnalysis'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'
import type { TierName } from '@/lib/constants'

interface Props {
  videoId:   string
  autoLoad?: boolean  // true = auto-trigger on mount (used when redirected after URL analysis)
  tier?:     TierName
}

export function VideoBreakdown({ videoId, autoLoad = false, tier = 'free' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [data, setData]   = useState<VideoBreakdownPayload | null>(null)
  const [errMsg, setErr]  = useState('')

  async function load() {
    setState('loading')
    try {
      // Try GET first (lightweight cache check)
      const res  = await fetch(`/api/analyze?video_id=${videoId}`)
      const json = await res.json()

      if (json.breakdown) {
        setData(json.breakdown as VideoBreakdownPayload)
        setState('done')
        return
      }

      // Not cached — generate via POST
      const res2  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ video_id: videoId }),
      })
      const json2 = await res2.json()
      if (!res2.ok) throw new Error(json2.error ?? `HTTP ${res2.status}`)
      setData(json2.breakdown as VideoBreakdownPayload)
      setState('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Analysis failed')
      setState('error')
    }
  }

  // Auto-trigger on mount when coming from UrlIngestion redirect
  useEffect(() => {
    if (autoLoad) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="border border-dashed border-indigo-200 rounded-xl p-5 text-center bg-indigo-50/20">
        <div className="text-[11px] text-slate-500 mb-1 font-mono">
          Viral Formulas · Scene Timeline · Retention Triggers
        </div>
        <p className="text-[10px] text-slate-400 mb-3 font-mono">
          AI deconstructs exactly how this video beats the algorithm
        </p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wide"
        >
          <Zap className="h-3.5 w-3.5" />
          Generate Video Analysis
        </button>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="border border-gray-100 rounded-xl p-6 flex items-center justify-center gap-3 text-gray-400 font-mono">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        <span className="text-xs">Analyzing ad structure… (approx. 5s)</span>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-700">Analysis failed</p>
          <p className="text-xs text-red-500 mt-0.5">{errMsg}</p>
          <button onClick={load} className="mt-2 text-xs text-red-600 underline hover:no-underline">Retry</button>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (!data) return null

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={`/viral/${videoId}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors font-mono"
        >
          <ExternalLink className="h-3 w-3" />
          View public breakdown page
        </Link>
        <button
          onClick={() => setState('idle')}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-mono"
        >
          Regenerate
        </button>
      </div>
      <VideoAnalysis data={data} showPremiumCta={false} tier={tier} />
    </div>
  )
}
