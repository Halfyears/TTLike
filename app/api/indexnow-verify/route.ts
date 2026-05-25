/**
 * GET /api/indexnow-verify
 *
 * Serves the IndexNow key for domain ownership verification.
 * IndexNow requires the key to be publicly accessible so the protocol
 * can confirm this domain controls the key being submitted.
 *
 * Called automatically by IndexNow servers during submission validation.
 * keyLocation in submit route points here: SITE_URL/api/indexnow-verify
 *
 * Returns plain text — the raw key value.
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.INDEXNOW_API_KEY ?? ''

  if (!key) {
    return new Response('not configured', { status: 404, headers: { 'Content-Type': 'text/plain' } })
  }

  return new Response(key, {
    status:  200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
