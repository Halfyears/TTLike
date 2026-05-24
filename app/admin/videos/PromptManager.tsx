'use client'

/**
 * PromptManager — hot-update the AI system prompt without redeploying.
 *
 * Reads / writes admin_config.ai_prompt_override via:
 *   GET  /api/admin/prompt-config
 *   PUT  /api/admin/prompt-config  { value: string }
 *
 * Empty value = fall back to hardcoded PARSER_SYSTEM_PROMPT.
 */

import { useEffect, useState } from 'react'
import { Wand2, Save, RotateCcw, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { LocalDate } from '@/components/ui/LocalDate'

export function PromptManager() {
  const [open,      setOpen]      = useState(false)
  const [value,     setValue]     = useState('')
  const [savedAt,   setSavedAt]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/admin/prompt-config')
      .then(r => r.json())
      .then((d: { value?: string; updated_at?: string }) => {
        setValue(d.value ?? '')
        setSavedAt(d.updated_at ?? null)
      })
      .catch(() => setErrorMsg('Failed to load prompt config'))
      .finally(() => setLoading(false))
  }, [open])

  async function save() {
    setSaving(true)
    setStatus('idle')
    try {
      const res  = await fetch('/api/admin/prompt-config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setStatus('saved')
      setSavedAt(new Date().toISOString())
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setValue('')
    setStatus('idle')
  }

  const isOverrideActive = value.trim().length > 0

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">AI Prompt Manager</span>
          {isOverrideActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 uppercase tracking-wide">
              Override Active
            </span>
          )}
          {!isOverrideActive && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 uppercase tracking-wide">
              Using Default
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-700 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400">
            Override the Gemini system prompt at runtime — no redeploy needed.
            Leave blank to use the hardcoded <code className="text-pink-300">PARSER_SYSTEM_PROMPT</code>.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <textarea
              value={value}
              onChange={e => { setValue(e.target.value); setStatus('idle') }}
              rows={12}
              placeholder="Paste your custom system prompt here, or leave blank to use the default…"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-xs text-gray-200 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            />
          )}

          {/* Status */}
          {status === 'saved' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Saved — next analysis will use this prompt.
              {savedAt && <><span className="text-gray-600 mx-1">·</span><LocalDate date={savedAt} className="text-gray-500" /></>}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-bold text-white transition-colors"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? 'Saving…' : 'Save Prompt'}
            </button>
            <button
              onClick={reset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-xs font-medium text-gray-300 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
