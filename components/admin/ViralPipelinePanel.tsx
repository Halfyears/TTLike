'use client'

/**
 * ViralPipelinePanel
 *
 * Admin panel for running the viral pipeline on a specific video.
 * Appears in the admin breakdown detail view.
 *
 * Input:  video_id + product_schema form
 * Output: pipeline result summary (structure, hook_line, providers)
 */

import { useState } from 'react'
import {
  Zap, Loader2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'

interface PipelineResult {
  ok:           boolean
  pipeline_ms?: number
  structure_id?: string
  top_structure?: string
  hook_line?:    string
  total_lines?:  number
  providers?:    Record<string, string>
  stage?:        string
  error?:        string
}

interface Props {
  videoId:     string
  productName: string | null
  niche:       string | null
}

const PERSUASION_STYLES = ['ROI_PROOF', 'PAIN_INTERCEPT', 'CURIOSITY_LOOP', 'STATUS_ANXIETY'] as const

export function ViralPipelinePanel({ videoId, productName, niche }: Props) {
  const [open,       setOpen]       = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<PipelineResult | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Form state
  const [category,         setCategory]         = useState(niche ?? '')
  const [price,            setPrice]            = useState('29')
  const [painPoints,       setPainPoints]        = useState('')
  const [persuasionStyle,  setPersuasionStyle]  = useState<string>('')
  const [targetAudience,   setTargetAudience]   = useState('')

  async function runPipeline() {
    const painArr = painPoints.split(',').map(p => p.trim()).filter(Boolean)
    if (!category.trim())    { alert('Category is required'); return }
    if (painArr.length === 0) { alert('At least one pain point is required'); return }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/viral-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          video_id:       videoId,
          product_schema: {
            category:          category.trim(),
            price_point:       parseFloat(price) || 29,
            pain_points:       painArr,
            persuasion_style:  persuasionStyle || undefined,
            target_audience:   targetAudience.trim() || undefined,
          },
        }),
      })
      // Check Content-Type before JSON.parse to handle HTML error pages
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error ${res.status}: unexpected response format`)
      }
      const json: PipelineResult = await res.json()
      setResult(json)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-violet-700/40 rounded-xl overflow-hidden">

      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Viral Pipeline</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-900/50 text-violet-300 uppercase tracking-wide">
            Spike → Structure → Script
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-700 p-5 space-y-4">

          {/* Product context form */}
          <p className="text-xs text-gray-400">
            Provide the product context for this video. The pipeline will infer the viral structure
            and generate a 4-track script optimised for this product.
          </p>

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

          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">
              Pain Points * <span className="text-gray-600">(comma-separated)</span>
            </label>
            <input
              value={painPoints} onChange={e => setPainPoints(e.target.value)}
              placeholder="low energy, poor sleep, time scarcity"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Persuasion Style</label>
              <select
                value={persuasionStyle} onChange={e => setPersuasionStyle(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Auto-detect</option>
                {PERSUASION_STYLES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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
              Product from video: <span className="text-gray-300">{productName}</span>
            </p>
          )}

          <button
            onClick={runPipeline}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running pipeline… (30–90s)</>
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

                  <a
                    href={`/products/${videoId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                  >
                    <ExternalLink className="h-3 w-3" /> View product page
                  </a>
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
      )}
    </div>
  )
}
