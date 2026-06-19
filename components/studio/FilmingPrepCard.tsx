'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronDown, Camera, CheckCircle2, Circle, Zap, Copy, Download, Rocket } from 'lucide-react'

interface FilmingPrepCardProps {
  hookLine?:    string | null   // generated hook line from the script
  productName?: string | null   // product name the user confirmed
  scriptLines?: string[]        // key SAY lines from the script (first 3)
  scriptText?:  string | null   // full plain-text script for Copy Script export
}

// ── Static checklist items (IDs only — labels built with data below) ──────────
const STATIC_ITEMS = [
  { id: 'light',  label: 'Lighting set — natural light or ring light, no harsh shadows' },
  { id: 'frame',  label: 'Framing checked — subject centred, clean background' },
  { id: 'audio',  label: 'Quiet environment — test-record 5 seconds before starting' },
  { id: 'b-roll', label: 'B-roll or product shot ready for cutaways' },
] as const

export function FilmingPrepCard({ hookLine, productName, scriptLines = [], scriptText }: FilmingPrepCardProps) {
  const [open,    setOpen]    = useState(true)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copiedScript,    setCopiedScript]    = useState(false)
  const [copiedChecklist, setCopiedChecklist] = useState(false)
  const [shotFired, setShotFired] = useState(false)

  // ── Build checklist once per prop change, not every render ────────────────
  const CHECKLIST = useMemo(() => [
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
    ...STATIC_ITEMS,
  ], [hookLine, productName, scriptLines])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const done    = checked.size
  const total   = CHECKLIST.length
  const allDone = done === total

  // ── Export helpers ─────────────────────────────────────────────────────────

  const handleCopyScript = useCallback(async () => {
    const text = scriptText?.trim() || scriptLines.join('\n')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2500)
    } catch { /* silent */ }
  }, [scriptText, scriptLines])

  // CHECKLIST now stable (from useMemo), so this callback only recreates when
  // checklist content or hook/product actually change.
  const handleSaveChecklist = useCallback(async () => {
    const lines: string[] = [
      '📋 Pre-Shoot Checklist — TTLike',
      '',
      ...CHECKLIST.map(item => `${checked.has(item.id) ? '✅' : '⬜'} ${item.label}`),
    ]
    if (hookLine)    lines.push('', `🎣 Hook: ${hookLine}`)
    if (productName) lines.push(`📦 Product: ${productName}`)

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopiedChecklist(true)
      setTimeout(() => setCopiedChecklist(false), 2500)
    } catch { /* silent */ }
  }, [CHECKLIST, checked, hookLine, productName])

  const handleReadyToShoot = useCallback(() => setShotFired(true), [])

  return (
    <div className={`rounded-2xl border transition-colors ${allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>

      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${allDone ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Camera className={`w-4 h-4 ${allDone ? 'text-emerald-600' : 'text-gray-500'}`} aria-hidden="true" />
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
          aria-hidden="true"
        />
      </button>

      {/* Animated body */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {/* Progress bar */}
        <div className="px-5 pt-1 pb-3">
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-pink-400'}`}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Script quick-reference */}
        {(hookLine || scriptLines.length > 0) && (
          <div className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" aria-hidden="true" /> Script Reference
            </p>
            {hookLine && (
              <p className="text-xs text-gray-700 font-medium leading-snug mb-1.5">
                <span className="text-pink-500 font-bold">HOOK:</span> {hookLine}
              </p>
            )}
            {scriptLines.slice(0, 2).map((line, i) => (
              <p key={i} className="text-xs text-gray-500 leading-snug mt-1">{line}</p>
            ))}
          </div>
        )}

        {/* Checklist items */}
        <ul className="px-5 pb-5 space-y-3" role="list">
          {CHECKLIST.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="flex items-start gap-3 w-full text-left group"
                aria-pressed={checked.has(item.id)}
              >
                {checked.has(item.id)
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                  : <Circle       className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" aria-hidden="true" />
                }
                <span className={`text-sm transition-colors leading-snug ${checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* ── Completion State ─────────────────────────────────────────────── */}
        {allDone && (
          <div className="mx-5 mb-5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-lg shadow-emerald-500/20">
            {shotFired ? (
              <div className="text-center py-1">
                <p className="text-2xl mb-1" aria-hidden="true">🚀</p>
                <p className="font-bold text-base">You pressed record.</p>
                <p className="text-emerald-100 text-xs mt-1">That imperfect take is worth 100 perfect plans.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl" aria-hidden="true">🎬</span>
                  <div>
                    <p className="font-bold text-sm leading-none">You&apos;re ready enough.</p>
                    <p className="text-emerald-100 text-xs mt-0.5">Shoot one imperfect take right now.</p>
                  </div>
                </div>

                {/* Export row — min-h-[44px] for touch targets */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    disabled={!scriptText && scriptLines.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    {copiedScript ? 'Copied!' : 'Copy Script'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChecklist}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    {copiedChecklist ? 'Copied!' : 'Save Checklist'}
                  </button>
                </div>

                {/* Primary CTA — min-h-[44px] */}
                <button
                  type="button"
                  onClick={handleReadyToShoot}
                  className="w-full flex items-center justify-center gap-2 px-4 min-h-[44px] bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <Rocket className="w-4 h-4" aria-hidden="true" />
                  I&apos;m Ready to Shoot
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
