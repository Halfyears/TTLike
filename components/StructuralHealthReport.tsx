'use client'

/**
 * StructuralHealthReport — V2.5 Premium Deep Audit Component
 *
 * Displays 4-section forensic audit of a viral TikTok video:
 *   §1 Hook Retention Mechanics (前3秒算法留存深度审计)
 *   §2 Trust Transference Blueprint (信任转移与降噪机制)
 *   §3 Structural Leak Detection (爆款结构致命漏洞审计)
 *   §4 Zero-Cost Counter-Attack Manual (零成本截胡爆单手册)
 *
 * Rendered on-demand after user clicks "Generate Report".
 * Results are cached server-side — never re-billed for same video.
 */

import { useState } from 'react'
import { Loader2, ShieldAlert, ShieldCheck, Zap, AlertTriangle, Target, Wrench } from 'lucide-react'
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

export function StructuralHealthReport({ videoId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [report, setReport] = useState<ReportType | null>(null)
  const [errMsg, setErr]    = useState('')

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
        <div className="text-xl mb-2">🔬</div>
        <h3 className="text-xs font-black text-slate-800 mb-1 font-mono">AI Structural Health Report</h3>
        <p className="text-[11px] text-slate-500 mb-1 max-w-xs mx-auto leading-relaxed">
          深度审计：算法留存机制 · 信任降噪策略 · 结构致命漏洞 · 零成本截胡方案
        </p>
        <p className="text-[10px] text-slate-400 mb-4 font-mono">
          Hook Retention · Trust Blueprint · Leak Detection · Counter-Attack
        </p>
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wide"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
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
          <p className="text-xs font-bold text-slate-600">Running Forensic Audit…</p>
          <p className="text-[10px] mt-0.5">Hook mechanics · Trust blueprint · Leak detection · Counter-attack</p>
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
          <p className="text-xs font-medium text-red-700">Report generation failed</p>
          <p className="text-[10px] text-red-500 mt-0.5">{errMsg}</p>
          <button onClick={generate} className="mt-2 text-[10px] text-red-600 underline hover:no-underline">Retry</button>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (!report) return null

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden font-mono bg-white text-[11px]">

      {/* ── Audit Header ── */}
      <div className="bg-gradient-to-r from-red-900 to-slate-900 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-red-300">
            🔬 TTLike™ Forensic Audit Engine
          </div>
          <p className="text-xs font-black text-white mt-0.5">AI Structural Health Report</p>
        </div>
        <button
          onClick={() => setState('idle')}
          className="text-[9px] text-slate-400 hover:text-white transition-colors"
        >
          Regenerate
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── §1 Hook Retention Mechanics ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-3 py-2 flex items-center gap-2 border-b border-blue-100">
            <Target className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">
              §1 — {report.hook_retention.title}
            </span>
            <span className="ml-auto text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded shrink-0">
              {report.hook_retention.timecode}
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-slate-400 uppercase tracking-wide shrink-0">Technique:</span>
              <span className="text-[10px] font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {report.hook_retention.technique}
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">{report.hook_retention.detail}</p>
            <div className="bg-slate-900 text-green-400 rounded px-3 py-2 text-[10px] leading-relaxed">
              <span className="text-slate-400">▶ ALGO IMPACT: </span>
              {report.hook_retention.algorithm_impact}
            </div>
          </div>
        </div>

        {/* ── §2 Trust Transference Blueprint ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-violet-50 px-3 py-2 flex items-center gap-2 border-b border-violet-100">
            <ShieldCheck className="h-3.5 w-3.5 text-violet-600 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">
              §2 — {report.trust_transference.title}
            </span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide shrink-0">Visual:</span>
                <span className="text-[10px] font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                  {report.trust_transference.visual_technique}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide shrink-0">Psychology:</span>
                <span className="text-[10px] font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                  {report.trust_transference.psychological_mechanism}
                </span>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">{report.trust_transference.detail}</p>
          </div>
        </div>

        {/* ── §3 Structural Leak Detection ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-3 py-2 flex items-center gap-2 border-b border-red-100">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-red-700">
              §3 — Structural Leak Detection
            </span>
            <span className="ml-auto text-[9px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded shrink-0">
              {report.structural_leaks.length} leak{report.structural_leaks.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {report.structural_leaks.map((leak, idx) => (
              <div key={idx} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] px-2 py-0.5 rounded ${SEVERITY_STYLES[leak.severity] ?? SEVERITY_STYLES.MEDIUM}`}>
                    {SEVERITY_ICONS[leak.severity] ?? '🟡'} {leak.severity}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    @{leak.timecode}
                  </span>
                  <span className="font-bold text-slate-800">{leak.issue}</span>
                </div>
                <p className="text-slate-600 leading-relaxed pl-1">{leak.detail}</p>
                <div className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border-l-2 border-red-400">
                  Estimated Impact: {leak.estimated_loss}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── §4 Zero-Cost Counter-Attack Manual ── */}
        <div className="border-2 border-emerald-300 rounded-lg overflow-hidden">
          <div className="bg-emerald-600 px-3 py-2 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-white shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              §4 — {report.counter_attack.title}
            </span>
          </div>
          <div className="p-3 space-y-2.5 bg-emerald-50/30">
            <div className="space-y-2">
              {report.counter_attack.fixes.map((fix, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-black mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-emerald-800">{fix.action}: </span>
                    <span className="text-slate-700 leading-relaxed">{fix.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <Wrench className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Production Tip: </span>
                <span className="text-slate-700 leading-relaxed">{report.counter_attack.production_tip}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
