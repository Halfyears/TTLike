'use client'

import { useState } from 'react'
import { FileText, Copy, Check } from 'lucide-react'
import type { ScriptLayer } from '@/lib/utils/result-transform'

interface ScriptLayerCardProps {
  script: ScriptLayer
}

export function ScriptLayerCard({ script }: ScriptLayerCardProps) {
  const [copied, setCopied] = useState(false)

  function buildPlainText() {
    return script.lines.map(l =>
      `[${l.time_range}] ${l.beat}\nSAY: ${l.say}\nDO: ${l.do}\nFEEL: ${l.emotion}`
    ).join('\n\n')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildPlainText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Script</h2>
          {script.total_duration && (
            <span className="text-xs text-gray-400 font-mono">{script.total_duration}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy all</>}
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {script.lines.map((line, i) => (
          <div key={i} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-gray-400">{line.time_range}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                {line.beat}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                {line.emotion}
              </span>
            </div>

            <div className="grid gap-2">
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase w-8 shrink-0 pt-0.5">SAY</span>
                <p className="text-sm text-gray-900 font-medium leading-relaxed">{line.say}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase w-8 shrink-0 pt-0.5">DO</span>
                <p className="text-sm text-gray-600 leading-relaxed">{line.do}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
