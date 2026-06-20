import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { updateSession } from '@/lib/supabase/proxy'
import { PROTECTED_ROUTES, AUTH_ROUTES, ADMIN_ROUTES } from '@/lib/constants'
import { isCurrentUserAdmin } from '@/lib/auth/admin'

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
    // Check in-process instead of self-fetching /api/admin/check: Cloudflare
    // blocks a Worker fetching its own *.workers.dev URL as a loop-prevention
    // measure (error 1042), so that self-fetch never succeeded on this
    // preview domain. isCurrentUserAdmin() already routes Supabase vs D1
    // correctly via lib/supabase/server.ts, with zero network round trip.
    if (!await isCurrentUserAdmin()) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
