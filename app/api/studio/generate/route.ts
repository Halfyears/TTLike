// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/studio/generate
// ─────────────────────────────────────────────────────────────────────────────
// Workflow (spec §4 corrected for TTLike infrastructure):
//   1. Validate input
//   2. Create drama row (status PENDING)
//   3. One-shot Gemini inference → characters[] + storyboards[]
//   4. Atomically insert characters → storyboards (with character_id FK)
//   5. Update drama status → COMPLETED + scene_count
//   6. dispatch(COMPLETE) to ledger kernel [fire-and-forget]
//   7. Return result
//   On any error: update drama status → FAILED + dispatch(FAIL)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { callDramaDisassemble } from '@/lib/studio/prompt'
import { dispatch } from '@/lib/ledger'
import type { InferenceResult, GenerateResponse } from '@/lib/studio/types'

const schema = z.object({
  title:      z.string().min(1).max(200),
  raw_script: z.string().min(10).max(8000),
})

export async function POST(request: Request) {
  const supabase     = await createClient()
  const svcClient    = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Validate ──────────────────────────────────────────────────────────────
  const body   = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([k, v]) => `${k}: ${v?.[0]}`).join(', ')
    return NextResponse.json({ error: `Invalid request — ${first}` }, { status: 400 })
  }
  const { title, raw_script } = parsed.data

  // ── 1. Create drama row (PENDING) ─────────────────────────────────────────
  const { data: drama, error: dramaErr } = await supabase
    .from('dramas')
    .insert({ user_id: user.id, title, raw_script, status: 'PENDING' })
    .select('id')
    .single()

  if (dramaErr || !drama) {
    return NextResponse.json({ error: 'Failed to create drama record' }, { status: 500 })
  }
  const dramaId = drama.id as number

  // ── 2. One-shot AI waterfall inference ───────────────────────────────────────
  let result: InferenceResult
  let aiProvider = 'unknown'
  try {
    const { text: raw, provider } = await callDramaDisassemble(raw_script)
    aiProvider = provider
    result = JSON.parse(raw) as InferenceResult

    if (!Array.isArray(result.storyboards) || result.storyboards.length === 0) {
      throw new Error('AI returned no storyboards')
    }
    if (!Array.isArray(result.characters)) result.characters = []

  } catch (err) {
    // AI failed — mark drama FAILED + kernel FAIL event
    await supabase.from('dramas').update({ status: 'FAILED' }).eq('id', dramaId)
    void dispatch(svcClient, {
      aggregate_id:    `user:${user.id}`,
      user_id:         user.id,
      idempotency_key: `studio:${dramaId}:FAIL:${Date.now()}`,
      event_type:      'FAIL',
      payload: { drama_id: dramaId, title, error: String(err) },
    }).catch(e => console.error('[Studio] Kernel FAIL dispatch error:', e))

    console.error('[Studio] Inference failed:', err)
    return NextResponse.json({ error: 'AI inference failed. Please try again.' }, { status: 500 })
  }

  // ── 3. Insert characters ──────────────────────────────────────────────────
  const characterIdMap = new Map<string, number>()  // name → id

  if (result.characters.length > 0) {
    const { data: insertedChars } = await supabase
      .from('drama_characters')
      .insert(
        result.characters.map(c => ({
          drama_id:    dramaId,
          name:        c.name,
          role:        c.role ?? 'supporting',
          description: c.description ?? null,
        }))
      )
      .select('id, name')

    for (const c of insertedChars ?? []) {
      characterIdMap.set(c.name as string, c.id as number)
    }
  }

  // ── 4. Insert storyboards ─────────────────────────────────────────────────
  const storyboardRows = result.storyboards.map(s => ({
    drama_id:        dramaId,
    episode_number:  1,          // MVP: single episode
    scene_no:        s.scene_no,
    character_id:    characterIdMap.get(s.character_focus) ?? null,
    character_name:  s.character_focus,
    image_prompt:    s.image_prompt,
    video_prompt:    s.video_prompt,
    audio_narration: s.audio_narration,
  }))

  const { data: insertedBoards, error: boardErr } = await supabase
    .from('drama_storyboards')
    .insert(storyboardRows)
    .select()

  if (boardErr) {
    await supabase.from('dramas').update({ status: 'FAILED' }).eq('id', dramaId)
    return NextResponse.json({ error: 'Failed to save storyboards' }, { status: 500 })
  }

  // ── 5. Update drama to COMPLETED ─────────────────────────────────────────
  const sceneCount = storyboardRows.length
  await supabase
    .from('dramas')
    .update({ status: 'COMPLETED', scene_count: sceneCount })
    .eq('id', dramaId)

  // ── 6. Fetch inserted characters for response ──────────────────────────────
  const { data: characters } = await supabase
    .from('drama_characters')
    .select('*')
    .eq('drama_id', dramaId)

  // ── 7. Kernel COMPLETE event (fire-and-forget) ────────────────────────────
  void dispatch(svcClient, {
    aggregate_id:    `user:${user.id}`,
    user_id:         user.id,
    idempotency_key: `studio:${dramaId}:COMPLETE`,
    event_type:      'COMPLETE',
    payload: {
      drama_id:        dramaId,
      title,
      scene_count:     sceneCount,
      character_count: result.characters.length,
      tokens_consumed: 1,
      ai_provider:     aiProvider,
    },
  }).catch(e => console.error('[Studio] Kernel COMPLETE dispatch error:', e))

  const response: GenerateResponse = {
    drama_id:    dramaId,
    title,
    characters:  characters ?? [],
    storyboards: insertedBoards ?? [],
    scene_count: sceneCount,
    from_cache:  false,
  }

  return NextResponse.json(response)
}
