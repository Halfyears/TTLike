'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-violet-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Zap className="h-7 w-7 text-pink-500" />
            TTLike
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="text-lg font-semibold">Check your email</h3>
              <p className="text-sm text-gray-600 mt-1">Password reset link sent to <strong>{email}</strong></p>
              <Link href="/auth/login" className="mt-4 inline-block text-pink-500 text-sm font-medium">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset password</h2>
              <p className="text-sm text-gray-600 mb-6">Enter your email and we&apos;ll send a reset link</p>
              <form onSubmit={handleReset} className="space-y-4">
                <Input id="email" type="email" label="Email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full" loading={loading}>Send Reset Link</Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <Link href="/auth/login" className="text-gray-500 hover:text-gray-700">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
