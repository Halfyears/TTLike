'use client'

import { useState } from 'react'
import { ChevronDown, Mic } from 'lucide-react'

export interface TranscriptSegment {
  timecode: string   // "MM:SS-MM:SS"
  text:     string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSeconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number)
  return (m ?? 0) * 60 + (s ?? 0)
}

/** Gap in seconds between end of seg[i] and start of seg[i+1]. Returns null for last segment. */
function gapAfter(segs: TranscriptSegment[], i: number): number | null {
  if (i >= segs.length - 1) return null
  const endStr   = segs[i].timecode.split('-')[1]  ?? ''
  const startStr = segs[i + 1].timecode.split('-')[0] ?? ''
  if (!endStr || !startStr) return null
  return Math.max(0, parseSeconds(startStr) - parseSeconds(endStr))
}

const TRANSITION_WORDS = /^(but|however|so|then|now|wait|actually|and|plus|also|here'?s?|look|see|the thing is|that means|which means|what this means)/i

type Marker = 'pause' | 'transition' | null

function markerAfter(segs: TranscriptSegment[], i: number): Marker {
  const gap  = gapAfter(segs, i)
  const next = segs[i + 1]?.text ?? ''

  if (gap !== null && gap >= 1.2) return 'pause'
  if (TRANSITION_WORDS.test(next.trim())) return 'transition'
  // sentence-ending followed by next segment starting with capital
  if (/[.!?]$/.test(segs[i].text.trim()) && /^[A-Z一-龥]/.test(next.trim())) return 'transition'
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TranscriptCard({ segments }: { segments: TranscriptSegment[] }) {
  const [open, setOpen] = useState(false)

  if (segments.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Audio Transcript</p>
            <p className="text-xs text-gray-400 mt-0.5">{segments.length} segments · tap to read</p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Segment list */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[600px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0'}`}
      >
        <ol className="px-5 pb-5 pt-1 space-y-1">
          {segments.map((seg, i) => {
            const marker = markerAfter(segments, i)
            return (
              <li key={i}>
                {/* Segment row */}
                <div className="flex items-start gap-3 py-1.5">
                  <span className="shrink-0 text-[10px] text-gray-400 font-mono mt-0.5 w-20">
                    {seg.timecode}
                  </span>
                  <p className="text-sm text-gray-800 leading-relaxed">{seg.text}</p>
                </div>

                {/* Marker between segments */}
                {marker === 'pause' && (
                  <div className="flex items-center gap-2 py-1 pl-24">
                    <div className="flex gap-0.5">
                      {[0,1,2].map(j => (
                        <span key={j} className="w-1 h-1 rounded-full bg-gray-300" />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">pause</span>
                  </div>
                )}

                {marker === 'transition' && (
                  <div className="flex items-center gap-2 py-1 pl-24">
                    <div className="h-px w-6 bg-violet-200" />
                    <span className="text-[10px] text-violet-400 uppercase tracking-wider">turn</span>
                    <div className="h-px flex-1 bg-violet-100" />
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {/* Legend */}
        <div className="px-5 pb-4 flex items-center gap-4 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
            <span className="text-[10px] text-gray-400 ml-1">pause ≥1.2s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-4 bg-violet-300" />
            <span className="text-[10px] text-gray-400">topic turn</span>
          </div>
        </div>
      </div>
    </div>
  )
}
