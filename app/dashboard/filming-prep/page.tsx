'use client'

import { useState, useEffect } from 'react'
import {
  Camera, Lightbulb, Mic, Wind, Brain, CheckCircle2, Circle,
  ChevronDown, Wand2, ArrowRight, Zap, Package, Monitor,
  Clapperboard, Eye, Clock,
} from 'lucide-react'
import type { AnalysisItem } from '@/app/api/studio/analyses/route'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CheckItem {
  id:   string
  text: string
  tip?: string
}

interface Section {
  id:       string
  icon:     React.ElementType
  color:    string
  bg:       string
  border:   string
  title:    string
  subtitle: string
  items:    CheckItem[]
}

// ── Checklist data ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id:       'environment',
    icon:     Lightbulb,
    color:    'text-amber-500',
    bg:       'bg-amber-50',
    border:   'border-amber-100',
    title:    'Environment',
    subtitle: 'Set the scene before you hit record',
    items: [
      { id: 'e1', text: 'Lighting set up — window light or ring light, no harsh shadows',      tip: 'Position light at 45° to your face, not directly behind you' },
      { id: 'e2', text: 'Background clean — no clutter, no distracting movement',              tip: 'A plain wall, shelf, or branded backdrop all work well' },
      { id: 'e3', text: 'Room quiet — phone silent, fans off, doors closed, pets secured',      tip: 'Record a 5-second silent clip first to check for background hum' },
      { id: 'e4', text: 'No echo — soft furnishings absorb sound (carpet, curtains, cushions)', tip: 'Hard rooms echo. Hang a blanket behind camera if needed' },
      { id: 'e5', text: 'Temperature comfortable — won\'t need to adjust clothing mid-take',   tip: 'Cold or sweating shows on camera' },
      { id: 'e6', text: 'Notifications off — Do Not Disturb on all devices in the room',       tip: 'A banner on screen is an instant retake trigger' },
    ],
  },
  {
    id:       'equipment',
    icon:     Camera,
    color:    'text-blue-500',
    bg:       'bg-blue-50',
    border:   'border-blue-100',
    title:    'Equipment & Tools',
    subtitle: 'Everything you need before pressing record',
    items: [
      { id: 'q1', text: 'Battery above 50% and enough storage space',                           tip: 'Nothing worse than stopping mid-take for a low battery warning' },
      { id: 'q2', text: 'Camera lens clean — wipe with a microfibre cloth',                     tip: 'Fingerprints cause hazy footage even in good lighting' },
      { id: 'q3', text: 'Camera stable — tripod, ring light stand, or propped securely',        tip: 'Shaky footage loses viewers in the first 2 seconds' },
      { id: 'q4', text: 'Microphone ready — lavalier clipped or phone mic tested',              tip: 'Audio quality matters more than video quality on TikTok' },
      { id: 'q5', text: 'Product/props clean, charged, and within arm\'s reach',               tip: 'Set out everything before you start — don\'t improvise mid-shoot' },
      { id: 'q6', text: 'B-roll shots planned — close-ups, detail shots, demo angles',          tip: 'Plan at least 3 cutaway angles to cover edits' },
      { id: 'q7', text: 'Script visible if needed — cue card or phone near camera',             tip: 'Looking slightly off-lens for cue reads better than looking down' },
      { id: 'q8', text: 'Frame checked — face in upper third, 9:16 ratio set',                 tip: 'Leave space at top/bottom for TikTok captions and UI overlays' },
    ],
  },
  {
    id:       'mental',
    icon:     Brain,
    color:    'text-violet-500',
    bg:       'bg-violet-50',
    border:   'border-violet-100',
    title:    'Mental Prep',
    subtitle: 'Mindset, energy, and delivery confidence',
    items: [
      { id: 'm1', text: 'Hook line memorised — say it naturally, not read it',                  tip: 'Practice the hook 5 times before recording. First 2 seconds are everything' },
      { id: 'm2', text: 'Key message clear — know the ONE thing viewers must take away',        tip: 'If you can\'t say it in one sentence, you\'re not ready to film' },
      { id: 'm3', text: 'Energy level high — moved, stretched, or had water',                   tip: 'Do 10 jumping jacks if needed. Energy is contagious' },
      { id: 'm4', text: 'Delivery speed planned — slightly faster than normal conversation',     tip: 'Slow delivery loses viewers. Energetic but clear, not rushed' },
      { id: 'm5', text: 'At least one practice run out loud (not just in your head)',            tip: 'Saying it aloud exposes stumbles. Fix them before camera is on' },
      { id: 'm6', text: 'Mindset ready — mistakes are expected, retakes are normal',            tip: 'Top creators do 10–20 takes. Perfectionism kills momentum' },
    ],
  },
]

