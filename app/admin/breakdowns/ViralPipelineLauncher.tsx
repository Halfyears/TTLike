'use client'

/**
 * ViralPipelineLauncher
 * Allows an admin to enter a video_id and launch the viral pipeline.
 * Styled to match BatchTrigger for visual consistency.
 */

import { useState } from 'react'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { ViralPipelinePanel } from '@/components/admin/ViralPipelinePanel'

export function ViralPipelineLauncher() {
  const [open,    setOpen]    = useState(false)
  const [videoId, setVideoId] = useState('')
  const [active,  setActive]  = useState(false)

  function handleLoad() {
    if (videoId.trim()) setActive(true)
  }

  function handleReset() {
    setActive(false)
    setVideoId('')
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">

      {/* Header row — always visible */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" />
            Viral Pipeline Generator
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-lg">
            Convert any video breakdown into a structured 4-track script via
            Spike → Structure → Router → Language → Emotion AI pipeline.
          </p>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shrink-0"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? 'Collapse' : 'Open Pipeline'}
        </button>
      </div>

      {/* Expandable body */}
      {open && (
        <div className="mt-4 space-y-3">
          {!active ? (
            <>
              <p className="text-xs text-gray-500">
                Paste a <code className="text-violet-300 bg-gray-700 px-1 rounded">tiktok_videos.id</code> UUID from the Videos table to begin.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoId}
                  onChange={e => setVideoId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoad()}
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <button
                  onClick={handleLoad}
                  disabled={!videoId.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  Load Video
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 font-mono truncate">
                  Video: <span className="text-violet-300">{videoId}</span>
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0 ml-3"
                >
                  ← Change video
                </button>
              </div>
              <ViralPipelinePanel
                videoId={videoId.trim()}
                productName={null}
                niche={null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
