import { redirect }        from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BatchClient }     from './BatchClient'

export const metadata = { title: 'Batch Analysis · TTLike' }

export default async function BatchPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard/batch')

  const service = createServiceClient()
  await service.rpc('ensure_billing_tier', { uid: user.id })

  const { data: tierRow } = await service
    .from('user_billing_tiers')
    .select('tier_name, video_analysis_used, video_analysis_limit')
    .eq('user_id', user.id)
    .single()

  const tier      = tierRow?.tier_name       ?? 'free'
  const used      = tierRow?.video_analysis_used  ?? 0
  const limit     = tierRow?.video_analysis_limit ?? 5
  const remaining = Math.max(0, limit - used)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Batch Analysis</h1>
        <p className="text-sm text-gray-500">
          Analyze up to 10 TikTok URLs at once. Each URL counts as one analysis.
        </p>
      </div>

      <BatchClient tier={tier} remaining={remaining} limit={limit} />
    </div>
  )
}
