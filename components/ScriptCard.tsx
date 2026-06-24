'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Film } from 'lucide-react'

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
  brandName?: string
  offer?: string
}

/** Highlight occurrences of `terms` inside `text` with a yellow mark */
function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  const active = terms.filter(t => t.trim().length > 0)
  if (active.length === 0) return <>{text}</>

  // Build a regex that matches any of the terms (case-insensitive)
  const escaped = active.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'i')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

/** Format fullScript into a CapCut-friendly paste-ready string */
function formatForCapCut(script: Script, index: number): string {
  return [
    `=== TTLike Script #${index + 1}: ${script.title} ===`,
    `Paste into CapCut Script Mode`,
    '',
    `[0s–3s] HOOK`,
    `🎤 "${script.hook}"`,
    '',
    `[3s–25s] BODY`,
    script.body,
    '',
    `[25s–30s] CTA`,
    `🎤 "${script.cta}"`,
    '',
    '--- Full Script ---',
    script.fullScript,
  ].join('\n')
}

export function ScriptCard({ script, index, brandName = '', offer = '' }: ScriptCardProps) {
  const [copied,       setCopied]       = useState(false)
  const [copiedCapCut, setCopiedCapCut] = useState(false)
  const highlightTerms = [brandName, offer].filter(Boolean)
  const copiedTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedCapCutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    if (copiedCapCutTimerRef.current) clearTimeout(copiedCapCutTimerRef.current)
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(script.fullScript).then(() => {
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyCapCut() {
    navigator.clipboard.writeText(formatForCapCut(script, index)).then(() => {
      setCopiedCapCut(true)
      if (copiedCapCutTimerRef.current) clearTimeout(copiedCapCutTimerRef.current)
      copiedCapCutTimerRef.current = setTimeout(() => setCopiedCapCut(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-3">
        <span className="flex-shrink-0 h-7 w-7 rounded-full bg-pink-100 text-pink-600 text-sm font-black flex items-center justify-center">
          {index + 1}
        </span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">{script.title}</h3>
      </div>

      {/* Hook — most prominent */}
      <div className="mx-4 sm:mx-6 mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pink-200 mb-2">Hook (0–3s)</p>
        <p className="text-lg sm:text-xl font-bold text-white leading-snug">
          &ldquo;<HighlightedText text={script.hook} terms={highlightTerms} />&rdquo;
        </p>
      </div>

      {/* Body */}
      <div className="mx-4 sm:mx-6 mb-3 rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Body (3–25s)</p>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          <HighlightedText text={script.body} terms={highlightTerms} />
        </p>
      </div>

      {/* CTA */}
      <div className="mx-4 sm:mx-6 mb-4 rounded-xl bg-green-50 border border-green-100 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-2">CTA (25–30s)</p>
        <p className="text-sm font-medium text-green-800">
          <HighlightedText text={script.cta} terms={highlightTerms} />
        </p>
      </div>

      {/* Full script expandable */}
      <div className="mx-4 sm:mx-6 mb-4">
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors select-none">
            Full script ▾
          </summary>
          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 leading-relaxed">
            {script.fullScript}
          </pre>
        </details>
      </div>

      {/* Copy buttons */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5 mt-auto flex flex-col gap-2">
        {/* Primary: Copy Full Script */}
        <button
          onClick={handleCopy}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-slate-900 hover:bg-slate-700 text-white'
          }`}
        >
          {copied ? (
            <><Check className="h-4 w-4" /> Copied!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copy Full Script</>
          )}
        </button>

        {/* Secondary: Copy for CapCut */}
        <button
          onClick={handleCopyCapCut}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
            copiedCapCut
              ? 'bg-green-500 text-white'
              : 'bg-black hover:bg-gray-800 text-white'
          }`}
        >
          {copiedCapCut ? (
            <><Check className="h-4 w-4" /> Copied for CapCut!</>
          ) : (
            <><Film className="h-4 w-4" /> Copy for CapCut</>
          )}
        </button>
      </div>
    </div>
  )
}
