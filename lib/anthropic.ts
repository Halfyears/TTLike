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

  const systemPrompt = `You are an expert TikTok UGC script writer specializing in viral content for dropshipping products.
Your scripts maximize engagement, watch time, and conversions.
${brandName ? `Always use the exact brand name: "${brandName}".` : ''}
${offer     ? `Always include the offer "${offer}" verbatim in the CTA.` : ''}`

  const userPrompt = `Generate exactly ${hookTypes.length} TikTok video script(s) for this product.
Each script must use the specified hook style listed below.

Product: ${productName}
Description: ${productDescription}
Target Audience: ${targetAudience}
Niche: ${niche}
CTA Style: ${ctaStyle}
${personalLines}

Hook style assignments (one script per line):
${hookList}

For EACH script:
1. Open with a hook that matches its assigned hook style (first 3 seconds)
2. Build engagement in the body (10-20 seconds)
3. End with a CTA that ${ctaStyle}${offer ? ` and mentions "${offer}"` : ''}

Return a JSON array with exactly ${hookTypes.length} object(s):
[
  {
    "title": "Short script title including the hook style",
    "hook": "Opening hook text",
    "body": "Main content",
    "cta": "Call to action",
    "fullScript": "Complete script with timestamps"
  }
]

Return only valid JSON, no markdown.`

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
