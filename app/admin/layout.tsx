import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Shield, LayoutDashboard, Users, Video, BookOpen, Link2, Zap } from 'lucide-react'

const adminLinks = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/videos', icon: Video, label: 'Videos' },
  { href: '/admin/blog', icon: BookOpen, label: 'Blog' },
  { href: '/admin/affiliates', icon: Link2, label: 'Affiliates' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let isAdmin = false
  try {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    isAdmin = dbUser?.role === 'ADMIN'
  } catch {
    // DB not connected in dev without migration
    isAdmin = user.email === process.env.ADMIN_EMAIL
  }

  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex w-56 flex-col bg-gray-800 border-r border-gray-700 fixed h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-pink-400" />
            <span>TTLike Admin</span>
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
            <Zap className="h-3 w-3" /> Back to App
          </Link>
        </div>
      </aside>

      <div className="flex-1 md:ml-56">
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
