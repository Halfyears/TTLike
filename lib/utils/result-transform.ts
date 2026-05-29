/**
 * lib/utils/result-transform.ts
 *
 * Transforms ViralPipeline internal data into user-facing Creative Blueprint + Script Layer.
 * Hides all internal engine names (Spike/Structure/Router/Language Profile).
 */

import type { ViralPipeline } from '@/lib/types/intelligence'

// ── Output Types ──────────────────────────────────────────────────────────────

export interface KeyMoment {
  beat:      string  // friendly label, e.g. "Opening Hook", "Problem Reveal"
  timecode:  string  // e.g. "00:00–00:03"
  emotions:  string[]
}

export interface CreativeBlueprint {
  hook:        string   // first spoken line
  emotion_arc: string   // e.g. "tension_release"
  duration:    string   // e.g. "00:45"
  key_moments: KeyMoment[]
}

export interface ScriptLine {
  time_range: string
  say:        string
  do:         string
  emotion:    string
  beat:       string
}

export interface ScriptLayer {
  lines:          ScriptLine[]
  total_duration: string
}

export interface StudioResult {
  creative_blueprint: CreativeBlueprint
  script_layer:       ScriptLayer
}

// ── Beat → friendly label map ─────────────────────────────────────────────────

const BEAT_LABELS: Record<string, string> = {
  HOOK:       'Opening Hook',
  CHAOS:      'Pattern Interrupt',
  DEMO:       'Product Moment',
  PAYOFF:     'Big Reveal',
  PROOF:      'Social Proof',
  PROBLEM:    'Problem Reveal',
  AGITATE:    'Pain Amplify',
  SOLVE:      'Solution Drop',
  STORY:      'Story Setup',
  RESULT:     'Result Reveal',
  REVEAL:     'Big Reveal',
  CTA:        'Call to Action',
  SHOCK:      'Shock Moment',
  REFRAME:    'Reframe',
  COMPARISON: 'Comparison',
  WINNER:     'Winner Reveal',
  TREND:      'Trend Hook',
  PIVOT:      'Pivot Moment',
}

function friendlyBeat(beat: string): string {
  return BEAT_LABELS[beat.toUpperCase()] ?? beat
}

// ── Transform function ────────────────────────────────────────────────────────

export function viralPipelineToStudioResult(vp: ViralPipeline): StudioResult {
  const script       = vp.final_script
  const emotionCurve = vp.reasoning?.emotion_curve

  const lines: ScriptLine[] = (script?.lines ?? []).map(l => ({
    time_range: l.time_range,
    say:        l.say,
    do:         l.do,
    emotion:    l.emotion,
    beat:       friendlyBeat(l.beat),
  }))

  const key_moments: KeyMoment[] = (emotionCurve?.beats ?? []).map((b, i) => {
    const matchingLine = script?.lines?.find(l => l.beat === b.beat)
    return {
      beat:     friendlyBeat(b.beat),
      timecode: matchingLine?.time_range ?? b.duration_hint ?? `~${i * 8}s`,
      emotions: b.emotions,
    }
  })

  return {
    creative_blueprint: {
      hook:        script?.hook_line ?? lines[0]?.say ?? '',
      emotion_arc: emotionCurve?.overall_arc ?? 'tension_release',
      duration:    script?.total_duration ?? '',
      key_moments,
    },
    script_layer: {
      lines,
      total_duration: script?.total_duration ?? '',
    },
  }
}
