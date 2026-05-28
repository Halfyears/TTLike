import 'server-only'
import { runAIWaterfall } from '@/lib/ai/providers'

/**
 * Slot-filling script schema.
 * Each slot is defined ONCE by the LLM; [SLOT:key] markers in fullScript
 * are substituted before the response is returned to the client.
 * This pattern cuts LLM output tokens ~40-50% vs repeating phrases verbatim.
 */
export type ScriptSlots = {
  pain_point:   string   // core consumer pain (used in hook + body)
  product_name: string   // exact product name
  key_benefit:  string   // top product benefit (used in demo + proof)
  proof_line:   string   // one concrete social-proof or stat sentence
  cta_line:     string   // full CTA line ready to record
}

type Script = {
  title:      string
  hook:       string
  body:       string
  cta:        string
  fullScript: string
  slots?:     ScriptSlots
}

export type GenerateScriptsResult = { scripts: Script[]; provider: string }

export async function generateScripts(params: {
  hookTypes: string[]          // one script generated per hook type, max 5
  niches: string[]             // target niche(s)
  productName: string
  productDescription: string
  targetAudience: string
  niche?: string               // legacy single-niche fallback
  keywords?: string
  brandName?: string
  offer?: string
  ctaType?: string
}): Promise<GenerateScriptsResult> {
  const { hookTypes, productName, keywords, brandName, offer, ctaType } = params
  const niche = params.niches?.length ? params.niches.join(', ') : (params.niche ?? 'General')

  const productDescription = params.productDescription?.trim() ||
    `A trending ${niche} product on TikTok — ${productName}`
  const targetAudience = params.targetAudience?.trim() ||
    `TikTok shoppers interested in ${niche}`

  const ctaInstructions: Record<string, string> = {
    bio:     'direct viewers to the link in bio to purchase',
    comment: 'ask viewers to comment a keyword (e.g. "WANT") to get the link',
    dm:      'tell viewers to DM you for more info or the link',
    shop:    'direct viewers to click the TikTok Shop link in the video',
  }
  const ctaStyle = ctaInstructions[ctaType ?? 'bio'] ?? ctaInstructions.bio

  const brandLine    = brandName ? `Brand: ${brandName}` : ''
  const offerLine    = offer     ? `Exclusive Offer: ${offer} — weave this naturally into the CTA` : ''
  const keywordsLine = keywords  ? `Keywords / Context: ${keywords}` : ''
  const personalLines = [brandLine, offerLine, keywordsLine].filter(Boolean).join('\n')

  const hookList = hookTypes
    .map((h, i) => `Script ${i + 1}: hook style = ${h}`)
    .join('\n')

  const systemPrompt = `You are a cold, metrics-driven direct-response TikTok ad copywriter. Generate optimized UGC scripts for dropshipping products.

OUTPUT RULES:
1. Output raw JSON only — no markdown, no preamble, no commentary.
2. Every spoken line must be a dense, direct sentence. Zero filler phrases.
3. Use SLOT-FILLING for token efficiency: define each reusable phrase ONCE in "slots", then reference it as [SLOT:key] in fullScript.
4. fullScript MUST use [SLOT:key] markers where slot values apply — never repeat the full phrase.
${brandName ? `5. Brand name (use verbatim): "${brandName}".` : ''}
${offer     ? `6. Offer (include verbatim in CTA): "${offer}".` : ''}`

  const userPrompt = `Generate exactly ${hookTypes.length} TikTok UGC script(s).

Product: ${productName}
Description: ${productDescription}
Audience: ${targetAudience}
Niche: ${niche}
CTA method: ${ctaStyle}
${personalLines}

Hook assignments:
${hookList}

SLOT KEYS (define once, reference with [SLOT:key] in fullScript):
  pain_point   — the single core consumer pain this product solves
  product_name — exact product name
  key_benefit  — the top benefit/feature (1 short phrase)
  proof_line   — one concrete proof stat or social-proof sentence
  cta_line     — the full closing CTA line ready to speak

fullScript scene format (use [SLOT:key] markers):
[00:00 - 00:03] HOOK
• VISUAL: [exact phone-shooting instruction]
• AUDIO: "[spoken hook line — may use [SLOT:pain_point]]"

[00:04 - 00:18] DEMO
• VISUAL: [close-up instruction for [SLOT:product_name]]
• AUDIO: "[demo line — use [SLOT:key_benefit]]"

[00:19 - 00:28] PROOF
• VISUAL: [instruction]
• AUDIO: "[SLOT:proof_line]"

[00:29 - 00:35] CTA
• VISUAL: [instruction]
• AUDIO: "[SLOT:cta_line]"

Return a JSON array with exactly ${hookTypes.length} object(s):
[
  {
    "title": "Short script title with hook style",
    "hook": "Opening hook line only",
    "body": "Core selling proposition (1-2 sentences)",
    "cta": "Closing CTA line only",
    "slots": {
      "pain_point": "...",
      "product_name": "...",
      "key_benefit": "...",
      "proof_line": "...",
      "cta_line": "..."
    },
    "fullScript": "[scene-by-scene with [SLOT:key] markers as specified above]"
  }
]

Return only valid JSON. No markdown.`

  // Scripts can be long — give each provider generous time
  // Worst case: Groq 12s + Gemini 35s + GitHub 15s = 62s (within Vercel 60s with cache)
  const { text: rawText, provider } = await runAIWaterfall(systemPrompt, userPrompt, {
    groqTimeoutMs:   12_000,
    geminiTimeoutMs: 35_000,
    githubTimeoutMs: 15_000,
  })

  let scripts: Script[]
  try {
    scripts = JSON.parse(rawText) as Script[]
  } catch {
    console.error('[anthropic] JSON parse failed, raw:', rawText.slice(0, 400))
    throw new Error('AI returned unparseable response — try again')
  }

  // ── Slot substitution: replace [SLOT:key] markers in fullScript ──────────────
  const resolved = scripts.map(script => {
    if (!script.slots || !script.fullScript) return script

    const slots = script.slots
    const substituted = script.fullScript.replace(
      /\[SLOT:(\w+)\]/g,
      (_, key) => (slots as Record<string, string>)[key] ?? `[${key}]`,
    )
    return { ...script, fullScript: substituted }
  })

  return { scripts: resolved, provider }
}
