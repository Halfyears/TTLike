import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Blog · TTLike' }

const MOCK_POSTS = [
  { slug: 'tiktok-viral-products-2024', title: '10 Products That Went Viral on TikTok in 2024 (And Why)', excerpt: 'Analyzing the anatomy of TikTok virality across 10 breakout products. What do they have in common?', category: 'Research', readTime: 8, publishedAt: new Date('2024-12-01'), coverImage: null },
  { slug: 'hook-formula-guide', title: 'The Complete TikTok Hook Formula Guide for Sellers', excerpt: 'Master the 7 hook types that drive TikTok sales. Includes real examples and templates you can use today.', category: 'Strategy', readTime: 12, publishedAt: new Date('2024-11-28'), coverImage: null },
  { slug: 'dropshipping-tiktok-beginners', title: 'TikTok Dropshipping in 2024: A Beginner\'s Complete Guide', excerpt: 'Everything you need to know to start dropshipping on TikTok — product selection, content strategy, and scaling.', category: 'Guide', readTime: 15, publishedAt: new Date('2024-11-20'), coverImage: null },
  { slug: 'ugc-scripts-that-convert', title: 'The UGC Scripts That Actually Convert (With Data)', excerpt: 'We analyzed 500+ TikTok UGC videos to find the script patterns with the highest conversion rates.', category: 'Research', readTime: 10, publishedAt: new Date('2024-11-15'), coverImage: null },
  { slug: 'tiktok-algorithm-explained', title: 'TikTok Algorithm Explained: What Makes Videos Go Viral in 2024', excerpt: 'A deep dive into how TikTok\'s recommendation algorithm works and how to game it for maximum reach.', category: 'Strategy', readTime: 9, publishedAt: new Date('2024-11-08'), coverImage: null },
  { slug: 'ai-ugc-content-creation', title: 'How to Use AI to Create TikTok UGC Content at Scale', excerpt: 'Step-by-step guide to using AI tools like Claude to generate, script, and optimize TikTok UGC content.', category: 'AI', readTime: 11, publishedAt: new Date('2024-11-01'), coverImage: null },
]

const categoryColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Research: 'info',
  Strategy: 'success',
  Guide: 'warning',
  AI: 'default',
}

export default function BlogPage() {
  const [featured, ...rest] = MOCK_POSTS

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TTLike Blog</h1>
        <p className="text-gray-600">TikTok selling strategies, viral analysis, and growth guides</p>
      </div>

      {/* Featured Post */}
      <Link href={`/blog/${featured.slug}`}>
        <Card hover className="mb-8">
          <CardContent className="p-8">
            <Badge variant={categoryColors[featured.category] ?? 'default'} className="mb-3">{featured.category}</Badge>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-pink-600 transition-colors">
              {featured.title}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">{featured.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatDate(featured.publishedAt)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readTime} min read</span>
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
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <Card hover className="h-full">
              <div className="h-36 bg-gradient-to-br from-pink-50 to-violet-50 rounded-t-xl" />
              <CardContent className="p-5">
                <Badge variant={categoryColors[post.category] ?? 'default'} className="mb-2">{post.category}</Badge>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-snug line-clamp-2">{post.title}</h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {post.readTime} min</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
