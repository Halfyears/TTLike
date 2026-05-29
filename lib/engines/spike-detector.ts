/**
 * lib/engines/spike-detector.ts
 *
 * Spike Detector Engine
 *
 * Analyses an IngestionSignal (video metadata + viral formulas + engagement metrics)
 * and infers likely emotional spike moments via the AI reasoning waterfall.
 *
 * Output: SpikeResult — timestamped spike map with strength scores.
 */

import 'server-only'

import { runAIWaterfall } from '@/lib/ai/providers'
import { SPIKE_DETECTION_SYSTEM } from '@/lib/ai/prompts/reasoning-system'
import { SpikeResultSchema, type IngestionSignal, type SpikeResult } from '@/lib/engines/types'

// ── User prompt builder ───────────────────────────────────────────────────────

function buildSpikePrompt(signal: IngestionSignal): string {
  const engagementRate = signal.views > 0
    ? ((signal.likes + signal.shares) / signal.views * 100).toFixed(2)
    : '0'

  // Primary source: visual_timeline from Gemini multimodal (actual video analysis)
  const timelineSection = signal.visual_timeline && signal.visual_timeline.length > 0
    ? `Scene-by-scene timeline (extracted from actual video by Gemini):
${signal.visual_timeline.map((s, i) =>
  `  Scene ${i + 1} [${s.timecode}]\n` +
  `    Audio: "${s.audio}"\n` +
  `    Visual: ${s.visual}\n` +
  `    Why it works: ${s.why_this_works}`
).join('\n')}`
    : '  (no scene timeline available — use viral formula timestamps)'

  // Secondary source: viral formulas with timestamps
  const formulaSummary = signal.viral_formulas.length > 0
    ? signal.viral_formulas.slice(0, 3).map((f, i) =>
        `  Formula ${i + 1}: "${f.title}" @ ${f.timestamp ?? 'unknown'}\n` +
        `    Mechanism: ${f.mechanism}\n` +
        `    Script: ${f.example_script.slice(0, 100)}`
      ).join('\n')
    : '  (none available)'

  return `Video ID: ${signal.video_id}
Title: ${signal.title}
Product: ${signal.product_name ?? 'Unknown'}
Niche: ${signal.niche ?? 'General'}
Engagement: ${signal.metrics.views} views · ${signal.metrics.likes} likes · ${signal.metrics.shares} shares
Engagement rate: ${engagementRate}%
Viral score: ${signal.viral_score}/100

${timelineSection}

Viral formulas (timestamped):
${formulaSummary}

Use the scene timeline and formula timestamps above to identify PRECISE emotional spike moments.
The timeline data comes from real Gemini video analysis — use exact timecodes where available.`
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Detect emotional spike moments for a video using the AI reasoning waterfall.
 *
 * @param signal   Normalised IngestionSignal from ingestion.ts
 * @returns        Validated SpikeResult
 * @throws         If all AI providers fail or JSON is unparseable
 */
export async function detectSpikes(signal: IngestionSignal): Promise<{
  result:   SpikeResult
  provider: string
}> {
  const userPrompt = buildSpikePrompt(signal)

  const { text, provider } = await runAIWaterfall(
    SPIKE_DETECTION_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 20_000, geminiTimeoutMs: 30_000, githubTimeoutMs: 20_000 },
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`[spike-detector] JSON parse failed (provider: ${provider}): ${text.slice(0, 200)}`)
  }

  // Inject video_id if AI omitted it (defensive)
  if (typeof parsed === 'object' && parsed !== null && !('video_id' in parsed)) {
    (parsed as Record<string, unknown>).video_id = signal.video_id
  }

  const result = SpikeResultSchema.parse(parsed)
  return { result, provider }
}
