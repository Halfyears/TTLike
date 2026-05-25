'use client'

/**
 * ActionableHookCard — TTLike Hook Machine v1.0
 * Dark slate theme, animated scroll-stop score, bold rendering, copy-to-clipboard.
 */

import { useEffect, useRef, useState } from 'react'
import { Copy, Check, Zap, Brain, Eye, Share2 } from 'lucide-react'
import type { TTLikeHookResponse, HookVariant } from '@/lib/types/hooks'

// ── Bold text renderer: **text** → <strong class="text-amber-400"> ─────────────

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-amber-400 font-semibold">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Score counter animation ───────────────────────────────────────────────────

function ScoreCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const start    = performance.now()
    const duration = 800

    const tick = (now: number) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target])

  const color =
    target >= 75 ? 'text-emerald-400' :
    target >= 50 ? 'text-amber-400'   :
                   'text-red-400'

  return <span className={`text-5xl font-black tabular-nums ${color}`}>{count}</span>
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy for CapCut' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text — ignore failure
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md
        bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white
        transition-colors border border-slate-600 hover:border-slate-500"
    >
      {copied
        ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
        : <><Copy className="h-3 w-3" />{label}</>
      }
    </button>
  )
}

// ── Pattern badge colour map ──────────────────────────────────────────────────

const PATTERN_COLOURS: Record<string, string> = {
  'Shock Reversal':       'bg-red-900/50    text-red-300    border-red-700',
  'Negative Interruption':'bg-orange-900/50 text-orange-300 border-orange-700',
  'Visual Peak':          'bg-violet-900/50 text-violet-300 border-violet-700',
  'Curiosity Gap':        'bg-cyan-900/50   text-cyan-300   border-cyan-700',
}

const EMOTION_COLOURS: Record<string, string> = {
  'Status Anxiety': 'bg-pink-900/40   text-pink-300',
  'Time Scarcity':  'bg-red-900/40    text-red-300',
  'Vanity':         'bg-purple-900/40 text-purple-300',
  'Social Proof':   'bg-blue-900/40   text-blue-300',
}

// ── Variant Card ──────────────────────────────────────────────────────────────

function VariantCard({ v }: { v: HookVariant }) {
  const patternCls = PATTERN_COLOURS[v.pattern] ?? 'bg-slate-700 text-slate-300 border-slate-600'
  const emotionCls = EMOTION_COLOURS[v.emotion] ?? 'bg-slate-700/40 text-slate-300'

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 flex flex-col gap-3">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${patternCls}`}>
          {v.pattern}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${emotionCls}`}>
          {v.emotion}
        </span>
      </div>

      {/* Hook text */}
      <p className="text-sm font-medium text-white leading-snug">
        &ldquo;<BoldText text={v.text} />&rdquo;
      </p>

      {/* Visual SOP */}
      <div className="flex items-start gap-2 bg-slate-900/60 rounded-lg px-3 py-2">
        <Eye className="h-3.5 w-3.5 mt-0.5 text-slate-500 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-snug">{v.visual_action}</p>
      </div>

      {/* Copy */}
      <div className="flex justify-end">
        <CopyButton text={v.text} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface ActionableHookCardProps {
  result:      TTLikeHookResponse
  originalText: string
}

function ShareCardButton({ result, originalText }: { result: TTLikeHookResponse; originalText: string }) {
  const [copied, setCopied] = useState(false)

  function buildShareUrl() {
    const p = new URLSearchParams({
      score:   String(result.original_analysis.scroll_stop_score),
      pattern: result.hook_classification.primary_pattern,
      hook:    originalText.slice(0, 120),
    })
    // 40 chars per variant keeps total URL under 2 KB (matches route.tsx limit)
    result.variants.slice(0, 4).forEach((v, i) => p.set(`v${i + 1}`, v.text.slice(0, 40)))
    return `/api/og/hook?${p.toString()}`
  }

  const handleShare = async () => {
    const url = `${window.location.origin}${buildShareUrl()}`
    // Open in new tab (shows the card image — user can save/screenshot)
    window.open(url, '_blank')
    // Also copy the URL
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleShare}
      title="Generate share card (opens in new tab)"
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md
        bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 hover:text-indigo-200
        transition-colors border border-indigo-700/50 hover:border-indigo-600"
    >
      {copied
        ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Link copied!</span></>
        : <><Share2 className="h-3 w-3" />Share Card</>
      }
    </button>
  )
}

export default function ActionableHookCard({ result, originalText }: ActionableHookCardProps) {
  const { original_analysis, hook_classification, variants } = result
  const score = Math.min(100, Math.max(0, original_analysis.scroll_stop_score))

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 overflow-hidden shadow-2xl">

      {/* ── Score header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-6 px-6 py-5 border-b border-slate-800 bg-slate-900/80">
        {/* Score */}
        <div className="flex flex-col items-center min-w-[80px]">
          <ScoreCounter target={score} />
          <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            Scroll-Stop Score
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-14 bg-slate-700" />

        {/* Classification */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">
              {hook_classification.primary_pattern}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hook_classification.dominant_emotions.map(e => (
              <span key={e}
                className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                {e}
              </span>
            ))}
          </div>
        </div>

        {/* Right side: badge + share */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 bg-pink-950/50 border border-pink-800 text-pink-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
            <Zap className="h-3 w-3" />
            Hook Machine
          </div>
          <ShareCardButton result={result} originalText={originalText} />
        </div>
      </div>

      {/* ── Original text + feedback ─────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">Your Hook</p>
        <p className="text-sm text-slate-300 italic mb-3 leading-snug">&ldquo;{originalText}&rdquo;</p>
        <div className="flex items-start gap-2 bg-slate-900/60 rounded-lg px-3 py-2.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 shrink-0">
            Verdict
          </span>
          <p className="text-xs text-amber-300 leading-relaxed">
            <BoldText text={original_analysis.brutal_feedback} />
          </p>
        </div>
      </div>

      {/* ── 4 Variants ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-4">
          4 Anti-Duplication Variants
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {variants.map(v => (
            <VariantCard key={v.id} v={v} />
          ))}
        </div>
      </div>

    </div>
  )
}
