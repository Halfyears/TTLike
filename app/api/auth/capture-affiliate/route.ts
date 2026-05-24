/**
 * POST /api/auth/capture-affiliate
 *
 * Called internally by the auth callback after a successful login when an
 * `affiliate_ref` cookie is present.
 *
 * Body: { ref: string }
 *
 * Actions (all idempotent — safe to retry):
 *   1. Resolve the AffiliateLink row by code.
 *   2. Increment its `conversions` counter.
 *   3. Grant the newly signed-up user 1 white-label PDF pass
 *      (only if they haven't already received one for this code).
 *
 * Auth: must be called with a valid session (the auth callback forwards the
 * session cookie). Anonymous calls are silently ignored.
 */

import { NextResponse }                      from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma }                            from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { ref?: string }
    const ref  = typeof body.ref === 'string' ? body.ref.trim().slice(0, 64) : null
    if (!ref) return NextResponse.json({ ok: false, reason: 'no ref' })

    // Resolve authenticated user
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'unauthenticated' })

    // ── Validate affiliate code via Prisma ────────────────────────────────────
    const affiliateLink = await prisma.affiliateLink.findUnique({ where: { code: ref } })
    if (!affiliateLink || !affiliateLink.isActive) {
      return NextResponse.json({ ok: false, reason: 'invalid_code' })
    }

    // ── Atomic idempotent grant ────────────────────────────────────────────────
    // updateMany with affiliateCode:null condition prevents double-grant even
    // under concurrent retries — no separate read needed.
    const updated = await prisma.user.updateMany({
      where: { email: user.email!, affiliateCode: null },
      data:  { affiliateCode: ref, whitelabelPdfPasses: { increment: 1 } },
    })

    if (updated.count === 0) {
      // Already attributed — idempotent success
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_attributed' })
    }

    // First attribution — increment affiliate conversions
    await prisma.affiliateLink.update({
      where: { code: ref },
      data:  { conversions: { increment: 1 } },
    })

    // ── Log to user_analytics (best-effort) ──────────────────────────────────
    try {
      const service = createServiceClient()
      await service.from('user_analytics').insert({
        user_id:      user.id,
        event:        'affiliate_signup',
        context_data: { affiliate_code: ref, pdf_passes_granted: 1 },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, pdf_passes_granted: 1 })
  } catch (e) {
    console.warn('[capture-affiliate] error:', e)
    return NextResponse.json({ ok: false, reason: 'internal_error' })
  }
}
