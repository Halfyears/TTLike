import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

// Revalidate every hour — balances freshness vs crawl budget
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ── Helper: fetch from Supabase REST ──────────────────────────────────────
  async function supabase<T>(
    table: string,
    params: Record<string, string>,
  ): Promise<T[]> {
    const url = new URL(`/rest/v1/${table}`, base)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = await fetch(url.toString(), {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return res.json() as Promise<T[]>
  }

  // ── 1. Static routes ──────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/products`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/trending`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/hooks`,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/blog`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/pricing`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/start`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/auth/signup`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/auth/login`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // ── 2. Niche hook pages (programmatic SEO) ────────────────────────────────
  const nicheRoutes: MetadataRoute.Sitemap = [
    'beauty', 'fitness', 'home', 'tech', 'fashion', 'pet', 'food', 'gadgets',
  ].map(niche => ({
    url:             `${SITE_URL}/hooks/${niche}`,
    lastModified:    new Date(),
    changeFrequency: 'monthly' as const,
    priority:        0.75,
  }))

  // ── 3. Product pages — top 200 by viral score ─────────────────────────────
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const rows = await supabase<{ id: string; updated_at?: string | null }>(
      'tiktok_videos',
      {
        select: 'id,updated_at',
        order:  'viral_score.desc',
        limit:  '200',
      },
    )
    productRoutes = rows.map(r => ({
      url:             `${SITE_URL}/products/${r.id}`,
      lastModified:    r.updated_at ? new Date(r.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))
  } catch { /* non-fatal */ }

  // ── 4. Blog posts — dynamic from DB, fallback to hardcoded slugs ──────────
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const rows = await supabase<{ slug: string; updated_at?: string | null }>(
      'blog_posts',
      {
        select: 'slug,updated_at',
        status: 'eq.PUBLISHED',
        order:  'created_at.desc',
        limit:  '200',
      },
    )
    if (rows.length > 0) {
      blogRoutes = rows.map(r => ({
        url:             `${SITE_URL}/blog/${r.slug}`,
        lastModified:    r.updated_at ? new Date(r.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority:        0.6,
      }))
    } else {
      // Fallback: hardcoded slugs when DB returns nothing
      throw new Error('empty')
    }
  } catch {
    blogRoutes = [
      'tiktok-viral-products-2024',
      'hook-formula-guide',
      'dropshipping-tiktok-beginners',
      'ugc-scripts-that-convert',
      'tiktok-algorithm-explained',
      'ai-ugc-content-creation',
    ].map(slug => ({
      url:             `${SITE_URL}/blog/${slug}`,
      lastModified:    new Date(),
      changeFrequency: 'monthly' as const,
      priority:        0.6,
    }))
  }

  // ── 5. Viral breakdown pages — top 1000 most recent ───────────────────────
  let viralRoutes: MetadataRoute.Sitemap = []
  try {
    const rows = await supabase<{
      video_id: string | null
      seo_slug: string | null
      created_at: string
    }>(
      'video_breakdowns',
      {
        select: 'video_id,seo_slug,created_at',
        order:  'created_at.desc',
        limit:  '1000',
      },
    )
    viralRoutes = rows
      .filter(r => r.seo_slug || r.video_id)
      .map(r => ({
        url:             `${SITE_URL}/viral/${r.seo_slug ?? r.video_id}`,
        lastModified:    new Date(r.created_at),
        changeFrequency: 'monthly' as const,
        priority:        0.8,
      }))
  } catch { /* non-fatal */ }

  return [
    ...staticRoutes,
    ...nicheRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...viralRoutes,
  ]
}
