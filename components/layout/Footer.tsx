import Link from 'next/link'
import { Zap } from 'lucide-react'

const footerLinks = {
  Product: [
    { href: '/products', label: 'Product Database' },
    { href: '/hooks', label: 'Hook Library' },
    { href: '/trending', label: 'Trending' },
    { href: '/dashboard/ai-scripts', label: 'AI Script Generator' },
  ],
  Company: [
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/auth/signup', label: 'Sign Up Free' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Zap className="h-5 w-5 text-pink-400" />
              TTLike
            </Link>
            <p className="text-sm leading-relaxed">
              AI-powered TikTok viral intelligence for dropshippers and UGC creators.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-pink-500/10 text-pink-400 text-xs px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
              Beta - 100% Free
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-white font-medium text-sm mb-3">{group}</h3>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p suppressHydrationWarning>© {new Date().getFullYear()} TTLike. All rights reserved.</p>
          <p>Made for TikTok sellers worldwide</p>
        </div>
      </div>
    </footer>
  )
}
