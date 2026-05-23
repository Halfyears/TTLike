'use client'

/**
 * VideoAnalysis — V2.5 Inspiration Engine display component.
 *
 * V2.2: Say:/Do:/Edit: trend badges, HOOK/DEMO/PROOF/CTA phase badges,
 *       metric pills in header.
 * V2.3: Readable font sizes (text-sm base), prominent copy buttons,
 *       "Copy for CapCut" timeline export.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Film, Download, Lock } from 'lucide-react'
import type { VideoBreakdownPayload, TimelineScene } from '@/lib/types/intelligence'
import type { TierName } from '@/lib/constants'

interface Props {
  data:            VideoBreakdownPayload
  showPremiumCta?: boolean
  /** User's current tier — gates Copy for CapCut & full timeline export */
  tier?:           TierName
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

const SCENE_PHASES = ['HOOK', 'DEMO', 'PROOF', 'CTA'] as const
const PHASE_STYLES = [
  'bg-red-100     text-red-700     border border-red-200',
  'bg-blue-100    text-blue-700    border border-blue-200',
  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'bg-amber-100   text-amber-700   border border-amber-200',
]

// ── CapCut format ─────────────────────────────────────────────────────────────

function formatForCapCut(timeline: TimelineScene[], metrics?: { views: string; likes: string; shares: string }): string {
  const header = [
    '=== TTLike Ad Blueprint — Paste into CapCut Script Mode ===',
    metrics ? `📊 ${metrics.views} views · ♥ ${metrics.likes} likes · ↗ ${metrics.shares} shares` : '',
    '',
  ].filter(l => l !== undefined).join('\n')

  const PHASES = ['HOOK', 'DEMO', 'PROOF', 'CTA']
  const body = timeline.map((scene, idx) => [
    `[${scene.timecode}] — ${PHASES[idx] ?? 'SCENE'}`,
    `📷 VISUAL: ${scene.visual}`,
    `🎤 SAY:    "${scene.audio}"`,
    `💡 WHY:    ${scene.why_this_works}`,
  ].join('\n')).join('\n\n')

  return `${header}${body}`
}

// ── Inline copy hook ──────────────────────────────────────────────────────────

