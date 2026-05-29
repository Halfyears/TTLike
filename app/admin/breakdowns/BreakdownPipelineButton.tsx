'use client'

/**
 * BreakdownPipelineButton
 *
 * Per-row "Run Pipeline" button for the breakdown table.
 * On click, opens a modal with the ViralPipelinePanel pre-loaded
 * with the video's product info (no manual UUID entry needed).
 */

import { useState } from 'react'
import { Zap, X } from 'lucide-react'
import { ViralPipelinePanel } from '@/components/admin/ViralPipelinePanel'

interface Props {
  videoId:     string
  productName: string | null
  niche:       string | null
  hasTimeline: boolean   // true if breakdown has visual_timeline (real video analysis)
}

export function BreakdownPipelineButton({ videoId, productName, niche, hasTimeline }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={hasTimeline ? 'Run Viral Pipeline (video analysed)' : 'Run Viral Pipeline (metadata only)'}
        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
          hasTimeline
            ? 'bg-violet-600/80 hover:bg-violet-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <Zap className="h-3 w-3" />
        Pipeline
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl mt-8 mb-8">

            {/* Modal header */}
            <div className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-t-xl px-5 py-3.5">
              <div>
                <p className="text-white font-semibold text-sm">Viral Pipeline</p>
                {productName && (
                  <p className="text-gray-400 text-xs mt-0.5 truncate max-w-xs">{productName}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Data source info */}
            <div className={`px-5 py-2 text-[11px] border-x ${
              hasTimeline
                ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-400'
                : 'bg-amber-900/20 border-amber-700/30 text-amber-400'
            }`}>
              {hasTimeline
                ? '✓ Real video analysis available — Gemini extracted scene timeline and timestamps'
                : '⚠ No scene timeline — generate a breakdown first for best results'
              }
            </div>

            {/* Panel (always open, no double-toggle) */}
            <div className="bg-gray-800 border border-gray-600 border-t-0 rounded-b-xl overflow-hidden">
              <ViralPipelinePanel
                videoId={videoId}
                productName={productName}
                niche={niche}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
