import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/dashboard')

  const initials = (user.user_metadata?.name as string | undefined)
    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? '?'

  return (
    <AppShell email={user.email ?? ''} initials={initials} contentClass="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </AppShell>
  )
}
