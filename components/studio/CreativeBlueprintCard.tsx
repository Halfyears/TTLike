'use client'

import { Sparkles, Clock, Zap } from 'lucide-react'
import type { CreativeBlueprint } from '@/lib/utils/result-transform'

const ARC_LABELS: Record<string, string> = {
  tension_release:  'Tension → Release',
  curiosity_reveal: 'Curiosity → Reveal',
  pain_solution:    'Pain → Solution',
  story_arc:        'Story Arc',
}

const EMOTION_COLORS: Record<string, string> = {
  curiosity:   'bg-yellow-100 text-yellow-700',
  surprise:    'bg-purple-100 text-purple-700',
  anxiety:     'bg-red-100 text-red-700',
  relief:      'bg-green-100 text-green-700',
  trust:       'bg-blue-100 text-blue-700',
  fomo:        'bg-orange-100 text-orange-700',
  urgency:     'bg-red-100 text-red-700',
  confidence:  'bg-blue-100 text-blue-700',
  satisfaction: 'bg-green-100 text-green-700',
  inspiration: 'bg-indigo-100 text-indigo-700',
  empathy:     'bg-pink-100 text-pink-700',
  focus:       'bg-blue-100 text-blue-700',
}

function emotionChip(e: string) {
  const cls = EMOTION_COLORS[e.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
  return (
    <span key={e} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {e}
    </span>
  )
}

interface CreativeBlueprintCardProps {
  blueprint: CreativeBlueprint
}

export function CreativeBlueprintCard({ blueprint }: CreativeBlueprintCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Creative Blueprint</h2>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Hook */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Opening Hook
          </p>
          <blockquote className="text-gray-900 font-medium text-base sm:text-lg leading-snug border-l-4 border-indigo-400 pl-4 italic">
            &ldquo;{blueprint.hook}&rdquo;
          </blockquote>
        </div>

        {/* Arc + Duration */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Emotion Arc</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
              {ARC_LABELS[blueprint.emotion_arc] ?? blueprint.emotion_arc}
            </span>
          </div>
          {blueprint.duration && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                {blueprint.duration}
              </span>
            </div>
          )}
        </div>

        {/* Key Moments */}
        {blueprint.key_moments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Key Moments</p>
            <div className="space-y-2">
              {blueprint.key_moments.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="flex-shrink-0 w-16 text-xs text-gray-400 font-mono pt-0.5">{m.timecode}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">{m.beat}</p>
                    <div className="flex flex-wrap gap-1">
                      {m.emotions.map(e => emotionChip(e))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
