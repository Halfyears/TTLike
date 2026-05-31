'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  plan: 'creator' | 'scale'
  label: string
  highlight?: boolean
  isLoggedIn: boolean
}

export function PricingCheckoutButton({ plan, label, highlight, isLoggedIn }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    if (!isLoggedIn) {
      router.push(`/auth/signup?next=/pricing`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      if (data.url) window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        className={`w-full ${!highlight ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Redirecting…' : label}
      </Button>
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
