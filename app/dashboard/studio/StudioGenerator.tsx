'use client'

import { useState } from 'react'
import { Clapperboard, Sparkles, Copy, Check, User, Image, Video, Mic, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { GenerateResponse, CharacterRow, StoryboardRow } from '@/lib/studio/types'

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-pink-500 transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Prompt block ──────────────────────────────────────────────────────────────
function PromptBlock({ icon: Icon, label, color, text }: {
  icon: React.ElementType; label: string; color: string; text: string
}) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${color}`}>
        <Icon className="h-2.5 w-2.5" />{label}
      </div>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs text-gray-700 leading-relaxed">{text}</p>
        <CopyBtn text={text} />
      </div>
    </div>
  )
}

// ── Storyboard card ───────────────────────────────────────────────────────────
function StoryboardCard({ board, index }: { board: StoryboardRow; index: number }) {
  const [open, setOpen] = useState(index < 3) // first 3 expanded by default
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-gray-50 px-3 py-2.5 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center shrink-0">
            {board.scene_no}
          </span>
          {board.character_name && (
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
              {board.character_name}
            </span>
          )}
          <span className="text-xs text-gray-500 truncate max-w-[200px]">{board.audio_narration.slice(0, 60)}{board.audio_narration.length > 60 ? '…' : ''}</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-100">
          <PromptBlock icon={Image}  label="Image Prompt" color="text-blue-500"   text={board.image_prompt} />
          <PromptBlock icon={Video}  label="Video Prompt" color="text-violet-500" text={board.video_prompt} />
          <PromptBlock icon={Mic}    label="Narration"    color="text-green-600"  text={board.audio_narration} />
        </div>
      )}
    </div>
  )
}

// ── Character chip ────────────────────────────────────────────────────────────
function CharacterChip({ c }: { c: CharacterRow }) {
  const roleColor: Record<string, string> = {
    lead:       'bg-pink-50 text-pink-700 border-pink-200',
    supporting: 'bg-blue-50 text-blue-700 border-blue-200',
    minor:      'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${roleColor[c.role] ?? roleColor.minor}`}>
      <User className="h-3 w-3 shrink-0" />
      <span className="font-medium">{c.name}</span>
      <span className="opacity-60 capitalize">· {c.role}</span>
    </div>
  )
}

// ── Results panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ result, onReset }: { result: GenerateResponse; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{result.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {result.scene_count} scenes · {result.characters.length} characters
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:text-pink-500 hover:border-pink-300 transition-colors"
        >
          <Sparkles className="h-3 w-3" /> New Script
        </button>
      </div>

      {/* Characters */}
      {result.characters.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Characters</p>
          <div className="flex flex-wrap gap-2">
            {result.characters.map(c => <CharacterChip key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Storyboards */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Storyboards — {result.scene_count} scenes
        </p>
        <div className="space-y-2">
          {result.storyboards.map((b, i) => (
            <StoryboardCard key={b.id} board={b} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main generator component ──────────────────────────────────────────────────
export function StudioGenerator() {
  const [title,      setTitle]      = useState('')
  const [rawScript,  setRawScript]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [result,     setResult]     = useState<GenerateResponse | null>(null)

  const charCount = rawScript.length
  const MAX       = 8000

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch('/api/studio/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim() || 'Untitled', raw_script: rawScript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setResult(data as GenerateResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (result) return <ResultsPanel result={result} onReset={() => setResult(null)} />

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleGenerate} className="space-y-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Drama Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., The Forgotten Promise"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Script textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Script / Story</label>
              <span className={`text-xs tabular-nums ${charCount > MAX * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                {charCount.toLocaleString()} / {MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              value={rawScript}
              onChange={e => setRawScript(e.target.value)}
              placeholder={`Paste your script or story here…\n\nExample:\nScene 1: Linda walks into the empty office at midnight, clutching a folder of evidence. Her phone buzzes — an unknown number.\n"We know what you found," the voice says. "Leave it alone."\nShe looks out the window. Someone is watching from the street below.`}
              rows={12}
              maxLength={MAX}
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none leading-relaxed"
            />
            <p className="text-xs text-gray-400">
              Supports Chinese and English · AI will extract characters and generate image + video prompts per scene
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            <Clapperboard className="h-4 w-4 mr-2" />
            {loading ? 'Generating storyboards…' : 'Generate Storyboards with AI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
