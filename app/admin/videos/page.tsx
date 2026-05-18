'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'
import { RefreshCw, ExternalLink, TrendingUp } from 'lucide-react'

interface Video {
  id: string
  tiktok_id: string
  title: string
  author: string
  views: number
  likes: number
  shares: number
  viral_score: number
  video_url: string | null
  cover_url: string | null
  niche: string | null
  product_name: string | null
  created_at: string
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('')

  const supabase = createClient()

  async function fetchVideos() {
    setLoading(true)
    let query = supabase.from('tiktok_videos').select('*', { count: 'exact' }).order('viral_score', { ascending: false }).limit(100)
    if (search) query = query.ilike('title', `%${search}%`)
    if (niche) query = query.eq('niche', niche)
    const { data, count } = await query
    setVideos((data ?? []) as Video[])
    setTotal(count ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchVideos() }, [])

  function scoreColor(s: number) {
    if (s >= 90) return 'text-red-400'
    if (s >= 70) return 'text-orange-400'
    if (s >= 50) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Video Database</h1>
          <p className="text-gray-400 text-sm">{total.toLocaleString()} videos tracked</p>
        </div>
        <button
          onClick={fetchVideos}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchVideos()}
          placeholder="Search title…"
          className="flex-1 max-w-xs bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <select
          value={niche}
          onChange={e => setNiche(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All niches</option>
          {['Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel'].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button onClick={fetchVideos} className="px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600">
          Search
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No videos found. Run the scraper to populate data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Cover', 'Title', 'Author', 'Niche', 'Views', 'Likes', 'Score', 'Link'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {videos.map(v => (
                  <tr key={v.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-2">
                      {v.cover_url ? (
                        <img src={v.cover_url} alt="" className="h-10 w-7 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-7 rounded bg-gray-700 flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white max-w-xs">
                      <p className="truncate">{v.product_name ?? v.title}</p>
                      <p className="text-xs text-gray-500 truncate">{v.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{v.author}</td>
                    <td className="px-4 py-3">
                      {v.niche && <Badge>{v.niche}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{formatNumber(v.views)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{formatNumber(v.likes)}</td>
                    <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${scoreColor(v.viral_score)}`}>
                      {v.viral_score.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      {v.video_url && (
                        <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
