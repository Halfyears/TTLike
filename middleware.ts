import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { updateSession } from '@/lib/supabase/proxy'
import { PROTECTED_ROUTES, AUTH_ROUTES, ADMIN_ROUTES } from '@/lib/constants'
import { resolveSiteOrigin } from '@/lib/cloudflare/origin'

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

// clerkMiddleware() resolves (and JWT-verifies) the Clerk session on every
// request it wraps, regardless of whether the callback calls auth() — that's
// real CPU work the Workers free-tier 10ms/request budget can't reliably
// absorb. The rest of the app never reads Clerk's session directly (it reads
// our own ttlike_session cookie via the D1 facade), so only wrap the handful
// of routes that actually run Clerk client code or read auth()/currentUser().
const CLERK_PATHS = ['/auth/login', '/auth/signup', '/auth/sso-callback', '/api/auth/clerk-bridge']

async function coreMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r))

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAdminRoute && user) {
    const checkUrl = `${resolveSiteOrigin(request)}/api/admin/check`
    const cookieHeader = request.headers.get('cookie') ?? ''
    let debugInfo = ''
    const { data: profile } = await fetch(
      checkUrl,
      { headers: { cookie: cookieHeader }, cache: 'no-store' }
    ).then(async r => {
      const text = await r.text()
      debugInfo = `status=${r.status} body=${text.slice(0, 200)}`
      return JSON.parse(text)
    }).catch((e) => {
      debugInfo = `fetch-error=${e instanceof Error ? e.message : String(e)}`
      return { data: null }
    })

    if (!profile?.isAdmin) {
      // TEMP DEBUG: surface why the admin self-fetch didn't pan out instead
      // of silently redirecting. Remove once root-caused.
      const res = NextResponse.redirect(new URL('/dashboard', request.url))
      res.headers.set('x-debug-check-url', checkUrl)
      res.headers.set('x-debug-cookie-len', String(cookieHeader.length))
      res.headers.set('x-debug-result', debugInfo.slice(0, 200))
      return res
    }
  }

  return supabaseResponse
}

// Only construct clerkMiddleware() when Clerk is actually configured —
// on Vercel (no publishable key) this must never be called.
const clerkWrapped = CLERK_ENABLED ? clerkMiddleware((_auth, request) => coreMiddleware(request)) : null

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const needsClerk = clerkWrapped && CLERK_PATHS.some(p => request.nextUrl.pathname.startsWith(p))
  return needsClerk ? clerkWrapped(request, event) : coreMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
