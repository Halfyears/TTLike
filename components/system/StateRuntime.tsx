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

  // Set on every change — no cleanup here to avoid brief gap between transitions
  useEffect(() => {
    document.body.dataset.state = state
  }, [state])

  // Cleanup only on unmount: runtime removed = data-state gone
  useEffect(() => {
    return () => { delete document.body.dataset.state }
  }, [])

  return null
}
