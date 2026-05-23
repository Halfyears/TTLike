/**
 * VideoAnalysis — V2.5 Inspiration Engine display component.
 * Pure display: no loading/async logic.
 * Used by VideoBreakdown (client) and viral/[id] (server).
 *
 * Props:
 *   data          — VideoBreakdownPayload (V2.5 format)
 *   showPremiumCta — true shows the upgrade CTA (VideoBreakdown done state)
 */
import Link from 'next/link'
import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

interface Props {
  data:            VideoBreakdownPayload
  showPremiumCta?: boolean
}

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
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-slate-900">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">
          📡 TTLike™ Creative Workbook Engine
        </div>
        <p className="text-sm font-bold text-slate-700 mt-0.5">Ad Reverse-Engineering Panel</p>
      </div>

      <div className="p-5 space-y-8">

        {/* ── Section 1: Viral Formulas ── */}
        {data.viral_formulas?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-3">
              🎬 Viral Formulas You Can Steal
            </h3>
            <div className="space-y-3">
              {data.viral_formulas.map((formula, idx) => (
                <div key={idx} className="border border-slate-100 p-3 bg-slate-50/50 rounded-lg">
                  <div className="text-xs font-bold text-slate-800">
                    {idx + 1}. {formula.title}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    <span className="text-slate-400">→ </span>
                    {formula.action_step}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 leading-relaxed">
                    <span className="text-slate-400">Why it works: </span>
                    {formula.mechanism}
                  </div>
                  <div className="mt-2 p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900 leading-relaxed">
                    <strong>Your version:</strong> &ldquo;{formula.your_version}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 2: Visual Timeline ── */}
        {data.visual_timeline?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-3">
              ⏱️ Copy-Paste Script with Visual Notes
            </h3>
            <div className="border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
              {data.visual_timeline.map((scene, idx) => (
                <div key={idx} className="p-3 text-xs hover:bg-slate-50/40 transition-colors">
                  <div className="font-bold text-emerald-700 mb-1.5">[{scene.timecode}]</div>
                  <div className="space-y-1 pl-3 border-l-2 border-slate-200">
                    <div className="leading-relaxed">
                      <span className="text-slate-400">👁️ VISUAL: </span>
                      {scene.visual}
                    </div>
                    <div className="leading-relaxed">
                      <span className="text-slate-400">🔊 AUDIO: </span>
                      <span className="text-slate-800">&ldquo;{scene.audio}&rdquo;</span>
                    </div>
                    <div className="mt-1 text-slate-500 italic leading-relaxed">
                      🎯 Why It Works: {scene.why_this_works}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 3: Premium Structural Audit CTA ── */}
        {showPremiumCta && (
          <div className="border-2 border-dashed border-amber-300 p-4 bg-amber-50/30 text-center rounded-lg">
            <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">
              ⚠️ Go Deeper — Strategy Audit Available
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-3 leading-relaxed">
              The formulas above are what you can copy. The audit reveals what you can <em>beat</em> — conversion leaks,
              structural flaws, and a zero-cost script to outperform this video head-on.
            </p>
            <Link href="/pricing">
              <button className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs uppercase px-5 py-2 font-bold transition-colors rounded">
                🔬 Unlock Full Strategy Audit (Pro)
              </button>
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
