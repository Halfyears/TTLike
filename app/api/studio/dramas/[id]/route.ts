import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dramaId = parseInt(id)
  if (isNaN(dramaId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [{ data: drama }, { data: characters }, { data: storyboards }] = await Promise.all([
    supabase.from('dramas').select('*').eq('id', dramaId).eq('user_id', user.id).single(),
    supabase.from('drama_characters').select('*').eq('drama_id', dramaId).order('id'),
    supabase.from('drama_storyboards').select('*').eq('drama_id', dramaId)
      .order('episode_number').order('scene_no'),
  ])

  if (!drama) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ drama, characters: characters ?? [], storyboards: storyboards ?? [] })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('dramas').delete()
    .eq('id', parseInt(id)).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
