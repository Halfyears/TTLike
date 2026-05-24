'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, CheckCircle, XCircle, RefreshCw, Play, Database, Clock, Image, AlertTriangle } from 'lucide-react'
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

export default function ScraperPage() {
  const [logs, setLogs] = useState<ScraperLog[]>([])
  const [stats, setStats] = useState<Stats>({ last_run: null, last_success: null, last_error: null, total_videos: 0 })
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // ── Cover cache state ──────────────────────────────────────────────────────
  const [caching, setCaching] = useState(false)
  const [cacheResult, setCacheResult] = useState<CacheResult | null>(null)
  const [cacheLimit, setCacheLimit] = useState(100)

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

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData])

  async function handleTrigger() {
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

      {/* Manual trigger */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <h2 className="text-white font-semibold mb-3">Manual Trigger</h2>
        <p className="text-gray-400 text-sm mb-4">
          Dispatches a GitHub Actions workflow run immediately. Requires{' '}
          <code className="text-pink-400 bg-gray-900 px-1 rounded text-xs">GH_TOKEN</code>{' '}
          in your environment.
        </p>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
