import { Search } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Product Database · TTLike' }

const MOCK_PRODUCTS = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  productName: ['Posture Corrector Pro', 'LED Strip Lights Kit', 'Portable Blender Mini', 'Silk Sleep Mask', 'Magnetic Phone Stand', 'Jade Roller Set', 'Resistance Bands Set', 'Cold Brew Coffee Maker', 'Plant Misting Bottle', 'Foam Roller Set', 'Wireless Ear Clips', 'Scalp Massager', 'Eye Mask Heating', 'Foot Massage Roller', 'Bamboo Organizer', 'UV Nail Lamp', 'Pet Hair Remover', 'Car Phone Holder', 'Smart Jump Rope', 'Glass Straw Set', 'Aromatherapy Diffuser', 'Knee Support Brace', 'Face Sculptor Tool', 'Travel Pillow'][i],
  niche: ['Health', 'Home', 'Kitchen', 'Beauty', 'Tech', 'Beauty', 'Fitness', 'Kitchen', 'Home', 'Fitness', 'Tech', 'Beauty', 'Health', 'Health', 'Home', 'Beauty', 'Pets', 'Tech', 'Fitness', 'Kitchen', 'Home', 'Health', 'Beauty', 'Travel'][i],
  viralScore: 60 + ((i * 7 + 13) % 38),
  views: 500_000 + (i * 127_391) % 3_000_000,
  likes: 10_000 + (i * 19_231) % 200_000,
  shares: 1_000 + (i * 3_741) % 50_000,
  author: `@tiktok_seller_${i}`,
  cover_url: null as string | null,
  video_url: null as string | null,
}))

const NICHES = ['All', 'Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel']

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; niche?: string; sort?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, niche, sort } = await searchParams
  const sortKey = sort === 'views' ? 'views' : 'viral_score'

  // Try real DB data; fall back to mock if table is empty
  let products: Array<{
    id: string; productName: string; niche: string; viralScore: number;
    views: number; likes: number; shares: number; author: string;
    cover_url: string | null; video_url: string | null;
  }> = []

  try {
    const url = new URL('/rest/v1/tiktok_videos', process.env.NEXT_PUBLIC_SUPABASE_URL)
    url.searchParams.set('select', '*')
    url.searchParams.set('order', `${sortKey}.desc`)
    url.searchParams.set('limit', '48')
    if (q) url.searchParams.set('title', `ilike.*${q}*`)
    if (niche && niche !== 'All') url.searchParams.set('niche', `eq.${niche}`)

    const res = await fetch(url.toString(), {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      products = rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        productName: String(r.product_name ?? r.title ?? ''),
        niche: String(r.niche ?? 'General'),
        viralScore: Number(r.viral_score ?? 0),
        views: Number(r.views ?? 0),
        likes: Number(r.likes ?? 0),
        shares: Number(r.shares ?? 0),
        author: String(r.author ?? ''),
        cover_url: r.cover_url ? String(r.cover_url) : null,
        video_url: r.video_url ? String(r.video_url) : null,
      }))
    }
  } catch (err) {
    console.error('[products] fetch failed:', err)
  }

  if (products.length === 0) {
    const mock = MOCK_PRODUCTS
      .filter(p => !q || p.productName.toLowerCase().includes(q.toLowerCase()))
      .filter(p => !niche || niche === 'All' || p.niche === niche)
      .sort((a, b) => sort === 'views' ? b.views - a.views : b.viralScore - a.viralScore)
    products = mock.map(m => ({ ...m, productName: m.productName, author: m.author }))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Database</h1>
        <p className="text-gray-600">AI-curated viral products updated every 6 hours</p>
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

      <p className="text-sm text-gray-500 mb-4">{products.length} products found</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard
            key={product.id}
            id={product.id}
            productName={product.productName}
            niche={product.niche}
            viralScore={product.viralScore}
            viewCount={product.views}
            likeCount={product.likes}
            shareCount={product.shares}
            authorHandle={product.author}
            thumbnailUrl={product.cover_url}
            videoUrl={product.video_url}
          />
        ))}
      </div>
    </div>
  )
}
