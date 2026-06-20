'use client'

import { useState } from 'react'
import { useSignIn, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'

/**
 * Rendered only when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set (Cloudflare/D1
 * auth path) — always mounted inside <ClerkProvider>, so useSignIn() is safe.
 */
export function ClerkGoogleButton({ redirect }: { redirect: string }) {
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { isSignedIn, isLoaded: userLoaded } = useUser()
  const [loading, setLoading] = useState(false)
  const ready = signInLoaded && userLoaded

  async function handleClick() {
    if (!ready) return

    // Clerk already has an active session (e.g. a previous OAuth round-trip
    // succeeded but our own session bridge failed) — skip straight to the
    // bridge instead of re-triggering OAuth, which Clerk rejects.
    if (isSignedIn) {
      window.location.href = `/api/auth/clerk-bridge?next=${encodeURIComponent(redirect)}`
      return
    }

    setLoading(true)
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/auth/sso-callback',
      redirectUrlComplete: `/api/auth/clerk-bridge?next=${encodeURIComponent(redirect)}`,
    })
  }

  return (
    <Button type="button" variant="secondary" className="w-full" onClick={handleClick} loading={loading || !ready}>
      <GoogleIcon />
      Continue with Google
    </Button>
  )
}
