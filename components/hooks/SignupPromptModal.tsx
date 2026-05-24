'use client'

/**
 * SignupPromptModal
 *
 * Shown after anonymous users hit their soft generation cap (5 or 10 uses).
 * Never blocks — always shows a "Continue free" dismiss option.
 */

import { X, Sparkles, History, Zap } from 'lucide-react'
import Link from 'next/link'

interface Props {
  /** How many generations the user has completed */
  count:     number
  onDismiss: () => void
}

export function SignupPromptModal({ count, onDismiss }: Props) {
  const isHard = count >= 10  // stronger message at 10+

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={e => { if (e.target === e.currentTarget) onDismiss() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">

        {/* Top gradient accent */}
        <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-indigo-500 to-pink-500" />

        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-5">
          {/* Icon + headline */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-pink-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              {isHard ? 'You\'re on a roll 🔥' : 'Save your hooks before they\'re gone'}
            </h2>
          </div>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            {isHard
              ? `${count} hooks generated! Create a free account to keep your history and unlock 10 bonus daily analyses.`
              : 'You\'ve generated 5 hooks. Sign up free to save them, access your history, and get 3 bonus video analyses daily.'}
          </p>

          {/* Benefits */}
          <ul className="space-y-2 mb-5">
            {[
              { icon: History, text: 'Unlimited Hook Machine — always free' },
              { icon: Zap,     text: '3 free video analyses per day' },
              { icon: Sparkles, text: 'Save & organise your hook history' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-slate-300">
                <Icon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <Link href="/auth/signup" className="w-full">
              <button className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-semibold transition-colors shadow-lg shadow-pink-900/30">
                Sign Up Free — No Credit Card
              </button>
            </Link>
            <Link href="/auth/login" className="w-full">
              <button className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium transition-colors">
                Already have an account? Log In
              </button>
            </Link>
            <button
              onClick={onDismiss}
              className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Continue without saving
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
