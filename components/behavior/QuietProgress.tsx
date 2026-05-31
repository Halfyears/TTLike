'use client'

import { useEffect, useState, useCallback } from 'react'
import { useBehaviorStore } from '@/lib/behavior/state-machine'
import { BADGE_LABELS } from '@/lib/behavior/badge-engine'
import type { BadgeType } from '@/lib/behavior/badge-engine'

interface BadgeEntry {
  id:         string
  badgeType:  BadgeType
  createdAt:  string
}

function fmtAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30)  return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Silent, low-contrast badge display.
 * Lives at the bottom of the dashboard sidebar.
 * Refetches automatically when the behavior state machine reaches COMPLETE.
 * No animations, no celebration — badges are growth traces, not achievement notifications.
 */
export function QuietProgress() {
  const [badges, setBadges] = useState<BadgeEntry[]>([])
  const behaviorState = useBehaviorStore((s) => s.state)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/behavior/badges')
      if (!res.ok) return
      const data = await res.json()
      setBadges((data.badges ?? []).slice(0, 5))
    } catch { /* silent — badge display is non-critical */ }
  }, [])

  // Initial load
  useEffect(() => { void load() }, [load])

  // Refetch when session completes so new badges appear without page reload
  useEffect(() => {
    if (behaviorState === 'COMPLETE') void load()
  }, [behaviorState, load])

  if (badges.length === 0) return null

  return (
    <div className="px-3 pb-3 border-t border-slate-800 pt-3">
      <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-2 px-1">
        Progress
      </p>
      <ul className="space-y-1">
        {badges.map((b) => (
          <li key={b.id} className="px-1">
            <p className="text-[10px] text-slate-500 leading-snug">
              {BADGE_LABELS[b.badgeType] ?? b.badgeType}
            </p>
            <p className="text-[9px] text-slate-700 mt-0.5">{fmtAge(b.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
