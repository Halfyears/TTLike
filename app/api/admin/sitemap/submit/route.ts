/**
 * POST /api/admin/sitemap/submit
 *
 * Submits the sitemap to search engines:
 *   1. Bing Ping  — GET https://www.bing.com/ping?sitemap=<url>
 *   2. IndexNow   — GET https://api.indexnow.org/indexnow?url=<url>&key=<key>
 *                   (only if INDEXNOW_API_KEY env var is set)
 *
 * Auth: admin only.
 * Returns per-engine results so the UI can surface partial failures.
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                            from '@/lib/prisma'
import { SITE_URL }                          from '@/lib/constants'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* prisma unavailable */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

interface EngineResult {
  engine:  string
  ok:      boolean
  status?: number
  skipped?: boolean
  reason?: string
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  const results: EngineResult[] = []

  // ── 1. Bing Ping ────────────────────────────────────────────────────────────
  try {
    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    const res = await fetch(bingUrl, { method: 'GET', signal: AbortSignal.timeout(10_000) })
    results.push({ engine: 'Bing', ok: res.ok, status: res.status })
  } catch (err) {
    results.push({ engine: 'Bing', ok: false, reason: String(err) })
  }

  // ── 2. IndexNow ─────────────────────────────────────────────────────────────
  const indexNowKey = process.env.INDEXNOW_API_KEY
  if (!indexNowKey) {
    results.push({ engine: 'IndexNow', ok: false, skipped: true, reason: 'INDEXNOW_API_KEY not set' })
  } else {
    try {
      const indexNowUrl =
        `https://api.indexnow.org/indexnow?url=${encodeURIComponent(sitemapUrl)}&key=${encodeURIComponent(indexNowKey)}`
      const res = await fetch(indexNowUrl, { method: 'GET', signal: AbortSignal.timeout(10_000) })
      results.push({ engine: 'IndexNow', ok: res.ok || res.status === 202, status: res.status })
    } catch (err) {
      results.push({ engine: 'IndexNow', ok: false, reason: String(err) })
    }
  }

  // ── 3. Log submission to user_analytics (best-effort) ───────────────────────
  try {
    const service = createServiceClient()
    // Use a sentinel UUID so user_id NOT NULL is satisfied while still being identifiable
    // as a system event. Admin email is used as a fallback identifier in context_data.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await service.from('user_analytics').insert({
        user_id:      user.id,
        event:        'sitemap_submit',
        context_data: { sitemap_url: sitemapUrl, results },
      })
    }
  } catch { /* non-fatal */ }

  const allOk = results.every(r => r.ok || r.skipped)
  return NextResponse.json({
    sitemap_url:  sitemapUrl,
    submitted_at: new Date().toISOString(),
    results,
    ok:           allOk,
  }, { status: allOk ? 200 : 207 })
}
