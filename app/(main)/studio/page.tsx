'use client'

import { useState, useCallback } from 'react'
import { Plus, X, Loader2, ChevronLeft } from 'lucide-react'
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Confirm Product Details</h2>
        {meta.title && (
          <p className="text-xs text-gray-400 mb-5 truncate" title={meta.title ?? ''}>
            {meta.title}
          </p>
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
                  <button onClick={() => removePain(i)} className="hover:text-indigo-900">
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

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={onSubmit}
          disabled={loading || !form.category.trim() || form.pain_points.length === 0}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Starting...</> : 'Generate Script'}
        </button>
      </div>
    </div>
  )
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  blueprint,
  script,
  onReset,
}: {
  blueprint: CreativeBlueprint
  script:    ScriptLayer
  onReset:   () => void
}) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Your Script</h2>
        <button onClick={onReset} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Analyze another video
        </button>
      </div>
      <CreativeBlueprintCard blueprint={blueprint} />
      <ScriptLayerCard script={script} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [stage, setStage]           = useState<Stage>('url_input')
  const [videoMeta, setVideoMeta]   = useState<VideoMeta | null>(null)
  const [form, setForm]             = useState<ProductForm>({ category: '', pain_points: [], price_point: 29 })
  const [breakdownId, setBreakdownId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)
  const [result, setResult]         = useState<{ blueprint: CreativeBlueprint; script: ScriptLayer } | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)

  // Step 1: URL resolved → fetch context and fill form
  async function handleResolved(videoId: string, title: string | null, productName: string | null, niche: string | null) {
    setVideoMeta({ video_id: videoId, title, product_name: productName, niche })
    // Auto-fill with context API
    try {
      const res  = await fetch(`/api/studio/context/${videoId}`)
      const data = await res.json()
      if (data.ok) {
        setForm({
          category:    data.category || niche || '',
          pain_points: data.pain_points ?? [],
          price_point: data.ref_price ?? 29,
        })
      } else {
        setForm({ category: niche ?? '', pain_points: [], price_point: 29 })
      }
    } catch {
      setForm({ category: niche ?? '', pain_points: [], price_point: 29 })
    }
    setStage('product_form')
  }

  // Step 2: Submit product form → trigger pipeline
  async function handleSubmitForm() {
    if (!videoMeta) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const res  = await fetch('/api/studio/analyze-video', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          video_id: videoMeta.video_id,
          product_schema: {
            category:    form.category,
            pain_points: form.pain_points,
            price_point: form.price_point,
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) { setSubmitError(data.error); return }
      setBreakdownId(data.breakdown_id)
      setStage('analyzing')
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Step 3: Polling completed → fetch result
  const handleCompleted = useCallback(async () => {
    if (!breakdownId) return
    try {
      const res  = await fetch(`/api/studio/result/${breakdownId}`)
      const data = await res.json()
      if (!data.ok) { setErrorMsg(data.error ?? 'Failed to load result'); setStage('error'); return }
      setResult({ blueprint: data.creative_blueprint, script: data.script_layer })
      setStage('result')
    } catch {
      setErrorMsg('Failed to load result. Please try again.')
      setStage('error')
    }
  }, [breakdownId])

  const handleFailed = useCallback((err: string) => {
    setErrorMsg(err)
    setStage('error')
  }, [])

  function reset() {
    setStage('url_input')
    setVideoMeta(null)
    setForm({ category: '', pain_points: [], price_point: 29 })
    setBreakdownId(null)
    setResult(null)
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

      {stage === 'result' && result && (
        <ResultView blueprint={result.blueprint} script={result.script} onReset={reset} />
      )}

      {stage === 'error' && (
        <div className="max-w-md mx-auto text-center py-12">
          <p className="text-red-600 font-medium mb-4">{errorMsg ?? 'Something went wrong'}</p>
          <button onClick={reset} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            Try again
          </button>
        </div>
      )}
    </main>
  )
}
