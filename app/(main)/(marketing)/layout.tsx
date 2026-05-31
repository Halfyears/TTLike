import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BetaBanner } from '@/components/ui/BetaBanner'
import { createClient } from '@/lib/supabase/server'

// Marketing pages (/, /pricing, /blog, /privacy, /terms) always use the top
// navbar + footer regardless of auth state. Logged-in users see Dashboard CTA.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <Navbar user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
