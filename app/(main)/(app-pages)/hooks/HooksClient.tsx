'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { HOOK_TYPES } from '@/lib/constants'
import ActionableHookCard from '@/components/ActionableHookCard'
import { SignupPromptModal } from '@/components/hooks/SignupPromptModal'
import { createClient } from '@/lib/supabase/client'
import type { TTLikeHookResponse } from '@/lib/types/hooks'

// ── Anonymous generation tracking ─────────────────────────────────────────────

const STORAGE_KEY = 'ttlike_hook_count'
const MODAL_DISMISSED_KEY = 'ttlike_hook_modal_v1'
const SOFT_THRESHOLD = 5
const HARD_THRESHOLD = 10

function getStoredCount(): number {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0 } catch { return 0 }
}
function incStoredCount(): number {
  const next = getStoredCount() + 1
  try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
  return next
}
function wasDismissedAt(threshold: number): boolean {
  try {
    // sessionStorage: resets each session, so returning from signup page doesn't re-show modal
    const val = sessionStorage.getItem(`${MODAL_DISMISSED_KEY}_${threshold}`)
    return val === '1'
  } catch { return false }
}
function markDismissed(threshold: number) {
  try { sessionStorage.setItem(`${MODAL_DISMISSED_KEY}_${threshold}`, '1') } catch { /* ignore */ }
}

const HOOK_PATTERNS = [
  { id: '1', type: 'SURPRISE', title: 'The "I Had No Idea" Hook', template: 'I had no idea [product] could do [unexpected benefit] until I tried it...', example: 'I had no idea a $15 massage gun could fix my 2-year back pain until I tried it...', viralScore: 94, useCount: 2847 },
  { id: '2', type: 'QUESTION', title: 'The Pain Point Question', template: 'Are you still [struggling with problem] in [year]? There\'s a better way...', example: 'Are you still waking up with back pain in 2024? There\'s a better way...', viralScore: 91, useCount: 2341 },
  { id: '3', type: 'FOMO', title: 'The Trend Warning', template: 'Everyone is buying [product] right now and here\'s why you should too...', example: 'Everyone is buying this posture corrector right now and here\'s why you should too...', viralScore: 89, useCount: 1923 },
  { id: '4', type: 'EMOTIONAL', title: 'The Personal Story', template: 'After [time period] of [suffering], this [product] literally changed my life...', example: 'After 3 years of chronic back pain, this posture corrector literally changed my life...', viralScore: 88, useCount: 1756 },
  { id: '5', type: 'CONTRARIAN', title: 'The Myth Buster', template: 'Stop spending money on [expensive solution]. This $[price] product does the same thing...', example: 'Stop spending $200 on chiropractors. This $25 device does the same thing...', viralScore: 86, useCount: 1534 },
  { id: '6', type: 'SURPRISE', title: 'The Unboxing Reveal', template: 'My [family member/friend] thought I was crazy for buying this. They were wrong...', example: 'My husband thought I was crazy for buying this $12 gadget. He was wrong...', viralScore: 85, useCount: 1432 },
  { id: '7', type: 'EDUCATIONAL', title: 'The Did You Know', template: 'Did you know that [surprising fact about problem]? This is how I fixed it...', example: 'Did you know that 80% of people have bad posture from phone use? This is how I fixed it...', viralScore: 83, useCount: 1287 },
  { id: '8', type: 'STORY', title: 'The Money Story', template: 'I spent $[amount] on [expensive solution] before finding this $[price] [product]...', example: 'I spent $500 on massage therapy before finding this $20 massage gun...', viralScore: 82, useCount: 1198 },
  { id: '9', type: 'FOMO', title: 'The Limited Time', template: 'This [product] keeps selling out and I finally got one. Here\'s my honest review...', example: 'This LED lamp keeps selling out and I finally got one. Here\'s my honest review...', viralScore: 81, useCount: 1087 },
  { id: '10', type: 'QUESTION', title: 'The Challenge Hook', template: 'Can a $[price] [product] really [achieve big claim]? I tried it for [time period]...', example: 'Can a $30 blender really make restaurant-quality smoothies? I tried it for 30 days...', viralScore: 80, useCount: 987 },
  { id: '11', type: 'EMOTIONAL', title: 'The Gift Hook', template: 'I bought this [product] as a gift and now they won\'t stop talking about it...', example: 'I bought this massage gun as a gift and now my whole family fights over it...', viralScore: 79, useCount: 876 },
  { id: '12', type: 'CONTRARIAN', title: 'The Comparison Hook', template: 'POV: You realize [expensive brand] and this [cheap product] do the exact same thing...', example: 'POV: You realize Dyson and this $30 product do the exact same thing...', viralScore: 78, useCount: 765 },
]

