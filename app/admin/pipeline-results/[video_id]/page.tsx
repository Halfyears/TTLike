import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, ArrowLeft, Clock, BarChart2, GitBranch,
  MessageSquare, Eye, Activity, CheckCircle2,
} from 'lucide-react'
import type { VideoBreakdownPayload, ViralPipeline } from '@/lib/types/intelligence'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number) { return `${Math.round(n * 100)}%` }

function spikeColor(type: string) {
  const map: Record<string, string> = {
    hook: 'text-violet-300 bg-violet-900/30',
    chaos: 'text-red-300 bg-red-900/30',
    demo: 'text-blue-300 bg-blue-900/30',
    payoff: 'text-emerald-300 bg-emerald-900/30',
    emotion: 'text-pink-300 bg-pink-900/30',
  }
  return map[type] ?? 'text-gray-300 bg-gray-700/50'
}

function beatColor(beat: string) {
  const map: Record<string, string> = {
    HOOK: 'border-violet-500/50 bg-violet-900/10',
    CHAOS: 'border-red-500/50 bg-red-900/10',
    DEMO: 'border-blue-500/50 bg-blue-900/10',
    PAYOFF: 'border-emerald-500/50 bg-emerald-900/10',
    PROOF: 'border-teal-500/50 bg-teal-900/10',
    PROBLEM: 'border-orange-500/50 bg-orange-900/10',
    AGITATE: 'border-red-400/50 bg-red-900/10',
    SOLVE: 'border-green-500/50 bg-green-900/10',
    STORY: 'border-yellow-500/50 bg-yellow-900/10',
    RESULT: 'border-lime-500/50 bg-lime-900/10',
    REVEAL: 'border-pink-500/50 bg-pink-900/10',
    CTA: 'border-amber-500/50 bg-amber-900/10',
    SHOCK: 'border-red-600/50 bg-red-900/15',
    REFRAME: 'border-sky-500/50 bg-sky-900/10',
    COMPARISON: 'border-indigo-500/50 bg-indigo-900/10',
    WINNER: 'border-emerald-400/50 bg-emerald-900/10',
    TREND: 'border-pink-400/50 bg-pink-900/10',
    PIVOT: 'border-cyan-500/50 bg-cyan-900/10',
  }
  return map[beat] ?? 'border-gray-600/50 bg-gray-800/50'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PipelineResultsPage({
  params,
}: {
  params: Promise<{ video_id: string }>
}) {
  const { video_id } = await params
  const service = createServiceClient()

  const { data: breakdown } = await service
    .from('video_breakdowns')
    .select('id, payload, created_at, tiktok_videos!left(title, product_name, niche, views, viral_score)')
    .eq('video_id', video_id)
    .maybeSingle()

  const payload = breakdown?.payload as VideoBreakdownPayload | undefined
  const pipeline = payload?.viral_pipeline as ViralPipeline | undefined

  if (!pipeline) notFound()

  const video = (breakdown as unknown as {
    tiktok_videos: { title: string | null; product_name: string | null; niche: string | null; views: number | null; viral_score: number | null } | null
  })?.tiktok_videos
  const { reasoning, final_script, input } = pipeline

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <Link
          href="/admin/breakdowns"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Breakdowns
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-400" /> Pipeline Results
            </h1>
            {video?.title && (
              <p className="text-sm text-gray-400 mt-1 max-w-xl">
                {String(video.title)}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <p>Version: <span className="text-gray-300">{pipeline.generator_version}</span></p>
            {pipeline.pipeline_ms && (
              <p className="flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {(pipeline.pipeline_ms / 1000).toFixed(1)}s
              </p>
            )}
            <p className="font-mono text-[10px] text-gray-600">{pipeline.generation_id}</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Structure', value: reasoning?.structure_match?.structure_id ?? '—', icon: GitBranch },
          { label: 'Top Match', value: reasoning?.router?.top_structure ?? '—', icon: BarChart2 },
          { label: 'Script Lines', value: String(final_script?.lines.length ?? '—'), icon: MessageSquare },
          { label: 'Spikes Found', value: String(reasoning?.spike_result?.spikes.length ?? '—'), icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-bold text-white truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Main 3-column layout */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* LEFT — Reasoning */}
        <div className="lg:col-span-1 space-y-4">

          {/* Product Input */}
          {input?.product_schema && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gray-500" /> Product Input
              </h2>
              <div className="space-y-1.5 text-xs">
                {Object.entries(input.product_schema).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-500 shrink-0 capitalize w-28">{k.replace(/_/g, ' ')}:</span>
                    <span className="text-gray-300 break-words">
                      {Array.isArray(v) ? v.join(', ') : String(v ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Spike Detection */}
          {reasoning?.spike_result && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-gray-500" /> Spike Detection
              </h2>
              <p className="text-xs text-gray-400 italic">{reasoning.spike_result.summary}</p>
              <div className="space-y-2">
                {reasoning.spike_result.spikes.map((spike, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${spikeColor(spike.type)}`}>
                      {spike.type.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">{spike.t.toFixed(1)}s</span>
                        <div className="h-1 bg-gray-700 rounded-full flex-1 max-w-16">
                          <div
                            className="h-1 bg-violet-500 rounded-full"
                            style={{ width: pct(spike.strength) }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{pct(spike.strength)}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 truncate">{spike.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Structure Match */}
          {reasoning?.structure_match && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-2">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-gray-500" /> Structure Match
              </h2>
              <p className="text-xs font-bold text-violet-300">{reasoning.structure_match.structure_id}</p>
              <div className="flex flex-wrap gap-1">
                {reasoning.structure_match.pattern_sequence.map((beat, i) => (
                  <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                    {beat}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">{reasoning.structure_match.description}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500">Similarity:</span>
                <div className="h-1.5 bg-gray-700 rounded-full flex-1">
                  <div
                    className="h-1.5 bg-emerald-500 rounded-full"
                    style={{ width: pct(reasoning.structure_match.similarity_score) }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{pct(reasoning.structure_match.similarity_score)}</span>
              </div>
              <p className="text-[11px] text-gray-500 italic">{reasoning.structure_match.reasoning}</p>
            </section>
          )}

          {/* Router Candidates */}
          {reasoning?.router && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-gray-500" /> Router Candidates
              </h2>
              <p className="text-[11px] text-gray-400 italic">{reasoning.router.product_fit_summary}</p>
              <div className="space-y-2">
                {reasoning.router.candidates.map((c, i) => (
                  <div key={i} className={`rounded-lg p-2.5 border ${i === 0 ? 'border-violet-500/40 bg-violet-900/10' : 'border-gray-700 bg-gray-700/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-200">{c.structure_id}</span>
                      <span className="text-[10px] text-gray-400">{pct(c.probability)}</span>
                    </div>
                    <div className="h-1 bg-gray-700 rounded-full mb-1.5">
                      <div
                        className={`h-1 rounded-full ${i === 0 ? 'bg-violet-500' : 'bg-gray-500'}`}
                        style={{ width: pct(c.probability) }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">{c.fit_reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Language Profile */}
          {reasoning?.language_profile && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-2">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Language Profile</h2>
              <div className="space-y-1.5">
                {[
                  { label: 'Sentence Energy', val: reasoning.language_profile.sentence_energy },
                  { label: 'Compression',     val: reasoning.language_profile.compression },
                  { label: 'Emotion Variance', val: reasoning.language_profile.emotion_variance },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-28 shrink-0">{label}</span>
                    <div className="h-1.5 bg-gray-700 rounded-full flex-1">
                      <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: pct(val) }} />
                    </div>
                    <span className="text-[10px] text-gray-400 w-7 text-right">{pct(val)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  ['Tone', reasoning.language_profile.tone],
                  ['Vocab', reasoning.language_profile.vocabulary_level],
                  ['CTA', reasoning.language_profile.cta_style],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-700/50 rounded px-2 py-1.5 text-center">
                    <p className="text-[9px] text-gray-500 uppercase">{k}</p>
                    <p className="text-[11px] text-gray-200 font-semibold truncate">{v}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI Providers */}
          {pipeline.ai_providers && (
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-2">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">AI Providers</h2>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(pipeline.ai_providers).map(([stage, prov]) => (
                  <div key={stage} className="flex items-center justify-between bg-gray-700/40 rounded px-2 py-1">
                    <span className="text-[10px] text-gray-500 capitalize">{stage}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      prov === 'groq'   ? 'bg-green-900/40 text-green-400' :
                      prov === 'gemini' ? 'bg-blue-900/40 text-blue-400' :
                                         'bg-purple-900/40 text-purple-400'
                    }`}>{prov}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — Final Script */}
        <div className="lg:col-span-2">
          {final_script ? (
            <section className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    4-Track Script
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {final_script.lines.length} lines · {final_script.total_duration} · {final_script.structure_id}
                  </p>
                </div>
              </div>

              {/* Hook line highlight */}
              <div className="px-5 py-3 bg-violet-900/20 border-b border-violet-700/30">
                <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-1">Hook Line</p>
                <p className="text-sm text-white font-medium">"{final_script.hook_line}"</p>
              </div>

              {/* Script lines */}
              <div className="divide-y divide-gray-700/50">
                {final_script.lines.map((line) => (
                  <div key={line.sequence} className={`p-4 border-l-2 ${beatColor(line.beat)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-500 tabular-nums w-5">{line.sequence}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {line.beat}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{line.time_range}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">{line.emotion}</span>
                    </div>
                    <div className="space-y-1.5 ml-7">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-violet-400 w-6 shrink-0">SAY</span>
                        <p className="text-sm text-white leading-snug">{line.say}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-blue-400 w-6 shrink-0">DO</span>
                        <p className="text-xs text-gray-400 leading-snug">{line.do}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-gray-500 text-sm">No script generated yet.</p>
            </div>
          )}

          {/* Emotion Curve */}
          {reasoning?.emotion_curve && (
            <section className="mt-4 bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Emotion Curve
                <span className="ml-2 text-[10px] text-gray-500 normal-case font-normal">
                  arc: {reasoning.emotion_curve.overall_arc.replace(/_/g, ' ')}
                </span>
              </h2>
              <div className="flex gap-2 flex-wrap">
                {reasoning.emotion_curve.beats.map((beat, i) => (
                  <div key={i} className="bg-gray-700/50 rounded-lg px-3 py-2 text-center min-w-[80px]">
                    <p className="text-[10px] font-bold text-gray-300">{beat.beat}</p>
                    <p className="text-[9px] text-gray-500 font-mono">{beat.duration_hint}</p>
                    <div className="mt-1 space-y-0.5">
                      {beat.emotions.map((e, j) => (
                        <p key={j} className="text-[9px] text-violet-300">{e}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
