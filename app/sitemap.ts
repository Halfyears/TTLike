import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { getD1Database } from '@/lib/cloudflare/env'

export const revalidate = 3600

type ProductRouteRow = { id: string; updated_at?: string | null }
type BlogRouteRow = { slug: string; updated_at?: string | null }
type ViralRouteRow = {
  video_id: string | null
  seo_slug: string | null
  created_at: string
}

async function supabaseRest<T>(
  table: string,
  params: Record<string, string>,
): Promise<T[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !anonKey) return []

  const url = new URL(`/rest/v1/${table}`, base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url.toString(), {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    next: { revalidate },
  })
  if (!res.ok) return []
  return res.json() as Promise<T[]>
}

async function listProducts(): Promise<ProductRouteRow[]> {
  const db = await getD1Database()
  if (db) {
    const { results = [] } = await db.prepare(`
      SELECT id, updated_at
      FROM tiktok_videos
      WHERE deleted_at IS NULL
      ORDER BY viral_score DESC
      LIMIT 200
    `).all<ProductRouteRow>()
    return results
  }

  return supabaseRest<ProductRouteRow>('tiktok_videos', {
    select: 'id,updated_at',
    order: 'viral_score.desc',
    limit: '200',
  })
}

async function listBlogPosts(): Promise<BlogRouteRow[]> {
  const db = await getD1Database()
  if (db) {
    const { results = [] } = await db.prepare(`
      SELECT slug, updated_at
      FROM blog_posts
      WHERE status = 'PUBLISHED'
      ORDER BY created_at DESC
      LIMIT 200
    `).all<BlogRouteRow>()
    return results
  }

  return supabaseRest<BlogRouteRow>('blog_posts', {
    select: 'slug,updated_at',
    status: 'eq.PUBLISHED',
    order: 'created_at.desc',
    limit: '200',
  })
}

async function listViralBreakdowns(): Promise<ViralRouteRow[]> {
  const db = await getD1Database()
  if (db) {
    const { results = [] } = await db.prepare(`
      SELECT vb.video_id, vb.seo_slug, vb.created_at
      FROM video_breakdowns vb
      INNER JOIN tiktok_videos tv ON tv.id = vb.video_id
      WHERE COALESCE(tv.views, 0) > 0
      ORDER BY vb.created_at DESC
      LIMIT 200
    `).all<ViralRouteRow>()
    return results
  }

  return supabaseRest<ViralRouteRow>('video_breakdowns', {
    select: 'video_id,seo_slug,created_at,tiktok_videos!inner(views)',
    order: 'created_at.desc',
    'tiktok_videos.views': 'gt.0',
    limit: '200',
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/hooks`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/start`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ]

  const nicheRoutes: MetadataRoute.Sitemap = [
    'beauty', 'fitness', 'home', 'tech', 'fashion', 'pet', 'food', 'gadgets',
  ].map(niche => ({
    url: `${SITE_URL}/hooks/${niche}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const productRoutes = (await listProducts()).map(row => ({
    url: `${SITE_URL}/products/${row.id}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const blogRoutes = (await listBlogPosts()).map(row => ({
    url: `${SITE_URL}/blog/${row.slug}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const viralRoutes = (await listViralBreakdowns())
    .filter(row => row.seo_slug || row.video_id)
    .map(row => ({
      url: `${SITE_URL}/viral/${row.seo_slug ?? row.video_id}`,
      lastModified: new Date(row.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

  return [
    ...staticRoutes,
    ...nicheRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...viralRoutes,
  ]
}
