'use client'

import { useState } from 'react'
import { Copy, Check, Zap, Video, Target } from 'lucide-react'

interface Script {
  title: string
  hook: string
  body: string
  cta: string
  fullScript: string
}

interface ScriptCardProps {
  script: Script
  index: number
}

const ACCENT_COLORS = [
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-pink-500',
  'from-blue-500 to-violet-500',
  'from-emerald-500 to-teal-500',
]

export function ScriptCard({ script, index }: ScriptCardProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]

  async function handleCopy() {
    await navigator.clipboard.writeText(script.fullScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 bg-white border border-gray-100">
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${accent} flex-shrink-0`} />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className={`flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br ${accent} text-white text-sm font-black flex items-center justify-center shadow`}>
          {index + 1}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{script.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Script #{index + 1} · 30 seconds</p>
        </div>
      </div>

      {/* ── HOOK — the hero ── */}
      <div className="mx-4 mb-3 rounded-2xl bg-gray-950 p-5 relative overflow-hidden">
        {/* decorative glow */}
        <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="h-3 w-3 text-pink-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">
              Hook · 0–3s
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white leading-tight">
            &ldquo;{script.hook}&rdquo;
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-4 mb-3 rounded-xl bg-gray-50 border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Video className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
            Body · 3–25s
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{script.body}</p>
      </div>

      {/* CTA */}
      <div className="mx-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            Call to Action · 25–30s
          </span>
        </div>
        <p className="text-sm font-semibold text-emerald-800 leading-relaxed">{script.cta}</p>
      </div>

      {/* Full script collapsible */}
      <div className="mx-4 mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          <span>Full script</span>
          <span className="text-gray-300">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100">
            {script.fullScript}
          </pre>
        )}
      </div>

      {/* Copy button — push to bottom */}
      <div className="px-4 pb-5 mt-auto">
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
            copied
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
              : `bg-gradient-to-r ${accent} text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-100`
          }`}
        >
          {copied ? (
            <><Check className="h-4 w-4" /> Copied to clipboard!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copy Full Script</>
          )}
        </button>
      </div>
    </div>
  )
}
