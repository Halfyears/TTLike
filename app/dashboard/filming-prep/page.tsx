'use client'

import { useState, useEffect } from 'react'
import { timeAgo } from '@/lib/dateUtils'
import {
  Camera, Lightbulb, Brain, CheckCircle2, Circle,
  ChevronDown, Wand2, ArrowRight, Zap, Package, Monitor, Mic, Wind,
  Clapperboard, Eye, Clock, ArrowUpRight,
} from 'lucide-react'
import type { AnalysisItem } from '@/app/api/studio/analyses/route'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CheckItem { id: string; text: string; tip?: string }

interface Section {
  id: string; icon: React.ElementType; color: string; bg: string
  title: string; subtitle: string; items: CheckItem[]
}

// ── Checklist data ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'environment', icon: Lightbulb,
    color: 'text-amber-600', bg: 'bg-amber-50',
    title: 'Environment', subtitle: 'Set the scene',
    items: [
      { id: 'e1', text: 'Lighting set up — window light or ring light, no harsh shadows' },
      { id: 'e2', text: 'Background clean — no clutter, no distracting movement' },
      { id: 'e3', text: 'Room quiet — phone silent, fans off, doors closed' },
      { id: 'e4', text: 'No echo — soft furnishings present (carpet, curtains)' },
      { id: 'e5', text: 'Temperature comfortable — won\'t adjust clothing mid-take' },
      { id: 'e6', text: 'Notifications off — Do Not Disturb on all devices' },
    ],
  },
  {
    id: 'equipment', icon: Camera,
    color: 'text-blue-600', bg: 'bg-blue-50',
    title: 'Equipment', subtitle: 'Gear ready',
    items: [
      { id: 'q1', text: 'Battery above 50% and enough storage space' },
      { id: 'q2', text: 'Camera lens clean — wiped with microfibre cloth' },
      { id: 'q3', text: 'Camera stable — tripod or propped securely' },
      { id: 'q4', text: 'Microphone ready — lavalier or phone mic tested' },
      { id: 'q5', text: 'Product clean, charged, and within arm\'s reach' },
      { id: 'q6', text: 'B-roll shots planned — at least 3 angles identified' },
      { id: 'q7', text: 'Script visible if needed — cue card near camera' },
      { id: 'q8', text: 'Frame checked — face in upper third, 9:16 ratio set' },
    ],
  },
  {
    id: 'mental', icon: Brain,
    color: 'text-violet-600', bg: 'bg-violet-50',
    title: 'Mental Prep', subtitle: 'Mindset & energy',
    items: [
      { id: 'm1', text: 'Hook line memorised — say it naturally, not read it' },
      { id: 'm2', text: 'Key message clear — one thing viewers must take away' },
      { id: 'm3', text: 'Energy level high — moved, stretched, or had water' },
      { id: 'm4', text: 'Delivery speed planned — slightly faster than normal' },
      { id: 'm5', text: 'At least one practice run out loud' },
      { id: 'm6', text: 'Mindset ready — retakes are normal, just start' },
    ],
  },
]

// ── Progress ring ──────────────────────────────────────────────────────────────

