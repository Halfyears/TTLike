import { TrendingUp, Flame, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import Link from 'next/link'

export const metadata = { title: 'Trending · TTLike' }

const TRENDING_TOPICS = [
  { id: '1', topic: '#TikTokMadeMeBuyIt', category: 'Meta', videoCount: 45200, growthRate: 34.5, viralScore: 96 },
  { id: '2', topic: 'Posture Correction', category: 'Health', videoCount: 12400, growthRate: 28.3, viralScore: 94 },
  { id: '3', topic: 'LED Room Makeover', category: 'Home', videoCount: 9870, growthRate: 22.1, viralScore: 91 },
  { id: '4', topic: 'Budget Kitchen Finds', category: 'Kitchen', videoCount: 8560, growthRate: 19.8, viralScore: 89 },
  { id: '5', topic: 'Skincare Routine', category: 'Beauty', videoCount: 34200, growthRate: 15.2, viralScore: 87 },
  { id: '6', topic: 'Home Gym Setup', category: 'Fitness', videoCount: 7890, growthRate: 41.7, viralScore: 93 },
  { id: '7', topic: 'Under $20 Finds', category: 'General', videoCount: 23100, growthRate: 25.6, viralScore: 90 },
  { id: '8', topic: 'Pet Products', category: 'Pets', videoCount: 6540, growthRate: 17.3, viralScore: 84 },
  { id: '9', topic: 'Amazon Must Haves', category: 'General', videoCount: 19800, growthRate: 12.4, viralScore: 82 },
  { id: '10', topic: 'Travel Essentials', category: 'Travel', videoCount: 5670, growthRate: 38.2, viralScore: 88 },
  { id: '11', topic: 'Meal Prep Gadgets', category: 'Kitchen', videoCount: 4560, growthRate: 29.4, viralScore: 86 },
  { id: '12', topic: 'Sleep Quality Products', category: 'Health', videoCount: 7230, growthRate: 33.1, viralScore: 92 },
]

const TRENDING_PRODUCTS = [
  { name: 'Posture Corrector Pro', niche: 'Health', growth: '+340%', viralScore: 94 },
  { name: 'LED Strip Lights Kit', niche: 'Home', growth: '+280%', viralScore: 89 },
  { name: 'Portable Blender', niche: 'Kitchen', growth: '+195%', viralScore: 86 },
  { name: 'Silk Sleep Mask', niche: 'Beauty', growth: '+167%', viralScore: 82 },
  { name: 'Resistance Bands Set', niche: 'Fitness', growth: '+412%', viralScore: 93 },
  { name: 'Cold Brew Maker', niche: 'Kitchen', growth: '+223%', viralScore: 88 },
]

export default function TrendingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trending Now</h1>
        <p className="text-gray-600">What&apos;s going viral on TikTok right now</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trending Topics */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" /> Trending Topics
          </h2>
          <div className="space-y-3">
            {TRENDING_TOPICS.map((topic, i) => (
              <Card key={topic.id} hover>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-black w-8 text-center ${i < 3 ? 'text-pink-500' : 'text-gray-300'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{topic.topic}</h3>
                        <Badge>{topic.category}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{topic.videoCount.toLocaleString()} videos</span>
                        <span className="flex items-center gap-0.5 text-green-600 font-medium">
                          <ArrowUpRight className="h-3 w-3" /> {topic.growthRate}% this week
                        </span>
                      </div>
                    </div>
                    <ViralScoreBadge score={topic.viralScore} showLabel={false} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" /> Fastest Growing Products
          </h2>
          <div className="space-y-3">
            {TRENDING_PRODUCTS.map(product => (
              <Card key={product.name} hover>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                      <Badge className="mt-1">{product.niche}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-bold text-sm">{product.growth}</div>
                      <ViralScoreBadge score={product.viralScore} showLabel={false} className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-pink-50 rounded-xl border border-pink-100">
            <h3 className="font-semibold text-pink-900 text-sm mb-2">Get Trend Alerts</h3>
            <p className="text-pink-700 text-xs mb-3">Be the first to know when a new product starts trending</p>
            <Link href="/auth/signup">
              <button className="w-full bg-pink-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-pink-600 transition-colors">
                Sign Up Free →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
