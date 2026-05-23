import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Fetch published viral breakdown pages ──────────────────────────────────
  let viralRoutes: MetadataRoute.Sitemap = []
  try {
    const base    = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const url = new URL('/rest/v1/video_breakdowns', base)
    url.searchParams.set('select', 'video_id,created_at')
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', '1000')

    const res = await fetch(url.toString(), {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const rows: Array<{ video_id: string | null; created_at: string }> = await res.json()
      viralRoutes = rows
        .filter(r => r.video_id)
        .map(r => ({
          url:             `${SITE_URL}/viral/${r.video_id}`,
          lastModified:    new Date(r.created_at),
          changeFrequency: 'monthly' as const,
          priority:        0.8,
        }))
    }
  } catch { /* non-fatal */ }

  const staticRoutes = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/hooks`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${SITE_URL}/trending`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${SITE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${SITE_URL}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
  ]

  const blogSlugs = [
    'tiktok-viral-products-2024',
    'hook-formula-guide',
    'dropshipping-tiktok-beginners',
    'ugc-scripts-that-convert',
    'tiktok-algorithm-explained',
    'ai-ugc-content-creation',
  ]

  const blogRoutes = blogSlugs.map(slug => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...blogRoutes, ...viralRoutes]
}
