'use client'

/**
 * PromptQualityChecker — Admin panel for spot-checking AI breakdown output quality.
 *
 * Fetches 5 random recent video_breakdowns and shows their payload JSON.
 * Automatically flags samples that contain too many generic buzzwords
 * (e.g. "Emotional Hook" repeated ≥3 times), signalling prompt degradation.
 */

import { useState } from 'react'
import { Microscope, RefreshCw, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

interface Sample {
  id:           string
  url_hash:     string
  video_id:     string | null
  video_title:  string | null
  video_niche:  string | null
  created_at:   string
  payload:      Record<string, unknown>
  warnings:     string[]
  quality_ok:   boolean
}

interface SampleResponse {
  samples:        Sample[]
  total_sampled:  number
  quality_alerts: number
  hint:           string | null
}

function PayloadViewer({ payload }: { payload: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const json = JSON.stringify(payload, null, 2)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? 'Hide' : 'Show'} payload JSON
      </button>
      {open && (
        <pre className="mt-2 p-3 rounded-lg bg-gray-900 border border-gray-700 text-[10px] text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  )
}

export function PromptQualityChecker() {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<SampleResponse | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function fetchSamples() {
    setLoading(true)
    setError(null)
    setResult(null)   // clear stale data to prevent brief flicker on resample
    try {
      const res  = await fetch('/api/admin/videos/prompt-quality-sample')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch samples')
      setResult(data as SampleResponse)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const alertCount = result?.quality_alerts ?? 0
  const allGood    = result && alertCount === 0

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      alertCount >= 3 ? 'bg-red-950/20 border-red-700'
      : alertCount > 0 ? 'bg-amber-950/20 border-amber-700'
      : 'bg-gray-800 border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Microscope className={`h-4 w-4 ${
            alertCount >= 3 ? 'text-red-400'
            : alertCount > 0 ? 'text-amber-400'
            : 'text-violet-400'
          }`} />
          <span className="text-sm font-semibold text-white">Prompt Quality Checker</span>
          {result && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              allGood
                ? 'bg-emerald-900/40 text-emerald-300'
                : alertCount >= 3
                  ? 'bg-red-900/40 text-red-300'
                  : 'bg-amber-900/40 text-amber-300'
            }`}>
              {allGood ? '✓ Quality OK' : `⚠ ${alertCount} alert${alertCount > 1 ? 's' : ''}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setOpen(o => !o)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {open ? 'Hide samples' : 'Show samples'}
            </button>
          )}
          <button
            onClick={fetchSamples}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 border border-violet-700/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sampling…' : result ? 'Resample' : 'Sample 5 Outputs'}
          </button>
        </div>
      </div>

      {/* Hint bar */}
      {result?.hint && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {result.hint}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Samples */}
      {open && result && result.samples.length > 0 && (
        <div className="mt-4 space-y-3">
          {result.samples.map((s, i) => (
            <div
              key={s.id}
              className={`rounded-lg border p-3 ${
                s.quality_ok
                  ? 'bg-gray-900/60 border-gray-700'
                  : 'bg-red-950/20 border-red-800'
              }`}
            >
              {/* Sample header */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-white">
                    #{i + 1} {s.video_title ? `— ${s.video_title}` : `— ${s.url_hash.slice(0, 12)}…`}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {s.video_niche && <span className="text-blue-400 mr-2">{s.video_niche}</span>}
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                {s.quality_ok
                  ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                }
              </div>

              {/* Warnings */}
              {s.warnings.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {s.warnings.map((w, wi) => (
                    <p key={wi} className="text-[10px] text-red-400">⚠ {w}</p>
                  ))}
                </div>
              )}

              {/* Key fields preview */}
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(s.payload)
                  .filter(([k]) => ['formulas','hooks','timeline','pain_points','script'].includes(k))
                  .map(([k, v]) => (
                    <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {k}: {Array.isArray(v) ? `[${(v as unknown[]).length}]` : typeof v === 'string' ? `"${(v as string).slice(0,30)}…"` : String(v)}
                    </span>
                  ))
                }
              </div>

              <PayloadViewer payload={s.payload} />
            </div>
          ))}
        </div>
      )}

      {open && result && result.samples.length === 0 && (
        <p className="mt-3 text-xs text-gray-500 text-center py-4">
          No breakdown samples found. Analyze some videos first.
        </p>
      )}
    </div>
  )
}
