/**
 * GET  /api/admin/finance/config  — list payment gateway configs (keys masked)
 * POST /api/admin/finance/config  — upsert a gateway config
 */

import { NextResponse }  from 'next/server'
import { d1Db }        from '@/lib/cloudflare/d1Compat'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

// ── Auth guard ────────────────────────────────────────────────────────────────

// ── Mask helper — show last 4 chars, rest as * ────────────────────────────────
function maskKey(val: string | null | undefined): string | null {
  if (!val) return null
  if (val.length <= 4) return '****'
  return '****' + val.slice(-4)
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await d1Db.paymentConfig.findMany({
    orderBy: { provider: 'asc' },
  })

  // Return masked version — never send raw keys to client
  const masked = rows.map(r => ({
    id:              r.id,
    provider:        r.provider,
    mode:            r.mode,
    isEnabled:       r.isEnabled,
    hasSecretKey:    !!r.secretKey,
    secretKeyMask:   maskKey(r.secretKey),
    hasPublicKey:    !!r.publicKey,
    publicKeyMask:   maskKey(r.publicKey),
    hasWebhookSecret: !!r.webhookSecret,
    webhookSecretMask: maskKey(r.webhookSecret),
    hasClientId:     !!r.clientId,
    clientIdMask:    maskKey(r.clientId),
    extraConfig:     r.extraConfig,
    updatedAt:       r.updatedAt,
  }))

  return NextResponse.json({ configs: masked })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    provider:      string
    mode?:         string
    secretKey?:    string
    publicKey?:    string
    webhookSecret?: string
    clientId?:     string
    extraConfig?:  Record<string, unknown>
    isEnabled?:    boolean
  }

  const { provider, mode, secretKey, publicKey, webhookSecret, clientId, extraConfig, isEnabled } = body
  if (!provider) return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  if (!['stripe', 'paypal'].includes(provider)) {
    return NextResponse.json({ error: 'provider must be stripe or paypal' }, { status: 400 })
  }

  // Sentinel "__unchanged__" means don't overwrite existing value
  const SENTINEL = '__unchanged__'

  // Fetch existing to preserve keys when sentinel sent
  const existing = await d1Db.paymentConfig.findUnique({ where: { provider } })

  // Guard: disallow explicit empty-string submission for sensitive fields that are already set
  // (frontend sends SENTINEL for unchanged fields; empty string is always a mistake here)
  const sensitiveFields = [
    { name: 'secretKey',     val: secretKey,     has: existing?.secretKey },
    { name: 'webhookSecret', val: webhookSecret, has: existing?.webhookSecret },
  ]
  for (const { name, val, has } of sensitiveFields) {
    if (val === '' && has) {
      return NextResponse.json(
        { error: `Cannot clear existing ${name} — leave blank to keep current value` },
        { status: 400 },
      )
    }
  }

  const updated = await d1Db.paymentConfig.upsert({
    where:  { provider },
    create: {
      provider,
      mode:          mode ?? 'sandbox',
      secretKey:     secretKey && secretKey !== SENTINEL ? secretKey : null,
      publicKey:     publicKey && publicKey !== SENTINEL ? publicKey : null,
      webhookSecret: webhookSecret && webhookSecret !== SENTINEL ? webhookSecret : null,
      clientId:      clientId && clientId !== SENTINEL ? clientId : null,
      extraConfig:   extraConfig ? extraConfig as Record<string, unknown> : undefined,
      isEnabled:     isEnabled ?? false,
    },
    update: {
      ...(mode !== undefined && { mode }),
      ...(secretKey !== undefined && secretKey !== SENTINEL && { secretKey }),
      ...(publicKey !== undefined && publicKey !== SENTINEL && { publicKey }),
      ...(webhookSecret !== undefined && webhookSecret !== SENTINEL && { webhookSecret }),
      ...(clientId !== undefined && clientId !== SENTINEL && { clientId }),
      ...(extraConfig !== undefined && { extraConfig: extraConfig as Record<string, unknown> }),
      ...(isEnabled !== undefined && { isEnabled }),
      updatedAt: new Date(),
      // Preserve existing keys if sentinel sent
      ...(secretKey === SENTINEL && existing?.secretKey && { secretKey: existing.secretKey }),
      ...(publicKey === SENTINEL && existing?.publicKey && { publicKey: existing.publicKey }),
      ...(webhookSecret === SENTINEL && existing?.webhookSecret && { webhookSecret: existing.webhookSecret }),
      ...(clientId === SENTINEL && existing?.clientId && { clientId: existing.clientId }),
    },
  })

  return NextResponse.json({
    ok:       true,
    provider: updated.provider,
    mode:     updated.mode,
    isEnabled: updated.isEnabled,
  })
}
