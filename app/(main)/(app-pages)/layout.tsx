import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

function getInitials(user: { user_metadata?: Record<string, unknown>; email?: string | null }): string {
  return (user.user_metadata?.name as string | undefined)
    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? '?'
}

// App-feature pages (/studio, /products, /trending, /hooks, /viral):
//   logged-in  → AppShell (left sidebar + mobile bottom tab bar)
//   guest      → top navbar + footer
export default async function AppPagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (
      <AppShell email={user.email ?? ''} initials={getInitials(user)}>
        {children}
      </AppShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
