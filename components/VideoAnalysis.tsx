/**
 * VideoAnalysis — V2.5 Inspiration Engine display component.
 * Pure display: no loading/async logic.
 * Used by VideoBreakdown (client) and viral/[id] (server).
 *
 * V2.2 additions:
 *   • Say:/Do:/Edit: prefix extracted as coloured trend badges
 *   • HOOK/DEMO/PROOF/CTA phase badges on visual timeline
 *   • Higher-density monospaced layout
 */
import Link from 'next/link'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

interface Props {
  data:            VideoBreakdownPayload
  showPremiumCta?: boolean
}

// ── Trend-badge helpers ───────────────────────────────────────────────────────

type ScriptPrefix = 'Say' | 'Do' | 'Edit'

const PREFIX_STYLES: Record<ScriptPrefix, string> = {
  Say:  'bg-blue-100   text-blue-700   border border-blue-200',
  Do:   'bg-orange-100 text-orange-700 border border-orange-200',
  Edit: 'bg-purple-100 text-purple-700 border border-purple-200',
}

function parsePrefix(script: string): { prefix: ScriptPrefix | null; body: string } {
  const match = script.match(/^(Say|Do|Edit):\s*([\s\S]*)$/)
  if (!match) return { prefix: null, body: script }
  return { prefix: match[1] as ScriptPrefix, body: match[2] }
}

// Scene phase labels by index (4 scenes: 0-3)
const SCENE_PHASES = ['HOOK', 'DEMO', 'PROOF', 'CTA'] as const
const PHASE_STYLES = [
  'bg-red-100    text-red-700    border border-red-200',    // HOOK
  'bg-blue-100   text-blue-700   border border-blue-200',   // DEMO
  'bg-emerald-100 text-emerald-700 border border-emerald-200', // PROOF
  'bg-amber-100  text-amber-700  border border-amber-200',  // CTA
]

// ── Component ─────────────────────────────────────────────────────────────────

export function VideoAnalysis({ data, showPremiumCta = false }: Props) {
  if (!data) return null

  // ── Legacy V1/V2 format detected (has analysis, no viral_formulas) ──────────
  const isLegacy = !(data.viral_formulas?.length) && !(data.visual_timeline?.length)
  if (isLegacy) {
    return (
      <div className="border border-slate-200 rounded-xl p-5 text-center text-sm text-slate-500 font-mono bg-white">
        This breakdown was generated with an older version.
        <br />
        Click <span className="font-semibold text-pink-500">Regenerate</span> to unlock the V2.5 Inspiration Engine.
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-slate-900 text-[11px]">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-400">
            📡 TTLike™ Creative Workbook Engine
          </div>
          <p className="text-xs font-bold text-slate-700 mt-0.5">Ad Reverse-Engineering Panel</p>
        </div>
        {/* Metric pills */}
        {data.metrics && (
          <div className="flex gap-1.5 text-[9px] font-bold">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              👁 {data.metrics.views}
            </span>
            <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded font-mono">
              ♥ {data.metrics.likes}
            </span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-mono">
              ↗ {data.metrics.shares}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">

        {/* ── Section 1: Viral Formulas ── */}
        {data.viral_formulas?.length > 0 && (
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 mb-2.5">
              🎬 Viral Formulas You Can Steal
            </h3>
            <div className="space-y-2.5">
              {data.viral_formulas.map((formula, idx) => {
                const rawScript = formula.example_script
                  ?? (formula as unknown as { action_step?: string }).action_step
                  ?? ''
                const { prefix, body } = parsePrefix(rawScript)
                return (
                  <div key={idx} className="border border-slate-100 p-3 bg-slate-50/40 rounded-lg">

                    {/* Title row */}
                    <div className="font-bold text-slate-800 leading-tight">
                      {idx + 1}. {formula.title}
                    </div>

                    {/* example_script with prefix badge */}
                    <div className="mt-1.5 flex flex-wrap items-start gap-1.5">
                      {prefix && (
                        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${PREFIX_STYLES[prefix]}`}>
                          {prefix}:
                        </span>
                      )}
                      <span className="text-slate-600 leading-relaxed">{body}</span>
                    </div>

                    {/* Mechanism */}
                    <div className="mt-1 text-slate-500 leading-relaxed">
                      <span className="text-slate-400">Why it works: </span>
                      {formula.mechanism}
                    </div>

                    {/* your_version */}
                    <div className="mt-2 p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-indigo-900 leading-relaxed">
                      <strong>Your version:</strong>{' '}
                      &ldquo;{formula.your_version}&rdquo;
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Section 2: Visual Timeline ── */}
        {data.visual_timeline?.length > 0 && (
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-2.5">
              ⏱️ Copy-Paste Script with Visual Notes
            </h3>
            <div className="border border-slate-200 divide-y divide-slate-100 rounded-lg overflow-hidden">
              {data.visual_timeline.map((scene, idx) => {
                const phase = SCENE_PHASES[idx] ?? 'SCENE'
                const phaseStyle = PHASE_STYLES[idx] ?? PHASE_STYLES[0]
                return (
                  <div key={idx} className="p-3 hover:bg-slate-50/40 transition-colors">

                    {/* Timecode + phase badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-emerald-700">[{scene.timecode}]</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${phaseStyle}`}>
                        {phase}
                      </span>
                    </div>

                    <div className="space-y-1 pl-3 border-l-2 border-slate-200">
                      <div className="leading-relaxed">
                        <span className="text-slate-400">VISUAL: </span>
                        {scene.visual}
                      </div>
                      <div className="leading-relaxed">
                        <span className="text-slate-400">AUDIO: </span>
                        <span className="text-slate-800">&ldquo;{scene.audio}&rdquo;</span>
                      </div>
                      <div className="text-slate-500 italic leading-relaxed">
                        WHY: {scene.why_this_works}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Section 3: Premium Structural Audit CTA ── */}
        {showPremiumCta && (
          <div className="border-2 border-dashed border-amber-300 p-4 bg-amber-50/30 text-center rounded-lg">
            <div className="text-[9px] font-bold uppercase text-amber-800 tracking-widest mb-1">
              ⚠️ Go Deeper — Strategy Audit Available
            </div>
            <p className="text-slate-600 max-w-md mx-auto mb-3 leading-relaxed">
              The formulas above are what you can copy. The audit reveals what you can{' '}
              <em>beat</em> — conversion leaks, structural flaws, and a zero-cost script to
              outperform this video head-on.
            </p>
            <Link href="/pricing">
              <button className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-[10px] uppercase px-5 py-2 font-bold transition-colors rounded">
                🔬 Unlock Full Strategy Audit (Pro)
              </button>
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
