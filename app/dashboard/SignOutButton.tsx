'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    // Sign-out must happen server-side: it clears an httpOnly cookie under
    // the Cloudflare/D1 auth path, which the browser Supabase client (a no-op
    // stub there) can't touch.
    await fetch('/api/auth/signout', { method: 'POST' })
    await (window as unknown as { Clerk?: { signOut?: () => Promise<void> } }).Clerk?.signOut?.().catch(() => {})
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
    >
      <LogOut className="h-4 w-4" /> Sign Out
    </button>
  )
}
