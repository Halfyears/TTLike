'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Mail, CreditCard, LogOut, Check, Loader2,
  ExternalLink, Shield, ChevronRight, AlertTriangle, BarChart2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import type { TierResponse } from '@/app/api/user/tier/route'

// ── Plan config ────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:       { label: 'Free',       color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200'   },
  creator:    { label: 'Creator',    color: 'text-pink-700',   bg: 'bg-pink-50',    border: 'border-pink-200'   },
  scale:      { label: 'Scale',      color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200' },
  enterprise: { label: 'Enterprise', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200'  },
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-0.5">
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router   = useRouter()

  // ── User state ────────────────────────────────────────────────────────────
  const [email,       setEmail]       = useState('')
  const [name,        setName]        = useState('')
  const [initials,    setInitials]    = useState('?')
  const [tier,        setTier]        = useState<TierResponse | null>(null)
  const [tierLoading, setTierLoading] = useState(true)

  // ── Name edit ─────────────────────────────────────────────────────────────
  const [nameEdit,    setNameEdit]    = useState('')
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameSaved,   setNameSaved]   = useState(false)
  const [nameError,   setNameError]   = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Billing portal ────────────────────────────────────────────────────────
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState('')

  // ── Sign out ──────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false)

  // ── Load user + tier ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    void (async () => {
      // The browser Supabase client has no real session under the
      // Cloudflare/D1 auth path — ask the server, which routes correctly.
      const res  = await fetch('/api/user/profile')
      const data = await res.json() as { user: { name: string | null; email: string | null } | null }
      const user = data.user
      if (!mounted) return                          // component unmounted (e.g. sign-out navigated away)
      if (!user) { router.push('/auth/login'); return }

      const displayName = user.name ?? ''
      const userEmail   = user.email ?? ''
      setEmail(userEmail)
      setName(displayName)
      setNameEdit(displayName)
      setInitials(
        displayName
          ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : userEmail[0]?.toUpperCase() ?? '?'
      )
    })()

    void fetch('/api/user/tier')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: TierResponse) => { if (mounted) setTier(d) })
      .catch(() => {})
      .finally(() => { if (mounted) setTierLoading(false) })

    return () => {
      mounted = false
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nameEdit.trim()
    if (!trimmed || trimmed === name) return
    setNameSaving(true)
    setNameError('')
    try {
      const res  = await fetch('/api/user/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setNameError(data.error ?? 'Failed to save'); return }
      setName(trimmed)
      setNameSaved(true)
      setInitials(trimmed.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase())
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setNameSaved(false), 2500)
    } catch {
      setNameError('Network error — please try again')
    } finally {
      setNameSaving(false)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setPortalError(data.error ?? 'Could not open billing portal'); return }
      if (data.url) window.location.href = data.url
    } catch {
      setPortalError('Network error — please try again')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      // Sign-out must happen server-side: it clears an httpOnly cookie under
      // the Cloudflare/D1 auth path, which the browser client can't touch.
      await fetch('/api/auth/signout', { method: 'POST' })
      router.push('/')
      setTimeout(() => router.refresh(), 100)
    } catch {
      setSigningOut(false)
    }
  }

  // Only compute isFree after tier has loaded — prevents paid users seeing "Upgrade" flash
  const isFree  = tierLoading ? null : (!tier || tier.tier_name === 'free')
  const planCfg = PLAN_CONFIG[tier?.tier_name ?? 'free'] ?? PLAN_CONFIG.free!

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Account</h1>
          <p className="text-xs text-gray-500 mt-0.5">Profile, plan, and sign-out settings</p>
        </div>
      </div>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Section title="Profile">
        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4">

            {/* Avatar + identifiers */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg font-black shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">{name || 'No name set'}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {email}
                </p>
              </div>
            </div>

            {/* Name edit form */}
            <form onSubmit={handleSaveName} className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameEdit}
                  onChange={e => { setNameEdit(e.target.value.slice(0, 60)); setNameError('') }}
                  placeholder="Your name"
                  maxLength={60}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="submit"
                  disabled={nameSaving || !nameEdit.trim() || nameEdit.trim() === name}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-pink-600 transition-colors"
                >
                  {nameSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : nameSaved
                    ? <><Check className="h-4 w-4" /> Saved</>
                    : 'Save'}
                </button>
              </div>
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              <p className="text-[11px] text-gray-400">
                Email address cannot be changed here — contact support.
              </p>
            </form>
          </CardContent>
        </Card>
      </Section>

      {/* ── Plan & Billing ────────────────────────────────────────────────── */}
      <Section title="Plan & Billing">
        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4">

            {/* Current plan row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Current Plan</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${planCfg.color} ${planCfg.bg} ${planCfg.border}`}>
                {planCfg.label}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {isFree === null ? (
                /* Loading skeleton — prevents paid users seeing "Upgrade" flash */
                <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ) : isFree ? (
                /* Free → show upgrade */
                <a
                  href="/pricing"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Upgrade to Creator — $29/mo
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              ) : (
                /* Paid → manage via Stripe portal */
                <>
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Manage Billing &amp; Invoices
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-dashed border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <span>Cancel Subscription</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {portalError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {portalError}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    Billing is managed via Stripe. You&apos;ll be redirected to a secure portal.
                  </p>
                </>
              )}
            </div>

            {/* Usage quick-link — prominent */}
            <a
              href="/dashboard/usage"
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-gray-400" />
                Quota &amp; History
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </a>
          </CardContent>
        </Card>
      </Section>

      {/* ── Sign Out ──────────────────────────────────────────────────────── */}
      <Section title="Session">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Sign Out</p>
                <p className="text-xs text-gray-400 mt-0.5">You&apos;ll be returned to the homepage</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {signingOut
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <LogOut className="h-4 w-4" />}
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </CardContent>
        </Card>
      </Section>

    </div>
  )
}
