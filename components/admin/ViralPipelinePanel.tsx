'use client'

/**
 * ViralPipelinePanel
 *
 * Admin panel for running the viral pipeline on a specific video.
 * On mount, auto-fetches video context (pain_points, category) from the breakdown.
 * Pain points are pre-filled from viral formula mechanisms — editable tag list.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Zap, Loader2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink, X, Plus,
} from 'lucide-react'

interface PipelineResult {
  ok:            boolean
  pipeline_ms?:  number
  structure_id?: string
  top_structure?: string
  hook_line?:    string
  total_lines?:  number
  providers?:    Record<string, string>
  stage?:        string
  error?:        string
}

interface VideoContext {
  product_name:  string | null
  niche:         string | null
  category:      string
  pain_points:   string[]
  has_timeline:  boolean
  formula_count: number
}

interface Props {
  videoId:     string
  productName: string | null
  niche:       string | null
}

const PERSUASION_STYLES = ['ROI_PROOF', 'PAIN_INTERCEPT', 'CURIOSITY_LOOP', 'STATUS_ANXIETY'] as const

export function ViralPipelinePanel({ videoId, productName, niche }: Props) {
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<PipelineResult | null>(null)
  const [showDetail,  setShowDetail]  = useState(false)
  const [ctxLoading,  setCtxLoading]  = useState(true)

  // Form state
  const [category,        setCategory]        = useState(niche ?? '')
  const [price,           setPrice]           = useState('29')
  const [painTags,        setPainTags]        = useState<string[]>([])
  const [painInput,       setPainInput]       = useState('')
  const [persuasionStyle, setPersuasionStyle] = useState<string>('')
  const [targetAudience,  setTargetAudience]  = useState('')

  const painInputRef = useRef<HTMLInputElement>(null)

  // Auto-load context on mount
  useEffect(() => {
    let cancelled = false
    setCtxLoading(true)
    fetch(`/api/admin/pipeline/video-context?video_id=${videoId}`)
      .then(r => r.json())
      .then((ctx: VideoContext & { ok: boolean }) => {
        if (cancelled || !ctx.ok) return
        if (ctx.category && !category)  setCategory(ctx.category)
        if (ctx.pain_points?.length)    setPainTags(ctx.pain_points)
      })
      .catch(() => {/* silent — user can fill manually */})
      .finally(() => { if (!cancelled) setCtxLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // ── Pain tag helpers ────────────────────────────────────────────────────────
  function addTag(raw: string) {
    const val = raw.trim()
    if (!val || painTags.includes(val) || painTags.length >= 5) return
    setPainTags(p => [...p, val])
    setPainInput('')
  }

  function removeTag(tag: string) {
    setPainTags(p => p.filter(t => t !== tag))
  }

  function handlePainKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(painInput)
    } else if (e.key === 'Backspace' && !painInput && painTags.length > 0) {
      setPainTags(p => p.slice(0, -1))
    }
  }

  // ── Pipeline runner ──────────────────────────────────────────────────────────
  async function runPipeline() {
    // Commit any pending input
    const finalTags = painInput.trim()
      ? [...painTags, painInput.trim()].slice(0, 5)
      : painTags

    if (!category.trim()) { alert('Category is required'); return }
    if (finalTags.length === 0) { alert('At least one pain point is required'); return }

    setPainTags(finalTags)
    setPainInput('')
    setLoading(true)
    setResult(null)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 90_000)

    try {
      const res = await fetch('/api/admin/viral-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          video_id:       videoId,
          product_schema: {
            category:         category.trim(),
            price_point:      parseFloat(price) || 29,
            pain_points:      finalTags,
            persuasion_style: persuasionStyle || undefined,
            target_audience:  targetAudience.trim() || undefined,
          },
        }),
      })
      clearTimeout(timeoutId)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error ${res.status}: unexpected response format`)
      }
      const json: PipelineResult = await res.json()
      setResult(json)
    } catch (e) {
      clearTimeout(timeoutId)
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overflow-hidden">
      <div className="p-5 space-y-4">

        <p className="text-xs text-gray-400">
          Product context is auto-extracted from the video breakdown. Review and adjust before running.
        </p>

        {/* Category + Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Category *</label>
            <input
              value={category} onChange={e => setCategory(e.target.value)}
              placeholder={niche ?? 'skincare, fitness, tech…'}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Price (USD) *</label>
            <input
              value={price} onChange={e => setPrice(e.target.value)}
              type="number" min="1" placeholder="29"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Pain Points — tag-based, auto-filled */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-gray-400">
              Pain Points *
              <span className="text-gray-600 ml-1">(from video analysis · editable)</span>
            </label>
            {ctxLoading && <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />}
            {!ctxLoading && painTags.length > 0 && (
              <span className="text-[10px] text-violet-400">auto-filled ✓</span>
            )}
          </div>

          {/* Tag list + input */}
          <div
            className="min-h-[42px] w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent"
            onClick={() => painInputRef.current?.focus()}
          >
            {painTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-violet-700/50 text-violet-200 text-[11px] font-medium px-2 py-0.5 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeTag(tag) }}
                  className="text-violet-300 hover:text-white"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {painTags.length < 5 && (
              <input
                ref={painInputRef}
                value={painInput}
                onChange={e => setPainInput(e.target.value)}
                onKeyDown={handlePainKeyDown}
                onBlur={() => addTag(painInput)}
                placeholder={painTags.length === 0 ? 'Loading from video…' : 'Add more…'}
                className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder-gray-500 outline-none py-0.5"
              />
            )}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            Press Enter or comma to add · max 5 · click × to remove
          </p>
        </div>

        {/* Persuasion Style + Target Audience */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Persuasion Style</label>
            <select
              value={persuasionStyle} onChange={e => setPersuasionStyle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Auto-detect</option>
              {PERSUASION_STYLES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">Target Audience</label>
            <input
              value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              placeholder="women 25-35, fitness enthusiasts…"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {productName && (
          <p className="text-[11px] text-gray-500">
            Product: <span className="text-gray-300">{productName}</span>
          </p>
        )}

        <button
          onClick={runPipeline}
          disabled={loading || ctxLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running pipeline… (30–90s)</>
            : ctxLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading video context…</>
              : <><Zap className="h-4 w-4" /> Run Viral Pipeline</>
          }
        </button>

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-4 border ${
            result.ok
              ? 'bg-emerald-900/20 border-emerald-700/40'
              : 'bg-red-900/20 border-red-700/40'
          }`}>
            {result.ok ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-300">
                    Pipeline complete in {((result.pipeline_ms ?? 0) / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="text-xs space-y-1 text-gray-300">
                  <div><span className="text-gray-500">Structure:</span> {result.structure_id}</div>
                  <div><span className="text-gray-500">Top match:</span> {result.top_structure}</div>
                  <div className="mt-2 p-2 bg-gray-700/50 rounded border border-gray-600">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wide">Hook line</span>
                    <p className="text-white font-medium mt-0.5 text-sm">"{result.hook_line}"</p>
                  </div>
                  <div><span className="text-gray-500">Script lines:</span> {result.total_lines}</div>
                </div>

                {result.providers && (
                  <div>
                    <button
                      onClick={() => setShowDetail(s => !s)}
                      className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1"
                    >
                      {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      Provider detail
                    </button>
                    {showDetail && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(result.providers).map(([stage, prov]) => (
                          <div key={stage} className="text-[10px] text-gray-500">
                            <span className="text-gray-400 font-mono">{stage}</span>: {prov}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <a
                    href={`/admin/pipeline-results/${videoId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    <ExternalLink className="h-3 w-3" /> View Full Pipeline
                  </a>
                  <a
                    href={`/products/${videoId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300"
                  >
                    <ExternalLink className="h-3 w-3" /> Product page
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  <span className="font-bold">Stage: {result.stage}</span>
                  <br />
                  {result.error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
