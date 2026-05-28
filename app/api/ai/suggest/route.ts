import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { runAIWaterfall }  from '@/lib/ai/providers'
import { z }               from 'zod'

const NICHES = [
  'Beauty & Skincare', 'Fashion', 'Home & Garden', 'Tech & Gadgets',
  'Health & Fitness', 'Food & Kitchen', 'Baby & Kids', 'Pets',
  'Sports & Outdoors', 'Travel', 'DIY & Crafts', 'Books & Education',
]

const SYSTEM = 'You are a TikTok dropshipping expert. Return raw JSON only — no markdown, no preamble.'

const schema = z.object({
  productName: z.string().min(1).max(100),
  rawNiche:    z.string().max(100).optional().default(''),
  keywords:    z.string().max(300).optional().default(''),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { productName, rawNiche, keywords } = parsed.data

    const userPrompt = `Given a viral product, generate smart form suggestions.

Product: ${productName}
Current Category: ${rawNiche || 'unknown'}
Keywords: ${keywords || 'none'}

Return a JSON object with exactly these fields:
{
  "description": "2–3 sentences describing the product, its main benefit, and the problem it solves. Conversational, benefit-first tone.",
  "targetAudience": "One specific sentence: who buys this, age range, pain point. E.g. 'Women aged 25–40 who struggle with back pain from long work hours.'",
  "niche": "Pick the single best match from this list: ${NICHES.join(', ')}",
  "nicheOptions": ["top 3 relevant niches from the list above, as an array"]
}

Return only valid JSON, no markdown.`

    const { text: rawText } = await runAIWaterfall(SYSTEM, userPrompt, {
      groqTimeoutMs:   8_000,
      geminiTimeoutMs: 15_000,
      githubTimeoutMs: 10_000,
    })
    const suggestions = JSON.parse(rawText)

    return NextResponse.json(suggestions)
  } catch (err) {
    console.error('Suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
