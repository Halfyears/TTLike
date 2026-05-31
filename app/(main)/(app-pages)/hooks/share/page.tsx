/**
 * /hooks/share — Shareable Hook Machine result page
 *
 * Receives the analysis result encoded as URL search params (set by ActionableHookCard):
 *   score   — scroll_stop_score (0-100)
 *   pattern — primary_pattern string
 *   hook    — original hook text (≤120 chars)
 *   v1–v4   — variant texts (≤40 chars each)
 *
 * The four variant patterns are inferred from position (always generated in
 * the same order by the prompt): Shock Reversal, Negative Interruption,
 * Visual Peak, Curiosity Gap.
 *
 * Server component — renders with proper OG metadata for social sharing.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, Brain, ArrowRight, Sparkles } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CopyHookButton } from './CopyHookButton'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShareParams {
  score:   number
  pattern: string
  hook:    string
  v1:      string
  v2:      string
  v3:      string
  v4:      string
}

// ── Variant display config ─────────────────────────────────────────────────────

const VARIANT_META = [
  { pattern: 'Shock Reversal',        bg: 'bg-red-900/40',     border: 'border-red-700/60',    text: 'text-red-300',    num: 'bg-red-500'     },
  { pattern: 'Negative Interruption', bg: 'bg-orange-900/40',  border: 'border-orange-700/60', text: 'text-orange-300', num: 'bg-orange-500'  },
  { pattern: 'Visual Peak',           bg: 'bg-violet-900/40',  border: 'border-violet-700/60', text: 'text-violet-300', num: 'bg-violet-500'  },
  { pattern: 'Curiosity Gap',         bg: 'bg-cyan-900/40',    border: 'border-cyan-700/60',   text: 'text-cyan-300',   num: 'bg-cyan-500'    },
] as const

// ── Score colour ───────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function scoreLabel(score: number) {
  if (score >= 85) return '🔥 Viral Potential'
  if (score >= 70) return '✅ Strong Hook'
  if (score >= 50) return '⚡ Decent Hook'
  return '⚠️ Needs Work'
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Record<string, string>> },
): Promise<Metadata> {
  const sp      = await searchParams
  const score   = Number(sp.score ?? 0)
  const pattern = sp.pattern ?? 'Hook'
  const hook    = sp.hook ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ttlike.co'

  const ogImageUrl = `${siteUrl}/api/og/hook?${new URLSearchParams({
    score:   String(score),
    pattern,
    hook:    hook.slice(0, 120),
    ...(sp.v1 ? { v1: sp.v1 } : {}),
    ...(sp.v2 ? { v2: sp.v2 } : {}),
    ...(sp.v3 ? { v3: sp.v3 } : {}),
    ...(sp.v4 ? { v4: sp.v4 } : {}),
  }).toString()}`

  const title = `${score}/100 Scroll-Stop Score — ${pattern} | TTLike Hook Machine`
  const description = hook
    ? `"${hook.slice(0, 120)}" — Analysed by TTLike Hook Machine. See 4 anti-duplication variants.`
    : `Score ${score}/100 with pattern "${pattern}" — See 4 anti-duplication TikTok variants.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Hook Machine Result' }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImageUrl],
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HookSharePage(
  { searchParams }: { searchParams: Promise<Record<string, string>> },
) {
  const sp = await searchParams

  const score   = Math.min(100, Math.max(0, Number(sp.score ?? 0) || 0))
  const pattern = sp.pattern ?? ''
  const hook    = sp.hook    ?? ''
  const v1      = sp.v1      ?? ''
  const v2      = sp.v2      ?? ''
  const v3      = sp.v3      ?? ''
  const v4      = sp.v4      ?? ''

  // Require at least a score and one variant to render
  if (!score && !v1) notFound()

  const variants = [v1, v2, v3, v4].filter(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 py-10 px-4">
      <div className="mx-auto max-w-2xl">

        {/* Brand bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/hooks" className="flex items-center gap-2 group">
            <Zap className="h-5 w-5 text-pink-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
              TTLike Hook Machine
            </span>
          </Link>
          <Link href="/hooks">
            <button className="flex items-center gap-1.5 text-xs bg-pink-500 hover:bg-pink-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              Try Yours Free
            </button>
          </Link>
        </div>

        {/* Score hero */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl mb-6">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-6 border-b border-slate-800">
            <div className="flex items-center gap-5">
              {/* Score ring */}
              <div className="flex flex-col items-center min-w-[90px]">
                <span className={`text-6xl font-black tabular-nums leading-none ${scoreColor(score)}`}>
                  {score}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1.5">
                  / 100 score
                </span>
              </div>

              <div className="w-px h-16 bg-slate-700" />

              {/* Classification */}
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-1.5">{scoreLabel(score)}</div>
                {pattern && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-sm font-semibold text-indigo-300">{pattern}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-pink-950/50 border border-pink-800 text-pink-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    <Zap className="h-3 w-3" />
                    Hook Machine
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Original hook */}
          {hook && (
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">
                Original Hook
              </p>
              <p className="text-sm text-slate-300 italic leading-snug">&ldquo;{hook}&rdquo;</p>
            </div>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="px-6 py-5">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-4">
                4 Anti-Duplication Variants
              </p>
              <div className="space-y-3">
                {variants.map((text, i) => {
                  const meta = VARIANT_META[i]
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border ${meta.border} ${meta.bg} p-4`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Pattern badge */}
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.border} ${meta.text} whitespace-nowrap`}>
                          {meta.pattern}
                        </span>
                        {/* Hook text */}
                        <p className="text-sm font-medium text-white leading-snug pt-0.5">
                          &ldquo;{text}&rdquo;
                        </p>
                      </div>
                      <div className="flex justify-end mt-2">
                        <CopyHookButton text={text} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-indigo-700/50 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-center">
          <Sparkles className="h-6 w-6 text-pink-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">
            Analyse your own hook — it&apos;s free
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Get a scroll-stop score + 4 CapCut-ready variants in under 3 seconds.
          </p>
          <Link href="/hooks">
            <button className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-pink-900/40">
              <Zap className="h-4 w-4" />
              Try Hook Machine
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Generated by{' '}
          <Link href="/" className="hover:text-pink-400 transition-colors">TTLike.co</Link>
          {' '}— TikTok Hook Engine for eCommerce creators
        </p>

      </div>
    </div>
  )
}

