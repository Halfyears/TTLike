import { prisma }             from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'
import { SEOFlywheelPanel }    from '@/components/admin/SEOFlywheelPanel'
import type { BreakdownForFlywheel } from '@/components/admin/SEOFlywheelPanel'
import { SitemapSubmitPanel }  from '@/components/admin/SitemapSubmitPanel'
import { BlogPostsClient }     from '@/components/admin/BlogPostsClient'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Blog · Admin · TTLike' }

export default async function AdminBlogPage() {

  // ── 1. Blog posts (Prisma) ──────────────────────────────────────────────────
  let posts: Array<{
    id: string; title: string; slug: string; status: string
    category: string | null; viewCount: number; publishedAt: string | null
    excerpt: string | null; tags: string[]; authorName: string
  }> = []
  try {
    const raw = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      take:    100,
      select:  {
        id: true, title: true, slug: true, status: true, category: true,
        viewCount: true, publishedAt: true, excerpt: true, tags: true, authorName: true,
      },
    })
    // Convert Date → ISO string so the client component receives serializable data
    posts = raw.map(p => ({ ...p, publishedAt: p.publishedAt?.toISOString() ?? null }))
  } catch {
    // DB not connected — silently degrade
  }

  // ── 2. Video breakdowns for Blog Generator (Supabase) ───────────────────────
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
      .order('created_at', { ascending: false })
      .limit(500)

    breakdowns = (data ?? []) as unknown as BreakdownForFlywheel[]
  } catch {
    // Supabase unavailable — silently degrade
  }

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Blog Management</h1>
        <p className="text-gray-400 text-sm">
          AI Blog Generator · {posts.length} post{posts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Section 1: Sitemap Auto-Submit ── */}
      <SitemapSubmitPanel />

      {/* ── Section 2: Video Breakdown → Blog Generator ── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">
          🎬 Video Breakdown → Blog Generator
        </p>
        <SEOFlywheelPanel breakdowns={breakdowns} />
      </div>

      {/* ── Section 3: Blog Posts (with CRUD + Batch Generate) ── */}
      <BlogPostsClient initialPosts={posts} />

    </div>
  )
}
