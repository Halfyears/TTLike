/**
 * lib/engines/structure-inference.ts
 *
 * Structure Inference Engine
 *
 * Two-phase approach (Spec A audit recommendation):
 *   Phase 1 (pure TS): buildFeatureVector → matchStructure (cosine similarity)
 *                      → top-N candidates ranked by similarity score
 *   Phase 2 (LLM):     AI reasoning waterfall confirms the best match,
 *                      explains WHY it fits the specific spike pattern
 *
 * Output: StructureMatch — confirmed structure with reasoning.
 */

import 'server-only'

import { runAIWaterfall } from '@/lib/ai/providers'
import { STRUCTURE_INFERENCE_SYSTEM } from '@/lib/ai/prompts/reasoning-system'
import {
  StructureMatchSchema,
  type SpikeResult,
  type StructureMatch,
  type BeatName,
} from '@/lib/engines/types'

// Valid beat names for safe fallback filtering
const KNOWN_BEATS = new Set<string>([
  'HOOK','CHAOS','DEMO','PAYOFF','PROOF','PROBLEM','AGITATE','SOLVE',
  'STORY','RESULT','REVEAL','CTA','SHOCK','REFRAME','COMPARISON','WINNER',
  'TREND','PIVOT',
])
import {
  buildFeatureVector,
  matchStructure,
  type ScoredStructure,
} from '@/lib/engines/structure-library'

// ── User prompt builder ───────────────────────────────────────────────────────

function buildStructurePrompt(
  spikeResult:  SpikeResult,
  candidates:   ScoredStructure[],
): string {
  const spikeLines = spikeResult.spikes
    .map(s => `  t=${s.t}s  type=${s.type}  strength=${s.strength.toFixed(2)}  "${s.label}"`)
    .join('\n')

  const candidateLines = candidates
    .map((c, i) =>
      `  ${i + 1}. ${c.id} (cosine=${c.cosine_similarity.toFixed(3)})\n` +
      `     pattern: [${c.pattern_sequence.join(' → ')}]\n` +
      `     description: ${c.description}`,
    )
    .join('\n')

  return `Spike map for video "${spikeResult.video_id}":
${spikeLines}

Spike summary: ${spikeResult.summary}

Top candidate structures (ranked by cosine similarity):
${candidateLines}

Confirm the best matching structure from this candidates list.`
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Infer the viral structure that best matches a video's spike pattern.
 *
 * @param spikeResult   Output from spike-detector
 * @param topN          How many cosine candidates to pass to the LLM (default 3)
 */
export async function inferStructure(
  spikeResult: SpikeResult,
  topN = 3,
): Promise<{
  result:   StructureMatch
  provider: string
  candidates: ScoredStructure[]
}> {
  // ── Phase 1: cosine similarity (pure TS, no LLM) ──────────────────────────
  const featureVec  = buildFeatureVector(spikeResult.spikes)
  const candidates  = matchStructure(featureVec, topN)

  // ── Phase 2: LLM confirmation ─────────────────────────────────────────────
  const userPrompt  = buildStructurePrompt(spikeResult, candidates)

  const { text, provider } = await runAIWaterfall(
    STRUCTURE_INFERENCE_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 20_000, geminiTimeoutMs: 30_000, githubTimeoutMs: 20_000 },
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback: trust the top cosine match without LLM confirmation
    // Filter pattern_sequence to only known beat names before Zod parse
    const top = candidates[0]!
    const safePattern = top.pattern_sequence
      .filter((b): b is BeatName => KNOWN_BEATS.has(b))
    return {
      result: StructureMatchSchema.parse({
        structure_id:     top.id,
        pattern_sequence: safePattern.length >= 2 ? safePattern : ['HOOK', 'CTA'],
        similarity_score: top.cosine_similarity,
        description:      top.description,
        reasoning:        `Cosine similarity fallback (LLM parse failed, provider: ${provider})`,
      }),
      provider: `${provider}:fallback`,
      candidates,
    }
  }

  // Validate — throws ZodError on schema mismatch
  const result = StructureMatchSchema.parse(parsed)
  return { result, provider, candidates }
}
