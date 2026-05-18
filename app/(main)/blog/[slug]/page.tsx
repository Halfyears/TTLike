import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

const MOCK_POSTS: Record<string, {
  slug: string; title: string; excerpt: string; category: string;
  readTime: number; publishedAt: Date; content: string; tags: string[]
}> = {
  'hook-formula-guide': {
    slug: 'hook-formula-guide',
    title: 'The Complete TikTok Hook Formula Guide for Sellers',
    excerpt: 'Master the 7 hook types that drive TikTok sales. Includes real examples and templates you can use today.',
    category: 'Strategy',
    readTime: 12,
    publishedAt: new Date('2024-11-28'),
    tags: ['hooks', 'strategy', 'ugc', 'tiktok'],
    content: `## Why Hooks Are Everything on TikTok

The first 3 seconds of your TikTok video determine whether someone watches or swipes. This isn't just theory — TikTok's own data shows that 90% of drop-offs happen in the first 3 seconds.

For sellers, this means your hook is more important than your product. A mediocre product with a great hook will outsell a great product with a mediocre hook every single time.

## The 7 Hook Types That Sell

### 1. The Surprise Hook
**Formula:** "I can't believe [product] can [unexpected benefit]..."

This works because it creates a pattern interrupt. The brain is wired to pay attention to surprising information. When you say something unexpected, viewers feel compelled to find out what it is.

**Example:** "I can't believe this $15 tool fixed my posture better than 6 months of chiropractic care..."

### 2. The Question Hook
**Formula:** "Are you still [struggling with problem] in [current year]?"

Questions force the brain to engage. The viewer automatically asks themselves the question, and if the answer is "yes," you have their full attention.

**Example:** "Are you still waking up with back pain every morning in 2024?"

### 3. The FOMO Hook
**Formula:** "Everyone is buying [product] right now and here's why..."

Social proof is one of the strongest psychological triggers. When people see others making a purchase, they want to understand why and often follow suit.

### 4. The Emotional Hook
**Formula:** "After [time] of [suffering], this changed everything..."

Personal stories create empathy and trust. When viewers can see themselves in your situation, they're more likely to believe your product will work for them too.

### 5. The Contrarian Hook
**Formula:** "Stop spending money on [expensive solution]. This $[price] does the same thing..."

This hook challenges conventional wisdom, which triggers curiosity. It also positions you as knowledgeable and the viewer's ally against overpriced solutions.

### 6. The Story Hook
**Formula:** "I spent $[amount] on [expensive thing] before finding this..."

A good story creates a narrative arc that viewers want to follow to completion. It also provides social proof through your personal experience.

### 7. The Educational Hook
**Formula:** "Did you know [surprising fact]? Here's how to fix it..."

Educational content creates perceived value before the product reveal. When you teach something useful first, viewers are more receptive to your product recommendation.

## Combining Hooks with Your Product

The best hooks are specific to your product's unique mechanism and target audience's pain point. Generic hooks get ignored — specific ones stop the scroll.

**The Formula:** [Hook Type] + [Specific Pain Point] + [Unique Product Mechanism]

## Testing Your Hooks

Always test at least 3 different hooks for any product. What works for one audience might not work for another. Use TTLike's AI Script Generator to quickly generate multiple hook variations.

## Conclusion

Mastering hooks is the single highest-leverage skill for TikTok sellers. Invest time in learning these 7 patterns, test them systematically, and you'll see dramatic improvements in your view-through rates and conversions.
`,
  },
  'tiktok-viral-products-2024': {
    slug: 'tiktok-viral-products-2024',
    title: '10 Products That Went Viral on TikTok in 2024 (And Why)',
    excerpt: 'Analyzing the anatomy of TikTok virality across 10 breakout products.',
    category: 'Research',
    readTime: 8,
    publishedAt: new Date('2024-12-01'),
    tags: ['products', 'research', 'viral', '2024'],
    content: `## The Anatomy of a Viral TikTok Product

Not all products go viral by accident. After analyzing 500+ viral TikTok product videos, we've identified the common characteristics that make products explode on the platform.

## The 10 Viral Products of 2024

### 1. Posture Corrector Devices
**Why it went viral:** Clear visual transformation, relatable pain point (everyone has bad posture from phones), and quick visible results that translate perfectly to short-form video.

### 2. LED Strip Lights
**Why it went viral:** Massive visual transformation of any room. Easy to film before/after content. Appeals to the popular "room makeover" content category.

### 3. Portable Blenders
**Why it went viral:** Satisfying to watch, practical daily use demonstration, and the "healthy lifestyle" angle resonates with TikTok's health-conscious audience.

### 4. Silicone Cooking Tools
**Why it went viral:** Practical demonstrations that show clear value, multiple use cases that generate repeat content, and the ASMR appeal of silicone sounds.

### 5. Car Organization Products
**Why it went viral:** Relatable mess problem + satisfying organization solution. "Car transformation" content performs extremely well.

## What These Products Have in Common

1. **Visual Demonstration Value** - All show clear before/after or satisfying usage footage
2. **Relatable Problem** - All solve a pain point that a huge percentage of viewers experience
3. **Affordable Price Point** - All under $50, reducing purchase friction
4. **Quick Results** - All deliver noticeable results quickly, perfect for short-form content
5. **Broad Appeal** - All work for diverse demographics

## Using This Data

When evaluating products for TikTok dropshipping, run them through this checklist:
- Can I film a compelling before/after?
- Does it solve a problem 30%+ of my audience has?
- Is the price under $50?
- Can I show results in under 30 seconds?
- Does it have a "wow factor" when demonstrated?

Products that check all 5 boxes are your best candidates for viral content.
`,
  },
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = MOCK_POSTS[slug]
  if (!post) return {}
  return { title: post.title, description: post.excerpt }
}

function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">{line.slice(3)}</h2>
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-2">{line.slice(4)}</h3>
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.slice(2, -2)}</p>
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-600 text-sm">{line.slice(2)}</li>
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="text-gray-600 leading-relaxed text-sm">{line}</p>
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = MOCK_POSTS[slug] ?? Object.values(MOCK_POSTS)[0]

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <article className="lg:col-span-3">
          <Badge className="mb-4">{post.category}</Badge>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
          <p className="text-gray-600 text-lg mb-4">{post.excerpt}</p>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <span>TTLike Team</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min read</span>
          </div>

          <div className="prose-custom space-y-1">
            {renderMarkdown(post.content)}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Try TTLike Free</h3>
              <p className="text-xs text-gray-600 mb-3">Find viral products and generate AI scripts in seconds.</p>
              <Link href="/auth/signup">
                <button className="w-full bg-pink-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-pink-600">
                  Get Started →
                </button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">More Articles</h3>
              <div className="space-y-2">
                {Object.values(MOCK_POSTS).filter(p => p.slug !== slug).slice(0, 3).map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="block text-xs text-gray-600 hover:text-pink-500 py-1 border-b border-gray-50">
                    {p.title}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
