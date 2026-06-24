import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateScripts } from '@/lib/anthropic'
import {
  getCachedScripts,
  saveCachedScripts,
  incrementCacheHit,
  applyPersonalization,
  REGEN_THRESHOLD,
} from '@/lib/scriptCache'
import { dispatch } from '@/lib/ledger'
import { z } from 'zod'

const HOOK_VALUES = ['SURPRISE', 'QUESTION', 'EMOTIONAL', 'FOMO', 'CONTRARIAN', 'STORY', 'EDUCATIONAL'] as const

const scriptRequestSchema = z.object({
  productName:        z.string().min(1, 'Product name is required').max(100),
  productDescription: z.string().max(1000).optional().default(''),
  targetAudience:     z.string().max(200).optional().default(''),
  niches:             z.array(z.string().max(100)).min(1).max(10).optional(),
  niche:              z.string().max(100).optional().default('General'), // legacy fallback
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

    const d = parsed.data
    // Normalise hookTypes
    const hookTypes: string[] = d.hookTypes?.length
      ? d.hookTypes
      : d.hookType ? [d.hookType] : ['SURPRISE']

    // Normalise niches
    const niches: string[] = d.niches?.length
      ? d.niches
      : d.niche ? [d.niche] : ['General']
    const nicheLabel = niches.join(', ')

    // Cache key: sorted hook types joined (e.g. "QUESTION+SURPRISE")
    const cacheKey = [...hookTypes].sort().join('+')

    let scripts
    let fromCache  = false
    let aiProvider = 'cache'

    /** One automatic retry on transient AI failures (timeout / empty candidates) */
    async function generateWithRetry() {
      try {
        return await generateScripts({ ...d, hookTypes, niches })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        // Retry on timeout or empty-candidates — not on auth / bad-request errors
        const isTransient = msg.includes('AbortError') || msg.includes('no candidates')
          || msg.includes('unparseable') || msg.includes('fetch') || msg.includes('504') || msg.includes('503')
        if (!isTransient) throw err
        console.warn('[scripts] transient AI error, retrying once:', msg)
        await new Promise(r => setTimeout(r, 1_500))
        return await generateScripts({ ...d, hookTypes, niches })
      }
    }

    // ── Cache path ────────────────────────────────────────────────────────────
    if (d.sourceVideoId) {
      const cached = await getCachedScripts(supabase, d.sourceVideoId, cacheKey)

      if (cached && cached.hitCount < REGEN_THRESHOLD) {
        incrementCacheHit(supabase, cached.cacheId).catch(err =>
          console.error('Cache hit-count increment failed:', err instanceof Error ? err.message : err))
        scripts   = applyPersonalization(cached.scripts, d.brandName, d.offer, d.ctaType)
        fromCache = true
      } else {
        const result = await generateWithRetry()
        scripts    = result.scripts
        aiProvider = result.provider
        saveCachedScripts(supabase, d.sourceVideoId, cacheKey, scripts).catch(err =>
          console.error('Script cache save failed:', err instanceof Error ? err.message : err))
      }
    } else {
      const result = await generateWithRetry()
      scripts    = result.scripts
      aiProvider = result.provider
    }

    // ── Save to user history ──────────────────────────────────────────────────
    supabase.from('generated_scripts').insert({
      user_id:         user.id,
      product_name:    d.productName,
      niche:           nicheLabel,
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

    // ── Ledger event (fire-and-forget — never blocks the response) ────────────
    // Writes a COMPLETE event to ledger_event_kernel via service_role client.
    // Uses aggregate_id = `user:${userId}` so all of a user's generation events
    // fold into a single aggregate for future usage-metering queries.
    void dispatch(createServiceClient(), {
      aggregate_id:    `user:${user.id}`,
      user_id:         user.id,
      idempotency_key: `${user.id}:${cacheKey}:${Date.now()}`,
      event_type:      'COMPLETE',
      payload: {
        product_name:    d.productName,
        niche:           nicheLabel,
        hook_type:       cacheKey,
        script_count:    scripts.length,
        from_cache:      fromCache,
        tokens_consumed: fromCache ? 0 : scripts.length,
        ai_provider:     aiProvider,
      },
    }).catch(err => console.error('[ES-DCS] Ledger dispatch error (non-fatal):', err))

    return NextResponse.json({ scripts, count: scripts.length, fromCache })
  } catch (err) {
    console.error('Script generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate scripts. Please try again.' },
      { status: 500 },
    )
  }
}
