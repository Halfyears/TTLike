'use client'

import { useBehaviorStore } from './state-machine'
import type { BehaviorEvent } from './state-machine'

/**
 * Single entry point for all state transitions.
 * Components must call handleIntent() — never modify the store directly.
 */
export function handleIntent(event: BehaviorEvent) {
  useBehaviorStore.getState().dispatch(event)
}
