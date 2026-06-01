/**
 * POST /api/studio/transcribe/[video_id]
 *
 * Pre-transcribes TikTok audio BEFORE the user fills the product form.
 * Stores the transcript in video_breakdowns.payload so the main pipeline
 * can skip re-transcription (it checks `visual_timeline` existence first).
 *
 * Returns accurate category + pain_points extracted from real speech.
 * Always returns ok:true (with empty fallback) — never blocks the UI.
 *
 * Typical latency: 10–20 s (video download + Groq Whisper + LLM extraction).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { transcribeVideoUrl } from '@/lib/ai/transcription'

async function getUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch { return null }
}

// ── LLM context extraction from real transcript ───────────────────────────────

interface LLMContext {
  category:    string
  pain_points: string[]
}

async function extractContextFromTranscript(
  transcriptText: string,
  productName: string | null,
  title:       string | null,
): Promise<LLMContext | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  const excerpt = transcriptText.slice(0, 1200)
  if (!excerpt) return null

  const system = `You are a TikTok product analyst. Given the ACTUAL SPOKEN WORDS from a TikTok video, extract:
1. A concise product category (2-4 words, e.g. "posture corrector", "LED face mask", "kitchen gadget")
2. 3 specific customer pain points this product solves (6-12 words each, concrete problems not abstract words)

Return ONLY valid JSON: { "category": "...", "pain_points": ["...", "...", "..."] }
Rules:
- Base your answer on the spoken content — it is the ground truth
- category must be specific to THIS product, not a generic niche like "Health" or "Beauty"
- pain_points must be concrete, specific problems (e.g. "back pain from sitting at a desk all day")
- If transcript is unclear, use the product name / title as a secondary signal`

  const productHint = productName ? `\nProduct name hint: "${productName}"` : ''
  const titleHint   = title       ? `\nVideo title: "${title}"`             : ''
  const userMsg = `Spoken transcript:\n"${excerpt}"${productHint}${titleHint}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(10_000),
      body: JSON.stringify({
        model:           'llama-3.3-70b-versatile',
        messages:        [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        response_format: { type: 'json_object' },
        temperature:     0.3,
        max_tokens:      300,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.choices?.[0]?.message?.content ?? '') as string
    const parsed = JSON.parse(text) as { category?: string; pain_points?: unknown }
    if (
      typeof parsed.category === 'string' &&
      Array.isArray(parsed.pain_points) &&
      parsed.pain_points.length >= 1
    ) {
      return {
        category:    parsed.category.slice(0, 60),
        pain_points: (parsed.pain_points as unknown[])
          .filter((p): p is string => typeof p === 'string')
          .map(p => p.trim())
          .filter(p => p.length >= 5)
          .slice(0, 4),
      }
    }
    return null
  } catch {
    return null
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ video_id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { video_id } = await params
  if (!video_id) return NextResponse.json({ ok: false, error: 'video_id required' }, { status: 400 })

  const service = createServiceClient()

  // ── Fetch video metadata + CDN download URL ────────────────────────────────
  const { data: video, error: videoErr } = await service
    .from('tiktok_videos')
    .select('id, title, product_name, niche, video_url')
    .eq('id', video_id)
    .maybeSingle()

  if (videoErr) {
    console.error('[transcribe] DB error fetching video:', videoErr.message)
    return NextResponse.json({ ok: true, transcript_available: false, category: null, pain_points: [] })
  }
  if (!video) {
    return NextResponse.json({ ok: false, error: 'Video not found' }, { status: 404 })
  }

  const downloadUrl = video.video_url as string | null

  // ── Attempt transcription ──────────────────────────────────────────────────
  let transcript: Awaited<ReturnType<typeof transcribeVideoUrl>> = null

  if (downloadUrl) {
    transcript = await transcribeVideoUrl(downloadUrl)
  }

  // ── If transcription succeeded, persist into video_breakdowns ─────────────
  // This allows the main pipeline to skip re-transcription:
  // viralAnalysisPipeline checks `payload.visual_timeline` existence before transcribing.
  if (transcript && transcript.segments.length > 0) {
    const visual_timeline = transcript.segments.map(seg => ({
      timecode:       seg.timecode,
      visual:         '(video)',
      audio:          seg.audio,
      why_this_works: '',
    }))

    const viral_formulas = transcript.segments
      .filter(seg => seg.audio.length >= 10)
      .slice(0, 8)
      .map((seg, i) => ({
        title:          `Scene ${i + 1}  [${seg.timecode}]`,
        timestamp:      seg.timecode.split('-')[0] ?? '00:00',
        example_script: `SAY: "${seg.audio}"`,
        mechanism:      'transcribed spoken audio',
        your_version:   seg.audio,
      }))

    const newPayload = {
      visual_timeline,
      viral_formulas,
      transcript_full: transcript.full_text,
    }

    // Check for existing breakdown row
    const { data: existing, error: bdErr } = await service
      .from('video_breakdowns')
      .select('id, payload')
      .eq('video_id', video_id)
      .maybeSingle()

    if (bdErr) {
      console.error('[transcribe] DB error fetching breakdown:', bdErr.message)
    } else if (existing?.id) {
      // Row exists — only update if transcript not already stored
      const existingPayload = (existing.payload ?? {}) as Record<string, unknown>
      const alreadyDone =
        Array.isArray(existingPayload['visual_timeline']) &&
        (existingPayload['visual_timeline'] as unknown[]).length > 0

      if (!alreadyDone) {
        const { error: updateErr } = await service
          .from('video_breakdowns')
          .update({ payload: { ...existingPayload, ...newPayload } })
          .eq('id', existing.id)
        if (updateErr) {
          console.error('[transcribe] Failed to update breakdown payload:', updateErr.message)
        }
      }
    } else {
      // No breakdown row yet — create one with transcript pre-populated.
      // analyze-video will find this row and reuse it; the pipeline will
      // see visual_timeline populated and skip re-transcription.
      const urlHash = Buffer.from(video_id).toString('base64url').slice(0, 32)
      const { error: insertErr } = await service
        .from('video_breakdowns')
        .insert({
          video_id,
          url_hash:    urlHash,
          payload:     newPayload,
          blog_status: 'NOT_SENT',
          viral_status: 'PENDING',
          user_id:     user.id,
        })
      if (insertErr && insertErr.code !== '23505') {
        // 23505 = unique violation (race: another insert beat us) — that's fine
        console.error('[transcribe] Failed to insert breakdown:', insertErr.message)
      }
    }
  }

  // ── Extract category + pain_points from transcript ─────────────────────────
  let category:    string   = video.niche ?? 'General'
  let pain_points: string[] = []

  if (transcript?.full_text) {
    const llmCtx = await extractContextFromTranscript(
      transcript.full_text,
      video.product_name as string | null,
      video.title       as string | null,
    )
    if (llmCtx && llmCtx.pain_points.length >= 1) {
      category    = llmCtx.category
      pain_points = llmCtx.pain_points
    }
  }

  return NextResponse.json({
    ok:                   true,
    transcript_available: !!(transcript && transcript.segments.length > 0),
    category:             category || null,
    pain_points,
  })
}
