'use client'

/**
 * ViralPipelineLauncher
 *
 * Thin wrapper for the admin breakdowns page.
 * Accepts a freeform video_id input and renders ViralPipelinePanel.
 */

import { useState } from 'react'
import { ViralPipelinePanel } from '@/components/admin/ViralPipelinePanel'
import { Zap } from 'lucide-react'

export function ViralPipelineLauncher() {
  const [videoId, setVideoId] = useState('')
  const [active,  setActive]  = useState(false)

  return (
    <div className="space-y-3">
      {!active ? (
        <div className="bg-gray-800 border border-violet-700/30 rounded-xl p-4 flex items-center gap-3">
          <Zap className="h-4 w-4 text-violet-400 shrink-0" />
          <input
            value={videoId}
            onChange={e => setVideoId(e.target.value)}
            placeholder="Paste tiktok_videos.id UUID to run Viral Pipeline…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          <button
            onClick={() => videoId.trim() && setActive(true)}
            disabled={!videoId.trim()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-all"
          >
            Load
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => { setActive(false); setVideoId('') }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ← Change video
          </button>
          <ViralPipelinePanel
            videoId={videoId.trim()}
            productName={null}
            niche={null}
          />
        </div>
      )}
    </div>
  )
}
