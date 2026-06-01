'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clapperboard, Search,
  TrendingUp, BookOpen, BarChart2, Wand2, Layers, User, Camera,
} from 'lucide-react'

const GROUPS = [
  {
    label: 'Create',
    links: [
      { href: '/studio',           icon: Wand2,        label: 'Viral Studio', badge: 'NEW' },
      { href: '/dashboard/batch',  icon: Layers,       label: 'Batch Analysis' },
      { href: '/dashboard/studio', icon: Clapperboard, label: 'Storyboard' },
      { href: '/dashboard/filming-prep', icon: Camera, label: 'Filming Prep' },
    ],
  },
  {
    label: 'Discover',
    links: [
      { href: '/products',  icon: Search,     label: 'Products' },
      { href: '/trending',  icon: TrendingUp, label: 'Trending' },
      { href: '/hooks',     icon: BookOpen,   label: 'Hook Library' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/dashboard',       icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/usage', icon: BarChart2,       label: 'Usage' },
    ],
  },
]

export function NavLinks() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      {GROUPS.map(group => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.links.map(({ href, icon: Icon, label, badge }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && !active && (
                    <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

// ── Mobile bottom tab bar (5 items) ──────────────────────────────────────────
// Storyboard omitted — accessible from Studio page; replaced with Account entry
const MOBILE_TABS = [
  { href: '/dashboard',        icon: LayoutDashboard, label: 'Overview' },
  { href: '/studio',           icon: Wand2,           label: 'Studio' },
  { href: '/products',         icon: Search,          label: 'Products' },
  { href: '/trending',         icon: TrendingUp,      label: 'Trending' },
  { href: '/dashboard/usage',  icon: User,            label: 'Account' },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Force GPU compositing layer — prevents iOS Safari from scrolling
        // position:fixed elements when the URL bar hides/shows
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {MOBILE_TABS.map(({ href, icon: Icon, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              active ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`relative flex items-center justify-center rounded-lg w-8 h-8 transition-all ${
              active ? 'bg-pink-50' : ''
            }`}>
              <Icon className="h-5 w-5" />
              {active && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-pink-500 border-2 border-white" />
              )}
            </div>
            <span className={`text-[10px] font-semibold leading-none ${active ? 'text-pink-500' : ''}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
