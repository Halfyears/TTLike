import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Zap, LayoutDashboard, Search, BookOpen, TrendingUp } from 'lucide-react'
import { SignOutButton } from './SignOutButton'

const sidebarLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/ai-scripts', icon: Zap, label: 'AI Scripts' },
  { href: '/products', icon: Search, label: 'Products' },
  { href: '/hooks', icon: BookOpen, label: 'Hook Library' },
  { href: '/trending', icon: TrendingUp, label: 'Trending' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-100 fixed h-full">
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
          <div className="px-3 py-2 text-xs text-gray-500 font-medium truncate">
            {user.email}
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-gray-100 px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
            <Zap className="h-5 w-5 text-pink-500" /> TTLike
          </Link>
          {/* Mobile nav icons */}
          <nav className="flex items-center gap-1">
            {sidebarLinks.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                title={label}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </nav>
        </header>

        <div className="p-4 sm:p-6 flex-1">{children}</div>
      </div>
    </div>
  )
}
