'use client'

/**
 * Sign out of both our own session and Clerk's client-side session.
 *
 * The httpOnly ttlike_session cookie can only be cleared server-side, so
 * this always hits /api/auth/signout first. It also clears Clerk's own
 * client session (only present under the Cloudflare/D1 + Clerk auth path) —
 * otherwise the next "Continue with Google" click reuses the lingering
 * Clerk session and silently signs back into the same account.
 */
export async function signOutEverywhere(): Promise<void> {
  await fetch('/api/auth/signout', { method: 'POST' })
  await (window as unknown as { Clerk?: { signOut?: () => Promise<void> } })
    .Clerk?.signOut?.()
    .catch(() => {})
}
