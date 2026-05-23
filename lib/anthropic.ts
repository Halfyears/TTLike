import 'server-only'

type Script = { title: string; hook: string; body: string; cta: string; fullScript: string }

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
}): Promise<Script[]> {
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

  // Build per-hook instructions
  const hookList = hookTypes
    .map((h, i) => `Script ${i + 1}: hook style = ${h}`)
    .join('\n')

  const systemPrompt = `You are a cold, metrics-driven direct-response TikTok ad copywriter. Generate optimized UGC scripts for dropshipping products.
OUTPUT RULES:
1. Output raw JSON only — no markdown, no preamble, no commentary.
2. Every spoken line must be a dense, direct sentence. Zero filler phrases.
3. fullScript must follow the scene-by-scene timestamp format below exactly.
${brandName ? `Brand name (use verbatim): "${brandName}".` : ''}
${offer     ? `Offer (include verbatim in CTA): "${offer}".` : ''}`

  const userPrompt = `Generate exactly ${hookTypes.length} TikTok UGC script(s).

Product: ${productName}
Description: ${productDescription}
Audience: ${targetAudience}
Niche: ${niche}
CTA method: ${ctaStyle}
${personalLines}

Hook assignments:
${hookList}

For EACH script, the fullScript field MUST use this scene format:
[00:00 - 00:03] Scene 1: Opening Hook
• VISUAL: [exact phone-shooting instruction]
• AUDIO: "[spoken line matching hook type]"

[00:04 - 00:18] Scene 2: Pain Point + Product Demo
• VISUAL: [close-up instruction]
• AUDIO: "[spoken line targeting the core consumer pain]"

[00:19 - 00:28] Scene 3: Social Proof / Key Benefit
• VISUAL: [instruction]
• AUDIO: "[one concrete proof point or benefit]"

[00:29 - 00:35] Scene 4: CTA
• VISUAL: [instruction]
• AUDIO: "[exact CTA line — ${ctaStyle}${offer ? ` — include "${offer}"` : ''}]"

Return a JSON array with exactly ${hookTypes.length} object(s):
[
  {
    "title": "Short script title with hook style",
    "hook": "Opening hook line only",
    "body": "Core selling proposition (1-2 sentences)",
    "cta": "Closing CTA line only",
    "fullScript": "[scene-by-scene breakdown as specified above]"
  }
]

Return only valid JSON. No markdown.`

  const apiKey = process.env.GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!response.ok) {
    const errData = await response.json()
    throw new Error(errData.error?.message || 'Gemini API error')
  }

  const resData = await response.json()
  const rawText = resData.candidates[0].content.parts[0].text.trim()

  try {
    return JSON.parse(rawText) as Script[]
  } catch {
    console.error('JSON parse failed, raw:', rawText)
    throw new Error('AI returned unparseable response')
  }
}
