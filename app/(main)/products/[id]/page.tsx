import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, Share2, ExternalLink, Zap, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/utils'

const MOCK_PRODUCTS: Record<string, {
  id: string; productName: string; niche: string; viralScore: number;
  viewCount: bigint; likeCount: bigint; shareCount: bigint; commentCount: bigint;
  authorName: string; authorHandle: string; hashtags: string[];
  description: string; hookType: string; hookText: string;
  whyItWorks: string; scriptTemplate: string; keyInsights: string[];
}> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => [
    String(i + 1),
    {
      id: String(i + 1),
      productName: ['Posture Corrector Pro', 'LED Strip Lights Kit', 'Portable Blender Mini', 'Silk Sleep Mask'][i % 4],
      niche: ['Health', 'Home', 'Kitchen', 'Beauty'][i % 4],
      viralScore: 70 + (i % 30),
      viewCount: BigInt(1_000_000 + i * 150_000),
      likeCount: BigInt(50_000 + i * 5_000),
      shareCount: BigInt(5_000 + i * 500),
      commentCount: BigInt(2_000 + i * 200),
      authorName: `Creator ${i + 1}`,
      authorHandle: `@creator_${i + 1}`,
      hashtags: ['#tiktokshop', '#viral', `#${['health', 'home', 'kitchen', 'beauty'][i % 4]}`],
      description: `This product has been trending on TikTok for the past 2 weeks. High engagement rate and strong purchase intent signals detected.`,
      hookType: ['SURPRISE', 'QUESTION', 'EMOTIONAL', 'FOMO'][i % 4],
      hookText: [
        "I can't believe I spent years with bad posture until I found this...",
        "Did you know LED lights can increase your productivity by 30%?",
        "This little blender changed my morning routine completely...",
        "Everyone is talking about this silk sleep mask and here's why...",
      ][i % 4],
      whyItWorks: 'Strong visual transformation angle, relatable pain point, clear before/after narrative. The product demonstrates visible results quickly, creating high satisfaction and shareability.',
      scriptTemplate: `[0-3s] Hook: "${['I can\'t believe...', 'Did you know...', 'This changed...', 'Everyone is...'][i % 4]}"\n[3-15s] Problem agitation - describe the pain point\n[15-25s] Product reveal and demo\n[25-30s] CTA: "Link in bio - limited stock!"`,
      keyInsights: [
        'Transformation angle outperforms product features',
        'First 3 seconds must show the problem',
        'UGC style outperforms polished ads 3:1',
        'Add urgency to boost CTR',
      ],
    }
  ])
)

interface Props { params: Promise<{ id: string }> }

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = MOCK_PRODUCTS[id]
  if (!product) notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{product.niche}</Badge>
                    <Badge variant="info">{product.hookType}</Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{product.productName}</h1>
                  <p className="text-gray-500 text-sm mt-1">{product.authorHandle}</p>
                </div>
                <ViralScoreBadge score={product.viralScore} />
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">{product.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {product.hashtags.map(tag => (
                  <span key={tag} className="text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Eye, label: 'Views', value: formatNumber(Number(product.viewCount)) },
                  { icon: Heart, label: 'Likes', value: formatNumber(Number(product.likeCount)) },
                  { icon: Share2, label: 'Shares', value: formatNumber(Number(product.shareCount)) },
                  { icon: TrendingUp, label: 'Comments', value: formatNumber(Number(product.commentCount)) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <Icon className="h-4 w-4 text-pink-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Breakdown */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-pink-500" />
                <h2 className="text-lg font-semibold">AI Viral Breakdown</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Opening Hook</h3>
                  <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 text-sm text-pink-800 italic">
                    &ldquo;{product.hookText}&rdquo;
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Why It Works</h3>
                  <p className="text-sm text-gray-600">{product.whyItWorks}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Insights</h3>
                  <ul className="space-y-1">
                    {product.keyInsights.map(insight => (
                      <li key={insight} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-pink-500 mt-0.5">•</span>{insight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Script Template</h3>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {product.scriptTemplate}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Generate Script</h3>
              <p className="text-sm text-gray-600 mb-4">Use AI to create 5 custom scripts for this product</p>
              <Link href={`/dashboard/ai-scripts?product=${encodeURIComponent(product.productName)}&hook=${product.hookType}`}>
                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" /> Generate Scripts
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Similar Products</h3>
              <div className="space-y-2">
                {Object.values(MOCK_PRODUCTS).slice(0, 4).filter(p => p.id !== id && p.niche === product.niche).slice(0, 3).map(p => (
                  <Link key={p.id} href={`/products/${p.id}`} className="block">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700 font-medium truncate">{p.productName}</span>
                      <ViralScoreBadge score={p.viralScore} showLabel={false} className="shrink-0 ml-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
