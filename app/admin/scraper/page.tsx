'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, CheckCircle, XCircle, RefreshCw, Play, Database, Clock, Image, AlertTriangle, ToggleLeft, ToggleRight, Shield, Settings2, Cpu, Ban } from 'lucide-react'
import { fmtDateTime } from '@/lib/dateUtils'

interface ScraperLog {
  id: string
  status: 'success' | 'error'
  message: string
  videos_fetched: number
  videos_updated: number
  error_details?: string | null
  created_at: string
}

interface Stats {
  last_run: string | null
  last_success: string | null
  last_error: string | null
  total_videos: number
}

function fmt(ts: string | null): string {
  if (!ts) return 'Never'
  return fmtDateTime(ts)
}

interface CacheResult {
  cached: number
  skipped: number
  failed: number
  total: number
  message: string
  error?: string
  hint?: string
}

interface RefreshResult {
  needsRefresh: number
  refreshed: number
  cached: number
  failed: number
  message: string
  error?: string
}

export default function ScraperPage() {
  const [logs, setLogs] = useState<ScraperLog[]>([])
  const [stats, setStats] = useState<Stats>({ last_run: null, last_success: null, last_error: null, total_videos: 0 })
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // ── Cover cache state ──────────────────────────────────────────────────────
  const [caching,     setCaching]     = useState(false)
  const [cacheResult, setCacheResult] = useState<CacheResult | null>(null)
  const [cacheLimit,  setCacheLimit]  = useState(100)

  // ── Refresh expired covers state ───────────────────────────────────────────
  const [refreshingCovers, setRefreshingCovers] = useState(false)
  const [refreshResult,    setRefreshResult]    = useState<RefreshResult | null>(null)
  const [refreshLimit,     setRefreshLimit]     = useState(50)

  // ── Fallback switch state ──────────────────────────────────────────────────
  const [fallbackEnabled,  setFallbackEnabled]  = useState(false)
  const [fallbackLoading,  setFallbackLoading]  = useState(false)
  const [fallbackUpdated,  setFallbackUpdated]  = useState<string | null>(null)
  const [fallbackMsg,      setFallbackMsg]      = useState<{ ok: boolean; text: string } | null>(null)

  // ── Scraper app config state ───────────────────────────────────────────────
  const [scraperApp,          setScraperApp]          = useState('github_actions')
  const [autoScrapeEnabled,   setAutoScrapeEnabled]   = useState(true)
  const [manualScrapeEnabled, setManualScrapeEnabled] = useState(true)
  const [configLoading,       setConfigLoading]       = useState(false)
  const [configMsg,           setConfigMsg]           = useState<{ ok: boolean; text: string } | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [logsRes, lastRunRes, lastSuccessRes, lastErrorRes, countRes] = await Promise.all([
        supabase.from('scraper_logs').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('scraper_logs').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('scraper_logs').select('created_at').eq('status', 'success').order('created_at', { ascending: false }).limit(1),
        supabase.from('scraper_logs').select('created_at').eq('status', 'error').order('created_at', { ascending: false }).limit(1),
        supabase.from('tiktok_videos').select('*', { count: 'exact', head: true }),
      ])

      setLogs((logsRes.data as ScraperLog[]) ?? [])
      setStats({
        last_run: lastRunRes.data?.[0]?.created_at ?? null,
        last_success: lastSuccessRes.data?.[0]?.created_at ?? null,
        last_error: lastErrorRes.data?.[0]?.created_at ?? null,
        total_videos: countRes.count ?? 0,
      })
    } finally {
      setRefreshing(false)
    }
  }, [])

  // ── Fetch fallback config ──────────────────────────────────────────────────
  const fetchFallback = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/scraper/fallback-config')
      const data = await res.json()
      if (res.ok) {
        setFallbackEnabled(data.enabled)
        setFallbackUpdated(data.updated_at)
      }
    } catch { /* ignore */ }
  }, [])

  // ── Fetch scraper app config ───────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/scraper/config')
      const data = await res.json()
      if (res.ok) {
        setScraperApp(data.scraper_app ?? 'github_actions')
        setAutoScrapeEnabled(data.auto_scrape_enabled !== false)
        setManualScrapeEnabled(data.manual_scrape_enabled !== false)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchData()
    fetchFallback()
    fetchConfig()
    const id = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData, fetchFallback, fetchConfig])

  // ── Toggle fallback ────────────────────────────────────────────────────────
  async function handleToggleFallback() {
    setFallbackLoading(true)
    setFallbackMsg(null)
    try {
      const next = !fallbackEnabled
      const res  = await fetch('/api/admin/scraper/fallback-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: next }),
      })
      const data = await res.json()
      if (res.ok) {
        setFallbackEnabled(data.enabled)
        setFallbackUpdated(data.updated_at)
        setFallbackMsg({
          ok:   true,
          text: `Fallback scraper ${data.enabled ? 'ENABLED — Apify bridge will be used when block rate ≥ 30%' : 'DISABLED — native HTTP fetch active'}`,
        })
      } else {
        setFallbackMsg({ ok: false, text: data.error ?? 'Failed to toggle' })
      }
    } finally {
      setFallbackLoading(false)
    }
  }

  // ── Update scraper app config ──────────────────────────────────────────────
  async function handleConfigUpdate(patch: {
    scraper_app?: string
    auto_scrape_enabled?: boolean
    manual_scrape_enabled?: boolean
  }) {
    setConfigLoading(true)
    setConfigMsg(null)
    try {
      const res  = await fetch('/api/admin/scraper/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const data = await res.json()
      if (res.ok) {
        setScraperApp(data.scraper_app)
        setAutoScrapeEnabled(data.auto_scrape_enabled)
        setManualScrapeEnabled(data.manual_scrape_enabled)
        setConfigMsg({ ok: true, text: 'Configuration saved.' })
      } else {
        setConfigMsg({ ok: false, text: data.error ?? 'Save failed' })
      }
    } finally {
      setConfigLoading(false)
    }
  }

  async function handleTrigger() {
    if (!manualScrapeEnabled) {
      setTriggerMsg({ ok: false, text: 'Manual scraping is disabled. Enable it in Scraper Configuration above.' })
      return
    }
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res = await fetch('/api/admin/trigger-scraper', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setTriggerMsg({ ok: true, text: 'Scraper triggered via GitHub Actions. Results appear in ~1 min.' })
        setTimeout(fetchData, 10_000)
      } else {
        setTriggerMsg({ ok: false, text: data.error ?? 'Unknown error' })
      }
    } catch (e) {
      setTriggerMsg({ ok: false, text: String(e) })
    } finally {
      setTriggering(false)
    }
  }

  async function handleRefreshExpiredCovers() {
    setRefreshingCovers(true)
    setRefreshResult(null)
    try {
      const res = await fetch('/api/admin/refresh-expired-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: refreshLimit }),
      })
      const data: RefreshResult = await res.json()
      setRefreshResult(data)
    } catch (e) {
      setRefreshResult({ needsRefresh: 0, refreshed: 0, cached: 0, failed: 0, message: String(e), error: String(e) })
    } finally {
      setRefreshingCovers(false)
    }
  }

  async function handleCacheCovers(force = false) {
    setCaching(true)
    setCacheResult(null)
    try {
      const res = await fetch('/api/admin/cache-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: cacheLimit, force }),
      })
      const data: CacheResult = await res.json()
      setCacheResult(data)
    } catch (e) {
      setCacheResult({ cached: 0, skipped: 0, failed: 0, total: 0, message: String(e), error: String(e) })
    } finally {
      setCaching(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Activity className="h-6 w-6 text-pink-400" /> Scraper Monitor
          </h1>
          <p className="text-gray-400 text-sm">Track crawler runs and data freshness</p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400 text-xs">Total Videos</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total_videos.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-xs">Last Run</span>
          </div>
          <p className="text-xs text-white">{fmt(stats.last_run)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-400 text-xs">Last Success</span>
          </div>
          <p className="text-xs text-white">{fmt(stats.last_success)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-gray-400 text-xs">Last Error</span>
          </div>
          <p className="text-xs text-white">{fmt(stats.last_error)}</p>
        </div>
      </div>

      {/* Block Rate Monitor */}
      {logs.length > 0 && (() => {
        const total    = logs.length
        const errors   = logs.filter(l => l.status === 'error').length
        const blockPct = Math.round((errors / total) * 100)
        const isAlert  = blockPct >= 30
        return (
          <div className={`mb-8 rounded-xl border p-5 ${isAlert ? 'bg-red-950/30 border-red-700' : 'bg-gray-800 border-gray-700'}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`h-4 w-4 ${isAlert ? 'text-red-400' : 'text-amber-400'}`} />
              <h2 className="text-white font-semibold">Block Rate Monitor</h2>
              {isAlert && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 uppercase tracking-wide animate-pulse">
                  ⚠ Alert — consider Apify fallback
                </span>
              )}
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className={`text-3xl font-black tabular-nums ${isAlert ? 'text-red-400' : 'text-amber-300'}`}>{blockPct}%</p>
                <p className="text-xs text-gray-500 mt-0.5">error rate (last {total} runs)</p>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isAlert ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, blockPct)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{errors} errors / {total} total · threshold: 30%</p>
              </div>
              {isAlert && (
                <div className="text-xs text-red-300 bg-red-950/50 rounded-lg px-3 py-2 max-w-xs">
                  Block rate ≥ 30%. Recommended: switch to Apify or Bright Data bridge to maintain scraping availability.
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Scraper Configuration ──────────────────────────────────────────── */}
      <div className="mb-8 bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-pink-400" />
          <h2 className="text-white font-semibold">Scraper Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Scraper App selector */}
          <div>
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 block">
              Scraper App
            </label>
            <select
              value={scraperApp}
              disabled={configLoading}
              onChange={e => handleConfigUpdate({ scraper_app: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
            >
              <option value="github_actions">GitHub Actions (Workflow)</option>
              <option value="apify_direct">Apify Direct</option>
              <option value="brightdata">Bright Data</option>
              <option value="custom">Custom Script</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-1.5">
              {scraperApp === 'github_actions' && 'Dispatches .github/workflows/fetch_tiktok.yml on demand or schedule.'}
              {scraperApp === 'apify_direct'   && 'Calls Apify Actor API directly — bypasses GitHub Actions.'}
              {scraperApp === 'brightdata'     && 'Routes through Bright Data residential proxies.'}
              {scraperApp === 'custom'         && 'Uses a custom scraper endpoint.'}
            </p>
          </div>

          {/* Auto-scrape toggle */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 block">
              Auto Scrape (Scheduled)
            </label>
            <div className="flex-1 flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5">
              <div>
                <p className={`text-sm font-semibold ${autoScrapeEnabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {autoScrapeEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {autoScrapeEnabled
                    ? 'Scheduled scraping is active'
                    : 'No automatic scraping'}
                </p>
              </div>
              <button
                onClick={() => handleConfigUpdate({ auto_scrape_enabled: !autoScrapeEnabled })}
                disabled={configLoading}
                className="shrink-0 disabled:opacity-50"
              >
                {autoScrapeEnabled
                  ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                  : <ToggleLeft  className="h-7 w-7 text-gray-500" />
                }
              </button>
            </div>
          </div>

          {/* Manual-scrape toggle */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 block">
              On-Demand Scrape (Manual)
            </label>
            <div className="flex-1 flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5">
              <div>
                <p className={`text-sm font-semibold ${manualScrapeEnabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {manualScrapeEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {manualScrapeEnabled
                    ? 'Manual trigger button active'
                    : 'Manual trigger is locked'}
                </p>
              </div>
              <button
                onClick={() => handleConfigUpdate({ manual_scrape_enabled: !manualScrapeEnabled })}
                disabled={configLoading}
                className="shrink-0 disabled:opacity-50"
              >
                {manualScrapeEnabled
                  ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                  : <ToggleLeft  className="h-7 w-7 text-gray-500" />
                }
              </button>
            </div>
          </div>

        </div>

        {!manualScrapeEnabled && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300 text-xs">
            <Ban className="h-3.5 w-3.5 shrink-0" />
            Manual trigger is currently disabled. Enable it above to allow on-demand scraping.
          </div>
        )}
        {!autoScrapeEnabled && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 text-xs">
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            Scheduled scraping is off. GitHub Actions cron will still run but can check this flag before proceeding.
          </div>
        )}
        {configMsg && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            configMsg.ok
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}>
            {configMsg.text}
          </div>
        )}
      </div>

      {/* Fallback Switch */}
      <div className={`mb-8 rounded-xl border p-5 ${fallbackEnabled ? 'bg-amber-950/20 border-amber-700' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${fallbackEnabled ? 'text-amber-400' : 'text-gray-500'}`} />
            <h2 className="text-white font-semibold">Fallback Scraper</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              fallbackEnabled
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-gray-700 text-gray-500'
            }`}>
              {fallbackEnabled ? 'Apify Bridge ON' : 'Native HTTP'}
            </span>
          </div>

          <button
            onClick={handleToggleFallback}
            disabled={fallbackLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              fallbackEnabled
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {fallbackEnabled
              ? <ToggleRight className="h-4 w-4" />
              : <ToggleLeft  className="h-4 w-4" />
            }
            {fallbackLoading
              ? 'Updating…'
              : fallbackEnabled ? 'Disable Fallback' : 'Enable Apify Fallback'
            }
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          When enabled, the scraper routes requests through Apify / Bright Data commercial proxies,
          bypassing TikTok&apos;s rate-limit blocks. Recommended when block rate ≥ 30%.
          {fallbackUpdated && (
            <span className="text-gray-600 ml-1">Last changed: {fmtDateTime(fallbackUpdated)}</span>
          )}
        </p>

        {fallbackMsg && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            fallbackMsg.ok
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}>
            {fallbackMsg.text}
          </div>
        )}
      </div>

      {/* Manual trigger */}
      <div className={`border rounded-xl p-5 mb-8 ${manualScrapeEnabled ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-700/50'}`}>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          Manual Trigger
          {!manualScrapeEnabled && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 uppercase tracking-wide">
              Disabled
            </span>
          )}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Dispatches a GitHub Actions workflow run immediately. Requires{' '}
          <code className="text-pink-400 bg-gray-900 px-1 rounded text-xs">GH_TOKEN</code>{' '}
          in your environment. Control availability via <strong className="text-gray-300">On-Demand Scrape</strong> toggle above.
        </p>
        <button
          onClick={handleTrigger}
          disabled={triggering || !manualScrapeEnabled}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            manualScrapeEnabled ? 'bg-pink-500 hover:bg-pink-600' : 'bg-gray-600'
          }`}
        >
          <Play className="h-4 w-4" />
          {triggering ? 'Triggering…' : 'Run Scraper Now'}
        </button>

        {triggerMsg && (
          <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${
            triggerMsg.ok
              ? 'bg-green-900/40 border border-green-700 text-green-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}>
            {triggerMsg.text}
          </div>
        )}
      </div>

      {/* Cache Covers panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Image className="h-5 w-5 text-pink-400" />
          <h2 className="text-white font-semibold">Cache Cover Images</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Downloads TikTok CDN cover images and stores them permanently in Supabase Storage
          (bucket: <code className="text-pink-400 bg-gray-900 px-1 rounded text-xs">covers</code>).
          Run this after every scrape to prevent thumbnails going blank when CDN URLs expire (~7 days).
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Batch size:</label>
            <select
              value={cacheLimit}
              onChange={e => setCacheLimit(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {[50, 100, 200].map(n => <option key={n} value={n}>{n} videos</option>)}
            </select>
          </div>

          <button
            onClick={() => handleCacheCovers(false)}
            disabled={caching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Image className={`h-4 w-4 ${caching ? 'animate-pulse' : ''}`} />
            {caching ? 'Caching…' : 'Cache New Covers'}
          </button>

          <button
            onClick={() => handleCacheCovers(true)}
            disabled={caching}
            title="Re-download all covers, even if already cached"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${caching ? 'animate-spin' : ''}`} />
            Force Re-cache
          </button>
        </div>

        {cacheResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            cacheResult.error && !cacheResult.cached
              ? 'bg-red-900/40 border border-red-700 text-red-300'
              : 'bg-green-900/30 border border-green-700/50 text-green-300'
          }`}>
            {cacheResult.hint ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">Migration not run</p>
                  <p className="text-amber-400/80 text-xs mt-0.5">{cacheResult.hint}</p>
                  <p className="text-amber-400/80 text-xs mt-1">
                    Run <code className="bg-gray-900 px-1 rounded">supabase/migrations/20260523_cover_storage.sql</code> in Supabase SQL Editor, then create a PUBLIC bucket named <code className="bg-gray-900 px-1 rounded">covers</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                <span>✅ Cached: <strong>{cacheResult.cached}</strong></span>
                <span>⏭ Skipped: <strong>{cacheResult.skipped}</strong></span>
                {cacheResult.failed > 0 && <span>❌ Failed: <strong>{cacheResult.failed}</strong></span>}
                <span className="text-gray-400">Total: {cacheResult.total}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh Expired Covers panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="h-5 w-5 text-amber-400" />
          <h2 className="text-white font-semibold">Refresh Expired Covers</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          For videos whose TikTok CDN URL has already expired and no Storage copy exists, fetches a fresh
          thumbnail via TikTok oEmbed API, then immediately caches it to Supabase Storage. Use this to
          recover thumbnails that went blank before being cached.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Batch size:</label>
            <select
              value={refreshLimit}
              onChange={e => setRefreshLimit(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {[25, 50, 100].map(n => <option key={n} value={n}>{n} videos</option>)}
            </select>
          </div>

          <button
            onClick={handleRefreshExpiredCovers}
            disabled={refreshingCovers}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingCovers ? 'animate-spin' : ''}`} />
            {refreshingCovers ? 'Refreshing…' : 'Refresh Expired Covers'}
          </button>
        </div>

        {refreshResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            refreshResult.error && !refreshResult.refreshed
              ? 'bg-red-900/40 border border-red-700 text-red-300'
              : 'bg-amber-900/20 border border-amber-700/50 text-amber-200'
          }`}>
            <p className="mb-1 text-xs text-amber-300/70">{refreshResult.message}</p>
            {refreshResult.needsRefresh > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span>🔍 Found expired: <strong>{refreshResult.needsRefresh}</strong></span>
                <span>🔄 URL refreshed: <strong>{refreshResult.refreshed}</strong></span>
                <span>✅ Cached: <strong>{refreshResult.cached}</strong></span>
                {refreshResult.failed > 0 && <span>❌ Failed: <strong>{refreshResult.failed}</strong></span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Run History (last 20)</h2>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">
            No logs yet — run the scraper to see results here.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-white truncate">{log.message}</span>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {fmtDateTime(log.created_at)}
                  </span>
                </div>

                {log.status === 'success' && (
                  <p className="mt-1 ml-6 text-xs text-gray-400">
                    Fetched: {log.videos_fetched} &nbsp;·&nbsp; Updated: {log.videos_updated}
                  </p>
                )}

                {log.status === 'error' && log.error_details && (
                  <p className="mt-1 ml-6 text-xs text-red-400 break-all">
                    {log.error_details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
