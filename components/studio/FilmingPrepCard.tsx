'use client'

import { useState } from 'react'
import { ChevronDown, Camera, CheckCircle2, Circle } from 'lucide-react'

const CHECKLIST = [
  { id: 'script',   label: 'Script memorized (or printed as cue card)' },
  { id: 'light',    label: 'Natural light or ring light — no harsh shadows' },
  { id: 'frame',    label: 'Framing checked: subject centered, clean background' },
  { id: 'audio',    label: 'Quiet environment — test record 5 seconds' },
  { id: 'hook',     label: 'Hook line ready — first 2 seconds planned' },
  { id: 'b-roll',   label: 'B-roll or product shot prepared for cutaways' },
]

export function FilmingPrepCard() {
  const [open,    setOpen]    = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const done = checked.size
  const total = CHECKLIST.length
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
              {allDone ? 'All set — time to film!' : `${done} / ${total} ready`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Checklist items + progress bar — both inside the animated div so neither shows when collapsed */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
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
                  : <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                }
                <span className={`text-sm transition-colors ${checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
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
