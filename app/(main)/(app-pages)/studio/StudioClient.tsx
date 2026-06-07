'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, X, Loader2, ChevronLeft, Clock, Zap, Clapperboard, Mic, FileText, Lightbulb, ListChecks } from 'lucide-react'
import { handleIntent } from '@/lib/behavior/intent-bridge'
import { useBehaviorStore } from '@/lib/behavior/state-machine'
import { URLInputCard } from '@/components/studio/URLInputCard'
import { AnalysisWaitScreen } from '@/components/studio/AnalysisWaitScreen'
import { CreativeBlueprintCard } from '@/components/studio/CreativeBlueprintCard'
import { ScriptLayerCard } from '@/components/studio/ScriptLayerCard'
import { AntiDupHooksPanel } from '@/components/studio/AntiDupHooksPanel'
import { FilmingPrepCard } from '@/components/studio/FilmingPrepCard'
import { TranscriptCard } from '@/components/studio/TranscriptCard'
import type { TranscriptSegment } from '@/components/studio/TranscriptCard'
import type { CreativeBlueprint, ScriptLayer } from '@/lib/utils/result-transform'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage =
  | 'url_input'
  | 'transcribing'   // pre-transcribes audio before form is shown
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
  price_point:  number | undefined
}

interface ResultMeta {
  generated_at: string | null
  pipeline_ms:  number | null
  has_audio:    boolean
}

// ── Transcribing Screen ───────────────────────────────────────────────────────

