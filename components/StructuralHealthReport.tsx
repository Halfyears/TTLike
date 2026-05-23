'use client'

/**
 * StructuralHealthReport — V2.5 Premium Deep Audit Component
 *
 * Displays 4-section forensic audit of a viral TikTok video:
 *   §1 Hook Retention Mechanics
 *   §2 Trust Transference Blueprint
 *   §3 Structural Leak Detection
 *   §4 Zero-Cost Counter-Attack Manual
 *
 * V2.6: Readable font sizes (text-sm base), prominent copy buttons,
 *       copy-all counter-attack action for CapCut/notes.
 */

import { useState } from 'react'
import { Loader2, ShieldAlert, ShieldCheck, Zap, AlertTriangle, Target, Wrench, Copy, Check } from 'lucide-react'
import type { StructuralHealthReport as ReportType } from '@/lib/types/intelligence'

interface Props {
  videoId: string
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-300 font-bold',
  HIGH:     'bg-orange-100 text-orange-700 border border-orange-200 font-bold',
  MEDIUM:   'bg-yellow-100 text-yellow-700 border border-yellow-200 font-semibold',
}

const SEVERITY_ICONS: Record<string, string> = {
  CRITICAL: '🛑',
  HIGH:     '⚠️',
  MEDIUM:   '🟡',
}

// ── Copy hook ─────────────────────────────────────────────────────────────────

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

// ── Format counter-attack for clipboard ──────────────────────────────────────

function formatCounterAttack(report: ReportType): string {
  const lines = [
    `=== TTLike™ Counter-Attack Manual ===`,
    `${report.counter_attack.title}`,
    '',
    ...report.counter_attack.fixes.map((fix, i) =>
      `${i + 1}. ${fix.action}\n   ${fix.detail}`
    ),
    '',
    `💡 PRODUCTION TIP: ${report.counter_attack.production_tip}`,
  ]
  return lines.join('\n')
}

