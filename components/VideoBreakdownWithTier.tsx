'use client'

/**
 * VideoBreakdownWithTier — thin client wrapper around VideoBreakdown.
 *
 * The product detail page is a React Server Component and cannot call hooks
 * directly. This wrapper runs on the client, fetches the user's current tier
 * via useUserTier(), and forwards it to VideoBreakdown so that paid users
 * (creator/scale) see the CapCut export buttons instead of the Lock CTA.
 */

import { VideoBreakdown } from '@/components/VideoBreakdown'
import { useUserTier }    from '@/hooks/useUserTier'

interface Props {
  videoId:   string
  autoLoad?: boolean
}

export function VideoBreakdownWithTier({ videoId, autoLoad = false }: Props) {
  const { tier } = useUserTier()

  return (
    <VideoBreakdown
      videoId={videoId}
      autoLoad={autoLoad}
      tier={tier.tier_name}
    />
  )
}