function TranscribingScreen({ title }: { title: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-5">
        <Mic className="w-8 h-8 text-pink-500 animate-pulse" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Transcribing Audio</h2>
      <p className="text-sm text-gray-500 mb-3 max-w-xs">
        Analysing the actual spoken words so the AI can generate accurate insights…
      </p>
      {title && (
        <p className="text-xs text-gray-400 max-w-xs italic line-clamp-2">"{title}"</p>
      )}
      <p className="mt-4 text-xs text-gray-400">~10–20 seconds</p>
      {/* Indeterminate progress bar */}
      <div className="mt-5 w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full w-1/3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
          style={{ animation: 'slide 1.6s ease-in-out infinite' }}
        />
      </div>
      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
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
        className="flex items-center gap-2 min-h-[44px] -ml-2 pl-2 pr-4 text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" /> Back
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Product Price (USD)
              <span className="text-gray-400 font-normal ml-1">(optional — helps the AI tailor the script)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={form.price_point ?? ''}
                onChange={e => {
                  const v = e.target.value
                  const n = Number(v)
                  // Reject empty, 0, negative, NaN, Infinity — Zod requires positive()
                  setForm(f => ({ ...f, price_point: v === '' || !isFinite(n) || n <= 0 ? undefined : n }))
                }}
                placeholder="e.g. 29"
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

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({
  number,
  icon: Icon,
  title,
  subtitle,
  accentColor = 'bg-pink-500',
}: {
  number:      number
  icon:        React.ElementType
  title:       string
  subtitle?:   string
  accentColor?: string
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className={`w-7 h-7 rounded-full ${accentColor} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
        {number}
      </div>
      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
      <div>
        <h2 className="font-bold text-gray-900 text-sm leading-none">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
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
  transcript,
  onReset,
}: {
  blueprint:  CreativeBlueprint
  script:     ScriptLayer
  meta:       VideoMeta
  resultMeta: ResultMeta
  transcript: TranscriptSegment[]
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

      {/* ── Top bar: meta + New video ─────────────────────────────────────── */}
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
            {resultMeta.has_audio && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-0.5 text-emerald-500">
                  <Mic className="w-3 h-3" />
                  Audio analyzed
                </span>
              </>
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
          className="shrink-0 flex items-center gap-2 min-h-[44px] px-3 -mr-2 text-sm font-medium text-pink-500 hover:text-pink-600 whitespace-nowrap transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> New video
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Section 1 — Your Script
          ════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-100 pt-2">
        <SectionHeader
          number={1}
          icon={FileText}
          title="Your Script"
          subtitle="Hook · Body · CTA — ready to read on camera"
          accentColor="bg-pink-500"
        />
      </div>
      <ScriptLayerCard script={script} onCopy={() => triggerComplete('copy')} />

      {/* ════════════════════════════════════════════════════════════════
          Section 2 — Why It Works
          ════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-100 pt-2">
        <SectionHeader
          number={2}
          icon={Lightbulb}
          title="Why It Works"
          subtitle="Viral pattern · Emotional trigger · Audience pain points"
          accentColor="bg-violet-500"
        />
      </div>
      <CreativeBlueprintCard blueprint={blueprint} />
      {blueprint.hook && <AntiDupHooksPanel hookLine={blueprint.hook} />}
      {transcript.length > 0 && <TranscriptCard segments={transcript} />}

      {/* ════════════════════════════════════════════════════════════════
          Section 3 — Pre-Shoot Checklist
          ════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-100 pt-2">
        <SectionHeader
          number={3}
          icon={ListChecks}
          title="Pre-Shoot Checklist"
          subtitle="Environment · Props · Gear · Mindset — so you can start filming today"
          accentColor="bg-emerald-500"
        />
      </div>
      <FilmingPrepCard
        hookLine={blueprint.hook}
        productName={meta.product_name}
        scriptLines={script.lines.slice(0, 3).map(l => `${l.say}`).filter(Boolean)}
      />

      {/* Ready-to-shoot nudge */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0">🎬</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">You&apos;re ready enough.</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Don&apos;t overthink it. Shoot one imperfect take now — you can always improve from there.
          </p>
        </div>
      </div>

      {/* ── Storyboard CTA ───────────────────────────────────────────────── */}
      {storyboardProduct && (
        <div className="flex justify-center pt-2 pb-4">
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
  const [form, setForm]                 = useState<ProductForm>({ product_name: '', category: '', pain_points: [], price_point: undefined })
  const [breakdownId, setBreakdownId]   = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [result, setResult]             = useState<{ blueprint: CreativeBlueprint; script: ScriptLayer } | null>(null)
  const [resultMeta, setResultMeta]     = useState<ResultMeta>({ generated_at: null, pipeline_ms: null, has_audio: false })
  const [transcript, setTranscript]     = useState<TranscriptSegment[]>([])
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [prefillUrl, setPrefillUrl]     = useState<string | null>(null)

  const breakdownIdRef  = useRef<string | null>(null)
  const handledUrlRef   = useRef<string | null>(null)
  const videoMetaRef    = useRef<VideoMeta | null>(null)

  // Keep ref in sync so useCallback closures can read current videoMeta without stale captures
  useEffect(() => { videoMetaRef.current = videoMeta }, [videoMeta])

  useEffect(() => {
    const urlParam = searchParams.get('url')
    if (urlParam && urlParam !== handledUrlRef.current) {
      handledUrlRef.current = urlParam
      setPrefillUrl(urlParam)
    }
  }, [searchParams])

  // Re-analyse: ?video_id=uuid skips URL resolution — goes straight to the context/form stage
  const handledVidRef = useRef<string | null>(null)
  useEffect(() => {
    const vid = searchParams.get('video_id')
    if (!vid || vid === handledVidRef.current) return
    handledVidRef.current = vid
    // Fetch video meta from existing DB row, then go to transcribing → form
    void (async () => {
      try {
        const res = await fetch(`/api/studio/context/${vid}`)
        const data = await res.json()
        setVideoMeta({
          video_id:     vid,
          title:        null,
          product_name: data.product_name ?? null,
          niche:        data.niche        ?? null,
        })
        setForm({
          product_name: data.product_name ?? '',
          category:     data.category     ?? data.niche ?? '',
          pain_points:  data.pain_points  ?? [],
          price_point:  undefined,
        })
        setStage('product_form')
      } catch {
        // If context fetch fails just go to url_input
      }
    })()
  }, [searchParams])

  // Direct result load: ?bd=breakdown_id jumps straight to the result view
  // (used by /dashboard/usage "View" action on past analyses)
  const handledBdRef = useRef<string | null>(null)
  useEffect(() => {
    const bd = searchParams.get('bd')
    if (!bd || bd === handledBdRef.current) return
    handledBdRef.current = bd
    breakdownIdRef.current = bd
    setBreakdownId(bd)
    setStage('analyzing')   // AnalysisWaitScreen will poll, find COMPLETED instantly
  }, [searchParams])

  // Step 1: URL resolved → pre-transcribe audio → fill form
  const handleResolved = useCallback(async (
    videoId: string,
    title: string | null,
    productName: string | null,
    niche: string | null,
  ): Promise<void> => {
    handleIntent('URL_RESOLVED')
    setVideoMeta({ video_id: videoId, title, product_name: productName, niche })

    // Show transcribing screen immediately while we process audio
    setStage('transcribing')

    // ── Step 1a: Pre-transcribe audio (best-effort, 25 s hard timeout) ────────
    // The endpoint also persists transcript into video_breakdowns.payload so the
    // main pipeline can skip re-transcription automatically.
    let transcribeData: { category?: string; pain_points?: string[]; transcript_available?: boolean } = {}
    try {
      const res = await fetch(`/api/studio/transcribe/${videoId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok) transcribeData = data
      }
    } catch {
      // Timeout or network error — fall through to title-based pre-fill
    }

    // ── Step 1b: Fill form from transcript or fall back to title-based LLM ───
    try {
      if (transcribeData.category && (transcribeData.pain_points?.length ?? 0) > 0) {
        // Transcript-based pre-fill (highest quality)
        setForm({
          product_name: productName ?? '',
          category:     transcribeData.category,
          pain_points:  transcribeData.pain_points!,
          price_point:  undefined,
        })
      } else {
        // Fallback: existing context endpoint (title-based LLM)
        const res  = await fetch(`/api/studio/context/${videoId}`)
        const data = await res.json()
        if (data.ok) {
          setForm({
            product_name: data.product_name ?? productName ?? '',
            category:     data.category || niche || '',
            pain_points:  data.pain_points ?? [],
            price_point:  undefined,
          })
        } else {
          // context endpoint also failed — salvage category from transcribeData if available
          setForm({ product_name: productName ?? '', category: transcribeData.category || niche || '', pain_points: [], price_point: undefined })
        }
      }
    } catch {
      setForm({ product_name: productName ?? '', category: transcribeData.category || niche || '', pain_points: [], price_point: undefined })
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
      breakdownIdRef.current = data.breakdown_id
      setBreakdownId(data.breakdown_id)

      // Cache hit: archived result available immediately — skip polling
      if (data.fromCache && data.status === 'COMPLETED') {
        handleIntent('ANALYSIS_STARTED')
        setStage('analyzing')
        return   // AnalysisWaitScreen polls status and will find COMPLETED instantly
      }

      handleIntent('ANALYSIS_STARTED')   // takeCount increment is now inside dispatch
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
      setResultMeta({ generated_at: data.generated_at ?? null, pipeline_ms: data.pipeline_ms ?? null, has_audio: Boolean(data.has_audio) })
      setTranscript(Array.isArray(data.transcript_segments) ? data.transcript_segments : [])
      // If we jumped here via ?bd= param, videoMeta is null — restore from result response.
      // Read from ref (not closure) to get current state and avoid stale-closure false-positive.
      if (!videoMetaRef.current && data.video_meta) {
        setVideoMeta({
          video_id:     data.video_id ?? '',
          title:        data.video_meta.title        ?? null,
          product_name: data.video_meta.product_name ?? null,
          niche:        data.video_meta.niche         ?? null,
        })
      }
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
    setForm({ product_name: '', category: '', pain_points: [], price_point: undefined })
    setStage('error')
  }, [])

  function reset() {
    handleIntent('RESET')
    setStage('url_input')
    setVideoMeta(null)
    setForm({ product_name: '', category: '', pain_points: [], price_point: undefined })
    breakdownIdRef.current = null
    setBreakdownId(null)
    setResult(null)
    setResultMeta({ generated_at: null, pipeline_ms: null, has_audio: false })
    setTranscript([])
    setErrorMsg(null)
    setSubmitError(null)
  }

  // url_input stage renders its own min-h-screen dark hero — outer wrapper
  // must NOT also be min-h-screen or the two stack to 200vh of scrollable space
  return (
    <div className={stage === 'url_input' ? '' : 'min-h-screen bg-white'}>

      {stage === 'url_input' && (
        /* min-h-screen: hero fills full viewport so there's no white gap below */
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex flex-col justify-center px-4 py-16">
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

      {stage === 'transcribing' && (
        <TranscribingScreen title={videoMeta?.title ?? null} />
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
        <div className="px-4 py-6 sm:py-10">
          <ResultView
            blueprint={result.blueprint}
            script={result.script}
            meta={videoMeta}
            resultMeta={resultMeta}
            transcript={transcript}
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
    </div>
  )
}