export function StructuralHealthReport({ videoId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [report, setReport] = useState<ReportType | null>(null)
  const [errMsg, setErr]    = useState('')
  const { copied, copy }   = useCopy()

  async function generate() {
    setState('loading')
    try {
      const res  = await fetch('/api/analyze/health-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ video_id: videoId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setReport(json.report as ReportType)
      setState('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Report generation failed')
      setState('error')
    }
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="border-2 border-dashed border-red-200 rounded-xl p-5 text-center bg-red-50/30">
        <div className="text-2xl mb-2">🔬</div>
        <h3 className="text-sm font-black text-slate-800 mb-1 font-mono">AI Structural Health Report</h3>
        <p className="text-xs text-slate-500 mb-1 max-w-xs mx-auto leading-relaxed">
          深度审计：算法留存机制 · 信任降噪策略 · 结构致命漏洞 · 零成本截胡方案
        </p>
        <p className="text-xs text-slate-400 mb-4 font-mono">
          Hook Retention · Trust Blueprint · Leak Detection · Counter-Attack
        </p>
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-wide"
        >
          <ShieldAlert className="h-4 w-4" />
          Generate Structural Health Report
        </button>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="border border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50/50 font-mono">
        <Loader2 className="h-6 w-6 animate-spin text-red-400" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-600">Running Forensic Audit…</p>
          <p className="text-xs mt-0.5">Hook mechanics · Trust blueprint · Leak detection · Counter-attack</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-2 font-mono">
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-700">Report generation failed</p>
          <p className="text-xs text-red-500 mt-0.5">{errMsg}</p>
          <button onClick={generate} className="mt-2 text-xs text-red-600 underline hover:no-underline">Retry</button>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (!report) return null

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-sm">

      {/* ── Audit Header ── */}
      <div className="bg-gradient-to-r from-red-900 to-slate-900 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-red-300">
            🔬 TTLike™ Forensic Audit Engine
          </div>
          <p className="text-sm font-black text-white mt-0.5">AI Structural Health Report</p>
        </div>
        <button
          onClick={() => setState('idle')}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Regenerate
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── §1 Hook Retention Mechanics ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-3 py-2 flex items-center gap-2 border-b border-blue-100">
            <Target className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-700">
              §1 — {report.hook_retention.title}
            </span>
            <span className="ml-auto text-xs font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded shrink-0">
              {report.hook_retention.timecode}
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 uppercase tracking-wide shrink-0">Technique:</span>
              <span className="text-xs font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {report.hook_retention.technique}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{report.hook_retention.detail}</p>
            <div className="bg-slate-900 text-green-400 rounded px-3 py-2 text-xs leading-relaxed flex items-start justify-between gap-2">
              <span>
                <span className="text-slate-400">▶ ALGO IMPACT: </span>
                {report.hook_retention.algorithm_impact}
              </span>
              <button
                onClick={() => copy(report.hook_retention.algorithm_impact, 'algo-impact')}
                className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  copied === 'algo-impact'
                    ? 'bg-green-700 text-green-200'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {copied === 'algo-impact' ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── §2 Trust Transference Blueprint ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-violet-50 px-3 py-2 flex items-center gap-2 border-b border-violet-100">
            <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-violet-700">
              §2 — {report.trust_transference.title}
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase tracking-wide shrink-0">Visual:</span>
                <span className="text-xs font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                  {report.trust_transference.visual_technique}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 uppercase tracking-wide shrink-0">Psychology:</span>
                <span className="text-xs font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                  {report.trust_transference.psychological_mechanism}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{report.trust_transference.detail}</p>
          </div>
        </div>

        {/* ── §3 Structural Leak Detection ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-3 py-2 flex items-center gap-2 border-b border-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-red-700">
              §3 — Structural Leak Detection
            </span>
            <span className="ml-auto text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded shrink-0">
              {report.structural_leaks.length} leak{report.structural_leaks.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {report.structural_leaks.map((leak, idx) => (
              <div key={idx} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_STYLES[leak.severity] ?? SEVERITY_STYLES.MEDIUM}`}>
                    {SEVERITY_ICONS[leak.severity] ?? '🟡'} {leak.severity}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    @{leak.timecode}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{leak.issue}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pl-1">{leak.detail}</p>
                <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border-l-2 border-red-400">
                  Estimated Impact: {leak.estimated_loss}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── §4 Zero-Cost Counter-Attack Manual ── */}
        <div className="border-2 border-emerald-300 rounded-lg overflow-hidden">
          <div className="bg-emerald-600 px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-white shrink-0" />
              <span className="text-xs font-black uppercase tracking-widest text-white">
                §4 — {report.counter_attack.title}
              </span>
            </div>
            <button
              onClick={() => copy(formatCounterAttack(report), 'counter-attack')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied === 'counter-attack'
                  ? 'bg-green-400 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {copied === 'counter-attack'
                ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                : <><Copy className="h-3.5 w-3.5" /> Copy Plan</>
              }
            </button>
          </div>
          <div className="p-3 space-y-2.5 bg-emerald-50/30">
            <div className="space-y-2">
              {report.counter_attack.fixes.map((fix, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-black mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-sm font-bold text-emerald-800">{fix.action}: </span>
                    <span className="text-sm text-slate-700 leading-relaxed">{fix.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <Wrench className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Production Tip: </span>
                <span className="text-sm text-slate-700 leading-relaxed">{report.counter_attack.production_tip}</span>
              </div>
            </div>

            {/* Full copy button */}
            <button
              onClick={() => copy(formatCounterAttack(report), 'counter-full')}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                copied === 'counter-full'
                  ? 'bg-green-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {copied === 'counter-full'
                ? <><Check className="h-4 w-4" /> Counter-Attack Plan Copied!</>
                : <><Copy className="h-4 w-4" /> Copy Full Counter-Attack Plan</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
