import { prisma }             from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge }               from '@/components/ui/Badge'
import { LocalDate }           from '@/components/ui/LocalDate'
import { SEOFlywheelPanel }    from '@/components/admin/SEOFlywheelPanel'
import type { BreakdownForFlywheel } from '@/components/admin/SEOFlywheelPanel'
import { SitemapSubmitPanel }  from '@/components/admin/SitemapSubmitPanel'
import Link from 'next/link'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Blog · Admin · TTLike' }

export default async function AdminBlogPage() {

  // ── 1. Blog posts (Prisma / PlanetScale) ────────────────────────────────────
  let posts: Array<{
    id: string; title: string; slug: string; status: string
    category: string | null; viewCount: number; publishedAt: Date | null
  }> = []
  try {
    posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  { id: true, title: true, slug: true, status: true, category: true, viewCount: true, publishedAt: true },
    })
  } catch {
    // DB not connected — silently degrade
  }

  // ── 2. Video breakdowns for SEO Flywheel (Supabase) ─────────────────────────
  let breakdowns: BreakdownForFlywheel[] = []
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('video_breakdowns')
      .select(`
        id,
        video_id,
        blog_status,
        ghost_post_id,
        blog_published_at,
        created_at,
        payload,
        tiktok_videos!left(id, title, product_name, niche, cover_url, views, viral_score)
      `)
      // Show NOT_SENT and FAILED at top, then PROCESSING, then PUBLISHED
      .order('blog_status', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(50)

    breakdowns = (data ?? []) as unknown as BreakdownForFlywheel[]
  } catch {
    // Supabase unavailable — flywheel silently degrades
  }

  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default',
  }

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Blog Management</h1>
        <p className="text-gray-400 text-sm">
          SEO Content Flywheel · Ghost CMS · {posts.length} blog post{posts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Section 1: Sitemap Auto-Submit ── */}
      <SitemapSubmitPanel />

      {/* ── Section 2: SEO Content Flywheel ── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">
          📡 SEO Content Flywheel — n8n → Ghost → Social
        </p>
        <SEOFlywheelPanel breakdowns={breakdowns} />
      </div>

      {/* ── Section 2: Published Blog Posts ── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">
          📝 Blog Posts
        </p>
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No blog posts found. Connect your database to manage blog content.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Title', 'Category', 'Status', 'Views', 'Published'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/blog/${post.slug}`} className="text-sm text-blue-400 hover:text-blue-300 max-w-xs truncate block">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{post.category ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={statusColors[post.status]}>{post.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-300">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-400"><LocalDate date={post.publishedAt?.toISOString()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}
