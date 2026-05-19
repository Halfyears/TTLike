import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const NICHES = [
  'Beauty & Skincare', 'Fashion', 'Home & Garden', 'Tech & Gadgets',
  'Health & Fitness', 'Food & Kitchen', 'Baby & Kids', 'Pets',
  'Sports & Outdoors', 'Travel', 'DIY & Crafts', 'Books & Education',
]

const schema = z.object({
  productName: z.string().min(1).max(200),
  rawNiche: z.string().max(100).optional().default(''),
  keywords: z.string().max(300).optional().default(''),
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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const prompt = `You are a TikTok dropshipping expert. Given a viral product, generate smart form suggestions.

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

    const apiKey = process.env.GEMINI_API_KEY
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini API error')
    }

    const resData = await response.json()
    const rawText = resData.candidates[0].content.parts[0].text.trim()
    const suggestions = JSON.parse(rawText)

    return NextResponse.json(suggestions)
  } catch (err) {
    console.error('Suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
