'use client'

import { useState } from 'react'
import { Zap, RefreshCw, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

interface BatchResult {
  generated: number
  skipped:   number
  errors:    string[]
  remaining: number
  message?:  string
}

export function BatchTrigger() {
  const [state,   setState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result,  setResult]  = useState<BatchResult | null>(null)
  const [errMsg,  setErrMsg]  = useState('')
  const [showErr, setShowErr] = useState(false)
  const [limit,   setLimit]   = useState(5)

  async function trigger() {
    setState('loading')
    setResult(null)
    try {
      const res = await fetch('/api/admin/bulk-analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ limit }),
      })
      const data: BatchResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? `HTTP ${res.status}`)
      setResult(data)
      setState('done')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Request failed')
      setState('error')
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-pink-400" />
            Batch Generate Breakdowns
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-lg">
            Auto-generate V2.5 Inspiration Engine breakdowns for the highest viral-score
            videos that haven&apos;t been analyzed yet. Safe to run multiple times.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Batch size selector */}
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            disabled={state === 'loading'}
            className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
          >
            {[3, 5, 10].map(n => (
              <option key={n} value={n}>{n} per batch</option>
            ))}
          </select>

          <button
            onClick={trigger}
            disabled={state === 'loading'}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            {state === 'loading' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Next Batch
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress hint */}
      {state === 'loading' && (
        <p className="text-xs text-gray-500 mt-3 animate-pulse">
          Calling Gemini 2.5 Flash for each video… approx {limit * 5}s
        </p>
      )}

      {/* Success result */}
      {state === 'done' && result && (
        <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300 space-y-0.5">
              <div>
                <span className="font-bold text-emerald-200">{result.generated}</span> breakdowns generated
                {result.skipped > 0 && (
                  <span className="text-emerald-500"> · {result.skipped} already cached</span>
                )}
                {result.remaining > 0 && (
                  <span className="text-amber-400 font-medium">
                    {' '}· {result.remaining}+ videos still waiting — run again
                  </span>
                )}
              </div>

              {result.message && (
                <div className="text-emerald-500">{result.message}</div>
              )}

              {result.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErr(s => !s)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {showErr ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {result.errors.length} error(s)
                  </button>
                  {showErr && (
                    <ul className="mt-1 space-y-0.5 text-amber-500">
                      {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {result.generated > 0 && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-1 text-emerald-400 underline hover:no-underline"
                >
                  Refresh page to see {result.generated} new breakdown{result.generated > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/40 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            {errMsg}
            <button
              onClick={() => setState('idle')}
              className="block mt-1 text-red-400 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
