/**
 * Resolve the public site origin from a request. request.url's origin can
 * resolve to the Next.js server's internal localhost address on
 * Workers/OpenNext rather than the public hostname — prefer the Host header
 * (reliably set by Cloudflare) as the fallback. Used by every route that
 * needs to build an absolute redirect/self-fetch URL.
 */
export function resolveSiteOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (envUrl) return envUrl

  const host = request.headers.get('host')
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${host}`
  }

  return new URL(request.url).origin
}
