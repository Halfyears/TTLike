import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateScripts } from '@/lib/anthropic'
import {
  getCachedScripts,
  saveCachedScripts,
  incrementCacheHit,
  applyPersonalization,
  REGEN_THRESHOLD,
} from '@/lib/scriptCache'
import { z } from 'zod'

const scriptRequestSchema = z.object({
  productName:     z.string().min(1).max(100),
  productDescription: z.string().max(1000).optional().default(''),
  targetAudience:  z.string().max(200).optional().default(''),
  niche:           z.string().min(1).max(100),
  hookType:        z.enum(['SURPRISE', 'QUESTION', 'EMOTIONAL', 'FOMO', 'CONTRARIAN', 'STORY', 'EDUCATIONAL']),
  keywords:        z.string().max(300).optional(),
  brandName:       z.string().max(100).optional(),
  offer:           z.string().max(200).optional(),
  ctaType:         z.enum(['bio', 'comment', 'dm', 'shop']).optional().default('bio'),
  sourceVideoId:   z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const parsed = scriptRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GEMINI_API_KEY in your environment.' },
        { status: 503 },
      )
    }

    const { sourceVideoId, hookType, brandName, offer, ctaType, productName, niche } = parsed.data
    let scripts
    let fromCache = false

    // ── Cache path (only when request comes from a known video) ──────────────
    if (sourceVideoId) {
      const cached = await getCachedScripts(supabase, sourceVideoId, hookType)

      if (cached && cached.hitCount < REGEN_THRESHOLD) {
        // Serve from cache — increment hit counter asynchronously
        incrementCacheHit(supabase, cached.cacheId)
        scripts = applyPersonalization(cached.scripts, brandName, offer, ctaType)
        fromCache = true
      } else {
        // Cache miss or threshold exceeded — generate fresh
        scripts = await generateScripts(parsed.data)
        saveCachedScripts(supabase, sourceVideoId, hookType, scripts)
      }
    } else {
      // Manual entry (no source video) — always generate
      scripts = await generateScripts(parsed.data)
    }

    // ── Always save to user's personal history ────────────────────────────────
    supabase.from('generated_scripts').insert({
      user_id:         user.id,
      product_name:    productName,
      niche,
      hook_type:       hookType,
      scripts,
      source_video_id: sourceVideoId ?? null,
      keywords:        parsed.data.keywords ?? '',
      brand_name:      brandName ?? '',
      offer:           offer ?? '',
      script_count:    scripts.length,
    }).then(({ error }) => {
      if (error) console.error('Failed to save scripts to history:', error.message)
    })

    return NextResponse.json({ scripts, count: scripts.length, fromCache })
  } catch (err) {
    console.error('Script generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate scripts. Please try again.' },
      { status: 500 },
    )
  }
}
