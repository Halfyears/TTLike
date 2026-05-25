'use client'

/**
 * ActionableHookCard v2.0
 *
 * Engineering rationales implemented:
 * 1. TYPOGRAPHY — heavy text-base/text-lg SAY block for teleprompter readability; dimmed VISUAL SOP
 * 2. OVERFLOW DEFENSE — brutal_feedback in max-h-20 overflow-y-auto container
 * 3. INLINE HIGHLIGHT — **text** → amber glow via split-on-** (no full markdown parser)
 * 4. MOBILE ACCESSIBILITY — copy button: `block md:opacity-0 md:group-hover:opacity-100`
 * 5. MONETIZATION GATEWAY — sticky footer bar with onCloneClick CTA
 *
 * Props contract (matches lib/types/hooks.ts):
 *   score        — scroll_stop_score 0-100
 *   feedback     — brutal_feedback string
 *   variants     — HookVariant[]  (exactly 4)
 *   originalText — optional, used for /hooks/share link
 *   primaryPattern — optional, used for share metadata
 *   onCloneClick — optional CTA callback for monetization barrier
 */

import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import type { TTLikeHookResponse, HookVariant } from '@/lib/types/hooks'

// ── Re-export for consumers who import HookVariant from here ──────────────────
export type { HookVariant }

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ActionableHookCardProps {
  score:          number
  feedback:       string
  variants:       HookVariant[]
  originalText?:  string   // for share URL; optional
  primaryPattern?: string  // for share URL metadata; optional
  onCloneClick?:  () => void
}

// ── Bold text parser (rationale #3) ──────────────────────────────────────────
// Splits on ** pairs; odd-index parts are wrapped in amber glow spans.
// No markdown library — zero bundle overhead.

function BoldGlow({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong
              key={i}
              className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10 font-bold mx-0.5"
            >
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Score colour (rationale #1) ───────────────────────────────────────────────

function scoreColorCls(score: number) {
  if (score < 50) return 'text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5'
  if (score < 70) return 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5'
  return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
}

// ── Share URL builder (carries forward /hooks/share integration) ──────────────

function buildShareUrl(
  score:    number,
  pattern:  string,
  hook:     string,
  variants: HookVariant[],
): string {
  const p = new URLSearchParams({
    score:   String(score),
    pattern,
    hook:    hook.slice(0, 120),
  })
  variants.slice(0, 4).forEach((v, i) => p.set(`v${i + 1}`, v.text.slice(0, 40)))
  return `/hooks/share?${p.toString()}`
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({
  score, primaryPattern, originalText, variants,
}: {
  score: number; primaryPattern: string; originalText: string; variants: HookVariant[]
}) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}${buildShareUrl(score, primaryPattern, originalText, variants)}`
    window.open(url, '_blank')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleShare}
      title="Share this result"
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg
        bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60
        text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/30
        transition-all"
    >
      {copied
        ? <><Check className="h-3 w-3 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Copied!</span></>
        : <><Share2 className="h-3 w-3" />Share</>
      }
    </button>
  )
}

// ── Variant card ──────────────────────────────────────────────────────────────

function VariantCard({
  variant,
  copiedId,
  onCopy,
}: {
  variant:  HookVariant
  copiedId: number | null
  onCopy:   (v: HookVariant) => void
}) {
  const isCopied = copiedId === variant.id

  return (
    <div className="group flex flex-col justify-between border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/20 rounded-xl p-5 transition-all hover:shadow-md">

      {/* Emotion badge + Copy button row */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black font-mono tracking-wider text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
          [{variant.emotion}]
        </span>

        {/* Rationale #4: always visible on mobile, fade in on desktop hover */}
        <button
          onClick={() => onCopy(variant)}
          className={`text-xs font-bold font-mono px-2.5 py-1 rounded transition-all
            opacity-100 md:opacity-0 md:group-hover:opacity-100
            ${isCopied
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          aria-label={isCopied ? 'Copied' : `Copy ${variant.pattern} variant`}
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Hook text — rationale #1: text-base/text-lg, high contrast */}
      <p className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed mb-4 tracking-wide">
        &ldquo;<BoldGlow text={variant.text} />&rdquo;
      </p>

      {/* Pattern badge */}
      <div className="mb-2">
        <span className="text-[9px] font-bold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          {variant.pattern}
        </span>
      </div>

      {/* Visual SOP — rationale #1: dimmed to reduce layout fatigue */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 -mx-5 -mb-5 p-4 rounded-b-xl">
        <span className="block text-[9px] font-bold font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-1">
          🎬 VISUAL SOP
        </span>
        <p className="text-xs text-slate-400 dark:text-slate-500 italic leading-normal">
          {variant.visual_action}
        </p>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ActionableHookCard({
  score,
  feedback,
  variants,
  originalText,
  primaryPattern,
  onCloneClick,
}: ActionableHookCardProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  // useRef for timeout cleanup — prevents setState on unmounted component
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const handleCopy = (variant: HookVariant) => {
    const copyText = [
      `HOOK (${variant.emotion}):`,
      `"${variant.text.replace(/\*\*/g, '')}"`,
      '',
      'VISUAL SOP:',
      variant.visual_action,
    ].join('\n')

    navigator.clipboard.writeText(copyText).catch(() => { /* ignore */ })
    setCopiedId(variant.id)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
  }

  const clampedScore = Math.min(100, Math.max(0, score))
  const canShare = !!(originalText && primaryPattern)

  return (
    // pb-28 reserves space so the sticky bar never covers last variant
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans pb-28">

      {/* ── 1. Brutalist Header Dashboard ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-5 mb-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">

        {/* Score cell */}
        <div className={`flex flex-col justify-center p-3 rounded-lg border ${scoreColorCls(clampedScore)}`}>
          <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">
            Viral Pressure
          </span>
          <span className="text-3xl font-black font-mono mt-0.5 tabular-nums">
            {clampedScore}
          </span>
        </div>

        {/* Brutal feedback — rationale #2: overflow-y-auto container */}
        <div className="md:col-span-2 flex flex-col justify-center pl-0 md:pl-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              Brutal Feedback
            </span>
            {/* Share button — only when originalText is provided */}
            {canShare && (
              <ShareButton
                score={clampedScore}
                primaryPattern={primaryPattern!}
                originalText={originalText!}
                variants={variants}
              />
            )}
          </div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-h-20 overflow-y-auto pr-1">
            {feedback}
          </div>
        </div>
      </div>

      {/* ── 2. Actionable Variant Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variants.map(variant => (
          <VariantCard
            key={variant.id}
            variant={variant}
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {/* ── 3. Sticky Bottom Monetization Bar — rationale #5 ─────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 z-40 shadow-xl">
        <div className="max-w-3xl mx-auto flex justify-between items-center px-2">
          <div className="hidden sm:block">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Ready to automate production?
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Map this conversion curve into your custom niche instantly.
            </p>
          </div>
          <button
            onClick={() => onCloneClick?.()}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-md transition-all tracking-wide"
          >
            ✨ Adapt This Script to My Product (Pro)
          </button>
        </div>
      </div>
    </div>
  )
}
