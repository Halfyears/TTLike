'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

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

export function ScriptCard({ script, index }: ScriptCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(script.fullScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-200 mb-2">Hook (0–3s)</p>
        <p className="text-lg sm:text-xl font-bold text-white leading-snug">&ldquo;{script.hook}&rdquo;</p>
      </div>

      {/* Body */}
      <div className="mx-4 sm:mx-6 mb-3 rounded-xl bg-gray-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Body (3–25s)</p>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{script.body}</p>
      </div>

      {/* CTA */}
      <div className="mx-4 sm:mx-6 mb-4 rounded-xl bg-green-50 border border-green-100 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-2">CTA (25–30s)</p>
        <p className="text-sm font-medium text-green-800">{script.cta}</p>
      </div>

      {/* Full script */}
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

      {/* Copy button */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5 mt-auto">
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <><Check className="h-4 w-4 text-green-500" /> Copied!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copy Full Script</>
          )}
        </button>
      </div>
    </div>
  )
}
