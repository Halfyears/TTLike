import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StudioClient } from './StudioClient'

export const metadata = { title: 'Viral Studio · TTLike' }

export default async function StudioPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login?next=/studio')

  return (
    <Suspense>
      <StudioClient />
    </Suspense>
  )
}
