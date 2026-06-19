/**
 * GET  /api/admin/prompt-config  — read current AI prompt override
 * PUT  /api/admin/prompt-config  — save new override (empty string = use hardcoded default)
 *
 * Stored in admin_config table, key = 'ai_prompt_override'.
 * parserPrompt.ts reads this at call time → instant hot-update, no redeploy needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/server'
import { isCurrentUserAdmin }        from '@/lib/auth/admin'

const CONFIG_KEY = 'ai_prompt_override'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('admin_config')
      .select('value, updated_at')
      .eq('key', CONFIG_KEY)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      value:      data?.value ?? '',
      updated_at: data?.updated_at ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to read prompt config' },
      { status: 500 },
    )
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  if (!await isCurrentUserAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { value } = await req.json() as { value?: string }
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'value must be a string' }, { status: 400 })
    }

    const service = createServiceClient()
    const { error } = await service
      .from('admin_config')
      .upsert(
        { key: CONFIG_KEY, value: value.trim(), updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      )

    if (error) throw error

    return NextResponse.json({ ok: true, value: value.trim() })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save prompt config' },
      { status: 500 },
    )
  }
}
