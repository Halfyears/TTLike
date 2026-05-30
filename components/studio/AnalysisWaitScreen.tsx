'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { label: 'Extracting hooks...',      minMs: 0 },
  { label: 'Mapping narrative flow...', minMs: 5000 },
  { label: 'Matching product fit...',   minMs: 10000 },
  { label: 'Crafting your script...',   minMs: 15000 },
]

const LAST_STEP = STEPS.length - 1

type PipelineStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface AnalysisWaitScreenProps {
  breakdownId: string
  onCompleted: () => void
  onFailed:    (error: string) => void
}

export function AnalysisWaitScreen({ breakdownId, onCompleted, onFailed }: AnalysisWaitScreenProps) {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('QUEUED')
  const [stepIndex, setStepIndex]           = useState(0)
  const [elapsed, setElapsed]               = useState(0)

  const startRef      = useRef(Date.now())
  const doneRef       = useRef(false)
  // Stable refs for callbacks — avoids poll restart when parent re-renders
  const onCompletedRef = useRef(onCompleted)
  const onFailedRef    = useRef(onFailed)

  // Keep refs in sync with latest props without re-running poll effect
  useEffect(() => { onCompletedRef.current = onCompleted }, [onCompleted])
  useEffect(() => { onFailedRef.current    = onFailed    }, [onFailed])

  // ── Elapsed ticker ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      500,
    )
    return () => clearInterval(id)
  }, [])

  // ── Time-based step advancement (stops at LAST_STEP - 1) ───────────────────
  useEffect(() => {
    const now = Date.now() - startRef.current
    let next = 0
    for (let i = LAST_STEP - 1; i >= 0; i--) {
      if (STEPS[i]!.minMs <= now) { next = i; break }
    }
    if (next > stepIndex && next < LAST_STEP) setStepIndex(next)
  })

  // ── Polling — only re-runs when breakdownId changes ─────────────────────────
  const pollFn = useCallback(async () => {
    let cancelled = false
    const scheduleNext = (ms: number) => {
      if (!cancelled) setTimeout(poll, ms)
    }

    async function poll() {
      if (cancelled || doneRef.current) return
      try {
        const res  = await fetch(`/api/studio/status?breakdown_id=${breakdownId}`)
        const data = await res.json()
        if (cancelled || doneRef.current) return

        const s = ((data.viral_status as string) ?? 'QUEUED') as PipelineStatus
        setPipelineStatus(s)

        if (s === 'COMPLETED') {
          doneRef.current = true
          setStepIndex(LAST_STEP)
          setTimeout(() => { if (!cancelled) onCompletedRef.current() }, 600)
          return
        }
        if (s === 'FAILED') {
          onFailedRef.current(data.viral_error ?? 'Analysis failed. Please try again.')
          return
        }

        const delay = (s === 'QUEUED' || s === 'PENDING') ? 3000 : 5000
        scheduleNext(delay)
      } catch {
        scheduleNext(5000)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [breakdownId])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    pollFn().then(fn => { cleanup = fn })
    return () => { cleanup?.() }
  }, [pollFn])

  const currentLabel = STEPS[stepIndex]!.label

  const statusLabel: Record<PipelineStatus, string> = {
    PENDING:    'Queued',
    QUEUED:     'Queued',
    PROCESSING: 'Running',
    COMPLETED:  'Done',
    FAILED:     'Failed',
  }

  return (
    <div className="w-full max-w-md mx-auto text-center py-12">
      {/* Spinner + current label */}
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{currentLabel}</h2>
        <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
          <span>{elapsed}s elapsed</span>
          <span className="text-gray-200">·</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            pipelineStatus === 'PROCESSING' ? 'bg-blue-50 text-blue-600' :
            pipelineStatus === 'COMPLETED'  ? 'bg-green-50 text-green-600' :
                                             'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              pipelineStatus === 'PROCESSING' ? 'bg-blue-400 animate-pulse' :
              pipelineStatus === 'COMPLETED'  ? 'bg-green-400' :
                                               'bg-gray-400'
            }`}></span>
            {statusLabel[pipelineStatus]}
          </span>
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done   = i < stepIndex
          const active = i === stepIndex
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                done   ? 'bg-green-50 text-green-700' :
                active ? 'bg-indigo-50 text-indigo-700 font-medium' :
                         'bg-gray-50 text-gray-400'
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
              )}
              {step.label}
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400">Usually takes 15–25 seconds</p>
    </div>
  )
}
