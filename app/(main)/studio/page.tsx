'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, X, Loader2, ChevronLeft, Clock, Zap } from 'lucide-react'
import { URLInputCard } from '@/components/studio/URLInputCard'
import { AnalysisWaitScreen } from '@/components/studio/AnalysisWaitScreen'
import { CreativeBlueprintCard } from '@/components/studio/CreativeBlueprintCard'
import { ScriptLayerCard } from '@/components/studio/ScriptLayerCard'
import type { CreativeBlueprint, ScriptLayer } from '@/lib/utils/result-transform'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage =
  | 'url_input'
  | 'product_form'
  | 'analyzing'
  | 'result'
  | 'error'

interface VideoMeta {
  video_id:     string
  title:        string | null
  product_name: string | null
  niche:        string | null
}

interface ProductForm {
  category:    string
  pain_points: string[]
  price_point: number
}

interface ResultMeta {
  generated_at: string | null
  pipeline_ms:  number | null
}

// ── Product Form Component ────────────────────────────────────────────────────

function ProductFormStep({
  meta,
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onBack,
}: {
  meta:     VideoMeta
  form:     ProductForm
  setForm:  React.Dispatch<React.SetStateAction<ProductForm>>
  loading:  boolean
  error:    string | null
  onSubmit: () => void
  onBack:   () => void
}) {
  const [newPain, setNewPain] = useState('')

  function addPain() {
    const p = newPain.trim()
    if (!p || form.pain_points.length >= 5) return
    setForm(f => ({ ...f, pain_points: [...f.pain_points, p] }))
    setNewPain('')
  }

  function removePain(i: number) {
    setForm(f => ({ ...f, pain_points: f.pain_points.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Confirm Product Details</h2>

        {/* Video title preview */}
        {meta.title && (
          <div className="flex items-start gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{meta.title}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category / Niche</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. skincare, fitness, kitchen"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Pain Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer Pain Points
              <span className="text-gray-400 font-normal ml-1">(up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.pain_points.map((p, i) => (
                <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                  {p}
                  <button onClick={() => removePain(i)} className="hover:text-indigo-900 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            {form.pain_points.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPain}
                  onChange={e => setNewPain(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPain() } }}
                  placeholder="Add a pain point..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={addPain}
                  className="px-3 py-2 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={form.price_point}
                onChange={e => setForm(f => ({ ...f, price_point: Number(e.target.value) }))}
                min={1}
                step={1}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={loading || !form.category.trim() || form.pain_points.length === 0}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Starting analysis...</>
            : 'Generate Script →'}
        </button>

        {form.pain_points.length === 0 && (
          <p className="mt-2 text-xs text-center text-gray-400">Add at least one pain point to continue</p>
        )}
      </div>
    </div>
  )
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  blueprint,
  script,
  meta,
  resultMeta,
  onReset,
}: {
  blueprint:  CreativeBlueprint
  script:     ScriptLayer
  meta:       VideoMeta
  resultMeta: ResultMeta
  onReset:    () => void
}) {
  // Format relative time
  const timeAgo = resultMeta.generated_at
    ? (() => {
        const secs = Math.floor((Date.now() - new Date(resultMeta.generated_at).getTime()) / 1000)
        if (secs < 10)  return 'just now'
        if (secs < 60)  return `${secs}s ago`
        if (secs < 120) return '1 min ago'
        return `${Math.floor(secs / 60)} min ago`
      })()
    : null

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            {timeAgo ? `Generated ${timeAgo}` : 'Generated'}
            {resultMeta.pipeline_ms && (
              <span className="text-gray-300">·</span>
            )}
            {resultMeta.pipeline_ms && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {(resultMeta.pipeline_ms / 1000).toFixed(1)}s
              </span>
            )}
          </p>
          {meta.title && (
            <p className="text-sm text-gray-600 font-medium truncate max-w-sm" title={meta.title}>
              {meta.title}
            </p>
          )}
        </div>
        <button
          onClick={onReset}
          className="shrink-0 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 whitespace-nowrap"
        >
          <ChevronLeft className="w-4 h-4" /> New video
        </button>
      </div>

      <CreativeBlueprintCard blueprint={blueprint} />
      <ScriptLayerCard script={script} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [stage, setStage]               = useState<Stage>('url_input')
  const [videoMeta, setVideoMeta]       = useState<VideoMeta | null>(null)
  const [form, setForm]                 = useState<ProductForm>({ category: '', pain_points: [], price_point: 29 })
  const [breakdownId, setBreakdownId]   = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [result, setResult]             = useState<{ blueprint: CreativeBlueprint; script: ScriptLayer } | null>(null)
  const [resultMeta, setResultMeta]     = useState<ResultMeta>({ generated_at: null, pipeline_ms: null })
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)

  // Stable ref so handleCompleted can always access the latest breakdownId
  // without re-creating the function and restarting the poll effect
  const breakdownIdRef = useRef<string | null>(null)

  // ── Step 1: URL resolved → fetch context → fill form → transition ──────────
  const handleResolved = useCallback(async (
    videoId: string,
    title: string | null,
    productName: string | null,
    niche: string | null,
  ): Promise<void> => {
    setVideoMeta({ video_id: videoId, title, product_name: productName, niche })
    // Fetch context while URLInputCard still shows loading
    try {
      const res  = await fetch(`/api/studio/context/${videoId}`)
      const data = await res.json()
      if (data.ok) {
        setForm({
          category:    data.category || niche || '',
          pain_points: data.pain_points ?? [],
          price_point: data.ref_price  ?? 29,
        })
      } else {
        setForm({ category: niche ?? '', pain_points: [], price_point: 29 })
      }
    } catch {
      setForm({ category: niche ?? '', pain_points: [], price_point: 29 })
    }
    // Only after context is ready do we show the form (URLInputCard loading turns off)
    setStage('product_form')
  }, [])

  // ── Step 2: Submit product form → trigger pipeline ─────────────────────────
  async function handleSubmitForm() {
    if (!videoMeta) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const res  = await fetch('/api/studio/analyze-video', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          video_id:       videoMeta.video_id,
          product_schema: {
            category:    form.category,
            pain_points: form.pain_points,
            price_point: form.price_point,
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      breakdownIdRef.current = data.breakdown_id
      setBreakdownId(data.breakdown_id)
      setStage('analyzing')
    } catch {
      setSubmitError('Network error — please check your connection and try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // ── Step 3: Pipeline completed → fetch result ──────────────────────────────
  // Uses ref so this function stays stable — no poll restart on re-render
  const handleCompleted = useCallback(async () => {
    const id = breakdownIdRef.current
    if (!id) return
    try {
      const res  = await fetch(`/api/studio/result/${id}`)
      const data = await res.json()
      if (!data.ok) {
        setErrorMsg(data.error ?? 'Failed to load result')
        setStage('error')
        return
      }
      setResult({ blueprint: data.creative_blueprint, script: data.script_layer })
      setResultMeta({ generated_at: data.generated_at ?? null, pipeline_ms: data.pipeline_ms ?? null })
      setStage('result')
    } catch {
      setErrorMsg('Failed to load result. Please try again.')
      setStage('error')
    }
  }, [])  // stable — reads breakdownId via ref

  const handleFailed = useCallback((err: string) => {
    setErrorMsg(err || 'Analysis failed. Please try again.')
    setStage('error')
  }, [])

  function reset() {
    setStage('url_input')
    setVideoMeta(null)
    setForm({ category: '', pain_points: [], price_point: 29 })
    breakdownIdRef.current = null
    setBreakdownId(null)
    setResult(null)
    setResultMeta({ generated_at: null, pipeline_ms: null })
    setErrorMsg(null)
    setSubmitError(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      {stage === 'url_input' && (
        <URLInputCard onResolved={handleResolved} />
      )}

      {stage === 'product_form' && videoMeta && (
        <ProductFormStep
          meta={videoMeta}
          form={form}
          setForm={setForm}
          loading={submitLoading}
          error={submitError}
          onSubmit={handleSubmitForm}
          onBack={reset}
        />
      )}

      {stage === 'analyzing' && breakdownId && (
        <div className="flex items-center justify-center">
          <AnalysisWaitScreen
            breakdownId={breakdownId}
            onCompleted={handleCompleted}
            onFailed={handleFailed}
          />
        </div>
      )}

      {stage === 'result' && result && videoMeta && (
        <ResultView
          blueprint={result.blueprint}
          script={result.script}
          meta={videoMeta}
          resultMeta={resultMeta}
          onReset={reset}
        />
      )}

      {stage === 'error' && (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-gray-900 font-medium mb-2">Analysis failed</p>
          <p className="text-sm text-gray-500 mb-6">{errorMsg ?? 'Something went wrong'}</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  )
}
