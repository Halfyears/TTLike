import { createClient } from '@/lib/supabase/server'

export interface VideoRow {
  id: string
  tiktok_id: string
  title: string
  author: string
  views: number
  likes: number
  shares: number
  comments: number
  viral_score: number
  video_url: string | null
  cover_url: string | null
  author_avatar_url: string | null
  niche: string | null
  product_name: string | null
  created_at: string
}

export async function getTopVideos(limit = 24, niche?: string, sort: 'viral_score' | 'views' = 'viral_score'): Promise<VideoRow[]> {
  const supabase = await createClient()
  let query = supabase.from('tiktok_videos').select('*').order(sort, { ascending: false }).limit(limit)
  if (niche && niche !== 'All') query = query.eq('niche', niche)
  const { data } = await query
  return (data ?? []) as VideoRow[]
}

export async function searchVideos(q: string, niche?: string, sort: 'viral_score' | 'views' = 'viral_score', limit = 48): Promise<VideoRow[]> {
  const supabase = await createClient()
  let query = supabase.from('tiktok_videos').select('*').order(sort, { ascending: false }).limit(limit)
  if (q) query = query.ilike('title', `%${q}%`)
  if (niche && niche !== 'All') query = query.eq('niche', niche)
  const { data, error } = await query
  if (error) throw new Error(`tiktok_videos query failed: ${error.message}`)
  return (data ?? []) as VideoRow[]
}

export async function countVideos(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase.from('tiktok_videos').select('*', { count: 'exact', head: true })
  return count ?? 0
}
