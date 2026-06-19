'use client'

import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'

/**
 * Rendered only when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set (Cloudflare/D1
 * auth path) — always mounted inside <ClerkProvider>, so useSignIn() is safe.
 */
export function ClerkGoogleButton({ redirect }: { redirect: string }) {
  const { signIn, isLoaded } = useSignIn()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isLoaded) return
    setLoading(true)
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/auth/sso-callback',
      redirectUrlComplete: `/api/auth/clerk-bridge?next=${encodeURIComponent(redirect)}`,
    })
  }

  return (
    <Button type="button" variant="secondary" className="w-full" onClick={handleClick} loading={loading}>
      <GoogleIcon />
      Continue with Google
    </Button>
  )
}
