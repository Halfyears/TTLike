'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, X, Loader2, ChevronLeft, Clock, Zap, Clapperboard } from 'lucide-react'
import { handleIntent } from '@/lib/behavior/intent-bridge'
import { useBehaviorStore } from '@/lib/behavior/state-machine'
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
  product_name: string
  category:     string
  pain_points:  string[]
  price_point:  number
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

  // Detect quota_exceeded to show upgrade CTA instead of generic error
  const isQuotaExceeded = error?.includes('quota_exceeded') || error?.includes('Upgrade to continue')

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

        {meta.title && (
          <div className="flex items-start gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
            <Zap className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{meta.title}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Product Name — most important field, placed first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Product Name
              <span className="text-gray-400 font-normal ml-1">(the AI will use this directly)</span>
            </label>
            <input
              type="text"
              value={form.product_name}
              onChange={e => setForm(f => ({ ...f, product_name: e.target.value.slice(0, 120) }))}
              placeholder="e.g. Posture Corrector Belt, LED Face Mask..."
              maxLength={120}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category / Niche</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. skincare, fitness, kitchen"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer Pain Points
              <span className="text-gray-400 font-normal ml-1">(up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.pain_points.map((p, i) => (
                <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full text-sm">
                  {p}
                  <button onClick={() => removePain(i)} className="hover:text-pink-900 ml-0.5">
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
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
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
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>
        </div>

        {error && (
          isQuotaExceeded ? (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 font-medium mb-2">Monthly limit reached</p>
              <p className="text-xs text-amber-700 mb-3">{error.replace('quota_exceeded · ', '')}</p>
              <a
                href="/pricing"
                className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Upgrade Plan →
              </a>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )
        )}

        <button
          onClick={onSubmit}
          disabled={loading || !form.category.trim() || form.pain_points.length === 0}
          className="mt-6 w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
  const timeAgo = resultMeta.generated_at
    ? (() => {
        const secs = Math.floor((Date.now() - new Date(resultMeta.generated_at).getTime()) / 1000)
        if (secs < 10)  return 'just now'
        if (secs < 60)  return `${secs}s ago`
        if (secs < 120) return '1 min ago'
        return `${Math.floor(secs / 60)} min ago`
      })()
    : null

  const storyboardProduct = encodeURIComponent(meta.product_name ?? meta.niche ?? '')
  const { markStoryboard, markCopy, session } = useBehaviorStore()
  // Guard: badge check fires exactly once per result view — prevent duplicate badges on repeat clicks
  const completedRef = useRef(false)

  function triggerComplete(type: 'copy' | 'storyboard') {
    if (type === 'copy')       markCopy()
    if (type === 'storyboard') markStoryboard()
    handleIntent('COMPLETE_SESSION')
    if (completedRef.current) return
    completedRef.current = true
    // Fire-and-forget badge check — QuietProgress refetches on COMPLETE state
    void fetch('/api/behavior/check-badges', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        takeCount:         session.takeCount,
        storyboardClicked: type === 'storyboard' ? true : session.storyboardClicked,
        copyUsed:          type === 'copy'        ? true : session.copyUsed,
      }),
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {timeAgo ? `Generated ${timeAgo}` : 'Generated'}
            {resultMeta.pipeline_ms && <span className="text-gray-300">·</span>}
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
          className="shrink-0 text-sm text-pink-500 hover:text-pink-600 flex items-center gap-1 whitespace-nowrap"
        >
          <ChevronLeft className="w-4 h-4" /> New video
        </button>
      </div>

      <CreativeBlueprintCard blueprint={blueprint} />
      <ScriptLayerCard script={script} onCopy={() => triggerComplete('copy')} />

      {/* Storyboard CTA */}
      {storyboardProduct && (
        <div className="flex justify-center pt-2">
          <a
            href={`/dashboard/studio?product=${storyboardProduct}`}
            onClick={() => triggerComplete('storyboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/20"
          >
            <Clapperboard className="w-4 h-4" />
            Generate Storyboard →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Main Client Component ─────────────────────────────────────────────────────

export function StudioClient() {
  const searchParams = useSearchParams()
  const [stage, setStage]               = useState<Stage>('url_input')
  const [videoMeta, setVideoMeta]       = useState<VideoMeta | null>(null)
  const [form, setForm]                 = useState<ProductForm>({ product_name: '', category: '', pain_points: [], price_point: 29 })
  const [breakdownId, setBreakdownId]   = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [result, setResult]             = useState<{ blueprint: CreativeBlueprint; script: ScriptLayer } | null>(null)
  const [resultMeta, setResultMeta]     = useState<ResultMeta>({ generated_at: null, pipeline_ms: null })
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [prefillUrl, setPrefillUrl]     = useState<string | null>(null)

  const breakdownIdRef = useRef<string | null>(null)
  const handledUrlRef  = useRef<string | null>(null)

  useEffect(() => {
    const urlParam = searchParams.get('url')
    if (urlParam && urlParam !== handledUrlRef.current) {
      handledUrlRef.current = urlParam
      setPrefillUrl(urlParam)
    }
  }, [searchParams])

  // Step 1: URL resolved → fetch context → fill form
  const handleResolved = useCallback(async (
    videoId: string,
    title: string | null,
    productName: string | null,
    niche: string | null,
  ): Promise<void> => {
    handleIntent('URL_RESOLVED')
    setVideoMeta({ video_id: videoId, title, product_name: productName, niche })
    try {
      const res  = await fetch(`/api/studio/context/${videoId}`)
      const data = await res.json()
      if (data.ok) {
        setForm({
          product_name: data.product_name ?? productName ?? '',
          category:     data.category || niche || '',
          pain_points:  data.pain_points ?? [],
          price_point:  data.ref_price   ?? 29,
        })
      } else {
        setForm({ product_name: productName ?? '', category: niche ?? '', pain_points: [], price_point: 29 })
      }
    } catch {
      setForm({ product_name: productName ?? '', category: niche ?? '', pain_points: [], price_point: 29 })
    }
    setStage('product_form')
  }, [])

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
          video_id:       videoMeta.video_id,
          product_schema: {
            product_name: form.product_name.trim() || undefined,
            category:     form.category,
            pain_points:  form.pain_points,
            price_point:  form.price_point,
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        // Quota exceeded: show the human-readable message from server
        const msg = data.error === 'quota_exceeded'
          ? (data.message ?? 'Monthly limit reached. Please upgrade to continue.')
          : (data.error ?? 'Something went wrong. Please try again.')
        setSubmitError(msg)
        return
      }
      if (!data.breakdown_id) {
        setSubmitError('Analysis could not be started. Please try again.')
        return
      }
      handleIntent('ANALYSIS_STARTED')   // takeCount increment is now inside dispatch
      breakdownIdRef.current = data.breakdown_id
      setBreakdownId(data.breakdown_id)
      setStage('analyzing')
    } catch {
      setSubmitError('Network error — please check your connection and try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Step 3: Pipeline completed → fetch result
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
      handleIntent('RESULT_READY')
      setResult({ blueprint: data.creative_blueprint, script: data.script_layer })
      setResultMeta({ generated_at: data.generated_at ?? null, pipeline_ms: data.pipeline_ms ?? null })
      setStage('result')
    } catch {
      setErrorMsg('Failed to load result. Please try again.')
      setStage('error')
    }
  }, [])

  const handleFailed = useCallback((err: string) => {
    handleIntent('RESET')
    setErrorMsg(err || 'Analysis failed. Please try again.')
    breakdownIdRef.current = null
    setBreakdownId(null)
    setVideoMeta(null)
    setForm({ product_name: '', category: '', pain_points: [], price_point: 29 })
    setStage('error')
  }, [])

  function reset() {
    handleIntent('RESET')
    setStage('url_input')
    setVideoMeta(null)
    setForm({ product_name: '', category: '', pain_points: [], price_point: 29 })
    breakdownIdRef.current = null
    setBreakdownId(null)
    setResult(null)
    setResultMeta({ generated_at: null, pipeline_ms: null })
    setErrorMsg(null)
    setSubmitError(null)
  }

  return (
    <main className="min-h-screen bg-white">

      {stage === 'url_input' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 pt-20 pb-24">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-pink-400/10 blur-3xl" />
          </div>

          <div className="relative flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs px-4 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
              AI-Powered · ~20 seconds · Any public TikTok URL
            </span>
          </div>

          <div className="relative">
            <URLInputCard onResolved={handleResolved} prefillUrl={prefillUrl ?? undefined} />
          </div>

          <div className="relative mt-12 flex flex-wrap justify-center gap-6 text-xs text-gray-500">
            {[
              ['🎯', 'Hook structure decoded'],
              ['🎭', 'Emotion arc mapped'],
              ['🎬', 'Scene-by-scene script'],
              ['⚡', 'Ready to film'],
            ].map(([icon, label]) => (
              <span key={label} className="flex items-center gap-1.5">{icon} {label}</span>
            ))}
          </div>
        </div>
      )}

      {stage === 'product_form' && videoMeta && (
        <div className="px-4 py-12">
          <ProductFormStep
            meta={videoMeta}
            form={form}
            setForm={setForm}
            loading={submitLoading}
            error={submitError}
            onSubmit={handleSubmitForm}
            onBack={reset}
          />
        </div>
      )}

      {stage === 'analyzing' && breakdownId && (
        <div className="flex items-center justify-center px-4 py-12">
          <AnalysisWaitScreen
            breakdownId={breakdownId}
            onCompleted={handleCompleted}
            onFailed={handleFailed}
          />
        </div>
      )}

      {stage === 'result' && result && videoMeta && (
        <div className="px-4 py-12">
          <ResultView
            blueprint={result.blueprint}
            script={result.script}
            meta={videoMeta}
            resultMeta={resultMeta}
            onReset={reset}
          />
        </div>
      )}

      {stage === 'error' && (
        <div className="px-4 py-12 max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-gray-900 font-medium mb-2">Analysis failed</p>
          <p className="text-sm text-gray-500 mb-6">{errorMsg ?? 'Something went wrong'}</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  )
}
