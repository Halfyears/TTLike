'use client'

import { useEffect } from 'react'
import { useBehaviorStore } from '@/lib/behavior/state-machine'

/**
 * Headless runtime host.
 * Mirrors the Zustand behavior state onto document.body[data-state].
 * Removing this component returns the app to its original SaaS state — zero side effects.
 */
export function StateRuntime() {
  const state = useBehaviorStore((s) => s.state)

  useEffect(() => {
    document.body.dataset.state = state
    return () => { delete document.body.dataset.state }
  }, [state])

  return null
}
