import { TrendingUp, Flame, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/constants'
import { queryD1Rows } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'
export const metadata = {
  title:       'Trending TikTok Products · TTLike',
  description: 'Real-time trending TikTok products ranked by viral score. Find the hottest dropshipping opportunities before your competitors.',
  alternates:  { canonical: `${SITE_URL}/trending` },
}

type VideoMetric = {
  id: string
  niche: string | null
  viral_score: number | null
  views: number | null
}

type TopProduct = VideoMetric & {
  product_name: string | null
  title: string | null
}

async function getTrendingData(): Promise<{ allVideos: VideoMetric[]; topProducts: TopProduct[] }> {
  const [d1Videos, d1TopProducts] = await Promise.all([
    queryD1Rows<VideoMetric>(
      `SELECT id, niche, viral_score, views
         FROM tiktok_videos
        WHERE deleted_at IS NULL
        ORDER BY viral_score DESC`,
    ),
    queryD1Rows<TopProduct>(
      `SELECT id, product_name, title, niche, viral_score, views
         FROM tiktok_videos
        WHERE deleted_at IS NULL
        ORDER BY viral_score DESC
        LIMIT 6`,
    ),
  ])

  if (d1Videos && d1TopProducts) return { allVideos: d1Videos, topProducts: d1TopProducts }

  const supabase = await createClient()
  const { data: allVideos } = await supabase
    .from('tiktok_videos')
    .select('id, niche, viral_score, views')
    .order('viral_score', { ascending: false })

  const { data: topProducts } = await supabase
    .from('tiktok_videos')
    .select('id, product_name, title, niche, viral_score, views')
    .order('viral_score', { ascending: false })
    .limit(6)

  return {
    allVideos: (allVideos ?? []) as VideoMetric[],
    topProducts: (topProducts ?? []) as TopProduct[],
  }
}

export default async function TrendingPage() {
  const { allVideos, topProducts } = await getTrendingData()

  // Group by niche
  const nicheMap: Record<string, { count: number; totalScore: number; totalViews: number }> = {}
  for (const v of allVideos) {
    const niche = v.niche ?? 'General'
    if (!nicheMap[niche]) nicheMap[niche] = { count: 0, totalScore: 0, totalViews: 0 }
    nicheMap[niche].count++
    nicheMap[niche].totalScore += Number(v.viral_score ?? 0)
    nicheMap[niche].totalViews += Number(v.views ?? 0)
  }

  const nicheStats = Object.entries(nicheMap)
    .map(([niche, s]) => ({
      niche,
      count: s.count,
      avgScore: Math.round(s.totalScore / s.count),
      totalViews: s.totalViews,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  const hasData = nicheStats.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trending Now</h1>
        <p className="text-gray-600">What&apos;s going viral on TikTok right now</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Trending Niches — real data */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" /> Trending Niches
          </h2>

          {!hasData ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-6 bg-gray-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-center text-sm text-gray-400 pt-2">Scraper runs at noon &amp; midnight Pacific — check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nicheStats.map((stat, i) => (
                <Link key={stat.niche} href={`/products?niche=${stat.niche}`}>
                  <Card hover>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-black w-8 text-center shrink-0 ${i < 3 ? 'text-pink-500' : 'text-gray-300'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-sm">{stat.niche}</h3>
                            <Badge>{stat.count} videos</Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {(stat.totalViews / 1_000_000).toFixed(1)}M total views
                          </div>
                        </div>
                        <ViralScoreBadge score={stat.avgScore} showLabel={false} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — real top products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-500" /> Top Viral Products
            </h2>
            <Link href="/products" className="text-pink-500 text-xs font-semibold flex items-center gap-0.5 hover:text-pink-600">
              All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">No data yet — check back after the next scraper run.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map(product => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card hover>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                            {String(product.product_name ?? product.title ?? '')}
                          </p>
                          <Badge className="mt-1.5">{product.niche ?? 'General'}</Badge>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {(Number(product.views ?? 0) / 1_000_000).toFixed(1)}M views
                          </p>
                        </div>
                        <ViralScoreBadge score={Math.round(Number(product.viral_score ?? 0))} showLabel={false} className="shrink-0 mt-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-pink-50 rounded-xl border border-pink-100">
            <h3 className="font-semibold text-pink-900 text-sm mb-1">Get Trend Alerts</h3>
            <p className="text-pink-700 text-xs mb-3">Be the first to know when a new product starts trending</p>
            <Link href="/auth/signup">
              <button className="w-full bg-pink-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-pink-600 transition-colors">
                Sign Up Free →
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
