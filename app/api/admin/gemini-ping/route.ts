/**
 * GET /api/admin/gemini-ping
 *
 * Lightweight Gemini connectivity probe used by the Admin Dashboard.
 * Sends a 1-token prompt and returns { ok, latency_ms, model } or { ok: false, error }.
 * Timeout: 8 s — fast enough to show status without blocking page load.
 */

import { NextResponse } from 'next/server'

export const maxDuration = 10

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY not set' })
  }

  const start = Date.now()
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(8_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    })

    const latency_ms = Date.now() - start

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json({
        ok:         false,
        latency_ms,
        error:      err.error?.message ?? `HTTP ${res.status}`,
      })
    }

    const data = await res.json()
    const hasCandidate = !!data.candidates?.[0]

    return NextResponse.json({
      ok:         hasCandidate,
      latency_ms,
      model:      'gemini-2.5-flash',
      ...(hasCandidate ? {} : { error: 'No candidates returned' }),
    })
  } catch (e) {
    return NextResponse.json({
      ok:         false,
      latency_ms: Date.now() - start,
      error:      e instanceof Error ? e.message : String(e),
    })
  }
}
