'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Zap, ArrowRight } from 'lucide-react'
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
  const router   = useRouter()
  const pathname = usePathname()
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
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
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
                  <Button variant="secondary" size="sm">Open App</Button>
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
        <div className="md:hidden border-t border-gray-100 bg-white shadow-xl shadow-gray-200/60">
          {/* Nav links — centered, pill hover, active highlight */}
          <div className="px-4 pt-3 pb-2 flex flex-col items-center gap-0.5">
            {navLinks.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center justify-center min-h-[52px] px-6 rounded-2xl text-base font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-pink-500'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* CTA buttons */}
          <div className="px-5 pt-3 pb-8 border-t border-gray-100 flex flex-col gap-3 items-center">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button className="w-full flex items-center justify-center gap-2">
                    Open App <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="min-h-[44px] px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button className="w-full">Get Started Free</Button>
                </Link>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="w-full">
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
