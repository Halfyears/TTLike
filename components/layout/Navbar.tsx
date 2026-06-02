'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface NavbarProps {
  user?: User | null
}

const navLinks = [
  { href: '/products', label: 'Products' },
  { href: '/hooks', label: 'Hook Library' },
  { href: '/trending', label: 'Trending' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <Zap className="h-6 w-6 text-pink-500" />
            <span>TTLike</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm">Dashboard</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Get Started Free</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          {/* Nav links — 48px touch targets, clear typography */}
          <div className="px-5 pt-1 pb-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center min-h-[48px] text-base font-medium text-gray-700 hover:text-pink-500 transition-colors border-b border-gray-50 last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA section */}
          <div className="px-5 pt-3 pb-8 border-t border-gray-100 flex flex-col gap-3">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Open App</Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}
                  className="w-full text-gray-500 hover:text-gray-700">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Get Started Free</Button>
                </Link>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" className="w-full">Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