// ── Script reference panel ──────────────────────────────────────────────────────

function ScriptReference({ analysis }: { analysis: AnalysisItem }) {
  const [open, setOpen] = useState(true)
  const title = analysis.product_name ?? analysis.category

  return (
    <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-violet-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
          <Zap className="h-4 w-4 text-pink-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">Script: {title}</p>
          <p className="text-[11px] text-pink-500 mt-0.5">Tap to review your hook & lines before filming</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5 space-y-3">
          {analysis.hook_line && (
            <div className="rounded-xl bg-white border border-pink-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Hook Line — say this first
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                &ldquo;{analysis.hook_line}&rdquo;
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`/studio?bd=${analysis.id}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 text-xs font-semibold transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Full Script
            </a>
            <a
              href={`/dashboard/studio?product=${encodeURIComponent(analysis.product_name ?? analysis.category)}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 text-xs font-semibold transition-colors"
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Storyboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Progress ring ──────────────────────────────────────────────────────────────

function ProgressRing({ done, total, hex }: { done: number; total: number; hex: string }) {
  const r    = 18
  const circ = 2 * Math.PI * r
  const pct  = total > 0 ? done / total : 0
  return (
    <svg width="44" height="44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={pct === 1 ? '#10b981' : hex}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        className="transition-all duration-500"
      />
      <text x="22" y="27" textAnchor="middle" fontSize="11" fontWeight="700"
        fill={pct === 1 ? '#10b981' : '#374151'}>
        {done}/{total}
      </text>
    </svg>
  )
}

// ── Section card ───────────────────────────────────────────────────────────────

const HEX: Record<string, string> = {
  'text-amber-500':  '#f59e0b',
  'text-blue-500':   '#3b82f6',
  'text-violet-500': '#8b5cf6',
}

function SectionCard({ section, checked, onToggle }: {
  section:  Section
  checked:  Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const done    = section.items.filter(i => checked.has(i.id)).length
  const total   = section.items.length
  const allDone = done === total

  return (
    <div className={`rounded-2xl border transition-colors ${allDone ? 'border-emerald-200 bg-emerald-50/40' : `${section.border} bg-white`}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className={`h-9 w-9 rounded-xl ${allDone ? 'bg-emerald-100' : section.bg} flex items-center justify-center shrink-0`}>
          <section.icon className={`w-4 h-4 ${allDone ? 'text-emerald-600' : section.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{section.title}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {allDone ? '✅ All set!' : section.subtitle}
          </p>
        </div>
        <ProgressRing done={done} total={total} hex={HEX[section.color] ?? '#6b7280'} />
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ml-1 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-3">
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-pink-400 to-violet-400'}`}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
        <ul className="px-5 pb-5 space-y-3">
          {section.items.map(item => {
            const ticked = checked.has(item.id)
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onToggle(item.id)} className="flex items-start gap-3 w-full text-left group">
                  {ticked
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                  }
                  <div className="flex-1">
                    <span className={`text-sm leading-snug transition-colors ${ticked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                    {item.tip && !ticked && (
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug italic">
                        💡 {item.tip}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'script' | 'checklist' | 'tips'

export default function FilmingPrepPage() {
  const [checked,        setChecked]        = useState<Set<string>>(new Set())
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisItem | null>(null)
  const [loadingScript,  setLoadingScript]  = useState(true)
  const [activeTab,      setActiveTab]      = useState<Tab>('checklist')

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/studio/analyses')
        if (!res.ok) { setLoadingScript(false); return }
        const data = await res.json()
        const items: AnalysisItem[] = data.items ?? []
        setLatestAnalysis(items[0] ?? null)
      } catch {
        // network error — page works without script reference
      } finally {
        setLoadingScript(false)
      }
    })()
  }, [])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const totalDone  = SECTIONS.reduce((s, sec) => s + sec.items.filter(i => checked.has(i.id)).length, 0)
  const allDone    = totalDone === totalItems
  const pct        = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  const TABS: { key: Tab; label: string; badge?: string }[] = [
    { key: 'script',    label: 'Script' },
    { key: 'checklist', label: 'Checklist', badge: totalDone > 0 ? `${pct}%` : undefined },
    { key: 'tips',      label: 'Tips' },
  ]

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Filming Prep</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Run through this before every shoot
          </p>
        </div>
        {totalDone > 0 && (
          <button
            onClick={() => setChecked(new Set())}
            className="text-xs text-gray-400 hover:text-pink-500 transition-colors shrink-0 mt-1"
          >
            Reset
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full leading-none ${
                activeTab === tab.key
                  ? (allDone ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600')
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Script tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'script' && (
        <div className="space-y-4">
          {loadingScript ? (
            <div className="h-16 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse" />
          ) : latestAnalysis ? (
            <ScriptReference analysis={latestAnalysis} />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 flex flex-col items-center text-center gap-4">
              <Wand2 className="h-10 w-10 text-gray-300" />
              <div>
                <p className="text-sm font-semibold text-gray-600">No script yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Analyse a TikTok video first to get your hook and script
                </p>
              </div>
              <a
                href="/studio"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Wand2 className="h-4 w-4" />
                Open Viral Studio
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Checklist progress summary if items checked */}
          {totalDone > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl border text-left transition-colors ${
                allDone ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
              }`}
            >
              <p className="text-sm font-semibold text-gray-800">
                {allDone ? '🎬 Ready to film!' : `Checklist: ${totalDone} / ${totalItems} done`}
              </p>
              <span className="text-xs font-bold text-pink-500">
                {allDone ? 'Review →' : 'Continue →'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Checklist tab ──────────────────────────────────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">

          {/* Overall progress */}
          <div className={`rounded-2xl px-5 py-4 border transition-colors ${allDone ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">
                {allDone ? '🎬 You\'re ready to film!' : `${totalDone} of ${totalItems} items checked`}
              </p>
              <span className={`text-sm font-black tabular-nums ${allDone ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-gray-400'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-pink-500 to-violet-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {allDone && latestAnalysis && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-xs text-emerald-600 font-medium flex-1">
                  All done — open your script, then hit record.
                </p>
                <a
                  href={`/studio?bd=${latestAnalysis.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> View Script
                </a>
              </div>
            )}
            {allDone && !latestAnalysis && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                All {totalItems} checks done — hit record! 🚀
              </p>
            )}
          </div>

          {/* Section checklists — collapsed by default */}
          {SECTIONS.map(section => (
            <SectionCard key={section.id} section={section} checked={checked} onToggle={toggle} />
          ))}
        </div>
      )}

      {/* ── Tips tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'tips' && (
        <div className="space-y-4">

          {/* Pro Tips */}
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-violet-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-pink-500" />
              <p className="text-sm font-bold text-gray-900">Pro Tips</p>
            </div>
            <ul className="space-y-3">
              {[
                { icon: Clock,   text: 'Record your first take within 60 seconds of being ready — overthinking kills energy' },
                { icon: Monitor, text: 'Watch back your take with sound OFF first — check body language before audio' },
                { icon: Package, text: 'Film 3–5 takes minimum. Your best take is rarely the first one' },
                { icon: Mic,     text: 'Speak 20% louder than feels natural — cameras compress volume' },
                { icon: Wind,    text: 'Shake out your hands and roll your shoulders between takes to stay loose' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-pink-400" />
                  </div>
                  <span className="text-sm text-gray-600 leading-snug pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-5">
            {latestAnalysis ? (
              <>
                <p className="text-sm font-bold text-white mb-0.5">Need a new angle?</p>
                <p className="text-xs text-gray-400 mb-4">
                  Analyse another viral video to get a fresh hook for your next shoot.
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href="/studio"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Wand2 className="h-4 w-4" />
                    New Analysis
                  </a>
                  <a
                    href={`/studio?bd=${latestAnalysis.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Current Script
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-white mb-0.5">Don&apos;t have a script yet?</p>
                <p className="text-xs text-gray-400 mb-4">
                  Analyse a viral TikTok first — you&apos;ll get a hook, emotion arc, and ready-to-film script.
                </p>
                <a
                  href="/studio"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity w-full"
                >
                  <Wand2 className="h-4 w-4" />
                  Open Viral Studio
                  <ArrowRight className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
