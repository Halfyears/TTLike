/**
 * POST /api/admin/sitemap/submit
 *
 * Submits the sitemap / key pages to search engines:
 *   1. Bing Webmaster API  — POST https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap
 *                            Requires: BING_WEBMASTER_API_KEY
 *                            (replaces deprecated /ping?sitemap= which returns HTTP 410)
 *   2. IndexNow (multi-engine POST) — https://api.indexnow.org/indexnow
 *                            Requires: INDEXNOW_API_KEY
 *                            Key hosted at: /api/indexnow-verify
 *
 * Auth: admin only.
 * Returns per-engine results so the UI can surface partial failures.
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SITE_URL }                          from '@/lib/constants'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

interface EngineResult {
  engine:  string
  ok:      boolean
  status?: number
  skipped?: boolean
  reason?: string
}

export async function POST() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  const results: EngineResult[] = []

  // ── 1. Bing Webmaster API (replaces deprecated /ping?sitemap= → HTTP 410) ───
  const bingKey = process.env.BING_WEBMASTER_API_KEY
  if (!bingKey) {
    results.push({ engine: 'Bing', ok: false, skipped: true, reason: 'BING_WEBMASTER_API_KEY not set' })
  } else {
    try {
      const res = await fetch(
        `https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap?apikey=${encodeURIComponent(bingKey)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body:    JSON.stringify({ siteUrl: SITE_URL, feedUrl: sitemapUrl }),
          signal:  AbortSignal.timeout(10_000),
        }
      )
      results.push({ engine: 'Bing', ok: res.ok, status: res.status })
    } catch (err) {
      results.push({ engine: 'Bing', ok: false, reason: String(err) })
    }
  }

  // ── 2. IndexNow — POST key pages (spec: individual URLs, not sitemap XML) ────
  const indexNowKey = process.env.INDEXNOW_API_KEY
  if (!indexNowKey) {
    results.push({ engine: 'IndexNow', ok: false, skipped: true, reason: 'INDEXNOW_API_KEY not set' })
  } else {
    try {
      const host    = new URL(SITE_URL).hostname
      const keyLocation = `${SITE_URL}/api/indexnow-verify`
      // Submit primary pages (IndexNow does not accept sitemap XML as a URL)
      const urlList = [
        SITE_URL,
        `${SITE_URL}/hooks`,
        `${SITE_URL}/pricing`,
        `${SITE_URL}/blog`,
        `${SITE_URL}/trending`,
      ]
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body:    JSON.stringify({ host, key: indexNowKey, keyLocation, urlList }),
        signal:  AbortSignal.timeout(10_000),
      })
      // IndexNow returns 200 or 202 on success
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
