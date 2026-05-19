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

const HOOK_VALUES = ['SURPRISE', 'QUESTION', 'EMOTIONAL', 'FOMO', 'CONTRARIAN', 'STORY', 'EDUCATIONAL'] as const

const scriptRequestSchema = z.object({
  productName:        z.string().min(1, 'Product name is required').max(100),
  productDescription: z.string().max(1000).optional().default(''),
  targetAudience:     z.string().max(200).optional().default(''),
  niche:              z.string().max(100).optional().default('General'),
  // Accept array (new) or single string (legacy fallback)
  hookTypes:          z.array(z.enum(HOOK_VALUES)).min(1).max(5).optional(),
  hookType:           z.enum(HOOK_VALUES).optional(),
  keywords:           z.string().max(300).optional(),
  brandName:          z.string().max(100).optional(),
  offer:              z.string().max(200).optional(),
  ctaType:            z.enum(['bio', 'comment', 'dm', 'shop']).optional().default('bio'),
  sourceVideoId:      z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const parsed = scriptRequestSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors
      const first = Object.entries(fields).map(([k, v]) => `${k}: ${v?.[0]}`).join(', ')
      return NextResponse.json(
        { error: `Invalid request — ${first || 'check your inputs'}` },
        { status: 400 },
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GEMINI_API_KEY.' },
        { status: 503 },
      )
    }

    const d = parsed.data
    // Normalise: hookTypes takes priority; fall back to legacy hookType or default
    const hookTypes: string[] = d.hookTypes?.length
      ? d.hookTypes
      : d.hookType
        ? [d.hookType]
        : ['SURPRISE']

    // Cache key: sorted hook types joined (e.g. "QUESTION+SURPRISE")
    const cacheKey = [...hookTypes].sort().join('+')

    let scripts
    let fromCache = false

    // ── Cache path ────────────────────────────────────────────────────────────
    if (d.sourceVideoId) {
      const cached = await getCachedScripts(supabase, d.sourceVideoId, cacheKey)

      if (cached && cached.hitCount < REGEN_THRESHOLD) {
        incrementCacheHit(supabase, cached.cacheId)
        scripts = applyPersonalization(cached.scripts, d.brandName, d.offer, d.ctaType)
        fromCache = true
      } else {
        scripts = await generateScripts({ ...d, hookTypes })
        saveCachedScripts(supabase, d.sourceVideoId, cacheKey, scripts)
      }
    } else {
      scripts = await generateScripts({ ...d, hookTypes })
    }

    // ── Save to user history ──────────────────────────────────────────────────
    supabase.from('generated_scripts').insert({
      user_id:         user.id,
      product_name:    d.productName,
      niche:           d.niche,
      hook_type:       cacheKey,
      scripts,
      source_video_id: d.sourceVideoId ?? null,
      keywords:        d.keywords ?? '',
      brand_name:      d.brandName ?? '',
      offer:           d.offer ?? '',
      script_count:    scripts.length,
    }).then(({ error }) => {
      if (error) console.error('History save error:', error.message)
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
