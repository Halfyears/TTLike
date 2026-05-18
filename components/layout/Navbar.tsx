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

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className="block text-sm font-medium text-gray-700 py-1"
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard"><Button className="w-full" size="sm">Dashboard</Button></Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full">Sign Out</Button>
              </>
            ) : (
              <>
                <Link href="/auth/login"><Button variant="secondary" className="w-full" size="sm">Sign In</Button></Link>
                <Link href="/auth/signup"><Button className="w-full" size="sm">Get Started Free</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
