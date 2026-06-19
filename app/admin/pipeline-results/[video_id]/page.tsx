import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, GitBranch, Activity, Zap,
  ChevronRight, Mic, Video, Heart,
} from 'lucide-react'
import type { VideoBreakdownPayload, ViralPipeline } from '@/lib/types/intelligence'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number) { return `${Math.round(n * 100)}%` }

const BEAT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  HOOK:       { bg: 'bg-violet-950/60', border: 'border-violet-500/60', text: 'text-violet-300', dot: 'bg-violet-400' },
  CHAOS:      { bg: 'bg-red-950/60',    border: 'border-red-500/60',    text: 'text-red-300',    dot: 'bg-red-400' },
  DEMO:       { bg: 'bg-blue-950/60',   border: 'border-blue-500/60',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  PAYOFF:     { bg: 'bg-emerald-950/60',border: 'border-emerald-500/60',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  PROOF:      { bg: 'bg-teal-950/60',   border: 'border-teal-500/60',   text: 'text-teal-300',   dot: 'bg-teal-400' },
  PROBLEM:    { bg: 'bg-orange-950/60', border: 'border-orange-500/60', text: 'text-orange-300', dot: 'bg-orange-400' },
  AGITATE:    { bg: 'bg-rose-950/60',   border: 'border-rose-500/60',   text: 'text-rose-300',   dot: 'bg-rose-400' },
  SOLVE:      { bg: 'bg-green-950/60',  border: 'border-green-500/60',  text: 'text-green-300',  dot: 'bg-green-400' },
  STORY:      { bg: 'bg-yellow-950/60', border: 'border-yellow-500/60', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  RESULT:     { bg: 'bg-lime-950/60',   border: 'border-lime-500/60',   text: 'text-lime-300',   dot: 'bg-lime-400' },
  REVEAL:     { bg: 'bg-pink-950/60',   border: 'border-pink-500/60',   text: 'text-pink-300',   dot: 'bg-pink-400' },
  CTA:        { bg: 'bg-amber-950/60',  border: 'border-amber-500/60',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  SHOCK:      { bg: 'bg-red-950/80',    border: 'border-red-600/60',    text: 'text-red-200',    dot: 'bg-red-500' },
  REFRAME:    { bg: 'bg-sky-950/60',    border: 'border-sky-500/60',    text: 'text-sky-300',    dot: 'bg-sky-400' },
  COMPARISON: { bg: 'bg-indigo-950/60', border: 'border-indigo-500/60', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  WINNER:     { bg: 'bg-emerald-950/70',border: 'border-emerald-400/60',text: 'text-emerald-200',dot: 'bg-emerald-300' },
  TREND:      { bg: 'bg-pink-950/60',   border: 'border-pink-400/60',   text: 'text-pink-300',   dot: 'bg-pink-400' },
  PIVOT:      { bg: 'bg-cyan-950/60',   border: 'border-cyan-500/60',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
}
const DEFAULT_BEAT = { bg: 'bg-gray-800/60', border: 'border-gray-600/60', text: 'text-gray-400', dot: 'bg-gray-500' }

const SPIKE_STYLES: Record<string, string> = {
  hook:    'bg-violet-500/20 text-violet-300 border border-violet-500/40',
  chaos:   'bg-red-500/20 text-red-300 border border-red-500/40',
  demo:    'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  payoff:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  emotion: 'bg-pink-500/20 text-pink-300 border border-pink-500/40',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PipelineResultsPage({
  params,
}: {
  params: Promise<{ video_id: string }>
}) {
  const { video_id } = await params
  const service = createServiceClient()

  let { data: breakdown } = await service
    .from('video_breakdowns')
    .select('id, payload, created_at, tiktok_videos!left(title, product_name, niche, cover_url, views, viral_score)')
    .eq('video_id', video_id)
    .not('payload->viral_pipeline', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!breakdown) {
    const { data: byId } = await service
      .from('video_breakdowns')
      .select('id, payload, created_at, tiktok_videos!left(title, product_name, niche, cover_url, views, viral_score)')
      .eq('id', video_id)
      .maybeSingle()
    if (byId) breakdown = byId
  }

  const payload  = breakdown?.payload as VideoBreakdownPayload | undefined
  const pipeline = payload?.viral_pipeline as ViralPipeline | undefined
  if (!pipeline) notFound()

  type TV = { title: string|null; product_name: string|null; niche: string|null; cover_url: string|null; views: number|null; viral_score: number|null } | null
  const video = (breakdown as unknown as { tiktok_videos: TV })?.tiktok_videos
  const { reasoning, final_script, input } = pipeline

  const productName  = video?.product_name ?? video?.title ?? 'Unknown Product'
  const structure    = reasoning?.structure_match?.structure_id ?? final_script?.structure_id ?? '—'
  const patternSeq   = reasoning?.structure_match?.pattern_sequence ?? []

  return (
    <div className="max-w-5xl space-y-8 pb-16">

      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <Link
        href="/admin/breakdowns"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Breakdowns
      </Link>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-900 to-violet-950/30">
        {/* Cover blur background */}
        {video?.cover_url && (
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${video.cover_url})`, filter: 'blur(20px)' }}
          />
        )}

        <div className="relative p-6 flex gap-5 items-start">
          {/* Cover thumbnail */}
          {video?.cover_url && (
            <img
              src={video.cover_url}
              alt={productName}
              className="h-24 w-16 object-cover rounded-lg shrink-0 shadow-lg"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30 uppercase tracking-wide">
                Pipeline v{pipeline.generator_version}
              </span>
              {video?.niche && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300">
                  {video.niche}
                </span>
              )}
              {input?.product_schema?.['price_point'] != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                  ${String(input.product_schema['price_point'])}
                </span>
              )}
              {pipeline.pipeline_ms && (
                <span className="text-[10px] text-gray-500 flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {(pipeline.pipeline_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            {/* Product name */}
            <h1 className="text-xl font-black text-white leading-tight mb-2 line-clamp-2">
              {productName}
            </h1>

            {/* Hook line */}
            {final_script?.hook_line && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-violet-400 shrink-0 mt-0.5 uppercase tracking-wider">Hook</span>
                <p className="text-sm text-violet-100 italic leading-snug">
                  &ldquo;{final_script.hook_line}&rdquo;
                </p>
              </div>
            )}

            {/* Structure pill row */}
            {patternSeq.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {patternSeq.map((beat, i) => {
                  const c = BEAT_COLORS[beat] ?? DEFAULT_BEAT
                  return (
                    <span key={i} className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                        {beat}
                      </span>
                      {i < patternSeq.length - 1 && (
                        <ChevronRight className="h-2.5 w-2.5 text-gray-600" />
                      )}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-gray-700/60 px-6 py-3 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <GitBranch className="h-3.5 w-3.5 text-violet-400" />
            <span className="font-mono text-violet-300 font-semibold">{structure}</span>
          </div>
          {final_script && (
            <>
              <div className="text-gray-500">·</div>
              <span className="text-gray-400">{final_script.lines.length} lines</span>
              <div className="text-gray-500">·</div>
              <span className="text-gray-400 font-mono">{final_script.total_duration}</span>
            </>
          )}
          {reasoning?.spike_result && (
            <>
              <div className="text-gray-500">·</div>
              <div className="flex items-center gap-1 text-gray-400">
                <Activity className="h-3.5 w-3.5 text-pink-400" />
                {reasoning.spike_result.spikes.length} spikes
              </div>
            </>
          )}
          {reasoning?.structure_match?.similarity_score && (
            <>
              <div className="text-gray-500">·</div>
              <span className="text-gray-400">
                {pct(reasoning.structure_match.similarity_score)} match
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── 4-Track Script (主体) ──────────────────────────────────────────── */}
      {final_script && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-violet-400" /> 4-Track Script
          </h2>

          <div className="space-y-3">
            {final_script.lines.map((line) => {
              const c = BEAT_COLORS[line.beat] ?? DEFAULT_BEAT
              return (
                <div
                  key={line.sequence}
                  className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}
                >
                  {/* Line header */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border} uppercase tracking-wide`}>
                      {line.beat}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">{line.time_range}</span>
                    <span className="ml-auto text-[10px] text-gray-600 italic">{line.emotion}</span>
                  </div>

                  {/* Line content */}
                  <div className="px-4 py-3 space-y-2.5">
                    {/* SAY */}
                    <div className="flex gap-3 items-start">
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <Mic className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase">Say</span>
                      </div>
                      <p className="text-[15px] text-white font-medium leading-snug">
                        {line.say}
                      </p>
                    </div>

                    {/* DO */}
                    <div className="flex gap-3 items-start">
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <Video className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Do</span>
                      </div>
                      <p className="text-[13px] text-gray-400 leading-snug">
                        {line.do}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Analysis Grid (3 cols) ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Spike Detection */}
        {reasoning?.spike_result && (
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-pink-400" /> Spike Map
            </h3>
            <p className="text-[11px] text-gray-500 italic leading-snug">{reasoning.spike_result.summary}</p>
            <div className="space-y-2.5">
              {reasoning.spike_result.spikes.map((spike, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${SPIKE_STYLES[spike.type] ?? 'bg-gray-700 text-gray-400'}`}>
                      {spike.type}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{spike.t.toFixed(1)}s</span>
                    <span className="text-[10px] text-gray-600 ml-auto">{pct(spike.strength)}</span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                      style={{ width: pct(spike.strength) }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-snug">{spike.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Router + Structure */}
        <div className="space-y-3">
          {reasoning?.structure_match && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-violet-400" /> Structure
              </h3>
              <p className="text-xs font-black text-violet-300 font-mono">{reasoning.structure_match.structure_id}</p>
              <p className="text-[11px] text-gray-500 leading-snug">{reasoning.structure_match.description}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Cosine similarity</span>
                  <span className="text-gray-300 font-mono">{pct(reasoning.structure_match.similarity_score)}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full">
                  <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: pct(reasoning.structure_match.similarity_score) }} />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 italic leading-snug">{reasoning.structure_match.reasoning}</p>
            </div>
          )}

          {reasoning?.router && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-2.5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Router</h3>
              <p className="text-[10px] text-gray-500 italic leading-snug">{reasoning.router.product_fit_summary}</p>
              <div className="space-y-2">
                {reasoning.router.candidates.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[10px] font-bold font-mono ${i === 0 ? 'text-violet-300' : 'text-gray-400'}`}>
                        {c.structure_id}
                      </span>
                      <span className="text-[10px] text-gray-500">{pct(c.probability)}</span>
                    </div>
                    <div className="h-1 bg-gray-700 rounded-full">
                      <div
                        className={`h-1 rounded-full ${i === 0 ? 'bg-violet-500' : 'bg-gray-600'}`}
                        style={{ width: pct(c.probability) }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5 leading-snug">{c.fit_reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language + Emotion + Providers */}
        <div className="space-y-3">
          {reasoning?.language_profile && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Language</h3>
              <div className="space-y-2">
                {[
                  { label: 'Energy',   val: reasoning.language_profile.sentence_energy },
                  { label: 'Compress', val: reasoning.language_profile.compression },
                  { label: 'Emotion',  val: reasoning.language_profile.emotion_variance },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 w-14 shrink-0">{label}</span>
                    <div className="h-1 bg-gray-700 rounded-full flex-1">
                      <div className="h-1 bg-violet-500 rounded-full" style={{ width: pct(val) }} />
                    </div>
                    <span className="text-[9px] text-gray-500 w-7 text-right tabular-nums">{pct(val)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  reasoning.language_profile.tone,
                  reasoning.language_profile.vocabulary_level,
                  reasoning.language_profile.cta_style,
                ].map(v => (
                  <span key={v} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase tracking-wide">
                    {String(v).replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {reasoning?.emotion_curve && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-2.5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-pink-400" /> Emotion Curve
                <span className="text-[9px] text-gray-600 normal-case font-normal ml-auto">
                  {reasoning.emotion_curve.overall_arc.replace(/_/g, ' ')}
                </span>
              </h3>
              <div className="flex flex-wrap gap-1">
                {reasoning.emotion_curve.beats.map((beat, i) => {
                  const c = BEAT_COLORS[beat.beat] ?? DEFAULT_BEAT
                  return (
                    <div key={i} className={`flex-1 min-w-[60px] rounded-lg p-1.5 text-center border ${c.border} ${c.bg}`}>
                      <p className={`text-[9px] font-black uppercase ${c.text}`}>{beat.beat}</p>
                      <div className="mt-0.5 space-y-0.5">
                        {beat.emotions.slice(0, 2).map((e, j) => (
                          <p key={j} className="text-[8px] text-gray-400 leading-tight">{e}</p>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {pipeline.ai_providers && (
            <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 space-y-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Providers</h3>
              <div className="space-y-1">
                {Object.entries(pipeline.ai_providers).map(([stage, prov]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 capitalize">{stage}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      prov === 'groq'   ? 'bg-green-900/50 text-green-400' :
                      prov === 'gemini' ? 'bg-blue-900/50 text-blue-400' :
                                         'bg-purple-900/50 text-purple-400'
                    }`}>{prov}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
