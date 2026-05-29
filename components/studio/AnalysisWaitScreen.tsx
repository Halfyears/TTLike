'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const STEPS = [
  { label: 'Extracting hooks...',        minMs: 0 },
  { label: 'Mapping narrative flow...',  minMs: 4000 },
  { label: 'Matching product fit...',    minMs: 9000 },
  { label: 'Crafting your script...',    minMs: 14000 },
]

type Status = 'PENDING' | 'PROCESSING' | 'QUEUED' | 'COMPLETED' | 'FAILED'

interface AnalysisWaitScreenProps {
  breakdownId:  string
  onCompleted:  () => void
  onFailed:     (error: string) => void
}

export function AnalysisWaitScreen({ breakdownId, onCompleted, onFailed }: AnalysisWaitScreenProps) {
  const [status, setStatus]       = useState<Status>('QUEUED')
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed]     = useState(0)
  const startRef                  = useRef(Date.now())
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [])

  // Step progression based on elapsed time
  useEffect(() => {
    const now = Date.now() - startRef.current
    let nextStep = 0
    for (let i = STEPS.length - 1; i >= 0; i--) {
      if (STEPS[i]!.minMs <= now) { nextStep = i; break }
    }
    if (nextStep > stepIndex) setStepIndex(nextStep)
  })

  // Polling
  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (cancelled) return
      try {
        const res  = await fetch(`/api/studio/status?breakdown_id=${breakdownId}`)
        const data = await res.json()
        if (cancelled) return

        const s = data.viral_status as Status
        setStatus(s)

        if (s === 'COMPLETED') { setStepIndex(STEPS.length - 1); onCompleted(); return }
        if (s === 'FAILED')    { onFailed(data.viral_error ?? 'Analysis failed'); return }

        const delay = (s === 'QUEUED') ? 3000 : 5000
        pollRef.current = setTimeout(poll, delay)
      } catch {
        if (!cancelled) pollRef.current = setTimeout(poll, 5000)
      }
    }

    poll()
    return () => { cancelled = true; if (pollRef.current) clearTimeout(pollRef.current) }
  }, [breakdownId, onCompleted, onFailed])

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]!

  return (
    <div className="w-full max-w-md mx-auto text-center py-12">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{currentStep.label}</h2>
        <p className="text-sm text-gray-400">{elapsed}s elapsed</p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const done    = i < stepIndex
          const active  = i === stepIndex
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
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
