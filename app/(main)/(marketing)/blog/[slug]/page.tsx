import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/constants'
import { BlogImage } from '@/components/blog/BlogImage'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DbPost {
  id:           string
  slug:         string
  title:        string
  excerpt:      string | null
  content:      string
  category:     string | null
  tags:         string[]
  cover_image:  string | null
  author_name:  string
  seo_title:    string | null
  seo_desc:     string | null
  published_at: string | null
  view_count:   number
}

// ── Static fallback posts (shown when DB has no matching slug) ────────────────
const FALLBACK: Record<string, DbPost> = {
  'hook-formula-guide': {
    id: 'f1', slug: 'hook-formula-guide',
    title: 'The Complete TikTok Hook Formula Guide for Sellers',
    excerpt: 'Master the 7 hook types that drive TikTok sales. Includes real examples and templates you can use today.',
    category: 'Strategy', tags: ['hooks', 'strategy', 'ugc', 'tiktok'],
    cover_image: null, author_name: 'TTLike Team', seo_title: null, seo_desc: null,
    published_at: '2024-11-28', view_count: 0,
    content: `## Why Hooks Are Everything on TikTok

The first 3 seconds of your TikTok video determine whether someone watches or swipes. TikTok's own data shows that 90% of drop-offs happen in the first 3 seconds.

## The 7 Hook Types That Sell

### 1. The Surprise Hook
**Formula:** "I can't believe [product] can [unexpected benefit]..."

### 2. The Question Hook
**Formula:** "Are you still [struggling with problem] in [current year]?"

### 3. The FOMO Hook
**Formula:** "Everyone is buying [product] right now and here's why..."

### 4. The Emotional Hook
**Formula:** "After [time] of [suffering], this changed everything..."

### 5. The Contrarian Hook
**Formula:** "Stop spending money on [expensive solution]. This $[price] does the same thing..."

### 6. The Story Hook
**Formula:** "I spent $[amount] on [expensive thing] before finding this..."

### 7. The Educational Hook
**Formula:** "Did you know [surprising fact]? Here's how to fix it..."

## Combining Hooks with Your Product

The best hooks are specific to your product's unique mechanism and target audience's pain point. Generic hooks get ignored — specific ones stop the scroll.

**The Formula:** [Hook Type] + [Specific Pain Point] + [Unique Product Mechanism]

## Conclusion

Mastering hooks is the single highest-leverage skill for TikTok sellers. Use TTLike's AI Script Generator to generate multiple hook variations and test systematically.
`,
  },
  'tiktok-viral-products-2024': {
    id: 'f2', slug: 'tiktok-viral-products-2024',
    title: '10 Products That Went Viral on TikTok in 2024 (And Why)',
    excerpt: 'Analyzing the anatomy of TikTok virality across 10 breakout products.',
    category: 'Research', tags: ['products', 'research', 'viral', '2024'],
    cover_image: null, author_name: 'TTLike Team', seo_title: null, seo_desc: null,
    published_at: '2024-12-01', view_count: 0,
    content: `## The Anatomy of a Viral TikTok Product

After analyzing 500+ viral TikTok product videos, we've identified the common characteristics that make products explode on the platform.

## Common Viral Products

### Posture Corrector Devices
Clear visual transformation, relatable pain point, and quick visible results that translate perfectly to short-form video.

### LED Strip Lights
Massive visual transformation of any room. Easy to film before/after content.

### Portable Blenders
Satisfying to watch, practical daily use demonstration, and the "healthy lifestyle" angle resonates with TikTok's audience.

## What These Products Have in Common

1. **Visual Demonstration Value** — All show clear before/after or satisfying usage footage
2. **Relatable Problem** — All solve a pain point that a huge percentage of viewers experience
3. **Affordable Price Point** — All under $50, reducing purchase friction
4. **Quick Results** — All deliver noticeable results quickly, perfect for short-form content
`,
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip emoji, control chars, and non-printable characters from a string */
function cleanTitle(raw: string): string {
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoji blocks
    .replace(/[\u{2600}-\u{27BF}]/gu, '')       // misc symbols
    .replace(/[^\x20-\x7EÀ-ɏ]/g, '') // keep latin + extended latin
    .replace(/\s{2,}/g, ' ')
    .replace(/[|·—–]\s*$/, '')                  // trailing separators
    .trim()
}

/** Build the SEO <title> tag: clean title · niche + top formula */
function buildSeoTitle(post: DbPost): string {
  // 1. Prefer explicit seo_title if it exists and is clean
  if (post.seo_title) {
    const cleaned = cleanTitle(post.seo_title)
    if (cleaned.length > 10) return cleaned
  }

  // 2. Build from title + category: "{clean title} · {niche} Top Formula"
  const base  = cleanTitle(post.title)
  const niche = post.category ? `${post.category} ` : ''
  return `${base} · ${niche}Top TikTok Formula`
}

// ── Data fetch ─────────────────────────────────────────────────────────────────
async function getPost(slug: string): Promise<DbPost | null> {
  // Try DB first
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, category, tags, cover_image, author_name, seo_title, seo_desc, published_at, view_count')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .maybeSingle()

    if (!error && data) {
      const d = data as Record<string, unknown>
      return {
        id:           d.id           as string,
        slug:         d.slug         as string,
        title:        d.title        as string,
        excerpt:      d.excerpt      as string | null,
        content:      d.content      as string,
        category:     d.category     as string | null,
        tags:         (d.tags        as string[] | null) ?? [],
        cover_image:  d.cover_image  as string | null,
        author_name:  (d.author_name as string | null) ?? 'TTLike Team',
        seo_title:    d.seo_title    as string | null,
        seo_desc:     d.seo_desc     as string | null,
        published_at: d.published_at as string | null,
        view_count:   (d.view_count  as number | null) ?? 0,
      }
    }
  } catch { /* fall through to fallback */ }

  // Fall back to hardcoded post
  return FALLBACK[slug] ?? null
}

async function getRelatedPosts(currentSlug: string, category: string | null): Promise<Array<{ slug: string; title: string }>> {
  try {
    const service = createServiceClient()
    const q = service
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'PUBLISHED')
      .neq('slug', currentSlug)
      .order('published_at', { ascending: false })
      .limit(3)
    if (category) q.eq('category', category)
    const { data } = await q
    if (data && data.length > 0) return data as Array<{ slug: string; title: string }>
  } catch { /* fall through */ }

  // Fallback: pick 3 from hardcoded list excluding current
  return Object.values(FALLBACK)
    .filter(p => p.slug !== currentSlug)
    .slice(0, 3)
    .map(p => ({ slug: p.slug, title: p.title }))
}

