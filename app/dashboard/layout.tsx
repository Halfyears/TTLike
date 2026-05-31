import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Zap } from 'lucide-react'
import { SignOutButton } from './SignOutButton'
import { NavLinks, MobileTabBar } from './NavLinks'
import { QuietProgress } from '@/components/behavior/QuietProgress'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/dashboard')

  const initials = (user.user_metadata?.name as string | undefined)
    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? '?'

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Desktop sidebar ── */}
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

        {/* Nav groups (client — needs usePathname) */}
        <NavLinks />

        {/* Quiet Progress — silent badge trace, low contrast */}
        <QuietProgress />

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-xs text-slate-400 truncate">{user.email}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-black text-white text-base tracking-tight">TTLike</span>
        </Link>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          {children}
        </div>
        {/* Mobile: quiet progress — inline, light background, above tab bar */}
        <div className="md:hidden px-4 pb-2">
          <QuietProgress variant="inline" />
        </div>
      </main>

      {/* ── Mobile bottom tab bar (client) ── */}
      <MobileTabBar />
    </div>
  )
}
