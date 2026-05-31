'use client'

/**
 * AntiDupHooksPanel — Anti-Duplication Hook Variants (Creator+ feature)
 *
 * Takes the script's hook line and generates 4 pattern variants via /api/hooks.
 * Each variant targets a different emotion trigger to avoid TikTok duplicate detection
 * when posting the same product multiple times.
 */

import { useState } from 'react'
import { Shuffle, Lock, Copy, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useUserTier } from '@/hooks/useUserTier'
import type { TTLikeHookResponse, HookVariant } from '@/lib/types/hooks'

interface Props {
  hookLine: string
}

// ── Pattern badge colors ──────────────────────────────────────────────────────

const PATTERN_COLORS: Record<string, string> = {
  'Shock Reversal':        'bg-red-50 text-red-700 border-red-200',
  'Negative Interruption': 'bg-orange-50 text-orange-700 border-orange-200',
  'Visual Peak':           'bg-violet-50 text-violet-700 border-violet-200',
  'Curiosity Gap':         'bg-blue-50 text-blue-700 border-blue-200',
}

const EMOTION_COLORS: Record<string, string> = {
  'Status Anxiety': 'text-rose-600',
  'Time Scarcity':  'text-amber-600',
  'Vanity':         'text-violet-600',
  'Social Proof':   'text-blue-600',
}

// ── Single variant row ────────────────────────────────────────────────────────

function VariantRow({ variant }: { variant: HookVariant }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(variant.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const patternCls  = PATTERN_COLORS[variant.pattern]  ?? 'bg-gray-50 text-gray-700 border-gray-200'
  const emotionCls  = EMOTION_COLORS[variant.emotion]  ?? 'text-gray-500'

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${patternCls}`}>
            {variant.pattern}
          </span>
          <span className={`text-[11px] font-semibold ${emotionCls}`}>
            {variant.emotion}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 transition-colors"
        >
          {copied
            ? <><Check className="h-3 w-3 text-green-500" />Copied</>
            : <><Copy className="h-3 w-3" />Copy</>
          }
        </button>
      </div>

      <p className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">
        &ldquo;{variant.text}&rdquo;
      </p>

      <p className="text-xs text-gray-500 italic leading-relaxed">
        🎬 {variant.visual_action}
      </p>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AntiDupHooksPanel({ hookLine }: Props) {
  const { tier } = useUserTier()
  const [expanded,   setExpanded]   = useState(false)
  const [state,      setState]      = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result,     setResult]     = useState<TTLikeHookResponse | null>(null)
  const [errMsg,     setErrMsg]     = useState('')

  if (tier.loading) {
    return <div className="h-16 bg-gray-50 rounded-xl animate-pulse border border-gray-100" />
  }

  const canUse = tier.tier_name !== 'free'

  // ── Locked (Free) state ────────────────────────────────────────────────────
  if (!canUse) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-700">Anti-Duplication Hook Variants</p>
            <p className="text-xs text-gray-400 mt-0.5">4 ready-to-post variants · Creator plan required</p>
          </div>
        </div>
        <a
          href="/pricing"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Upgrade
        </a>
      </div>
    )
  }

  // ── Generate handler ───────────────────────────────────────────────────────
  async function generate() {
    setState('loading')
    setErrMsg('')
    try {
      const res  = await fetch('/api/hooks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: hookLine }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setResult(json as TTLikeHookResponse)
      setState('done')
      setExpanded(true)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Generation failed')
      setState('error')
    }
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Shuffle className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Anti-Duplication Hook Variants</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs" title={hookLine}>
              &ldquo;{hookLine.slice(0, 60)}{hookLine.length > 60 ? '…' : ''}&rdquo;
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Generate 4 Variants
        </button>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-3 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-800">Generating anti-duplication variants…</p>
          <p className="text-xs text-gray-400 mt-0.5">4 patterns · Different emotion triggers</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 bg-red-50">
        <p className="text-sm text-red-600">{errMsg}</p>
        <button onClick={generate} className="text-xs text-red-600 underline shrink-0">Retry</button>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (!result) return null

  const score = result.original_analysis.scroll_stop_score

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Shuffle className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-gray-900">Anti-Duplication Variants Ready</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Original score: <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{score}/100</span>
              {' · '}
              <span className="italic text-gray-400">&ldquo;{result.original_analysis.brutal_feedback}&rdquo;</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">4 variants</span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Variants */}
      {expanded && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {result.variants.map(v => <VariantRow key={v.id} variant={v} />)}

          <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
            <p className="text-[11px] text-gray-400">
              Pattern: <span className="font-semibold text-gray-600">{result.hook_classification.primary_pattern}</span>
              {' · '}
              {result.hook_classification.dominant_emotions.join(', ')}
            </p>
            <button
              onClick={generate}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