// ── Metadata ──────────────────────────────────────────────────────────────────
interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}

  const seoTitle = buildSeoTitle(post)
  const desc     = post.seo_desc ?? post.excerpt ?? ''

  return {
    title:       seoTitle,
    description: desc,
    openGraph: {
      title:       seoTitle,
      description: desc,
      url:         `${SITE_URL}/blog/${slug}`,
      type:        'article',
      publishedTime: post.published_at ?? undefined,
      ...(post.cover_image ? { images: [{ url: post.cover_image }] } : {}),
    },
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
  }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## '))  return <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">{line.slice(3)}</h2>
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-2">{line.slice(4)}</h3>
    if (/^\*\*.*\*\*$/.test(line)) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.replace(/\*\*/g, '')}</p>
    if (line.startsWith('- '))  return <li key={i} className="ml-4 text-gray-600 text-sm list-disc">{line.slice(2)}</li>
    if (line.trim() === '')     return <br key={i} />
    return <p key={i} className="text-gray-600 leading-relaxed text-sm">{line}</p>
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const related   = await getRelatedPosts(slug, post.category)
  const readTime  = Math.max(1, Math.round(post.content.split(/\s+/).length / 200))

  const categoryColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    Research: 'info', Strategy: 'success', Guide: 'warning', AI: 'default',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <article className="lg:col-span-3">
          {post.category && (
            <Badge variant={categoryColors[post.category] ?? 'default'} className="mb-4">
              {post.category}
            </Badge>
          )}

          {/* Use cleanTitle for display heading too */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {cleanTitle(post.title)}
          </h1>
          {post.excerpt && (
            <p className="text-gray-600 text-lg mb-4">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <span>{post.author_name}</span>
            {post.published_at && <><span>·</span><span>{formatDate(new Date(post.published_at))}</span></>}
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readTime} min read</span>
          </div>

          {/* Cover image — always shown; falls back to gradient if URL expired */}
          <BlogImage
            src={post.cover_image}
            alt={cleanTitle(post.title)}
            category={post.category}
            className="w-full rounded-xl mb-8 object-cover max-h-72"
            fallbackClassName="max-h-72"
          />

          <div className="prose-custom space-y-1">
            {renderMarkdown(post.content)}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">#{tag}</span>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Try TTLike Free</h3>
              <p className="text-xs text-gray-600 mb-3">Find viral products and generate AI scripts in seconds.</p>
              <Link
                href="/auth/signup"
                className="block w-full text-center bg-pink-500 text-white text-sm font-medium min-h-[44px] leading-none flex items-center justify-center rounded-lg hover:bg-pink-600 transition-colors"
              >
                Get Started →
              </Link>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">More Articles</h3>
                <div className="space-y-2">
                  {related.map(p => (
                    <Link key={p.slug} href={`/blog/${p.slug}`} className="block text-xs text-gray-600 hover:text-pink-500 py-1 border-b border-gray-50 last:border-0">
                      {cleanTitle(p.title)}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
