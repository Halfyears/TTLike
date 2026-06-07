'use client'

/**
 * UpgradeModal
 *
 * Shown when a free-tier user hits their monthly studio quota.
 * Displays: usage bar · two plan cards (Creator / Scale) · CTAs
 */

import { X, Zap, Check } from 'lucide-react'
import Link from 'next/link'

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
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade plan"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Header gradient band */}
        <div className="bg-gradient-to-br from-pink-500 via-violet-500 to-indigo-500 px-6 pt-8 pb-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 shrink-0" />
            <p className="font-bold text-lg">Monthly limit reached</p>
          </div>
          <p className="text-sm text-white/80 mb-4">
            You&apos;ve used all {limit} free script{limit === 1 ? '' : 's'} this month.
            Upgrade to keep filming.
          </p>

          {/* Usage bar */}
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-white/70 mt-1.5 text-right">
            {used} / {limit} used
          </p>
        </div>

        {/* Plan cards */}
        <div className="px-4 py-5 grid grid-cols-2 gap-3">

          {/* Creator */}
          <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-pink-500 mb-1">Creator</p>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">$39<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <p className="text-[11px] text-gray-500 mb-3">50 outputs / month</p>
            <ul className="space-y-1.5 mb-4 flex-1">
              {CREATOR_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-pink-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-gray-700 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/pricing?plan=creator" onClick={onClose}>
              <button className="w-full py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity">
                Get Creator
              </button>
            </Link>
          </div>

          {/* Scale */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Scale</p>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">$99<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <p className="text-[11px] text-gray-500 mb-3">500 outputs / month</p>
            <ul className="space-y-1.5 mb-4 flex-1">
              {SCALE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-gray-700 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/pricing?plan=scale" onClick={onClose}>
              <button className="w-full py-2 bg-gray-800 text-white text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors">
                Get Scale
              </button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <Link href="/pricing" onClick={onClose}>
            <span className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
              Compare all plans →
            </span>
          </Link>
        </div>

      </div>
    </div>
  )
}
