'use client'

import { useState } from 'react'
import { Loader2, Zap, AlertTriangle } from 'lucide-react'
import {
  HOOK_TYPE_LABELS, EMOTION_DRIVER_LABELS, PACING_STYLE_LABELS,
  HookType, EmotionDriver, PacingStyle,
} from '@/lib/types/intelligence'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  color, label, badge, rows,
}: {
  color: string   // tailwind border-color class e.g. 'border-indigo-500'
  label: string
  badge: string
  rows: { key: string; value: string; highlight?: boolean }[]
}) {
  const bgMap: Record<string, string> = {
    'border-indigo-500': 'bg-indigo-50/60 text-indigo-900',
    'border-emerald-500': 'bg-emerald-50/60 text-emerald-900',
    'border-amber-500': 'bg-amber-50/60 text-amber-900',
    'border-violet-500': 'bg-violet-50/60 text-violet-900',
  }
  const labelColorMap: Record<string, string> = {
    'border-indigo-500': 'text-indigo-600',
    'border-emerald-500': 'text-emerald-600',
    'border-amber-500': 'text-amber-600',
    'border-violet-500': 'text-violet-600',
  }
  const adviceBg = bgMap[color] ?? 'bg-gray-50 text-gray-900'
  const labelColor = labelColorMap[color] ?? 'text-gray-600'

  return (
    <div className={`border-l-2 ${color} pl-4`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${labelColor}`}>
        [{label}]<span className="ml-1 font-normal opacity-70">· {badge}</span>
      </div>
      {rows.map(row => (
        row.highlight ? (
          <div key={row.key} className={`mt-2 text-xs rounded-lg px-3 py-2 leading-relaxed ${adviceBg}`}>
            <strong>💡 Seller tip: </strong>{row.value}
          </div>
        ) : (
          <div key={row.key} className="mt-1 text-xs text-gray-700 leading-relaxed">
            <span className="text-gray-400">{row.key}: </span>{row.value}
          </div>
        )
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function VideoBreakdown({ videoId }: { videoId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [data, setData]   = useState<VideoBreakdownPayload | null>(null)
  const [errMsg, setErr]  = useState('')

  async function load() {
    setState('loading')
    try {
      // Try GET first (lightweight cache check)
      const res = await fetch(`/api/analyze?video_id=${videoId}`)
      const json = await res.json()

      if (json.breakdown) {
        setData(json.breakdown as VideoBreakdownPayload)
        setState('done')
        return
      }

      // Not cached — generate
      const res2 = await fetch('/api/analyze', {
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

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="border border-dashed border-pink-200 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-500 mb-3">
          AI Ad Structure Report — hook · motivation · pacing · conversion
        </p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Zap className="h-4 w-4" />
          Generate AI Breakdown
        </button>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="border border-gray-100 rounded-xl p-6 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
        <span className="text-sm">AI is analyzing the ad structure… (approx. 5s)</span>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
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

  // ── Done ────────────────────────────────────────────────────────────────────
  if (!data || !data.analysis) return null
  const { analysis, category, metrics } = data

  const hookLabel    = HOOK_TYPE_LABELS[analysis.hook.type       as HookType]
  const emotionLabel = EMOTION_DRIVER_LABELS[analysis.emotion.driver as EmotionDriver]
  const pacingLabel  = PACING_STYLE_LABELS[analysis.pacing.style    as PacingStyle]

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden font-sans text-slate-900">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-slate-400">✦ TTLike™ Ad Structure X-Ray</span>
          <p className="text-sm font-bold text-slate-700 mt-0.5">{category}</p>
        </div>
        <button
          onClick={() => setState('idle')}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Regenerate
        </button>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white border-b border-slate-100">
        {[
          { label: 'Views',  value: metrics.views },
          { label: 'Likes',  value: metrics.likes },
          { label: 'Shares', value: metrics.shares },
        ].map(m => (
          <div key={m.label} className="py-2.5 px-3 text-center">
            <p className="text-xs font-bold text-slate-800 tabular-nums">{m.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Analysis sections */}
      <div className="p-4 space-y-5 bg-white">

        {/* Hook */}
        <Section
          color="border-indigo-500"
          label="Opening Hook"
          badge={hookLabel ? `${hookLabel.zh} (${hookLabel.en})` : analysis.hook.type}
          rows={[
            { key: 'In the video',  value: `"${analysis.hook.raw_text}"` },
            { key: 'Why it works',  value: analysis.hook.mechanism },
            { key: 'tip',           value: analysis.hook.actionable_advice, highlight: true },
          ]}
        />

        {/* Emotion */}
        <Section
          color="border-violet-500"
          label="Buying Motivation"
          badge={emotionLabel ? `${emotionLabel.zh} (${emotionLabel.en})` : analysis.emotion.driver}
          rows={[
            { key: 'Pain point', value: analysis.emotion.pain_point },
            { key: 'tip',        value: analysis.emotion.actionable_advice, highlight: true },
          ]}
        />

        {/* Pacing */}
        <Section
          color="border-emerald-500"
          label="Editing Pace"
          badge={pacingLabel ? `${pacingLabel.zh} (${pacingLabel.en})` : analysis.pacing.style}
          rows={[
            { key: 'In the video', value: analysis.pacing.raw_behavior },
            { key: 'tip',          value: analysis.pacing.actionable_advice, highlight: true },
          ]}
        />

        {/* CTA */}
        <Section
          color="border-amber-500"
          label="Conversion CTA"
          badge="Closing method"
          rows={[
            { key: 'In the video', value: analysis.cta.raw_behavior },
            { key: 'tip',          value: analysis.cta.actionable_advice, highlight: true },
          ]}
        />
      </div>
    </div>
  )
}
