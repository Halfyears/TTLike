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
import { Copy, Check, Film, Download, Lock, Zap, LayoutList, Search } from 'lucide-react'
import type { VideoBreakdownPayload, TimelineScene } from '@/lib/types/intelligence'
import { deriveCommercePayload } from '@/lib/types/intelligence'
import type { TierName } from '@/lib/constants'

interface Props {
  data:            VideoBreakdownPayload
  showPremiumCta?: boolean
  /** User's current tier — gates Copy for CapCut & full timeline export */
  tier?:           TierName
  /** Product metadata for commerce payload derivation */
  productName?:    string
  niche?:          string
  viralScore?:     number
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

export function VideoAnalysis({
  data,
  showPremiumCta = false,
  tier = 'free',
  productName = '',
  niche = 'General',
  viralScore = 0,
}: Props) {
  const { copied, copy } = useCopy()
  const isPaid = tier === 'creator' || tier === 'scale'

  if (!data) return null

  // Derive commerce payload (pure, zero network cost)
  const commerce = (data.viral_formulas?.length > 0)
    ? deriveCommercePayload(data, productName, niche, viralScore)
    : null

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

        {/* ── Section 0: Commerce Execution Layer (first fold) ── */}
        {commerce && (
          <div className="space-y-3">

            {/* Index bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-pink-50 border border-pink-100 rounded-lg px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Viral Pressure</p>
                <p className="text-xl font-black text-pink-600 tabular-nums">
                  {commerce.indexing_engine.ttlike_viral_pressure_index}
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Commerce Index</p>
                <p className="text-xl font-black text-indigo-600 tabular-nums">
                  {commerce.indexing_engine.commerce_intent_index}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Taxonomy</p>
                <p className="text-[11px] font-black text-amber-700 leading-tight mt-0.5">
                  {commerce.indexing_engine.primary_attention_taxonomy.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            {/* Hook anti-duplication library */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-pink-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Hook Anti-Duplication Library
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {commerce.execution_payload.hook_library.map((hook, hi) => (
                  <div key={hi} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                        {hook.timestamp}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 truncate">{hook.type}</span>
                    </div>
                    <div className="space-y-1">
                      {hook.anti_duplication_variants.map((v, vi) => {
                        const vKey = `hook-${hi}-${vi}`
                        return (
                          <div key={vi} className="flex items-start justify-between gap-2 bg-indigo-50/40 rounded px-2 py-1.5">
                            <p className="text-xs text-indigo-800 leading-snug flex-1">&ldquo;{v}&rdquo;</p>
                            <button
                              onClick={() => copy(v, vKey)}
                              className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                copied === vKey ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {copied === vKey ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storyboard flow */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                <LayoutList className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Storyboard Flow — MakeUGC / Canva Ready
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {commerce.execution_payload.storyboard_flow.map((slide) => {
                  const sKey = `slide-${slide.slide_number}`
                  const typeColors: Record<string, string> = {
                    hook:              'bg-red-100 text-red-700',
                    agitate_pain:      'bg-orange-100 text-orange-700',
                    value_proposition: 'bg-blue-100 text-blue-700',
                    cta:               'bg-emerald-100 text-emerald-700',
                  }
                  return (
                    <div key={slide.slide_number} className="px-3 py-2.5 flex items-start gap-2.5">
                      <span className="shrink-0 text-[10px] font-black text-slate-400 tabular-nums w-4 pt-0.5">
                        {slide.slide_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 ${typeColors[slide.type] ?? 'bg-slate-100 text-slate-500'}`}>
                          {slide.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-700 leading-snug whitespace-pre-line">{slide.exact_copy}</p>
                      </div>
                      <button
                        onClick={() => copy(slide.exact_copy, sKey)}
                        className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                          copied === sKey ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {copied === sKey ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pinterest search terms */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Pinterest Asset Search — 9:16 Ready
                </span>
              </div>
              <div className="px-3 py-2.5 flex flex-wrap gap-2">
                {commerce.execution_payload.upstream_search_queries.pinterest_search_terms.map((term, ti) => {
                  const tKey = `pin-${ti}`
                  return (
                    <button
                      key={ti}
                      onClick={() => copy(term, tKey)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        copied === tKey
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      {copied === tKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      {term}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        )}

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

        {/* ── Section 3: Health Report prompt (clean, no blur) ── */}
        {showPremiumCta && !isPaid && (
          <div className="border border-indigo-100 rounded-lg px-4 py-3 bg-indigo-50/40 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold text-indigo-700">🔬 AI Structural Health Report</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Hook mechanics · Leak detection · Counter-attack blueprint
              </p>
            </div>
            <Link href="/pricing">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer">
                <Lock className="h-3 w-3" /> Creator — $29/mo
              </span>
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
