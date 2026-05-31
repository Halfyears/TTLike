/**
 * AppShell — shared authenticated layout shell.
 *
 * PC  (md+): fixed left sidebar (w-64) + scrollable content area
 * Mobile    : no top header; fixed bottom tab bar; content fills full screen
 *
 * Used by both app/(main)/layout.tsx (logged-in) and app/dashboard/layout.tsx.
 * Guest visitors in (main) continue to use Navbar + Footer instead.
 */

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { NavLinks, MobileTabBar } from '@/app/dashboard/NavLinks'
import { QuietProgress } from '@/components/behavior/QuietProgress'
import { UserMenu } from '@/components/layout/UserMenu'

interface AppShellProps {
  children:         React.ReactNode
  email:            string
  initials:         string
  /** Extra className on the <main> element — use for dashboard inner padding */
  contentClass?:    string
}

export function AppShell({ children, email, initials, contentClass }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 fixed h-full z-30">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight">TTLike</span>
          </Link>
        </div>

        {/* Nav links */}
        <NavLinks />

        {/* Courage badge trace */}
        <QuietProgress />

        {/* User menu with dropdown */}
        <UserMenu email={email} initials={initials} />
      </aside>

      {/* ── Main content ── */}
      {/* Mobile: pb-20 (80px) clears the ~66px tab bar + safe-area buffer */}
      {/* Desktop: ml-64 clears the sidebar, no extra top padding needed */}
      <main className={`flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen ${contentClass ?? ''}`}>
        {children}

        {/* Badge trace on mobile — sits just above the tab bar */}
        <div className="md:hidden px-4 pb-2">
          <QuietProgress variant="inline" />
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <MobileTabBar />
    </div>
  )
}
