'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, LayoutDashboard, Users, Video, BookOpen,
  Link2, Zap, Activity, Megaphone, BrainCircuit,
  FileText, Clapperboard, DollarSign,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavGroup   = { type: 'group';   label: string }
type NavLink    = { type: 'link';    href: string; icon: React.ElementType; label: string }
type NavSubLink = { type: 'sublink'; href: string; icon: React.ElementType; label: string }
type NavEntry   = NavGroup | NavLink | NavSubLink

function buildNav(t: ReturnType<typeof useLanguage>['t']): NavEntry[] {
  return [
    // ── Operations (high-frequency morning checks) ──────────────────────────
    { type: 'group', label: t.nav.groupOperations },
    { type: 'link',    href: '/admin',              icon: LayoutDashboard, label: t.nav.dashboard },
    { type: 'link',    href: '/admin/users',         icon: Users,           label: t.nav.users },
    { type: 'link',    href: '/admin/finance',       icon: DollarSign,      label: t.nav.finance },
    // ── Content (AI engine + video library) ─────────────────────────────────
    { type: 'group', label: t.nav.groupContent },
    { type: 'link',  href: '/admin/videos',     icon: Video,        label: t.nav.videos },
    { type: 'link',  href: '/admin/breakdowns', icon: BrainCircuit, label: t.nav.breakdowns },
    { type: 'link',  href: '/admin/scripts',    icon: FileText,     label: t.nav.scripts },
    { type: 'link',  href: '/admin/studio',     icon: Clapperboard, label: t.nav.studio },
    // ── Growth (SEO flywheel + monetization) ────────────────────────────────
    { type: 'group', label: t.nav.groupGrowth },
    { type: 'link',  href: '/admin/blog',       icon: BookOpen,  label: t.nav.blog },
    { type: 'link',  href: '/admin/affiliates', icon: Link2,     label: t.nav.affiliates },
    { type: 'link',  href: '/admin/promotions', icon: Megaphone, label: t.nav.promotions },
    // ── Infrastructure (low-frequency, ops-only) ─────────────────────────────
    { type: 'group', label: t.nav.groupInfrastructure },
    { type: 'link',  href: '/admin/scraper', icon: Activity, label: t.nav.scraper },
  ]
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t, toggleLang } = useLanguage()
  const pathname = usePathname()
  const nav      = useMemo(() => buildNav(t), [t])

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col bg-gray-800 border-r border-gray-700 fixed h-full overflow-y-auto">

        {/* Brand */}
        <div className="p-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-pink-400 shrink-0" />
            <span className="truncate">{t.admin.title}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          {nav.map((entry, i) => {
            if (entry.type === 'group') {
              return (
                <p key={`g-${i}`}
                  className="mt-4 mb-1 first:mt-0 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {entry.label}
                </p>
              )
            }

            // Sub-link: indented, smaller, inside parent module
            if (entry.type === 'sublink') {
              const active = isActive(entry.href)
              const Icon   = entry.icon
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium transition-colors mb-0.5 ${
                    active
                      ? 'text-pink-300 bg-pink-600/10'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <span className="w-px h-3 bg-gray-600 rounded-full shrink-0" />
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{entry.label}</span>
                </Link>
              )
            }

            const active = isActive(entry.href)
            const Icon   = entry.icon
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                  active
                    ? 'bg-pink-600/20 text-pink-300 border border-pink-600/30'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{entry.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            <Zap className="h-3 w-3 shrink-0" />
            <span className="truncate">{t.nav.backToApp}</span>
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 md:ml-56 min-w-0">
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
