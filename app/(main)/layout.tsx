import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BetaBanner } from '@/components/ui/BetaBanner'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users: use the unified app shell (left sidebar / mobile bottom bar)
  if (user) {
    const initials = (user.user_metadata?.name as string | undefined)
      ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      ?? user.email?.[0]?.toUpperCase()
      ?? '?'

    return (
      <AppShell email={user.email ?? ''} initials={initials}>
        {children}
      </AppShell>
    )
  }

  // Guest visitors: marketing layout with top navbar and footer
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <Navbar user={null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
