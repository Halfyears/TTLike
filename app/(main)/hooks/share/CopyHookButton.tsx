'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyHookButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md
        bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200
        transition-colors border border-slate-600/50"
      aria-label="Copy hook text"
    >
      {copied
        ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
        : <><Copy className="h-3 w-3" />Copy</>
      }
    </button>
  )
}
