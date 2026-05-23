/**
 * VideoAnalysis — pure display component.
 * Renders a structured VideoBreakdownPayload with zero loading/async logic.
 * Used by VideoBreakdown (done state) and viral/[id] SEO page.
 */
import {
  HOOK_TYPE_LABELS, EMOTION_DRIVER_LABELS, PACING_STYLE_LABELS,
  HookType, EmotionDriver, PacingStyle,
} from '@/lib/types/intelligence'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

interface Section {
  title:     string
  tag:       string
  label:     string
  behavior:  string
  mechanism: string | null
  advice:    string
  border:    string
  text:      string
  bg:        string
}

export function VideoAnalysis({ data }: { data: VideoBreakdownPayload }) {
  if (!data?.analysis) return null

  const { analysis, category, metrics } = data

  const hookLabel    = HOOK_TYPE_LABELS[analysis.hook.type       as HookType]
  const emotionLabel = EMOTION_DRIVER_LABELS[analysis.emotion.driver as EmotionDriver]
  const pacingLabel  = PACING_STYLE_LABELS[analysis.pacing.style    as PacingStyle]

  const sections: Section[] = [
    {
      title:     'Opening Hook (First 3 Seconds Strategy)',
      tag:       hookLabel ? `${hookLabel.en} · ${hookLabel.zh}` : analysis.hook.type,
      label:     'Original Script Line:',
      behavior:  analysis.hook.raw_text,
      mechanism: analysis.hook.mechanism,
      advice:    analysis.hook.actionable_advice,
      border:    'border-indigo-500',
      text:      'text-indigo-600',
      bg:        'bg-indigo-50/40',
    },
    {
      title:     'Core Driver (Psychological Motivation)',
      tag:       emotionLabel ? `${emotionLabel.en} · ${emotionLabel.zh}` : analysis.emotion.driver,
      label:     'Target Consumer Pain:',
      behavior:  analysis.emotion.pain_point,
      mechanism: null,
      advice:    analysis.emotion.actionable_advice,
      border:    'border-emerald-500',
      text:      'text-emerald-600',
      bg:        'bg-emerald-50/40',
    },
    {
      title:     'Editing Rhythm & Visual Pacing Style',
      tag:       pacingLabel ? `${pacingLabel.en} · ${pacingLabel.zh}` : analysis.pacing.style,
      label:     'Editing Execution:',
      behavior:  analysis.pacing.raw_behavior,
      mechanism: null,
      advice:    analysis.pacing.actionable_advice,
      border:    'border-sky-500',
      text:      'text-sky-600',
      bg:        'bg-sky-50/40',
    },
    {
      title:     'Conversion Capture (Closing Strategy)',
      tag:       'CTA',
      label:     'Closing Action:',
      behavior:  analysis.cta.raw_behavior,
      mechanism: null,
      advice:    analysis.cta.actionable_advice,
      border:    'border-amber-500',
      text:      'text-amber-600',
      bg:        'bg-amber-50/40',
    },
  ]

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-slate-900">

      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">
          📡 TTLike™ Intelligence Engine — Ad Structure Report
        </div>
        <p className="text-sm font-bold text-slate-700 mt-0.5">{category}</p>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 gap-0 bg-slate-50 border-b border-slate-100 text-xs divide-x divide-slate-100">
        {[
          { label: 'Views',  value: metrics.views },
          { label: 'Likes',  value: metrics.likes },
          { label: 'Shares', value: metrics.shares },
        ].map(m => (
          <div key={m.label} className="py-2.5 px-4 text-center">
            <span className="font-bold text-slate-800 tabular-nums">{m.value}</span>
            <span className="text-slate-400 ml-1">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Analysis sections */}
      <div className="p-5 space-y-5">
        {sections.map((s, idx) => (
          <div key={idx} className={`border-l-2 ${s.border} pl-4`}>
            <div className={`text-[10px] font-bold ${s.text} uppercase tracking-wide mb-1`}>
              [{s.title}] · {s.tag}
            </div>
            <div className="mt-1 text-xs text-slate-700 leading-relaxed">
              <span className="text-slate-400">{s.label} </span>
              {s.behavior}
            </div>
            {s.mechanism && (
              <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                <span className="text-slate-400">Mechanism: </span>
                {s.mechanism}
              </div>
            )}
            <div className={`mt-2 text-xs p-2.5 rounded-lg ${s.bg} border border-slate-100 leading-relaxed`}>
              <strong>💡 Actionable Advice for Sellers:</strong> {s.advice}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
