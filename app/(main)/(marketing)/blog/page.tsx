import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import { BlogImage } from '@/components/blog/BlogImage'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'TikTok selling strategies, viral product analysis, and AI-powered growth guides for dropshippers and UGC creators.',
  alternates: { canonical: `${SITE_URL}/blog` },
}

// ── Types ────────────────────────────────────────────────────────────────────
interface BlogPost {
  id:          string
  slug:        string
  title:       string
  excerpt:     string | null
  category:    string | null
  cover_image: string | null
  published_at: string | null
  // read_time estimated from content length (words / 200 wpm)
  read_time?:  number
}

// ── Fallback posts shown when DB has no published content ───────────────────
const FALLBACK_POSTS: BlogPost[] = [
  { id: '1', slug: 'tiktok-viral-products-2024',    title: '10 Products That Went Viral on TikTok in 2024 (And Why)',                excerpt: 'Analyzing the anatomy of TikTok virality across 10 breakout products. What do they have in common?', category: 'Research', cover_image: null, published_at: '2024-12-01', read_time: 8  },
  { id: '2', slug: 'hook-formula-guide',             title: 'The Complete TikTok Hook Formula Guide for Sellers',                     excerpt: 'Master the 7 hook types that drive TikTok sales. Includes real examples and templates you can use today.', category: 'Strategy', cover_image: null, published_at: '2024-11-28', read_time: 12 },
  { id: '3', slug: 'dropshipping-tiktok-beginners', title: "TikTok Dropshipping in 2024: A Beginner's Complete Guide",               excerpt: 'Everything you need to know to start dropshipping on TikTok — product selection, content strategy, and scaling.', category: 'Guide', cover_image: null, published_at: '2024-11-20', read_time: 15 },
  { id: '4', slug: 'ugc-scripts-that-convert',      title: 'The UGC Scripts That Actually Convert (With Data)',                      excerpt: 'We analyzed 500+ TikTok UGC videos to find the script patterns with the highest conversion rates.', category: 'Research', cover_image: null, published_at: '2024-11-15', read_time: 10 },
  { id: '5', slug: 'tiktok-algorithm-explained',    title: 'TikTok Algorithm Explained: What Makes Videos Go Viral in 2024',         excerpt: "A deep dive into how TikTok's recommendation algorithm works and how to game it for maximum reach.", category: 'Strategy', cover_image: null, published_at: '2024-11-08', read_time: 9  },
  { id: '6', slug: 'ai-ugc-content-creation',       title: 'How to Use AI to Create TikTok UGC Content at Scale',                   excerpt: 'Step-by-step guide to using AI tools like Claude to generate, script, and optimize TikTok UGC content.', category: 'AI', cover_image: null, published_at: '2024-11-01', read_time: 11 },
]

const categoryColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Research: 'info', Strategy: 'success', Guide: 'warning', AI: 'default',
}

// ── Data fetch ───────────────────────────────────────────────────────────────
async function getPosts(): Promise<BlogPost[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, cover_image, published_at, content')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false })
      .limit(50)

    if (error || !data || data.length === 0) return FALLBACK_POSTS

    return (data as Array<{
      id: string; slug: string; title: string; excerpt: string | null
      category: string | null; cover_image: string | null; published_at: string | null
      content: string | null
    }>).map(p => ({
      id:           p.id,
      slug:         p.slug,
      title:        p.title,
      excerpt:      p.excerpt,
      category:     p.category,
      cover_image:  p.cover_image,
      published_at: p.published_at,
      // Estimate read time: ~200 wpm
      read_time:    p.content ? Math.max(1, Math.round(p.content.split(/\s+/).length / 200)) : 5,
    }))
  } catch {
    return FALLBACK_POSTS
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPage() {
  const posts = await getPosts()
  const [featured, ...rest] = posts

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{SITE_NAME} Blog</h1>
        <p className="text-gray-600">TikTok selling strategies, viral analysis, and growth guides</p>
      </div>

      {/* Featured Post */}
      <Link href={`/blog/${featured.slug}`}>
        <Card hover className="mb-8 overflow-hidden">
          {/* Featured cover — tall hero image with fallback */}
          <BlogImage
            src={featured.cover_image}
            alt={featured.title}
            category={featured.category}
            className="h-48 sm:h-64 w-full object-cover"
          />
          <CardContent className="p-6 sm:p-8">
            <Badge variant={categoryColors[featured.category ?? ''] ?? 'default'} className="mb-3">
              {featured.category ?? 'Article'}
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 hover:text-pink-600 transition-colors">
              {featured.title}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">{featured.excerpt}</p>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {featured.published_at && <span>{formatDate(new Date(featured.published_at))}</span>}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.read_time ?? 5} min read</span>
              </div>
              <span className="text-pink-500 text-sm font-medium flex items-center gap-1">
                Read more <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Post Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rest.map(post => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card hover className="h-full">
              <BlogImage
                src={post.cover_image}
                alt={post.title}
                category={post.category}
                className="h-36 w-full object-cover rounded-t-xl"
              />
              <CardContent className="p-5">
                <Badge variant={categoryColors[post.category ?? ''] ?? 'default'} className="mb-2">
                  {post.category ?? 'Article'}
                </Badge>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-snug line-clamp-2">{post.title}</h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {post.published_at && <span>{formatDate(new Date(post.published_at))}</span>}
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> {post.read_time ?? 5} min
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
