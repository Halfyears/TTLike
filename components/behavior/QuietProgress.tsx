'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { useBehaviorStore } from '@/lib/behavior/state-machine'
import { BADGE_LABELS } from '@/lib/behavior/badge-types'
import type { BadgeType } from '@/lib/behavior/badge-types'

interface BadgeEntry {
  id:        string
  badgeType: BadgeType
  createdAt: string
}

function fmtAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30)  return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

/**
 * Silent, low-contrast badge trace.
 *
 * variant="sidebar" — dark bg, lives in desktop sidebar (default)
 * variant="inline"  — light bg, used in mobile content area
 *
 * Session isolation: shows only badges earned in the current analysis session.
 * Falls back to the 3 most recent badges when no session is active.
 *
 * Expandable panel — auto-expands silently after COMPLETE.
 * No celebration, no flash. Badges are growth traces, not achievement notifications.
 */
export function QuietProgress({ variant = 'sidebar' }: { variant?: 'sidebar' | 'inline' }) {
  const [all,      setAll]      = useState<BadgeEntry[]>([])
  const [visible,  setVisible]  = useState<BadgeEntry[]>([])
  const [expanded, setExpanded] = useState(false)

  const behaviorState = useBehaviorStore((s) => s.state)
  const session       = useBehaviorStore((s) => s.session)

  // ── Fetch all user badges ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/behavior/badges')
      if (!res.ok) return
      const data = await res.json()
      setAll(data.badges ?? [])
    } catch { /* silent — non-critical */ }
  }, [])

  useEffect(() => { void load() }, [load])

  // Refetch 1500ms after COMPLETE to let check-badges POST commit first
  useEffect(() => {
    if (behaviorState !== 'COMPLETE') return
    const id = setTimeout(() => void load(), 1500)
    return () => clearTimeout(id)
  }, [behaviorState, load])

  // ── Session isolation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (all.length === 0) { setVisible([]); return }
    if (session.startedAt !== null) {
      // Active session: show only badges earned since session start
      const sessionBadges = all.filter(
        (b) => new Date(b.createdAt).getTime() >= session.startedAt!
      )
      setVisible(sessionBadges.slice(0, 5))
    } else {
      // No active session: show 3 most recent historical badges
      setVisible(all.slice(0, 3))
    }
  }, [all, session.startedAt])

  // ── Auto-expand after COMPLETE ────────────────────────────────────────────
  useEffect(() => {
    if (behaviorState !== 'COMPLETE') return
    // Expand after the refetch delay so content is ready when panel opens
    const id = setTimeout(() => setExpanded(true), 1700)
    return () => clearTimeout(id)
  }, [behaviorState])

  if (visible.length === 0) return null

  // ── Style tokens ──────────────────────────────────────────────────────────
  const dark = variant === 'sidebar'
  const border     = dark ? 'border-t border-slate-800'     : 'border-t border-gray-100'
  const labelColor = dark ? 'text-slate-600'                : 'text-gray-400'
  const chevron    = dark ? 'text-slate-700'                : 'text-gray-300'
  const textPri    = dark ? 'text-slate-500'                : 'text-gray-500'
  const textSec    = dark ? 'text-slate-700'                : 'text-gray-400'

  return (
    <div className={`px-3 pb-3 pt-3 ${border}`}>

      {/* Header — always visible, acts as toggle */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex w-full items-center justify-between px-1 mb-1 ${labelColor}`}
        aria-expanded={expanded}
      >
        <span className="text-[9px] uppercase tracking-widest">Progress</span>
        <ChevronDown
          className={`h-3 w-3 ${chevron} transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Badge list — slow reveal via CSS transition on max-height + opacity */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="space-y-1.5 pt-1">
          {visible.map((b) => (
            <li key={b.id} className="px-1">
              <p className={`text-[10px] leading-snug ${textPri}`}>
                {BADGE_LABELS[b.badgeType] ?? b.badgeType}
              </p>
              <p className={`text-[9px] mt-0.5 ${textSec}`}>{fmtAge(b.createdAt)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
