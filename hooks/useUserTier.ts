'use client'

/**
 * useUserTier — client-side hook for tier-gating UI features.
 *
 * Fetches from GET /api/user/tier (SSR auth, auto-provisions free row).
 * Returns `null` tier while loading so components can show skeletons.
 * Returns free-tier defaults when unauthenticated (graceful degradation).
 */

import { useState, useEffect, useCallback } from 'react'
import type { TierName }                    from '@/lib/constants'

export interface UserTierState {
  tier_name:            TierName
  video_analysis_used:  number
  video_analysis_limit: number
  strategy_audit_used:  number
  strategy_audit_limit: number
  custom_hook_used:     number
  custom_hook_limit:    number
  reset_at:             string | null
  /** True while the first fetch is in-flight */
  loading:              boolean
}

const FREE_DEFAULTS: UserTierState = {
  tier_name:            'free',
  video_analysis_used:  0,
  video_analysis_limit: 5,
  strategy_audit_used:  0,
  strategy_audit_limit: 0,
  custom_hook_used:     0,
  custom_hook_limit:    0,
  reset_at:             null,
  loading:              false,
}

export function useUserTier() {
  const [state, setState] = useState<UserTierState>({ ...FREE_DEFAULTS, loading: true })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/user/tier')
      if (res.status === 401) {
        // Not logged in — show free defaults, no loading state
        setState({ ...FREE_DEFAULTS, loading: false })
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState({ ...data, loading: false })
    } catch {
      // Network error — fall back to free defaults
      setState({ ...FREE_DEFAULTS, loading: false })
    }
  }, [])

  useEffect(() => { queueMicrotask(() => void refresh()) }, [refresh])

  return { tier: state, refreshTier: refresh }
}
