import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = {
  title:       'Product Database · TTLike',
  description: 'AI-curated viral TikTok products updated twice daily. Browse 500+ trending products with viral scores, engagement data, and AI-powered breakdown analysis.',
  alternates:  { canonical: `${SITE_URL}/products` },
}

const NICHES   = ['All', 'Health', 'Beauty', 'Home', 'Kitchen', 'Tech', 'Fitness', 'Pets', 'Travel']
const PER_PAGE = 24

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; niche?: string; sort?: string; page?: string }>
}

// ── Pagination helper ─────────────────────────────────────────────────────────
function pageUrl(
  base: { q?: string; niche?: string; sort?: string },
  page: number,
): string {
  const p = new URLSearchParams()
  if (base.q)     p.set('q', base.q)
  if (base.niche) p.set('niche', base.niche)
  if (base.sort && base.sort !== 'featured') p.set('sort', base.sort)
  if (page > 1)   p.set('page', String(page))
  const qs = p.toString()
  return `/products${qs ? `?${qs}` : ''}`
}

// ── Page numbers to display ───────────────────────────────────────────────────
function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, niche, sort, page: pageParam } = await searchParams
  const page   = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const offset = (page - 1) * PER_PAGE

  // Sort: 'featured' = admin sort_order, 'viral' = viral_score, 'views' = views
  const sortKey = sort === 'views' ? 'views' : sort === 'viral' ? 'viral_score' : null

  type Row = {
    id: string; product_name: string | null; title: string | null;
    niche: string | null; viral_score: number; views: number;
    likes: number; shares: number; author: string;
    cover_url: string | null; cover_storage_url: string | null; video_url: string | null;
  }

  let products: Array<{
    id: string; productName: string; niche: string; viralScore: number;
    views: number; likes: number; shares: number; author: string;
    cover_url: string | null; cover_storage_url: string | null; video_url: string | null;
  }> = []
  let total = 0

  try {
    const supabase = await createClient()

    let query = supabase
      .from('tiktok_videos')
      .select('id,product_name,title,niche,viral_score,views,likes,shares,author,cover_url,cover_storage_url,video_url', { count: 'exact' })
      .is('deleted_at', null)
      .range(offset, offset + PER_PAGE - 1)

    // Sort
    if (sortKey) {
      query = query.order(sortKey, { ascending: false })
    } else {
      // Featured: admin sort_order first, then viral_score fallback
      query = query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('viral_score', { ascending: false })
    }

    if (q)                  query = query.ilike('title', `%${q}%`)
    if (niche && niche !== 'All') query = query.eq('niche', niche)

    let { data, count, error } = await query

    // Graceful fallback: cover_storage_url column doesn't exist yet (migration pending)
    // Retry without it so the products page never goes blank before migration is run.
    if (error?.code === '42703') {
      console.warn('[products] cover_storage_url column missing — run migration 20260523_cover_storage.sql')
      const fbQuery = supabase
        .from('tiktok_videos')
        .select('id,product_name,title,niche,viral_score,views,likes,shares,author,cover_url,video_url', { count: 'exact' })
        .is('deleted_at', null)
        .range(offset, offset + PER_PAGE - 1)
      const sorted = sortKey
        ? fbQuery.order(sortKey, { ascending: false })
        : fbQuery.order('sort_order', { ascending: true, nullsFirst: false }).order('viral_score', { ascending: false })
      const filtered = q ? sorted.ilike('title', `%${q}%`) : sorted
      const filtered2 = (niche && niche !== 'All') ? filtered.eq('niche', niche) : filtered
      const fb = await filtered2
      data  = fb.data as typeof data
      count = fb.count
      error = fb.error
    }

    if (error) {
      console.error('[products] query error:', error)
    } else {
      total = count ?? 0
      products = ((data ?? []) as Row[]).map(r => ({
        id:          r.id,
        productName: r.product_name ?? r.title ?? '',
        niche:       r.niche ?? 'General',
        viralScore:  r.viral_score ?? 0,
        views:       r.views ?? 0,
        likes:       r.likes ?? 0,
        shares:      r.shares ?? 0,
        author:      r.author ?? '',
        cover_url:         r.cover_url         ?? null,
        cover_storage_url: (r as Row).cover_storage_url ?? null,
        video_url:         r.video_url         ?? null,
      }))
    }
  } catch (err) {
    console.error('[products] fetch failed:', err)
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const base       = { q, niche, sort }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">Product Database</h1>
        <p className="text-gray-600">AI-curated viral products updated twice daily</p>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6">
        <form className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q" defaultValue={q}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex gap-2">
            <select name="sort" defaultValue={sort ?? 'featured'}
              className="flex-1 min-w-0 sm:flex-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="featured">Featured</option>
              <option value="viral">Viral Score</option>
              <option value="views">Views</option>
            </select>
            <button type="submit"
              className="shrink-0 px-4 py-2.5 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Niche Pills */}
      <div className="w-full flex gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {NICHES.map(n => (
          <Link key={n} href={pageUrl({ q, sort, niche: n === 'All' ? undefined : n }, 1)} className="shrink-0">
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

      {/* Result count */}
      <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
        {total > 0
          ? `Showing ${offset + 1}–${Math.min(offset + PER_PAGE, total)} of ${total} products`
          : 'No products found'}
      </p>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium mb-2">No products yet</p>
          <p className="text-sm">The scraper runs at noon and midnight Pacific — check back soon.</p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
                coverStorageUrl={product.cover_storage_url}
                videoUrl={product.video_url}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 flex-wrap" aria-label="Pagination">
              {/* Prev */}
              <Link
                href={page > 1 ? pageUrl(base, page - 1) : '#'}
                aria-disabled={page === 1}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === 1
                    ? 'text-gray-300 pointer-events-none'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-pink-600'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Link>

              {/* Page numbers */}
              {pageRange(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-gray-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageUrl(base, p)}
                    className={`min-w-[36px] px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                      p === page
                        ? 'bg-pink-500 text-white pointer-events-none'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-pink-600'
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}

              {/* Next */}
              <Link
                href={page < totalPages ? pageUrl(base, page + 1) : '#'}
                aria-disabled={page === totalPages}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === totalPages
                    ? 'text-gray-300 pointer-events-none'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-pink-600'
                }`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
