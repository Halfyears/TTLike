/**
 * POST /api/behavior/check-badges
 *
 * Called by the client when COMPLETE_SESSION is dispatched.
 * Evaluates session context against badge rules and inserts new BadgeLog rows.
 * Returns the newly issued badge types (client can ignore — QuietProgress refetches independently).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndIssueBadges } from '@/lib/behavior/badge-engine'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  let body: { takeCount?: number; storyboardClicked?: boolean; copyUsed?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const session = {
    takeCount:         Number(body.takeCount ?? 0),
    storyboardClicked: Boolean(body.storyboardClicked),
    copyUsed:          Boolean(body.copyUsed),
  }

  try {
    const issued = await checkAndIssueBadges(user.id, session)
    return NextResponse.json({ ok: true, issued })
  } catch (err) {
    console.error('[check-badges]', err)
    return NextResponse.json({ ok: false, error: 'Badge check failed' }, { status: 500 })
  }
}