function ProgressRing({ done, total, color }: { done: number; total: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  return (
    <svg width="40" height="40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
      <circle
        cx="20" cy="20" r={r} fill="none"
        stroke={pct === 1 ? '#10b981' : color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        className="transition-all duration-500"
      />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="700"
        fill={pct === 1 ? '#10b981' : '#374151'}>
        {done}/{total}
      </text>
    </svg>
  )
}

const SECTION_HEX: Record<string, string> = {
  'text-amber-600': '#d97706',
  'text-blue-600':  '#2563eb',
  'text-violet-600':'#7c3aed',
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({ section, checked, onToggle }: {
  section: Section; checked: Set<string>; onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const done = section.items.filter(i => checked.has(i.id)).length
  const total = section.items.length
  const allDone = done === total

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${
      allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white'
    }`}>
      {/* Tap to expand — 52px tall min for easy touch */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
          allDone ? 'bg-emerald-100' : section.bg
        }`}>
          <section.icon className={`w-4 h-4 ${allDone ? 'text-emerald-600' : section.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{section.title}</p>
            {allDone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Done ✓</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {open ? 'Tap to collapse' : allDone ? section.subtitle : `${section.subtitle} — tap to open`}
          </p>
        </div>
        <ProgressRing done={done} total={total} color={SECTION_HEX[section.color] ?? '#6b7280'} />
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ml-0.5 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Progress bar (always visible) */}
      <div className="px-4">
        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-pink-400 to-violet-400'}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <ul className="px-4 pt-3 pb-4 space-y-0 divide-y divide-gray-50">
          {section.items.map(item => {
            const ticked = checked.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="flex items-center gap-3 w-full text-left py-3 group"
                >
                  {ticked
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <Circle className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" />
                  }
                  <span className={`text-sm leading-snug flex-1 transition-colors ${
                    ticked ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}>
                    {item.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ── Tab types ──────────────────────────────────────────────────────────────────

type Tab = 'script' | 'checklist' | 'tips'

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FilmingPrepPage() {
  const [checked,        setChecked]        = useState<Set<string>>(new Set())
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisItem | null>(null)
  const [loadingScript,  setLoadingScript]  = useState(true)
  const [activeTab,      setActiveTab]      = useState<Tab>('checklist')

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/studio/analyses')
        if (!res.ok) { setLoadingScript(false); return }
        const data = await res.json()
        const items: AnalysisItem[] = data.items ?? []
        setLatestAnalysis(items[0] ?? null)
      } catch {
        // page works without script reference
      } finally {
        setLoadingScript(false)
      }
    })()
  }, [])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const totalDone  = SECTIONS.reduce((s, sec) => s + sec.items.filter(i => checked.has(i.id)).length, 0)
  const allDone    = totalDone === totalItems
  const pct        = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  return (
    <div className="space-y-4 pb-4 max-w-full overflow-x-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Filming Prep</h1>
          <p className="text-xs text-gray-500 mt-0.5">Script · Checklist · Tips</p>
        </div>
        {totalDone > 0 && (
          <button
            onClick={() => setChecked(new Set())}
            className="text-sm text-gray-400 hover:text-pink-500 transition-colors min-h-[44px] px-3 flex items-center"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Tab bar — 48px tall for comfortable touch ─────────────────── */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {([
          { key: 'script'    as Tab, label: 'Script' },
          { key: 'checklist' as Tab, label: 'Checklist', badge: totalDone > 0 ? `${pct}%` : undefined },
          { key: 'tips'      as Tab, label: 'Tips' },
        ]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-h-[44px] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                activeTab === tab.key
                  ? allDone ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SCRIPT TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'script' && (
        <div className="space-y-4">
          {loadingScript ? (
            <div className="h-20 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse" />
          ) : latestAnalysis ? (
            <>
              {/* Script card */}
              <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-violet-50 overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-pink-500 shrink-0" />
                    <p className="text-sm font-bold text-gray-900 truncate flex-1">
                      {latestAnalysis.product_name ?? latestAnalysis.category}
                    </p>
                    <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                      {timeAgo(latestAnalysis.created_at)}
                    </span>
                  </div>

                  {latestAnalysis.hook_line && (
                    <div className="rounded-xl bg-white border border-pink-100 px-4 py-3 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-1.5">
                        Hook Line — say this first
                      </p>
                      <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
                        &ldquo;{latestAnalysis.hook_line}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col min-[360px]:grid min-[360px]:grid-cols-2 gap-2">
                    <a
                      href={`/studio?bd=${latestAnalysis.id}`}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white border border-pink-200 text-pink-600 text-sm font-semibold transition-colors hover:bg-pink-50"
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      Full Script
                    </a>
                    <a
                      href={`/dashboard/studio?product=${encodeURIComponent(latestAnalysis.product_name ?? latestAnalysis.category)}`}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white border border-violet-200 text-violet-600 text-sm font-semibold transition-colors hover:bg-violet-50"
                    >
                      <Clapperboard className="h-4 w-4 shrink-0" />
                      Storyboard
                    </a>
                  </div>
                </div>
              </div>

              {/* Checklist summary shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-colors ${
                  allDone
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {allDone ? '🎬 Ready to film!' : 'Filming Checklist'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {allDone ? `All ${totalItems} checks done` : `${totalDone} of ${totalItems} completed`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {totalDone > 0 && (
                    <span className={`text-sm font-black tabular-nums ${allDone ? 'text-emerald-600' : 'text-pink-500'}`}>
                      {pct}%
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            </>
          ) : (
            /* No analysis yet */
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-12 flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                <Wand2 className="h-7 w-7 text-pink-400" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-700">No script yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Analyse a viral TikTok to get your hook and ready-to-film script
                </p>
              </div>
              <a
                href="/studio"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Wand2 className="h-4 w-4" />
                Analyse a Video
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CHECKLIST TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'checklist' && (
        <div className="space-y-3">

          {/* Overall progress */}
          <div className={`rounded-2xl px-5 py-4 border transition-colors ${
            allDone ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-800">
                {allDone ? '🎬 You\'re ready to film!' : `${totalDone} of ${totalItems} checks done`}
              </p>
              <span className={`text-lg font-black tabular-nums ${
                allDone ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-gray-400'
              }`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-pink-500 to-violet-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {allDone && latestAnalysis && (
              <a
                href={`/studio?bd=${latestAnalysis.id}`}
                className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"
              >
                <Eye className="h-4 w-4" /> View Script before filming
                <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
              </a>
            )}
          </div>

          {/* Section cards — tap to expand, progress ring always visible */}
          {SECTIONS.map(section => (
            <SectionCard key={section.id} section={section} checked={checked} onToggle={toggle} />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TIPS TAB
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tips' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-violet-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-pink-500" />
              <p className="text-sm font-bold text-gray-900">Pro Tips</p>
            </div>
            <ul className="space-y-0 divide-y divide-pink-100/60">
              {[
                { icon: Clock,   text: 'Record your first take within 60 seconds of being ready — overthinking kills energy' },
                { icon: Monitor, text: 'Watch your take with sound OFF first — check body language before audio' },
                { icon: Package, text: 'Film 3–5 takes minimum — your best take is rarely the first one' },
                { icon: Mic,     text: 'Speak 20% louder than feels natural — cameras compress volume' },
                { icon: Wind,    text: 'Shake out your hands and roll your shoulders between takes to stay loose' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3 py-3.5">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-pink-400" />
                  </div>
                  <span className="text-sm text-gray-700 leading-snug pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-5 space-y-4">
            <div>
              <p className="text-sm font-bold text-white">
                {latestAnalysis ? 'Need a fresh angle?' : 'Don\'t have a script yet?'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {latestAnalysis
                  ? 'Analyse another viral video to get a new hook and script.'
                  : 'Analyse a viral TikTok first — get a hook, arc, and ready-to-film script.'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href="/studio"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Wand2 className="h-4 w-4" />
                {latestAnalysis ? 'New Analysis' : 'Open Viral Studio'}
              </a>
              {latestAnalysis && (
                <a
                  href={`/studio?bd=${latestAnalysis.id}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Current Script
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
