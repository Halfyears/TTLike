'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOutEverywhere } from '@/lib/auth/signOutEverywhere'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await signOutEverywhere()
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
