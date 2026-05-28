/**
 * GET  /api/admin/scraper/config
 *   Returns current scraper app settings.
 *   Response: { scraper_app, auto_scrape_enabled, manual_scrape_enabled, updated_at }
 *
 * POST /api/admin/scraper/config
 *   Body: { scraper_app?, auto_scrape_enabled?, manual_scrape_enabled? }
 *   Updates the relevant admin_config keys and returns the new combined state.
 */

import { NextRequest, NextResponse }          from 'next/server'
import { createClient, createServiceClient }  from '@/lib/supabase/server'
import { prisma }                             from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KEYS = {
  scraperApp:    'scraper_app',
  autoScrape:    'auto_scrape_enabled',
  manualScrape:  'manual_scrape_enabled',
} as const

const DEFAULTS = {
  scraper_app:            'github_actions',
  auto_scrape_enabled:    true,
  manual_scrape_enabled:  true,
}

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
      if (dbUser?.role === 'ADMIN') return true
    } catch { /* prisma not available */ }
    return user.email === process.env.ADMIN_EMAIL
  } catch { return false }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data: rows } = await service
    .from('admin_config')
    .select('key, value, updated_at')
    .in('key', Object.values(KEYS))

  const byKey = new Map((rows ?? []).map((r: { key: string; value: string; updated_at: string }) => [r.key, r]))

  const appRow    = byKey.get(KEYS.scraperApp)
  const autoRow   = byKey.get(KEYS.autoScrape)
  const manualRow = byKey.get(KEYS.manualScrape)

  return NextResponse.json({
    scraper_app:           appRow?.value    ?? DEFAULTS.scraper_app,
    auto_scrape_enabled:   autoRow?.value   !== 'false',
    manual_scrape_enabled: manualRow?.value !== 'false',
    updated_at:            appRow?.updated_at ?? autoRow?.updated_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    scraper_app?:            string
    auto_scrape_enabled?:    boolean
    manual_scrape_enabled?:  boolean
  }

  const service = createServiceClient()
  const now     = new Date().toISOString()
  const upserts: Array<{ key: string; value: string; updated_at: string }> = []

  if (body.scraper_app !== undefined) {
    upserts.push({ key: KEYS.scraperApp, value: String(body.scraper_app), updated_at: now })
  }
  if (body.auto_scrape_enabled !== undefined) {
    upserts.push({ key: KEYS.autoScrape, value: String(body.auto_scrape_enabled), updated_at: now })
  }
  if (body.manual_scrape_enabled !== undefined) {
    upserts.push({ key: KEYS.manualScrape, value: String(body.manual_scrape_enabled), updated_at: now })
  }

  if (upserts.length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { error } = await service
    .from('admin_config')
    .upsert(upserts, { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return merged state
  const { data: rows } = await service
    .from('admin_config')
    .select('key, value, updated_at')
    .in('key', Object.values(KEYS))

  const byKey = new Map((rows ?? []).map((r: { key: string; value: string; updated_at: string }) => [r.key, r]))

  return NextResponse.json({
    scraper_app:           byKey.get(KEYS.scraperApp)?.value    ?? DEFAULTS.scraper_app,
    auto_scrape_enabled:   byKey.get(KEYS.autoScrape)?.value    !== 'false',
    manual_scrape_enabled: byKey.get(KEYS.manualScrape)?.value  !== 'false',
    updated_at:            now,
  })
}
