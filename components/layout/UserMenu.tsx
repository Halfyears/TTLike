'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, Settings, CreditCard, LogOut } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  email:    string
  initials: string
}

export function UserMenu({ email, initials }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const router          = useRouter()
  const supabase        = createClient()

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    // push first, then refresh — avoids a race where refresh re-runs a protected
    // Server Component (e.g. /studio redirects to /auth/login) before navigation lands
    router.push('/')
    setTimeout(() => router.refresh(), 100)
  }

  return (
    <div ref={ref} className="relative px-3 py-3 border-t border-slate-800">
      {/* Dropdown panel — rendered above the trigger */}
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-[11px] text-slate-500 truncate">{email}</p>
          </div>
          <Link
            href="/dashboard/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Account Settings
          </Link>
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            Upgrade Plan
          </Link>
          <div className="border-t border-slate-700" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 w-full text-left transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      )}

      {/* Trigger row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
      >
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <span className="flex-1 text-xs text-slate-400 truncate text-left">{email}</span>
        <ChevronUp
          className={`h-3.5 w-3.5 text-slate-600 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  )
}
