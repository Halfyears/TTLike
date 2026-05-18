import Link from 'next/link'
import { Zap, Copy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { HOOK_TYPES } from '@/lib/constants'

export const metadata = { title: 'Hook Library · TTLike' }

const HOOK_PATTERNS = [
  { id: '1', type: 'SURPRISE', title: 'The "I Had No Idea" Hook', template: 'I had no idea [product] could do [unexpected benefit] until I tried it...', example: 'I had no idea a $15 massage gun could fix my 2-year back pain until I tried it...', viralScore: 94, useCount: 2847 },
  { id: '2', type: 'QUESTION', title: 'The Pain Point Question', template: 'Are you still [struggling with problem] in [year]? There\'s a better way...', example: 'Are you still waking up with back pain in 2024? There\'s a better way...', viralScore: 91, useCount: 2341 },
  { id: '3', type: 'FOMO', title: 'The Trend Warning', template: 'Everyone is buying [product] right now and here\'s why you should too...', example: 'Everyone is buying this posture corrector right now and here\'s why you should too...', viralScore: 89, useCount: 1923 },
  { id: '4', type: 'EMOTIONAL', title: 'The Personal Story', template: 'After [time period] of [suffering], this [product] literally changed my life...', example: 'After 3 years of chronic back pain, this posture corrector literally changed my life...', viralScore: 88, useCount: 1756 },
  { id: '5', type: 'CONTRARIAN', title: 'The Myth Buster', template: 'Stop spending money on [expensive solution]. This $[price] product does the same thing...', example: 'Stop spending $200 on chiropractors. This $25 device does the same thing...', viralScore: 86, useCount: 1534 },
  { id: '6', type: 'SURPRISE', title: 'The Unboxing Reveal', template: 'My [family member/friend] thought I was crazy for buying this. They were wrong...', example: 'My husband thought I was crazy for buying this $12 gadget. He was wrong...', viralScore: 85, useCount: 1432 },
  { id: '7', type: 'EDUCATIONAL', title: 'The Did You Know', template: 'Did you know that [surprising fact about problem]? This is how I fixed it...', example: 'Did you know that 80% of people have bad posture from phone use? This is how I fixed it...', viralScore: 83, useCount: 1287 },
  { id: '8', type: 'STORY', title: 'The Money Story', template: 'I spent $[amount] on [expensive solution] before finding this $[price] [product]...', example: 'I spent $500 on massage therapy before finding this $20 massage gun...', viralScore: 82, useCount: 1198 },
  { id: '9', type: 'FOMO', title: 'The Limited Time', template: 'This [product] keeps selling out and I finally got one. Here\'s my honest review...', example: 'This LED lamp keeps selling out and I finally got one. Here\'s my honest review...', viralScore: 81, useCount: 1087 },
  { id: '10', type: 'QUESTION', title: 'The Challenge Hook', template: 'Can a $[price] [product] really [achieve big claim]? I tried it for [time period]...', example: 'Can a $30 blender really make restaurant-quality smoothies? I tried it for 30 days...', viralScore: 80, useCount: 987 },
  { id: '11', type: 'EMOTIONAL', title: 'The Gift Hook', template: 'I bought this [product] as a gift and now they won\'t stop talking about it...', example: 'I bought this massage gun as a gift and now my whole family fights over it...', viralScore: 79, useCount: 876 },
  { id: '12', type: 'CONTRARIAN', title: 'The Comparison Hook', template: 'POV: You realize [expensive brand] and this [cheap product] do the exact same thing...', example: 'POV: You realize Dyson and this $30 product do the exact same thing...', viralScore: 78, useCount: 765 },
]

const hookTypeColors: Record<string, string> = {
  SURPRISE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  QUESTION: 'bg-blue-100 text-blue-700 border-blue-200',
  EMOTIONAL: 'bg-pink-100 text-pink-700 border-pink-200',
  FOMO: 'bg-red-100 text-red-700 border-red-200',
  CONTRARIAN: 'bg-violet-100 text-violet-700 border-violet-200',
  STORY: 'bg-green-100 text-green-700 border-green-200',
  EDUCATIONAL: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

export default function HooksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hook Library</h1>
        <p className="text-gray-600">Battle-tested hooks that make people stop scrolling</p>
      </div>

      {/* Hook type filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {HOOK_TYPES.map(hook => (
          <span key={hook.value}
            className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${hookTypeColors[hook.value]}`}>
            {hook.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {HOOK_PATTERNS.map(hook => (
          <Card key={hook.id} hover>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hookTypeColors[hook.type]}`}>
                  {hook.type}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Zap className="h-3 w-3 text-pink-400" />
                  {hook.viralScore}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-2">{hook.title}</h3>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-600 font-mono leading-relaxed">{hook.template}</p>
              </div>

              <div className="bg-pink-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-pink-800 italic leading-relaxed">&ldquo;{hook.example}&rdquo;</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{hook.useCount.toLocaleString()} uses</span>
                <Link href={`/dashboard/ai-scripts?hook=${hook.type}`}>
                  <button className="flex items-center gap-1 text-xs text-pink-500 font-medium hover:text-pink-600">
                    <Zap className="h-3 w-3" /> Use This Hook
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
