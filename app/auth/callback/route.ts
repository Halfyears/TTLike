import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'
import { d1Db }        from '@/lib/cloudflare/d1Compat'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Guard against open-redirect: only allow known app routes.
  const ALLOWED_NEXT = new Set(['/dashboard', '/studio', '/products', '/hooks', '/trending', '/blog', '/pricing'])
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = ALLOWED_NEXT.has(rawNext) ? rawNext : '/dashboard'

  // Prefer explicit site URL (set in Vercel env) to avoid localhost redirects
  // when the server-side request.url resolves to an internal or preview address.
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fetch user once and reuse across upsert + affiliate blocks.
      const { data: { user } } = await supabase.auth.getUser()

      // ── Upsert Prisma User — awaited so the record exists before redirect ──────
      if (user?.email) {
        try {
          const meta = user.user_metadata ?? {}
          await d1Db.user.upsert({
            where: { email: user.email },
            create: {
              id: user.id,
              email: user.email,
              name: meta.full_name ?? meta.name ?? null,
              avatarUrl: meta.avatar_url ?? meta.picture ?? null,
            },
            update: {
              name: meta.full_name ?? meta.name ?? undefined,
              avatarUrl: meta.avatar_url ?? meta.picture ?? undefined,
            },
          })
        } catch { /* non-fatal — user can still access the app */ }
      }

      // ── REQ-A1: Affiliate attribution (inlined — no internal fetch) ──────────
      // Read the `ref` cookie set when the user followed an affiliate link
      // (/api/auth/affiliate/[code]). Done inline to avoid forwarding cookies.
      const rawRef = request.cookies.get('affiliate_ref')?.value
      const refCode = rawRef ? rawRef.toLowerCase().trim().slice(0, 64) : null

      if (refCode) {
        // Fire-and-forget in a detached try/catch — never blocks redirect
        ;(async () => {
          try {
            if (!user?.email) return

            const affiliateLink = await d1Db.affiliateLink.findUnique({ where: { code: refCode } })
            if (!affiliateLink?.isActive) return

            // Atomic: only updates when affiliateCode IS NULL — prevents double-grant on concurrent retries
            const updated = await d1Db.user.updateMany({
              where: { email: user.email, affiliateCode: null },
              data:  { affiliateCode: refCode, whitelabelPdfPasses: { increment: 1 } },
            })

            if (updated.count > 0) {
              // First attribution — also increment affiliate conversions
              await d1Db.affiliateLink.update({
                where: { code: refCode },
                data:  { conversions: { increment: 1 } },
              })
            }
          } catch { /* non-fatal */ }
        })()
      }

      const redirectRes = NextResponse.redirect(`${siteOrigin}${next}`)
      // Clear the affiliate cookie so it is only consumed once
      if (refCode) redirectRes.cookies.delete('affiliate_ref')
      return redirectRes
    }
  }

  return NextResponse.redirect(`${siteOrigin}/auth/login?error=auth_callback_error`)
}
