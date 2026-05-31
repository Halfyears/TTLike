/**
 * lib/engines/language-engine.ts
 *
 * Language Profile Engine
 *
 * Derives the "physics" of language for the final script:
 * sentence energy, compression, emotion variance, tone, vocabulary, CTA style.
 *
 * Input:  structure_id + product_schema + niche
 * Output: LanguageProfile — validated against Zod schema
 */

import 'server-only'

import { runAIWaterfall } from '@/lib/ai/providers'
import { LANGUAGE_PROFILE_SYSTEM } from '@/lib/ai/prompts/reasoning-system'
import {
  LanguageProfileSchema,
  type ProductSchemaInput,
  type RouterDistribution,
  type LanguageProfile,
} from '@/lib/engines/types'

// ── User prompt builder ───────────────────────────────────────────────────────

function buildLanguagePrompt(
  structureId:   string,
  productSchema: ProductSchemaInput,
  niche:         string | null,
  routerSummary: string,
): string {
  return `Structure ID: ${structureId}

Product context:
  Category:    ${productSchema.category}
  Price:       ${productSchema.price_point != null ? `$${productSchema.price_point}` : 'not specified'}
  Pain points: ${productSchema.pain_points.join(', ')}
  Persuasion:  ${productSchema.persuasion_style ?? 'unspecified'}
  Audience:    ${productSchema.target_audience ?? 'unspecified'}
  Niche:       ${niche ?? 'general'}

Router verdict: ${routerSummary}

Define the language physics for a TikTok script using this structure and product.`
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Generate a language profile for the script renderer.
 *
 * @param structureId   Confirmed structure_id from router
 * @param productSchema Product context
 * @param niche         Video niche from ingestion signal
 * @param router        Router distribution (used for product_fit_summary context)
 */
export async function buildLanguageProfile(
  structureId:   string,
  productSchema: ProductSchemaInput,
  niche:         string | null,
  router:        RouterDistribution,
): Promise<{
  result:   LanguageProfile
  provider: string
}> {
  const userPrompt = buildLanguagePrompt(
    structureId,
    productSchema,
    niche,
    router.product_fit_summary,
  )

  const { text, provider } = await runAIWaterfall(
    LANGUAGE_PROFILE_SYSTEM,
    userPrompt,
    { groqTimeoutMs: 15_000, geminiTimeoutMs: 25_000, githubTimeoutMs: 15_000 },
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback: sensible defaults based on price point
    const isHighTicket = (productSchema.price_point ?? 0) > 80
    return {
      result: {
        sentence_energy:  isHighTicket ? 0.6 : 0.85,
        compression:      0.75,
        emotion_variance: isHighTicket ? 0.6 : 0.85,
        tone:             isHighTicket ? 'storyteller' : 'friend_talk',
        vocabulary_level: isHighTicket ? 'semi_formal' : 'casual',
        cta_style:        isHighTicket ? 'soft' : 'urgency',
      },
      provider: `${provider}:fallback`,
    }
  }

  const result = LanguageProfileSchema.parse(parsed)
  return { result, provider }
}
