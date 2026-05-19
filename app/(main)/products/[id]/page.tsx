import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, Share2, MessageCircle, ExternalLink, Zap, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

async function getVideo(id: string) {
  const url = new URL(`/rest/v1/tiktok_videos`, process.env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set('select', '*')
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function getSimilar(niche: string, excludeId: string) {
  const url = new URL(`/rest/v1/tiktok_videos`, process.env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set('select', 'id,product_name,title,viral_score')
  url.searchParams.set('niche', `eq.${niche}`)
  url.searchParams.set('id', `neq.${excludeId}`)
  url.searchParams.set('order', 'viral_score.desc')
  url.searchParams.set('limit', '3')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const v = await getVideo(id)
  if (!v) notFound()

  const productName = v.product_name ?? v.title ?? 'Untitled'
  const niche = v.niche ?? 'General'
  const similar = await getSimilar(niche, id)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              {/* Thumbnail */}
              {v.cover_url && (
                <div className="mb-4 rounded-lg overflow-hidden aspect-video bg-gray-100">
                  <img src={v.cover_url} alt={productName} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{niche}</Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{productName}</h1>
                  <p className="text-gray-500 text-sm mt-1">{v.author}</p>
                </div>
                <ViralScoreBadge score={Math.round(v.viral_score ?? 0)} />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Eye, label: 'Views', value: formatNumber(Number(v.views ?? 0)) },
                  { icon: Heart, label: 'Likes', value: formatNumber(Number(v.likes ?? 0)) },
                  { icon: Share2, label: 'Shares', value: formatNumber(Number(v.shares ?? 0)) },
                  { icon: MessageCircle, label: 'Comments', value: formatNumber(Number(v.comments ?? 0)) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <Icon className="h-4 w-4 text-pink-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {v.video_url && (
                <div className="mt-4">
                  <a href={v.video_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" /> Watch on TikTok
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Viral Score Breakdown */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-pink-500" />
                <h2 className="text-lg font-semibold">Viral Score Breakdown</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Engagement rate</span>
                  <span className="font-medium text-gray-900">
                    {v.views > 0 ? (((v.likes + v.shares * 3 + v.comments * 2) / v.views) * 100).toFixed(2) : '0'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Share amplification</span>
                  <span className="font-medium text-gray-900">{formatNumber(Number(v.shares ?? 0))} shares</span>
                </div>
                <div className="flex justify-between">
                  <span>Viral score</span>
                  <span className="font-bold text-pink-600">{(v.viral_score ?? 0).toFixed(1)} / 100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Generate Script</h3>
              <p className="text-sm text-gray-600 mb-4">Use AI to create 5 custom scripts for this product</p>
              <Link href={`/dashboard/ai-scripts?from_video=${encodeURIComponent(v.id)}&suggested_title=${encodeURIComponent(productName)}&niche=${encodeURIComponent(niche)}&keywords=${encodeURIComponent(v.title ?? '')}`}>
                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" /> Generate Scripts
                </Button>
              </Link>
            </CardContent>
          </Card>

          {similar.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Similar Products</h3>
                <div className="space-y-2">
                  {similar.map((p: Record<string, unknown>) => (
                    <Link key={String(p.id)} href={`/products/${p.id}`} className="block">
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-sm text-gray-700 font-medium truncate">
                          {String(p.product_name ?? p.title ?? '')}
                        </span>
                        <ViralScoreBadge score={Math.round(Number(p.viral_score ?? 0))} showLabel={false} className="shrink-0 ml-2" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
