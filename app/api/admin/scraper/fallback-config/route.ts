/**
 * GET  /api/admin/scraper/fallback-config
 *   Returns current scraper fallback status.
 *   Response: { enabled: boolean; updated_at: string | null }
 *
 * POST /api/admin/scraper/fallback-config
 *   Body: { enabled: boolean }  — sets scraper_fallback_enabled in admin_config.
 *   Response: { enabled: boolean; updated_at: string }
 */

import { NextRequest, NextResponse }        from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                            from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CONFIG_KEY = 'scraper_fallback_enabled'

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
  const { data } = await service
    .from('admin_config')
    .select('value, updated_at')
    .eq('key', CONFIG_KEY)
    .maybeSingle()

  return NextResponse.json({
    enabled:    data?.value === 'true',
    updated_at: data?.updated_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { enabled?: boolean }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: '`enabled` (boolean) is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const now     = new Date().toISOString()

  const { error } = await service
    .from('admin_config')
    .upsert({ key: CONFIG_KEY, value: String(body.enabled), updated_at: now }, { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enabled: body.enabled, updated_at: now })
}
