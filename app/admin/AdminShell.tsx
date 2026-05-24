'use client'

import Link from 'next/link'
import { Shield, LayoutDashboard, Users, Video, BookOpen, Link2, Zap, Activity, Megaphone, BrainCircuit, FileText, Clapperboard } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t, toggleLang } = useLanguage()

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: t.nav.dashboard },
    { href: '/admin/users', icon: Users, label: t.nav.users },
    { href: '/admin/videos', icon: Video, label: t.nav.videos },
    { href: '/admin/blog', icon: BookOpen, label: t.nav.blog },
    { href: '/admin/affiliates', icon: Link2, label: t.nav.affiliates },
    { href: '/admin/promotions', icon: Megaphone, label: t.nav.promotions },
    { href: '/admin/scraper',     icon: Activity,      label: t.nav.scraper },
    { href: '/admin/breakdowns',  icon: BrainCircuit,  label: t.nav.breakdowns },
    { href: '/admin/scripts',     icon: FileText,      label: t.nav.scripts },
    { href: '/admin/studio',      icon: Clapperboard,  label: t.nav.studio },
  ]

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex w-56 flex-col bg-gray-800 border-r border-gray-700 fixed h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-pink-400" />
            <span>{t.admin.title}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <Zap className="h-3 w-3" /> {t.nav.backToApp}
          </Link>
        </div>
      </aside>

      <div className="flex-1 md:ml-56">
        {/* Top bar with language toggle */}
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border border-gray-600"
          >
            {t.lang.toggle}
          </button>
        </div>
        <div className="p-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
