/**
 * lib/ai/transcription.ts
 *
 * Groq Whisper audio transcription client.
 *
 * Uses the same GROQ_API_KEY already in the stack.
 * Audio quota is INDEPENDENT from LLM quota:
 *   - Groq Whisper free: 2,000 req/day, 28,800 audio-seconds/day (~8h/day)
 *   - Model: whisper-large-v3-turbo (fast, accurate)
 *   - File size limit: 25MB
 *
 * Used as a pre-step in the Trigger.dev viral pipeline to populate
 * visual_timeline from real spoken content, upgrading signal_quality
 * from 'metadata_only' → 'full'.
 */

import 'server-only'

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MAX_BYTES        = 24 * 1024 * 1024  // 24MB — stay below 25MB Groq limit

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  /** "MM:SS-MM:SS" */
  timecode: string
  /** Exact spoken words at this moment */
  audio:    string
}

export interface TranscriptionResult {
  /** Full concatenated transcript */
  full_text: string
  segments:  TranscriptSegment[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Return true only if the URL looks like a CDN direct-download link.
 * TikTok page URLs and short-link redirects are rejected.
 */
function isCdnVideoUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false
  if (url.includes('/@'))              return false  // page URL
  if (/\/video\/\d+/.test(url))        return false  // page URL
  if (/^https?:\/\/(vm|vt)\.tiktok\.com/.test(url)) return false  // short redirect
  return true
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Download a TikTok CDN video and transcribe its audio with Groq Whisper.
 *
 * Returns null (graceful no-op) when:
 *   - URL is a TikTok page URL (not a direct CDN link)
 *   - File exceeds 24MB
 *   - Download or transcription fails for any reason
 *
 * Caller should treat null as "fall back to metadata_only" — never throws.
 */
export async function transcribeVideoUrl(
  videoUrl: string,
): Promise<TranscriptionResult | null> {
  if (!isCdnVideoUrl(videoUrl)) return null

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return null

  // ── Download video ─────────────────────────────────────────────────────────
  let buffer: ArrayBuffer
  try {
    const res = await fetch(videoUrl, {
      signal:  AbortSignal.timeout(30_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        'Referer':    'https://www.tiktok.com/',
        'Accept':     'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) return null

    // TikTok CDN usually omits Content-Length, so the pre-check only applies
    // when the header is actually present (> 0). The post-download check is
    // the real safety net and always runs.
    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength > 0 && contentLength > MAX_BYTES) return null

    buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) return null  // actual size guard
  } catch {
    return null
  }

  // ── Transcribe with Groq Whisper ───────────────────────────────────────────
  try {
    const blob     = new Blob([buffer], { type: 'video/mp4' })
    const formData = new FormData()
    formData.append('file',                      blob, 'video.mp4')
    formData.append('model',                     'whisper-large-v3-turbo')
    formData.append('response_format',           'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')
    // No 'language' param — let Whisper auto-detect (TikTok is multilingual)

    const res = await fetch(GROQ_WHISPER_URL, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${groqKey}` },
      signal:  AbortSignal.timeout(60_000),
      body:    formData,
    })
    if (!res.ok) return null

    const data = await res.json() as {
      text?:     string
      segments?: Array<{ start: number; end: number; text: string }>
    }

    const fullText = data.text?.trim() ?? ''
    if (!fullText) return null

    const rawSegments = data.segments ?? []

    // Convert Whisper segments → TranscriptSegment[]
    const segments: TranscriptSegment[] = rawSegments
      .filter(s => s.text.trim().length >= 3)  // skip noise / filler segments
      .map(s => ({
        timecode: `${formatTime(s.start)}-${formatTime(s.end)}`,
        audio:    s.text.trim(),
      }))

    // If Whisper returned text but no segments, create a single segment
    if (segments.length === 0 && fullText.length > 0) {
      segments.push({ timecode: '00:00-00:45', audio: fullText })
    }

    return { full_text: fullText, segments }

  } catch {
    return null
  }
}
