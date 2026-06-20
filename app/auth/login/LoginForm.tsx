'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ClerkGoogleButton } from '@/components/auth/ClerkGoogleButton'
import { GoogleIcon } from '@/components/auth/GoogleIcon'

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirect)
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=${redirect}` },
    })
  }

  return (
    <div className="space-y-4">
      {CLERK_ENABLED ? (
        <ClerkGoogleButton redirect={redirect} />
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleGoogleLogin}
          loading={googleLoading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      )}

      {/* Email/password sign-in isn't wired up to the Cloudflare/D1 auth path
          yet — only Google (via Clerk) works there. Hide it instead of
          showing a confusing "disabled" error from the stub Supabase client. */}
      {!CLERK_ENABLED && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-500"><span className="bg-white px-2">or</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <Input
              id="email" type="email" label="Email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <Input
              id="password" type="password" label="Password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
