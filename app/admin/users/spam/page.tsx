'use client'

/**
 * /admin/users/spam
 * Configure anti-spam rules: enable/disable, edit thresholds, set auto-actions.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldAlert, Plus, RefreshCw, Save, Trash2,
  ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpamRule {
  id:          string
  name:        string
  description: string | null
  ruleType:    string
  config:      Record<string, unknown> | null
  autoAction:  string | null
  isEnabled:   boolean
  createdAt:   string
  updatedAt:   string
}

const RULE_TYPES = [
  { value: 'disposable_email',  label: 'Disposable Email' },
  { value: 'email_pattern',     label: 'Email Pattern' },
  { value: 'registration_rate', label: 'Registration Rate' },
  { value: 'manual_flag',       label: 'Manual Flag' },
]

const AUTO_ACTIONS = [
  { value: '',             label: 'None (flag only)' },
  { value: 'flag',         label: 'Flag user' },
  { value: 'set_pending',  label: 'Set status → Pending' },
  { value: 'set_inactive', label: 'Set status → Inactive' },
]

const AUTO_ACTION_COLORS: Record<string, string> = {
  flag:         'bg-amber-900/40 text-amber-300',
  set_pending:  'bg-yellow-900/40 text-yellow-300',
  set_inactive: 'bg-red-900/40 text-red-300',
}

// ── Rule row ──────────────────────────────────────────────────────────────────
function RuleRow({
  rule, onToggle, onSave, onDelete,
}: {
  rule:     SpamRule
  onToggle: (id: string, enabled: boolean) => void
  onSave:   (id: string, patch: Partial<SpamRule>) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [name,        setName]        = useState(rule.name)
  const [description, setDescription] = useState(rule.description ?? '')
  const [autoAction,  setAutoAction]  = useState(rule.autoAction ?? '')
  const [configText,  setConfigText]  = useState(
    rule.config ? JSON.stringify(rule.config, null, 2) : ''
  )
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      let parsedConfig: Record<string, unknown> | null = null
      if (configText.trim()) {
        parsedConfig = JSON.parse(configText)
      }
      await onSave(rule.id, {
        name,
        description: description || null,
        autoAction:  autoAction || null,
        config:      parsedConfig ?? undefined,
      } as Partial<SpamRule>)
      setMsg({ ok: true, text: 'Saved' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${rule.isEnabled ? 'border-gray-600' : 'border-gray-700 opacity-60'}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-3.5 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(rule.id, !rule.isEnabled) }}
          className="shrink-0"
        >
          {rule.isEnabled
            ? <ToggleRight className="h-5 w-5 text-emerald-400" />
            : <ToggleLeft  className="h-5 w-5 text-gray-500" />
          }
        </button>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{rule.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
              {RULE_TYPES.find(r => r.value === rule.ruleType)?.label ?? rule.ruleType}
            </span>
            {rule.autoAction && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${AUTO_ACTION_COLORS[rule.autoAction] ?? 'bg-gray-700 text-gray-400'}`}>
                → {AUTO_ACTIONS.find(a => a.value === rule.autoAction)?.label ?? rule.autoAction}
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{rule.description}</p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(rule.id) }}
          className="shrink-0 text-gray-600 hover:text-red-400 transition-colors p-1"
          title="Delete rule"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div className="px-5 py-4 bg-gray-800/50 border-t border-gray-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rule Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Auto Action</label>
              <select
                value={autoAction}
                onChange={e => setAutoAction(e.target.value)}
                className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                {AUTO_ACTIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description…"
              className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Config (JSON)
              <span className="ml-1 text-gray-600">— rule-specific parameters</span>
            </label>
            <textarea
              value={configText}
              onChange={e => setConfigText(e.target.value)}
              rows={4}
              className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-pink-500 resize-y"
              placeholder='{"domains": ["mailinator.com", ...]}'
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              {saving
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><Save className="h-3.5 w-3.5" /> Save Rule</>
              }
            </button>
            {msg && (
              <span className={`text-xs flex items-center gap-1 ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {msg.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── New rule form ─────────────────────────────────────────────────────────────
function NewRuleForm({ onCreate }: { onCreate: () => void }) {
  const [open,       setOpen]       = useState(false)
  const [name,       setName]       = useState('')
  const [ruleType,   setRuleType]   = useState('email_pattern')
  const [autoAction, setAutoAction] = useState('')
  const [saving,     setSaving]     = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/admin/users/spam', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), ruleType, autoAction: autoAction || null }),
      })
      setName('')
      setOpen(false)
      onCreate()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-600 text-gray-500 hover:border-pink-600 hover:text-pink-400 transition-colors text-sm w-full justify-center"
    >
      <Plus className="h-4 w-4" /> Add Rule
    </button>
  )

  return (
    <div className="bg-gray-800 border border-pink-600/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-white">New Spam Rule</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Rule name…"
            className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>
        <select
          value={ruleType}
          onChange={e => setRuleType(e.target.value)}
          className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
        >
          {RULE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={autoAction}
          onChange={e => setAutoAction(e.target.value)}
          className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
        >
          {AUTO_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Create
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpamConfigPage() {
  const [rules,   setRules]   = useState<SpamRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/users/spam')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setRules(data.rules as SpamRule[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/users/spam/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isEnabled: enabled }),
    })
    setRules(prev => prev.map(r => r.id === id ? { ...r, isEnabled: enabled } : r))
  }

  async function handleSave(id: string, patch: Partial<SpamRule>) {
    const res  = await fetch(`/api/admin/users/spam/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Save failed')
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...data.rule } : r))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this spam rule?')) return
    await fetch(`/api/admin/users/spam/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const activeCount  = rules.filter(r => r.isEnabled).length
  const total        = rules.length

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Users
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <h1 className="text-xl font-bold text-white">Anti-Spam Rules</h1>
          </div>
          {!loading && (
            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
              {activeCount}/{total} active
            </span>
          )}
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
        Configure rules to detect and automatically handle suspicious user accounts.
        New registrations matching enabled rules will trigger the configured auto-action.
      </p>

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-700/40 text-blue-300 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          Rules are checked at registration and can be re-run on existing users via the Users page.
          Auto-actions affect the user&apos;s <strong>Account Status</strong> field.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading rules…</div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
          <NewRuleForm onCreate={load} />
        </div>
      )}
    </div>
  )
}
