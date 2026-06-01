'use client'

import { useState } from 'react'
import { ChevronDown, Camera, CheckCircle2, Circle, Zap } from 'lucide-react'

interface FilmingPrepCardProps {
  hookLine?:    string | null   // generated hook line from the script
  productName?: string | null   // product name the user confirmed
  scriptLines?: string[]        // key SAY lines from the script (first 3)
}

export function FilmingPrepCard({ hookLine, productName, scriptLines = [] }: FilmingPrepCardProps) {
  const [open,    setOpen]    = useState(true)   // auto-open so users don't miss it
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // Build script-aware checklist items
  const CHECKLIST = [
    {
      id: 'hook',
      label: hookLine
        ? `Hook line memorised — open with: "${hookLine.length > 70 ? hookLine.slice(0, 70) + '…' : hookLine}"`
        : 'Hook line ready — first 2 seconds planned',
    },
    {
      id: 'product',
      label: productName
        ? `Can say "${productName}" clearly and confidently`
        : 'Product name pronounced clearly and confidently',
    },
    {
      id: 'script',
      label: scriptLines.length > 0
        ? `Script reviewed — ${scriptLines.length} key lines to deliver`
        : 'Script memorised (or use as on-screen cue card)',
    },
    { id: 'light',  label: 'Lighting set — natural light or ring light, no harsh shadows' },
    { id: 'frame',  label: 'Framing checked — subject centred, clean background' },
    { id: 'audio',  label: 'Quiet environment — test-record 5 seconds before starting' },
    { id: 'b-roll', label: 'B-roll or product shot ready for cutaways' },
  ]

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const done    = checked.size
  const total   = CHECKLIST.length
  const allDone = done === total

  return (
    <div className={`rounded-2xl border transition-colors ${allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>

      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${allDone ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Camera className={`w-4 h-4 ${allDone ? 'text-emerald-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Pre-shoot Checklist</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {allDone ? '🎬 All set — time to film!' : `${done} / ${total} ready`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Animated body — progress + checklist */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {/* Progress bar */}
        <div className="px-5 pt-1 pb-3">
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-pink-400'}`}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Script quick-reference (only when data available) */}
        {(hookLine || (scriptLines.length > 0)) && (
          <div className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Script Reference
            </p>
            {hookLine && (
              <p className="text-xs text-gray-700 font-medium leading-snug mb-1.5">
                <span className="text-pink-500 font-bold">HOOK:</span> {hookLine}
              </p>
            )}
            {scriptLines.slice(0, 2).map((line, i) => (
              <p key={i} className="text-xs text-gray-500 leading-snug mt-1">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Checklist items */}
        <ul className="px-5 pb-5 space-y-3">
          {CHECKLIST.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="flex items-start gap-3 w-full text-left group"
              >
                {checked.has(item.id)
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  : <Circle       className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                }
                <span className={`text-sm transition-colors leading-snug ${checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
