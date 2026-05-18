import { Suspense } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'
import { TrendingUp, Eye, Heart } from 'lucide-react'

export const metadata = { title: 'Product Database · TTLike' }

const MOCK_PRODUCTS = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  productName: ['Posture Corrector Pro', 'LED Strip Lights Kit', 'Portable Blender Mini', 'Silk Sleep Mask', 'Magnetic Phone Stand', 'Jade Roller Set', 'Resistance Bands Set', 'Cold Brew Coffee Maker', 'Plant Misting Bottle', 'Foam Roller Set', 'Wireless Ear Clips', 'Scalp Massager', 'Eye Mask Heating', 'Foot Massage Roller', 'Bamboo Organizer', 'UV Nail Lamp', 'Pet Hair Remover', 'Car Phone Holder', 'Smart Jump Rope', 'Glass Straw Set', 'Aromatherapy Diffuser', 'Knee Support Brace', 'Face Sculptor Tool', 'Travel Pillow'][i],
  niche: ['Health', 'Home', 'Kitchen', 'Beauty', 'Tech', 'Beauty', 'Fitness', 'Kitchen', 'Home', 'Fitness', 'Tech', 'Beauty', 'Health', 'Health', 'Home', 'Beauty', 'Pets', 'Tech', 'Fitness', 'Kitchen', 'Home', 'Health', 'Beauty', 'Travel'][i],
  viralScore: 60 + Math.floor(Math.random() * 38),
  viewCount: BigInt((500_000 + Math.floor(Math.random() * 3_000_000))),
  likeCount: BigInt((10_000 + Math.floor(Math.random() * 200_000))),
  authorHandle: `@tiktok_seller_${i}`,
}))

const NICHES = ['All', 'Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel']

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; niche?: string; sort?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, niche, sort } = await searchParams

  const filtered = MOCK_PRODUCTS
    .filter(p => (!q || p.productName.toLowerCase().includes(q.toLowerCase())))
    .filter(p => (!niche || niche === 'All' || p.niche === niche))
    .sort((a, b) => sort === 'views' ? Number(b.viewCount - a.viewCount) : b.viralScore - a.viralScore)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Database</h1>
        <p className="text-gray-600">AI-curated viral products updated daily</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q" defaultValue={q}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <select name="sort" defaultValue={sort}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
            <option value="viral">By Viral Score</option>
            <option value="views">By Views</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600">
            Search
          </button>
        </form>
      </div>

      {/* Niche Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {NICHES.map(n => (
          <Link key={n} href={`/products?${q ? `q=${q}&` : ''}niche=${n}`}>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
              (niche === n || (!niche && n === 'All'))
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
            }`}>
              {n}
            </span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} products found</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(product => (
          <Link key={product.id} href={`/products/${product.id}`}>
            <Card hover className="h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge>{product.niche}</Badge>
                  <ViralScoreBadge score={product.viralScore} showLabel={false} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-3 line-clamp-2">{product.productName}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(product.viewCount)}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatNumber(product.likeCount)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{product.authorHandle}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
