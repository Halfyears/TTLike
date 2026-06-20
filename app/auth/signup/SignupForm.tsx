'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ClerkGoogleButton } from '@/components/auth/ClerkGoogleButton'
import { GoogleIcon } from '@/components/auth/GoogleIcon'

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const supabase = createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ttlike.com'

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    })
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">📧</div>
        <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
        <p className="text-sm text-gray-600 mt-1">We sent a confirmation link to <strong>{email}</strong></p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {CLERK_ENABLED ? (
        <ClerkGoogleButton redirect="/dashboard" />
      ) : (
        <Button type="button" variant="secondary" className="w-full" onClick={handleGoogleSignup} loading={googleLoading}>
          <GoogleIcon />
          Continue with Google
        </Button>
      )}

      {/* Email/password sign-up isn't wired up to the Cloudflare/D1 auth path
          yet — only Google (via Clerk) works there. Hide it instead of
          showing a confusing "disabled" error from the stub Supabase client. */}
      {!CLERK_ENABLED && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-500"><span className="bg-white px-2">or</span></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            <Input id="name" type="text" label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            <Input id="email" type="email" label="Email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input id="password" type="password" label="Password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
            <Button type="submit" className="w-full" loading={loading}>Create Free Account</Button>
            <p className="text-xs text-center text-gray-500">
              By signing up you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-700">Terms of Service</a>
              {' '}&amp;{' '}
              <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
            </p>
          </form>
        </>
      )}
    </div>
  )
}
