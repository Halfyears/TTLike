import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { d1Db } from '@/lib/cloudflare/d1Compat'
import { AdminShell } from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let isAdmin = false
  try {
    const dbUser = await d1Db.user.findUnique({ where: { email: user.email! } })
    isAdmin = dbUser?.role === 'ADMIN'
  } catch {
    isAdmin = user.email === process.env.ADMIN_EMAIL
  }

  if (!isAdmin) redirect('/dashboard')

  return <AdminShell>{children}</AdminShell>
}
