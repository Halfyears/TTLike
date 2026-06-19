import 'server-only'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return false

    if (user.email && user.email === process.env.ADMIN_EMAIL) return true

    const service = createServiceClient()
    const { data: byId } = await service
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if ((byId as { role?: string } | null)?.role === 'ADMIN') return true

    if (!user.email) return false

    const { data: byEmail } = await service
      .from('users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle()

    return (byEmail as { role?: string } | null)?.role === 'ADMIN'
  } catch {
    return false
  }
}
