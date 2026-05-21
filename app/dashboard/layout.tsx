import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Zap, LayoutDashboard, Search, BookOpen, TrendingUp, BarChart2, Clapperboard } from 'lucide-react'
import { SignOutButton } from './SignOutButton'

const sidebarLinks = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/ai-scripts', icon: Zap,             label: 'AI Scripts' },
  { href: '/dashboard/studio',     icon: Clapperboard,    label: 'Studio' },
  { href: '/dashboard/usage',      icon: BarChart2,       label: 'Usage' },
  { href: '/products',             icon: Search,          label: 'Products' },
  { href: '/hooks',                icon: BookOpen,        label: 'Hook Library' },
  { href: '/trending',             icon: TrendingUp,      label: 'Trending' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="p-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
            <Zap className="h-5 w-5 text-pink-500" /> TTLike
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <div className="px-3 py-2 text-xs text-gray-500 font-medium truncate">{user.email}</div>
          <SignOutButton />
        </div>
      </aside>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex">
        {sidebarLinks.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-400 hover:text-pink-500 transition-colors">
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
