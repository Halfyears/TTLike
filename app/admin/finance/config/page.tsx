'use client'

/**
 * /admin/finance/config
 * Configure Stripe and PayPal gateway settings from the admin backend.
 * No code changes needed — all keys stored in DB (payment_configs table).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Settings, Save, RefreshCw, Eye, EyeOff, CheckCircle,
  XCircle, AlertTriangle, CreditCard, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface GatewayConfig {
  id:               string
  provider:         string
  mode:             string
  isEnabled:        boolean
  hasSecretKey:     boolean
  secretKeyMask:    string | null
  hasPublicKey:     boolean
  publicKeyMask:    string | null
  hasWebhookSecret: boolean
  webhookSecretMask: string | null
  hasClientId:      boolean
  clientIdMask:     string | null
  updatedAt:        string
}

// ── Sentinel for "don't overwrite existing" ───────────────────────────────────
const SENTINEL = '__unchanged__'

// ── Single gateway form ───────────────────────────────────────────────────────
function GatewayForm({ config, onSaved }: { config: GatewayConfig; onSaved: () => void }) {
  const isStripe  = config.provider === 'stripe'
  const isPayPal  = config.provider === 'paypal'

  const [mode,          setMode]          = useState(config.mode)
  const [isEnabled,     setIsEnabled]     = useState(config.isEnabled)
  const [secretKey,     setSecretKey]     = useState('')
  const [publicKey,     setPublicKey]     = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [clientId,      setClientId]      = useState('')
  const [showSecret,    setShowSecret]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const payload: Record<string, unknown> = {
        provider:  config.provider,
        mode,
        isEnabled,
        // If field left blank → send SENTINEL (keep existing); if filled → send new value
        secretKey:     secretKey     || SENTINEL,
        publicKey:     publicKey     || SENTINEL,
        webhookSecret: webhookSecret || SENTINEL,
        clientId:      clientId      || SENTINEL,
      }

      const res  = await fetch('/api/admin/finance/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setMsg({ ok: true, text: `${config.provider} config saved` })
      // Clear plaintext fields after save
      setSecretKey('')
      setPublicKey('')
      setWebhookSecret('')
      setClientId('')
      onSaved()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const InputRow = ({
    label, value, onChange, placeholder, show, onToggleShow, masked, hasValue,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    show?: boolean
    onToggleShow?: () => void
    masked: string | null
    hasValue: boolean
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
        {hasValue && (
          <span className="ml-2 text-[10px] font-mono text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded">
            {masked ?? '****'} (set)
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={show === false ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={hasValue ? 'Leave blank to keep existing value' : placeholder}
          className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white
            placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 pr-10"
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-emerald-900/40' : 'bg-gray-700'}`}>
            <CreditCard className={`h-4 w-4 ${isEnabled ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white capitalize">{config.provider}</h2>
            <p className="text-[11px] text-gray-500">
              Last updated: {new Date(config.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Mode + Enable toggles */}
        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
          >
            <option value="sandbox">Sandbox / Test</option>
            <option value="live">Live / Production</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsEnabled(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className={`text-xs font-medium ${isEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      {/* Mode warning */}
      {mode === 'live' && (
        <div className="mx-5 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Live mode — real charges will be processed
        </div>
      )}

      {/* Fields */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Secret Key */}
        <InputRow
          label={isStripe ? 'Secret Key (sk_...)' : 'Client Secret'}
          value={secretKey}
          onChange={setSecretKey}
          placeholder={isStripe ? 'sk_test_...' : 'EBWKjlELKMYqRNQ8sYfopyov...'}
          show={showSecret}
          onToggleShow={() => setShowSecret(v => !v)}
          masked={config.secretKeyMask}
          hasValue={config.hasSecretKey}
        />

        {/* Public Key / Client ID */}
        {isStripe && (
          <InputRow
            label="Publishable Key (pk_...)"
            value={publicKey}
            onChange={setPublicKey}
            placeholder="pk_test_..."
            masked={config.publicKeyMask}
            hasValue={config.hasPublicKey}
          />
        )}
        {isPayPal && (
          <InputRow
            label="Client ID"
            value={clientId}
            onChange={setClientId}
            placeholder="AcDYD0P_x0N0..."
            masked={config.clientIdMask}
            hasValue={config.hasClientId}
          />
        )}

        {/* Webhook Secret */}
        <InputRow
          label={isStripe ? 'Webhook Secret (whsec_...)' : 'Webhook Secret'}
          value={webhookSecret}
          onChange={setWebhookSecret}
          placeholder={isStripe ? 'whsec_...' : 'WEBHOOK_SECRET'}
          show={showSecret}
          onToggleShow={() => setShowSecret(v => !v)}
          masked={config.webhookSecretMask}
          hasValue={config.hasWebhookSecret}
        />
      </div>

      {/* Docs / hints */}
      <div className="px-5 pb-3 text-[11px] text-gray-600">
        {isStripe && (
          <>
            Get keys at{' '}
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-gray-400 hover:text-white underline">
              dashboard.stripe.com/apikeys
            </a>
            {' · '}Webhook secret at{' '}
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener" className="text-gray-400 hover:text-white underline">
              dashboard.stripe.com/webhooks
            </a>
          </>
        )}
        {isPayPal && (
          <>
            Get credentials at{' '}
            <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener" className="text-gray-400 hover:text-white underline">
              developer.paypal.com
            </a>
          </>
        )}
      </div>

      {/* Save */}
      <div className="px-5 pb-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saving
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save {config.provider}</>
          }
        </button>

        {msg && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.ok
              ? <CheckCircle className="h-3.5 w-3.5" />
              : <XCircle className="h-3.5 w-3.5" />
            }
            {msg.text}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinanceConfigPage() {
  const [configs,  setConfigs]  = useState<GatewayConfig[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/finance/config')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setConfigs(data.configs as GatewayConfig[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/finance"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Finance
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-pink-400" />
            <h1 className="text-xl font-bold text-white">Payment Gateway Config</h1>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Configure Stripe and PayPal API keys, webhook secrets, and mode here.
        <strong className="text-gray-300"> Keys are stored in the database</strong> —
        no code changes or redeployments needed.
      </p>

      {/* Security notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-900/20 border border-amber-700/40 text-amber-300 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Security:</strong> Keys are stored in the database accessible only to admin users.
          Existing keys are never returned to the browser — only the last 4 characters are shown as confirmation.
          Leave a field blank to keep the existing value.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && configs.length === 0 && (
        <div className="py-20 text-center text-gray-500">Loading config…</div>
      )}

      {/* Gateway forms */}
      {configs.map(cfg => (
        <GatewayForm key={cfg.provider} config={cfg} onSaved={load} />
      ))}
    </div>
  )
}
