/**
 * lib/engines/structure-library.ts
 *
 * Loads the pre-built structure library from JSON and provides:
 *   - getStructureLibrary()  — all 8 structures
 *   - matchStructure(featureVector, topN) — cosine similarity ranking
 *   - getStructureById(id)   — direct lookup
 *
 * Pure TypeScript, no LLM calls.
 * The cosine similarity operates on fixed-length 8-dimensional feature vectors.
 *
 * Feature vector dimensions (indices 0–7):
 *   0: hook_intensity    — how strong the opening spike is
 *   1: chaos_presence    — tension/conflict in the middle
 *   2: demo_weight       — product demonstration emphasis
 *   3: payoff_strength   — resolution/satisfaction intensity
 *   4: proof_reliance    — social proof / stat dependency
 *   5: pain_focus        — pain-intercept framing
 *   6: narrative_depth   — story arc length
 *   7: curiosity_loop    — mystery/reveal mechanics
 */

import structureLibraryData from '@/lib/ai/structure-library.json'

export interface StructureDefinition {
  id:               string
  pattern_sequence: string[]
  description:      string
  best_for:         string[]
  price_range:      [number, number]
  avg_duration_s:   number
  feature_vector:   number[]  // 8-dimensional
}

export interface ScoredStructure extends StructureDefinition {
  cosine_similarity: number
}

// ── Load library ──────────────────────────────────────────────────────────────

const LIBRARY: StructureDefinition[] = (
  structureLibraryData as unknown as { structures: StructureDefinition[] }
).structures

// ── Cosine similarity ─────────────────────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0)
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0))
}

function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a)
  const magB = magnitude(b)
  if (magA === 0 || magB === 0) return 0
  return dotProduct(a, b) / (magA * magB)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all structures in the library.
 */
export function getStructureLibrary(): StructureDefinition[] {
  return LIBRARY
}

/**
 * Find the top-N matching structures for a given 8-dimensional feature vector.
 *
 * @param featureVector  8-element array [hook_intensity, chaos, demo, payoff, proof, pain, narrative, curiosity]
 * @param topN           How many top matches to return (default 3)
 */
export function matchStructure(featureVector: number[], topN = 3): ScoredStructure[] {
  if (featureVector.length !== 8) {
    throw new Error(`Feature vector must have 8 dimensions, got ${featureVector.length}`)
  }

  return LIBRARY
    .map(structure => ({
      ...structure,
      cosine_similarity: cosineSimilarity(featureVector, structure.feature_vector),
    }))
    .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
    .slice(0, topN)
}

/**
 * Build a feature vector from a spike result's spike types and strengths.
 * Maps spike attributes to the 8 feature dimensions.
 *
 * @param spikes  Array of {type, strength} objects from SpikeResult
 */
export function buildFeatureVector(
  spikes: Array<{ type: string; strength: number }>,
): number[] {
  // Accumulate signal per dimension from spikes
  const dims = new Array<number>(8).fill(0)

  for (const spike of spikes) {
    switch (spike.type) {
      case 'hook':    dims[0] = Math.max(dims[0]!, spike.strength); break
      case 'chaos':   dims[1] = Math.max(dims[1]!, spike.strength); break
      case 'demo':    dims[2] = Math.max(dims[2]!, spike.strength); break
      case 'payoff':  dims[3] = Math.max(dims[3]!, spike.strength); break
      case 'emotion':
        // emotion spikes spread across proof (4) and pain (5)
        dims[4] = Math.max(dims[4]!, spike.strength * 0.6)
        dims[5] = Math.max(dims[5]!, spike.strength * 0.7)
        break
      default: break
    }
  }

  // Infer narrative depth and curiosity from spike distribution
  const hookToPayoff = (dims[0]! + dims[3]!) / 2
  dims[6] = hookToPayoff > 0.6 ? hookToPayoff * 0.8 : 0   // narrative_depth
  dims[7] = dims[1]! > 0.7 && dims[3]! > 0.6 ? 0.8 : 0   // curiosity_loop: chaos + payoff

  // Fallback: if emotion-only spikes produced a zero vector, apply a minimal
  // generic signal so cosine similarity can still return meaningful rankings
  const total = dims.reduce((s, v) => s + v, 0)
  if (total === 0) {
    // Default to a mild hook + payoff signal (broadest match pattern)
    dims[0] = 0.5
    dims[3] = 0.5
  }

  return dims
}

/**
 * Direct lookup by structure_id. Returns undefined if not found.
 */
export function getStructureById(id: string): StructureDefinition | undefined {
  return LIBRARY.find(s => s.id === id)
}

/**
 * Returns structures filtered to those suitable for a given price point.
 * Useful for the router engine to pre-filter candidates.
 */
export function filterByPrice(price: number): StructureDefinition[] {
  return LIBRARY.filter(s => price >= s.price_range[0] && price <= s.price_range[1])
}
