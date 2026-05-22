import { Search } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Product Database · TTLike' }

const NICHES = ['All', 'Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel']

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; niche?: string; sort?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, niche, sort } = await searchParams
  // Sort options: 'featured' = admin-curated sort_order, 'viral' = viral_score, 'views' = views
  const sortKey = sort === 'views' ? 'views' : sort === 'viral' ? 'viral_score' : null

  let products: Array<{
    id: string; productName: string; niche: string; viralScore: number;
    views: number; likes: number; shares: number; author: string;
    cover_url: string | null; video_url: string | null;
  }> = []

  try {
    const url = new URL('/rest/v1/tiktok_videos', process.env.NEXT_PUBLIC_SUPABASE_URL)
    url.searchParams.set('select', '*')
    // Default: admin-curated sort_order, then viral_score as fallback
    const order = sortKey
      ? `${sortKey}.desc`
      : 'sort_order.asc.nullslast,viral_score.desc'
    url.searchParams.set('order', order)
    url.searchParams.set('limit', '200')
    // Exclude soft-deleted videos
    url.searchParams.set('deleted_at', 'is.null')
    if (q) url.searchParams.set('title', `ilike.*${q}*`)
    if (niche && niche !== 'All') url.searchParams.set('niche', `eq.${niche}`)

    const res = await fetch(url.toString(), {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const rows = await res.json()
      if (Array.isArray(rows)) {
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
    }
  } catch (err) {
    console.error('[products] fetch failed:', err)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Product Database</h1>
        <p className="text-gray-500 text-sm sm:text-base">AI-curated viral products updated twice daily</p>
      </div>

      {/* Filters — stacks vertically on mobile */}
      <div className="mb-4 sm:mb-6">
        <form className="flex flex-col sm:flex-row gap-2">
          {/* Search input — full width on mobile */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q" defaultValue={q}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          {/* Sort + Submit — side by side below search on mobile */}
          <div className="flex gap-2">
            <select name="sort" defaultValue={sort ?? 'featured'}
              className="flex-1 sm:flex-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="featured">Featured</option>
              <option value="viral">Viral Score</option>
              <option value="views">Views</option>
            </select>
            <button type="submit" className="shrink-0 px-4 py-2.5 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Niche Filters — horizontally scrollable on mobile */}
      <div className="flex gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {NICHES.map(n => (
          <Link key={n} href={`/products?${q ? `q=${q}&` : ''}niche=${n}`} className="shrink-0">
            <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors whitespace-nowrap ${
              (niche === n || (!niche && n === 'All'))
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
            }`}>
              {n}
            </span>
          </Link>
        ))}
      </div>

      <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">{products.length} products found</p>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium mb-2">No products yet</p>
          <p className="text-sm">The scraper runs at noon and midnight Pacific — check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
      )}
    </div>
  )
}