function useCopy(ms = 2000) {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), ms)
    })
  }
  return { copied, copy }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VideoAnalysis({ data, showPremiumCta = false, tier = 'free' }: Props) {
  const { copied, copy } = useCopy()
  const isPaid = tier === 'creator' || tier === 'scale'

  if (!data) return null

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
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-sm text-slate-900">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            📡 TTLike™ Creative Workbook Engine
          </div>
          <p className="text-sm font-bold text-slate-700 mt-0.5">Ad Reverse-Engineering Panel</p>
        </div>
        {data.metrics && (
          <div className="flex gap-1.5 text-[10px] font-bold shrink-0">
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
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">
              🎬 Viral Formulas You Can Steal
            </h3>
            <div className="space-y-3">
              {data.viral_formulas.map((formula, idx) => {
                const rawScript = formula.example_script
                  ?? (formula as unknown as { action_step?: string }).action_step
                  ?? ''
                const { prefix, body } = parsePrefix(rawScript)
                const copyKey = `formula-${idx}`
                return (
                  <div key={idx} className="border border-slate-100 p-4 bg-slate-50/40 rounded-lg">

                    {/* Title + optional timestamp anchor */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-bold text-slate-800 leading-tight text-sm">
                        {idx + 1}. {formula.title}
                      </div>
                      {formula.timestamp && (
                        <span className="shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          📹 {formula.timestamp}
                        </span>
                      )}
                    </div>

                    {/* example_script with prefix badge */}
                    <div className="mt-2 flex flex-wrap items-start gap-1.5">
                      {prefix && (
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${PREFIX_STYLES[prefix]}`}>
                          {prefix}:
                        </span>
                      )}
                      <span className="text-slate-600 leading-relaxed text-sm">{body}</span>
                    </div>

                    {/* Mechanism */}
                    <div className="mt-1.5 text-slate-500 leading-relaxed text-xs">
                      <span className="text-slate-400">Why it works: </span>
                      {formula.mechanism}
                    </div>

                    {/* your_version + copy button */}
                    <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Your version:</span>
                          <p className="text-sm text-indigo-900 leading-relaxed mt-0.5">
                            &ldquo;{formula.your_version}&rdquo;
                          </p>
                        </div>
                        <button
                          onClick={() => copy(formula.your_version, copyKey)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            copied === copyKey
                              ? 'bg-green-500 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {copied === copyKey
                            ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                            : <><Copy className="h-3.5 w-3.5" /> Copy</>
                          }
                        </button>
                      </div>
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
            {/* Header row with CapCut export */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                ⏱️ Copy-Paste Script with Visual Notes
              </h3>
              {isPaid ? (
                <button
                  onClick={() => copy(formatForCapCut(data.visual_timeline, data.metrics), 'capcut')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copied === 'capcut'
                      ? 'bg-green-500 text-white'
                      : 'bg-black hover:bg-gray-800 text-white'
                  }`}
                >
                  {copied === 'capcut' ? (
                    <><Check className="h-3.5 w-3.5" /> Copied for CapCut!</>
                  ) : (
                    <><Film className="h-3.5 w-3.5" /> Copy for CapCut</>
                  )}
                </button>
              ) : (
                <Link href="/pricing">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer">
                    <Lock className="h-3.5 w-3.5" /> Creator — CapCut Export
                  </span>
                </Link>
              )}
            </div>

            <div className="border border-slate-200 divide-y divide-slate-100 rounded-lg overflow-hidden">
              {data.visual_timeline.map((scene, idx) => {
                const phase = SCENE_PHASES[idx] ?? 'SCENE'
                const phaseStyle = PHASE_STYLES[idx] ?? PHASE_STYLES[0]
                const sceneKey = `scene-${idx}`
                return (
                  <div key={idx} className="p-3 hover:bg-slate-50/40 transition-colors">

                    {/* Timecode + phase badge + copy */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-emerald-700 text-sm">[{scene.timecode}]</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${phaseStyle}`}>
                        {phase}
                      </span>
                      <button
                        onClick={() => copy(`VISUAL: ${scene.visual}\nSAY: "${scene.audio}"`, sceneKey)}
                        className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                          copied === sceneKey
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {copied === sceneKey ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>

                    <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                      <div className="leading-relaxed text-sm">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">VISUAL </span>
                        {scene.visual}
                      </div>
                      <div className="leading-relaxed text-sm">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">SAY </span>
                        <span className="text-slate-800 font-medium">&ldquo;{scene.audio}&rdquo;</span>
                      </div>
                      <div className="text-slate-500 italic leading-relaxed text-xs">
                        WHY: {scene.why_this_works}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Full timeline copy */}
            {isPaid ? (
              <button
                onClick={() => copy(formatForCapCut(data.visual_timeline, data.metrics), 'timeline-full')}
                className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  copied === 'timeline-full'
                    ? 'bg-green-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {copied === 'timeline-full' ? (
                  <><Check className="h-4 w-4" /> Full Script Copied!</>
                ) : (
                  <><Download className="h-4 w-4" /> Copy Full Script</>
                )}
              </button>
            ) : (
              <Link href="/pricing" className="block mt-3">
                <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer">
                  <Lock className="h-4 w-4" /> Upgrade to Creator — Unlock Full Script Export
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Section 3: Retention Leak Teaser ── */}
        {!isPaid ? (
          <div className="border-2 border-dashed border-red-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50/60 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                ⚠️ Retention Drop Signal Detected
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wide">
                Creator Required
              </span>
            </div>
            {/* Blurred placeholder — purely visual teaser, no real data needed */}
            <div className="relative px-4 py-3 select-none">
              <div className="space-y-1.5 blur-sm pointer-events-none" aria-hidden>
                <p className="text-xs font-bold text-slate-700">📉 CRITICAL — 14% audience exits at 00:12</p>
                <p className="text-xs text-slate-500">Audio decibel dip + passive CTA triggers algorithm penalty at this timestamp</p>
                <p className="text-xs text-slate-500">Counter-attack: re-cut at 00:11 with a direct urgency line to recover 8–12% watch-through</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 gap-2 text-center px-4">
                <p className="text-xs font-bold text-slate-700">
                  Unlock forensic audit — pinpoint exact drop-off seconds &amp; counter-attack script
                </p>
                <Link href="/pricing">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-700 text-white transition-all cursor-pointer">
                    <Lock className="h-3 w-3" /> Upgrade to Creator — $29/mo
                  </span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-red-100 rounded-lg px-4 py-3 bg-red-50/30 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold text-red-700">🔬 AI Structural Health Report available</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Hook mechanics · Leak detection · Counter-attack blueprint
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide shrink-0">
              Scroll up ↑
            </span>
          </div>
        )}

      </div>
    </div>
  )
}
