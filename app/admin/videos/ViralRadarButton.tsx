'use client'

/**
 * ViralRadarButton — triggers the Super Viral Radar scan.
 *
 * Calls POST /api/admin/viral-radar to:
 *   1. Count how many unique users have analysed each video
 *   2. Mark videos analysed ≥ threshold times as is_viral_hit = true
 *   3. Clear stale flags from videos that no longer meet the threshold
 *
 * After a successful scan, refreshes the page to reflect updated badges.
 */

import { useState } from 'react'
import { Radar, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface RadarResult {
  updated:   number
  video_ids: string[]
}

export function ViralRadarButton() {
  const [running,  setRunning]  = useState(false)
  const [result,   setResult]   = useState<RadarResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res  = await fetch('/api/admin/viral-radar', { method: 'POST' })
      const json = await res.json() as RadarResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Radar scan failed')
      setResult(json)
      // Reload after 1.5s so viral badges appear
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 disabled:opacity-50 text-sm font-bold text-red-300 transition-all"
      >
        {running
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
          : <><Radar className="h-4 w-4" /> Run Viral Radar</>
        }
      </button>

      {result && !running && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" />
          {result.updated} video{result.updated !== 1 ? 's' : ''} flagged as super viral
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </div>
  )
}
