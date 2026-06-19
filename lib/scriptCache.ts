/**
 * Script cache helpers.
 *
 * Cache key: (video_id, hook_type, today's UTC date).
 * If hit_count < REGEN_THRESHOLD → serve from cache (0 tokens).
 * If hit_count >= REGEN_THRESHOLD → regenerate and reset cache.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const REGEN_THRESHOLD = 50   // regenerate after this many daily hits
const TODAY = () => new Date().toISOString().slice(0, 10)  // YYYY-MM-DD UTC

export interface CachedScript {
  title: string
  hook: string
  body: string
  cta: string
  fullScript: string
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getCachedScripts(
  supabase: SupabaseClient,
  videoId: string,
  hookType: string,
): Promise<{ scripts: CachedScript[]; hitCount: number; cacheId: string } | null> {
  const { data } = await supabase
    .from('script_cache')
    .select('id, scripts, hit_count')
    .eq('video_id', videoId)
    .eq('hook_type', hookType)
    .eq('cache_date', TODAY())
    .single()

  if (!data) return null
  return { scripts: data.scripts as CachedScript[], hitCount: data.hit_count, cacheId: data.id }
}

// ── Write / upsert ────────────────────────────────────────────────────────────

export async function saveCachedScripts(
  supabase: SupabaseClient,
  videoId: string,
  hookType: string,
  scripts: CachedScript[],
): Promise<void> {
  await supabase.from('script_cache').upsert(
    {
      video_id: videoId,
      hook_type: hookType,
      cache_date: TODAY(),
      scripts,
      hit_count: 1,
    },
    { onConflict: 'video_id,hook_type,cache_date' },
  )
}

// ── Increment hit counter ─────────────────────────────────────────────────────

export async function incrementCacheHit(
  supabase: SupabaseClient,
  cacheId: string,
): Promise<void> {
  await supabase.rpc('increment_script_cache_hits', { cache_id: cacheId })
}

// ── Personalization (zero-token) ──────────────────────────────────────────────
//
// When a user provides brandName / offer, we inject them into the CTA and
// fullScript fields of the cached scripts without any AI call.

export function applyPersonalization(
  scripts: CachedScript[],
  brandName?: string,
  offer?: string,
  ctaType?: string,
): CachedScript[] {
  if (!brandName && !offer && !ctaType) return scripts

  const ctaTypeText: Record<string, string> = {
    bio:     'Link in bio',
    comment: 'Comment for details',
    dm:      'DM for the link',
    shop:    'Shop now',
  }

  const ctaSuffix = [
    ctaType ? ctaTypeText[ctaType] ?? ctaType : '',
    brandName ? `Shop ${brandName}` : '',
    offer      ? offer              : '',
  ].filter(Boolean).join(' · ')

  return scripts.map(s => {
    // Only append if not already present
    const alreadyHas = (text: string, term: string) =>
      term ? text.toLowerCase().includes(term.toLowerCase()) : true

    const needsAppend =
      (ctaType && !alreadyHas(s.cta, ctaTypeText[ctaType] ?? ctaType)) ||
      (brandName && !alreadyHas(s.cta, brandName)) ||
      (offer && !alreadyHas(s.cta, offer))

    const newCta = needsAppend ? `${s.cta} — ${ctaSuffix}` : s.cta

    // Rebuild fullScript: replace original CTA line with new one
    const newFullScript = s.fullScript.includes(s.cta)
      ? s.fullScript.replace(s.cta, newCta)
      : `${s.fullScript}\n\nCTA: ${newCta}`

    return { ...s, cta: newCta, fullScript: newFullScript }
  })
}
