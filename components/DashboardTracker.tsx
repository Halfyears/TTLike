'use client'

/**
 * DashboardTracker — invisible client component mounted on the dashboard.
 *
 * Two tracking mechanisms:
 * 1. Dwell time — reports every 30 s (max 10 reports = 5 min cap)
 * 2. Feature clicks — intercepts clicks on elements with data-track-feature attribute
 *    via event delegation, then fires POST /api/analytics/track-event
 *
 * Errors are silently swallowed so tracking never breaks the UX.
 */

import { useEffect, useRef } from 'react'

interface Props {
  page?: string
}

async function trackEvent(body: Record<string, unknown>) {
  try {
    await fetch('/api/analytics/track-event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch { /* fire-and-forget, never throw */ }
}

export function DashboardTracker({ page = 'dashboard' }: Props) {
  const dwellSeconds = useRef(0)
  const reportCount  = useRef(0)
  const MAX_REPORTS  = 10  // cap at 5 min of dwell reporting

  useEffect(() => {
    // ── Dwell time: fire every 30s ──────────────────────────────────────────
    const interval = setInterval(() => {
      dwellSeconds.current += 30
      if (reportCount.current >= MAX_REPORTS) return
      reportCount.current++
      trackEvent({ event_type: 'page_dwell', page, dwell_seconds: 30 })
    }, 30_000)

    // ── Feature click delegation ────────────────────────────────────────────
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-track-feature]') as HTMLElement | null
      if (!target) return
      const featureName = target.dataset.trackFeature
      if (featureName) {
        trackEvent({ event_type: 'feature_click', feature_name: featureName, page })
      }
    }
    document.addEventListener('click', handleClick)

    return () => {
      clearInterval(interval)
      document.removeEventListener('click', handleClick)
    }
  }, [page])

  // Invisible — renders nothing
  return null
}