const hookTypeColors: Record<string, string> = {
  SURPRISE:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  QUESTION:    'bg-blue-100 text-blue-700 border-blue-200',
  EMOTIONAL:   'bg-pink-100 text-pink-700 border-pink-200',
  FOMO:        'bg-red-100 text-red-700 border-red-200',
  CONTRARIAN:  'bg-violet-100 text-violet-700 border-violet-200',
  STORY:       'bg-green-100 text-green-700 border-green-200',
  EDUCATIONAL: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

// ── Hook Machine section ──────────────────────────────────────────────────────

function HookMachine() {
  const router = useRouter()
  const [text,        setText]       = useState('')
  const [loading,     setLoading]    = useState(false)
  const [result,      setResult]     = useState<TTLikeHookResponse | null>(null)
  const [error,       setError]      = useState<string | null>(null)
  const [showModal,   setShowModal]  = useState(false)
  const [modalCount,  setModalCount] = useState(0)
  const [isLoggedIn,  setIsLoggedIn] = useState(false)
  // authChecked prevents false-positive modal fires before session resolves
  const [authChecked, setAuthChecked] = useState(false)

  // Check auth status once on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      setAuthChecked(true)
    }).catch(() => { setAuthChecked(true) })
  }, [])

  const maybeShowModal = useCallback((count: number) => {
    // Don't show until auth check resolves — avoids false-positive for logged-in users
    if (!authChecked || isLoggedIn) return
    const threshold =
      count >= HARD_THRESHOLD && !wasDismissedAt(HARD_THRESHOLD) ? HARD_THRESHOLD :
      count >= SOFT_THRESHOLD && !wasDismissedAt(SOFT_THRESHOLD) ? SOFT_THRESHOLD :
      0
    if (threshold > 0) {
      setModalCount(count)
      setShowModal(true)
    }
  }, [authChecked, isLoggedIn])

  const analyse = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/hooks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json() as TTLikeHookResponse & { error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      setResult(data)
      // Track generation count (anonymous only)
      if (!isLoggedIn) {
        const newCount = incStoredCount()
        maybeShowModal(newCount)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyse()
  }

  const handleDismiss = () => {
    // Mark the crossed threshold as dismissed so it doesn't appear again this session
    if (modalCount >= HARD_THRESHOLD) markDismissed(HARD_THRESHOLD)
    else if (modalCount >= SOFT_THRESHOLD) markDismissed(SOFT_THRESHOLD)
    setShowModal(false)
  }

  return (
    <>
    {showModal && <SignupPromptModal count={modalCount} onDismiss={handleDismiss} />}
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 mb-10 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-pink-400" />
        <h2 className="text-lg font-bold text-white">Hook Machine</h2>
        <span className="ml-1 text-[10px] font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40 px-2 py-0.5 rounded-full">
          v1.0
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Paste your hook below. Get a scroll-stop score + 4 anti-duplication variants ready for CapCut.
      </p>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. I had no idea this $12 gadget would replace my $300 morning routine…"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl bg-slate-800/80 border border-slate-600 text-white text-sm
            placeholder:text-slate-500 px-4 py-3 resize-none focus:outline-none
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-600">{text.length}/500 · ⌘↵ to analyse</span>
          <button
            onClick={analyse}
            disabled={loading || !text.trim()}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-400 disabled:bg-slate-700
              disabled:text-slate-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl
              transition-colors shadow-lg shadow-pink-900/30"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
              : <><Zap className="h-4 w-4" /> Analyse Hook</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6">
          <ActionableHookCard
            score={result.original_analysis.scroll_stop_score}
            feedback={result.original_analysis.brutal_feedback}
            variants={result.variants}
            originalText={text.trim()}
            primaryPattern={result.hook_classification.primary_pattern}
            onCloneClick={() => router.push('/pricing')}
          />
        </div>
      )}
    </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HooksClient() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hook Library</h1>
        <p className="text-gray-600">Battle-tested hooks that make people stop scrolling</p>
      </div>

      {/* ── AI Hook Machine (above fold) ───────────────────────────────────── */}
      <HookMachine />

      {/* ── Static library ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Hook Library</h2>
        <p className="text-sm text-gray-500">12 proven patterns — click any to jump to the script generator</p>
      </div>

      {/* Hook type filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {HOOK_TYPES.map(hook => (
          <span key={hook.value}
            className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${hookTypeColors[hook.value]}`}>
            {hook.label}
          </span>
        ))}
      </div>

      {/* ── Niche SEO pages ─────────────────────────────────────────────────── */}
      <div className="mb-8 p-4 rounded-xl border border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Hooks by Niche
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { slug: 'beauty',  label: '💄 Beauty',    },
            { slug: 'fitness', label: '💪 Fitness',   },
            { slug: 'home',    label: '🏠 Home',      },
            { slug: 'tech',    label: '📱 Tech',      },
            { slug: 'fashion', label: '👗 Fashion',   },
            { slug: 'pet',     label: '🐾 Pets',      },
            { slug: 'food',    label: '🍳 Food',      },
            { slug: 'gadgets', label: '🔧 Gadgets',   },
          ].map(({ slug, label }) => (
            <Link key={slug} href={`/hooks/${slug}`}>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-pink-300 hover:text-pink-600 transition-colors bg-white cursor-pointer">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {HOOK_PATTERNS.map(hook => (
          <Card key={hook.id} hover>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hookTypeColors[hook.type]}`}>
                  {hook.type}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Zap className="h-3 w-3 text-pink-400" />
                  {hook.viralScore}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-2">{hook.title}</h3>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-600 font-mono leading-relaxed">{hook.template}</p>
              </div>

              <div className="bg-pink-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-pink-800 italic leading-relaxed">&ldquo;{hook.example}&rdquo;</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{hook.useCount.toLocaleString()} uses</span>
                <Link href={`/dashboard/ai-scripts?hook=${hook.type}`}>
                  <button className="flex items-center gap-1 text-xs text-pink-500 font-medium hover:text-pink-600">
                    <Zap className="h-3 w-3" /> Use This Hook
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
