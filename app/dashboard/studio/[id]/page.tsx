import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, User, Image as ImageIcon, Video, Mic, Clapperboard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { LocalDate } from '@/components/ui/LocalDate'
import type { DramaRow, CharacterRow, StoryboardRow } from '@/lib/studio/types'

export const dynamic = 'force-dynamic'

async function getDrama(id: number, userId: string) {
  const supabase = await createClient()
  const [{ data: drama }, { data: characters }, { data: storyboards }] = await Promise.all([
    supabase.from('dramas').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase.from('drama_characters').select('*').eq('drama_id', id).order('id'),
    supabase.from('drama_storyboards').select('*').eq('drama_id', id)
      .order('episode_number').order('scene_no'),
  ])
  return { drama, characters: characters ?? [], storyboards: storyboards ?? [] }
}

const ROLE_COLOR: Record<string, string> = {
  lead:       'bg-pink-50 text-pink-700 border-pink-200',
  supporting: 'bg-blue-50 text-blue-700 border-blue-200',
  minor:      'bg-gray-50 text-gray-500 border-gray-200',
}

export default async function DramaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dramaId = parseInt(id)
  if (isNaN(dramaId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { drama, characters, storyboards } = await getDrama(dramaId, user.id)
  if (!drama) notFound()

  const d = drama as DramaRow
  const chars = characters as CharacterRow[]
  const boards = storyboards as StoryboardRow[]

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/studio" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-500 transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Studio
        </Link>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{d.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {boards.length} scenes · {chars.length} characters · <LocalDate date={d.created_at} />
            </p>
          </div>
        </div>
      </div>

      {/* Characters */}
      {chars.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Characters ({chars.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chars.map(c => (
                <div key={c.id} className={`flex items-start gap-2.5 p-3 rounded-lg border ${ROLE_COLOR[c.role] ?? ROLE_COLOR.minor}`}>
                  <User className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">{c.role}</p>
                    {c.description && <p className="text-xs opacity-80 leading-relaxed">{c.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storyboards */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Storyboards — {boards.length} scenes
        </p>
        <div className="space-y-3">
          {boards.map(board => (
            <Card key={board.id}>
              <CardContent className="p-0">
                {/* Scene header */}
                <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <span className="h-6 w-6 rounded-full bg-pink-100 text-pink-600 text-xs font-black flex items-center justify-center shrink-0">
                    {board.scene_no}
                  </span>
                  {board.character_name && (
                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                      {board.character_name}
                    </span>
                  )}
                  {board.episode_number > 1 && (
                    <span className="text-[10px] text-gray-400">EP {board.episode_number}</span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Audio narration */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-green-600">
                        <Mic className="h-2.5 w-2.5" />Narration
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed italic">&ldquo;{board.audio_narration}&rdquo;</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Image prompt */}
                    <div className="bg-blue-50/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-blue-500">
                          <ImageIcon className="h-2.5 w-2.5" />Image Prompt
                        </span>
                        <ServerCopyBtn text={board.image_prompt} />
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{board.image_prompt}</p>
                    </div>

                    {/* Video prompt */}
                    <div className="bg-violet-50/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-violet-500">
                          <Video className="h-2.5 w-2.5" />Video Prompt
                        </span>
                        <ServerCopyBtn text={board.video_prompt} />
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{board.video_prompt}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// Inline copy button (server component — uses onClick via 'use client' child)
// Replaced with a simple anchor that works without hydration cost.
// The parent page is already a Server Component so we import a tiny client shim.
function ServerCopyBtn({ text }: { text: string }) {
  return (
    <CopyButtonClient text={text} />
  )
}

// ── tiny co-located client component ─────────────────────────────────────────
import { CopyButtonClient } from './CopyButtonClient'
