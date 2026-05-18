'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, CheckCircle, XCircle, RefreshCw, Play, Database, Clock } from 'lucide-react'

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
  return new Date(ts).toLocaleString()
}

export default function ScraperPage() {
  const [logs, setLogs] = useState<ScraperLog[]>([])
  const [stats, setStats] = useState<Stats>({ last_run: null, last_success: null, last_error: null, total_videos: 0 })
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
          <code className="text-pink-400 bg-gray-900 px-1 rounded text-xs">GITHUB_TOKEN</code>{' '}
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
                    {new Date(log.created_at).toLocaleString()}
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
