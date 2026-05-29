/**
 * lib/engines/router.ts
 *
 * Router Engine
 *
 * Scores how well each candidate viral structure suits the specific product.
 * Input:  top-N structure candidates + product_schema (category, price, pain_points)
 * Output: RouterDistribution — probability-ranked structure list + top pick
 *
 * Uses the AI reasoning waterfall for commercial persuasion scoring.
 */

import 'server-only'

import { runAIWaterfall } from '@/lib/ai/providers'
import { ROUTER_SYSTEM } from '@/lib/ai/prompts/reasoning-system'
import {
  RouterDistributionSchema,
  type ProductSchemaInput,
  type StructureMatch,
  type RouterDistribution,
} from '@/lib/engines/types'
import type { ScoredStructure } from '@/lib/engines/structure-library'

// ── User prompt builder ───────────────────────────────────────────────────────

function buildRouterPrompt(
  productSchema: ProductSchemaInput,
  structureMatch: StructureMatch,
  candidates:    ScoredStructure[],
): string {
  const productLines = [
    `Category:       ${productSchema.category}`,
    `Price point:    $${productSchema.price_point}`,
    `Pain points:    ${productSchema.pain_points.join(', ')}`,
    productSchema.persuasion_style
      ? `Persuasion style: ${productSchema.persuasion_style}`
      : null,
    productSchema.target_audience
      ? `Target audience:  ${productSchema.target_audience}`
      : null,
  ].filter(Boolean).join('\n')

  // Include the LLM-confirmed match + all cosine candidates
  const allCandidateIds = new Set([
    structureMatch.structure_id,
    ...candidates.map(c => c.id),
  ])
  const structureLines = [...allCandidateIds]
    .map(id => {
      const c = candidates.find(s => s.id === id)
      const isBest = id === structureMatch.structure_id
      return `  ${isBest ? '★' : ' '} ${id}${c ? ` — ${c.description}` : ''}`
    })
    .join('\n')

  return `Product schema:
${productLines}

Structure candidates to score:
${structureLines}

Structure already inferred as best match by spike analysis: ${structureMatch.structure_id}
Reasoning: ${structureMatch.reasoning}

Now score each structure for commercial persuasion fit with THIS product.`
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Route the best viral structure for a specific product.
 *
 * @param productSchema   Caller-supplied product context
 * @param structureMatch  LLM-confirmed structure from structure-inference
 * @param candidates      Cosine-ranked structure candidates
 */
export async function routeStructure(
  productSchema:  ProductSchemaInput,
  structureMatch: StructureMatch,
  candidates:     ScoredStructure[],
): Promise<{
  result:   RouterDistribution
  provider: string
}> {
  const userPrompt = buildRouterPrompt(productSchema, structureMatch, candidates)

  const { text, provider } = await runAIWaterfall(
    ROUTER_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 20_000, geminiTimeoutMs: 30_000, githubTimeoutMs: 20_000 },
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback: return the spike-inferred structure with probability 1.0
    return {
      result: {
        top_structure:       structureMatch.structure_id,
        candidates:          [{ structure_id: structureMatch.structure_id, probability: 1.0, fit_reason: 'Spike-inferred fallback' }],
        product_fit_summary: `Fallback to spike-inferred structure (LLM parse failed: ${provider})`,
      },
      provider: `${provider}:fallback`,
    }
  }

  const result = RouterDistributionSchema.parse(parsed)
  return { result, provider }
}
