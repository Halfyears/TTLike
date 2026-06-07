'use client'

/**
 * UpgradeModal
 *
 * Shown when a free-tier user hits their monthly studio quota.
 * Displays: usage bar · two plan cards (Creator / Scale) · CTAs
 *
 * Mobile behaviour:
 *  - Slides up from bottom on small screens (items-end), centred on sm+
 *  - max-h-[90vh] + overflow-y-auto prevents content overflow on short viewports
 *  - All touch targets ≥ 44px (min-h-[44px] on buttons)
 *  - Single column plan layout on very narrow screens (<360px) via grid-cols-1 xs:grid-cols-2
 *
 * Accessibility:
 *  - role="dialog" + aria-modal + aria-labelledby
 *  - Escape key closes the modal
 *  - Backdrop click closes the modal
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Check } from 'lucide-react'

interface UpgradeModalProps {
  used:    number
  limit:   number
  onClose: () => void
}

const CREATOR_FEATURES = [
  '50 shoot-ready outputs / month',
  'Full AI script + hook breakdown',
  'Pre-shoot checklist (personalised)',
  'Unlimited product browsing',
  'Priority generation queue',
]

const SCALE_FEATURES = [
  '500 shoot-ready outputs / month',
  'Everything in Creator',
  'Bulk product analysis',
  'Strategy audit (20/mo)',
  'Custom hook generation (500/mo)',
]

export function UpgradeModal({ used, limit, onClose }: UpgradeModalProps) {
  const router = useRouter()
  const pct    = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))

  // Escape key closes modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function navigate(href: string) {
    onClose()
    router.push(href)
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — max-h + scroll prevents overflow on short mobile viewports */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Close button — min 44×44px touch target */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close upgrade modal"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Header gradient band */}
        <div className="bg-gradient-to-br from-pink-500 via-violet-500 to-indigo-500 px-5 pt-7 pb-5 text-white">
          <div className="flex items-center gap-2 mb-1 pr-10">
            <Zap className="w-5 h-5 shrink-0" aria-hidden="true" />
            <p id="upgrade-modal-title" className="font-bold text-lg leading-tight">Monthly limit reached</p>
          </div>
          <p className="text-sm text-white/80 mb-4">
            You&apos;ve used all {limit} free script{limit === 1 ? '' : 's'} this month.
            Upgrade to keep filming.
          </p>

          {/* Usage bar */}
          <div
            className="bg-white/20 rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-white/70 mt-1.5 text-right">{used} / {limit} used</p>
        </div>

        {/* Plan cards — 1 col on very narrow (<360px), 2 col otherwise */}
        <div className="px-4 py-5 grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">

          {/* Creator */}
          <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-pink-500 mb-1">Creator</p>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">
              $39<span className="text-sm font-normal text-gray-400">/mo</span>
            </p>
            <p className="text-[11px] text-gray-500 mb-3">50 outputs / month</p>
            <ul className="space-y-1.5 mb-4 flex-1">
              {CREATOR_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-pink-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-[11px] text-gray-700 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            {/* ≥44px touch target */}
            <button
              type="button"
              onClick={() => navigate('/pricing?plan=creator')}
              className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Creator
            </button>
          </div>

          {/* Scale */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Scale</p>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">
              $99<span className="text-sm font-normal text-gray-400">/mo</span>
            </p>
            <p className="text-[11px] text-gray-500 mb-3">500 outputs / month</p>
            <ul className="space-y-1.5 mb-4 flex-1">
              {SCALE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-[11px] text-gray-700 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/pricing?plan=scale')}
              className="w-full min-h-[44px] py-2.5 bg-gray-800 text-white text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
            >
              Get Scale
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="min-h-[44px] px-4 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Compare all plans →
          </button>
        </div>

      </div>
    </div>
  )
}
