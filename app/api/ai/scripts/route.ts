import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateScripts } from '@/lib/anthropic'
import { z } from 'zod'

const scriptRequestSchema = z.object({
  productName: z.string().min(1).max(100),
  productDescription: z.string().min(10).max(1000),
  targetAudience: z.string().min(1).max(200),
  niche: z.string().min(1).max(50),
  hookType: z.enum(['SURPRISE', 'QUESTION', 'EMOTIONAL', 'FOMO', 'CONTRARIAN', 'STORY', 'EDUCATIONAL']),
  keywords: z.string().max(300).optional(),
  brandName: z.string().max(100).optional(),
  offer: z.string().max(200).optional(),
  ctaType: z.enum(['bio', 'comment', 'dm', 'shop']).optional().default('bio'),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = scriptRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
  return NextResponse.json(
    { error: 'AI service not configured. Please set GEMINI_API_KEY in your environment.' },
    { status: 503 }
  )
}

    const scripts = await generateScripts(parsed.data)

    return NextResponse.json({ scripts, count: scripts.length })
  } catch (err) {
    console.error('Script generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate scripts. Please try again.' },
      { status: 500 }
    )
  }
}
