/**
 * /hooks/[niche] — Programmatic SEO pages for Hook Engine niches.
 *
 * Statically generated at build time for 8 niches.
 * Each page contains niche-specific hook examples + CTA to the Hook Machine.
 *
 * Routes: /hooks/beauty  /hooks/fitness  /hooks/home  /hooks/tech
 *         /hooks/fashion /hooks/pet       /hooks/food  /hooks/gadgets
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ArrowRight, Sparkles } from 'lucide-react'
import { notFound } from 'next/navigation'

// ── Niche data ────────────────────────────────────────────────────────────────

interface NicheHook {
  title:    string
  template: string
  example:  string
  score:    number
  pattern:  string
}

interface NicheMeta {
  label:       string
  emoji:       string
  description: string
  seoTitle:    string
  seoDesc:     string
  keywords:    string[]
  hooks:       NicheHook[]
}

const NICHE_DATA: Record<string, NicheMeta> = {
  beauty: {
    label:       'Beauty & Skincare',
    emoji:       '💄',
    description: 'Stop-scroll hooks for beauty, skincare, and cosmetics TikTok content that converts browsers into buyers.',
    seoTitle:    'TikTok Beauty Hook Generator — 50+ Proven Hooks for Skincare & Cosmetics',
    seoDesc:     'Free TikTok hook generator for beauty & skincare creators. Get scroll-stopping hooks for serums, cleansers, makeup dupes, and more — copy-paste ready.',
    keywords:    ['tiktok beauty hooks', 'skincare tiktok hook', 'cosmetics tiktok script', 'beauty ugc hooks'],
    hooks: [
      { title: 'The Dupe Reveal',      pattern: 'Shock Reversal',       score: 93, template: 'Stop buying [luxury brand] when this $[price] dupe does the same thing…', example: 'Stop buying La Mer when this $14 dupe does the same thing…' },
      { title: 'The Skin Confession',  pattern: 'Negative Interruption', score: 91, template: 'My skin was [problem] until I tried this one ingredient…',  example: 'My skin was breaking out every week until I tried this one ingredient…' },
      { title: 'The Dermat Secret',    pattern: 'Curiosity Gap',         score: 89, template: 'Dermatologists won\'t tell you this about [product type]…',  example: 'Dermatologists won\'t tell you this about vitamin C serums…' },
      { title: 'The 7-Day Challenge',  pattern: 'Visual Peak',           score: 87, template: 'I used [product] every day for 7 days. Here\'s what happened to my [skin concern]…', example: 'I used retinol every day for 7 days. Here\'s what happened to my fine lines…' },
      { title: 'The Honest Review',    pattern: 'Shock Reversal',        score: 85, template: 'Every beauty influencer is wrong about [product/routine step]…', example: 'Every beauty influencer is wrong about double cleansing…' },
      { title: 'The Before/After Set', pattern: 'Visual Peak',           score: 84, template: 'I took a photo before and after using [product] for [time]. The difference is insane.', example: 'I took a photo before and after using niacinamide for 30 days. The difference is insane.' },
    ],
  },

  fitness: {
    label:       'Health & Fitness',
    emoji:       '💪',
    description: 'High-converting TikTok hooks for fitness equipment, supplements, workout gear, and health products.',
    seoTitle:    'TikTok Fitness Hook Generator — Viral Hooks for Gym & Health Products',
    seoDesc:     'Free TikTok hook generator for fitness & health creators. Proven scroll-stopping hooks for gym equipment, supplements, workout accessories and more.',
    keywords:    ['tiktok fitness hooks', 'gym product tiktok hook', 'supplement tiktok script', 'fitness ugc hooks'],
    hooks: [
      { title: 'The PT Secret',       pattern: 'Curiosity Gap',         score: 94, template: 'Personal trainers are keeping this [equipment/method] secret because of their business model…', example: 'Personal trainers are keeping this resistance band method secret because of their business model…' },
      { title: 'The Pain Fix',        pattern: 'Negative Interruption', score: 92, template: 'If you have [pain/problem], stop doing [common advice] and do this instead…', example: 'If you have lower back pain, stop doing crunches and do this instead…' },
      { title: 'The $[X] vs $[Y]',   pattern: 'Shock Reversal',        score: 90, template: 'I spent $[expensive] on a gym membership. This $[cheap] device at home works better.', example: 'I spent $120 on a gym membership. This $30 device at home works better.' },
      { title: 'The 21-Day Result',   pattern: 'Visual Peak',           score: 88, template: 'I did [exercise/routine] every morning for 21 days with [product]. Day 1 vs Day 21:', example: 'I did 10 minutes with this massage gun every morning for 21 days. Day 1 vs Day 21:' },
      { title: 'The Myth Buster',     pattern: 'Shock Reversal',        score: 86, template: 'The [fitness advice] you\'ve been following is why you\'re not seeing results…', example: 'The "more protein" advice you\'ve been following is why you\'re not seeing results…' },
      { title: 'The Lazy Fix',        pattern: 'Curiosity Gap',         score: 84, template: 'You don\'t need to work out harder — you need [this product/method]…', example: 'You don\'t need to work out harder — you need this 10-minute recovery tool…' },
    ],
  },

  home: {
    label:       'Home & Garden',
    emoji:       '🏠',
    description: 'Proven TikTok hooks for home decor, kitchen gadgets, garden tools, and organisation products.',
    seoTitle:    'TikTok Home Decor Hook Generator — Viral Hooks for Home & Kitchen Products',
    seoDesc:     'Free TikTok hook generator for home & kitchen creators. Get proven hooks for home decor, organisation, kitchen gadgets, and garden products.',
    keywords:    ['tiktok home decor hooks', 'kitchen gadget tiktok hook', 'home organisation tiktok', 'home product ugc'],
    hooks: [
      { title: 'The Amazon Find',     pattern: 'Curiosity Gap',         score: 92, template: 'This $[price] Amazon find is why my [room/space] looks like a magazine spread…', example: 'This $22 Amazon find is why my living room looks like a magazine spread…' },
      { title: 'The Before/After',    pattern: 'Visual Peak',           score: 91, template: 'My [room] looked like a disaster. I spent $[amount] and spent [time]. Here\'s the result:', example: 'My kitchen looked like a disaster. I spent $60 and two hours. Here\'s the result:' },
      { title: 'The Landlord Hack',   pattern: 'Curiosity Gap',         score: 89, template: 'Landlord said I can\'t do [renovation]. So I used this $[price] product instead…', example: 'Landlord said I can\'t paint the walls. So I used these $30 peel-and-stick panels instead…' },
      { title: 'The Hostess Secret',  pattern: 'Shock Reversal',        score: 87, template: 'Every guest asks me about [item] in my home. It cost $[price] and took [time] to set up.', example: 'Every guest asks about the pendant light in my dining room. It cost $35 and took 20 minutes.' },
      { title: 'The ADHD Hack',       pattern: 'Negative Interruption', score: 85, template: 'If you can never keep your [space] organised, you don\'t need more discipline — you need [this]…', example: 'If you can never keep your desk organised, you don\'t need more discipline — you need this system…' },
      { title: 'The Dupe Reveal',     pattern: 'Shock Reversal',        score: 83, template: 'Don\'t pay [brand] prices for [product type]. This [cheap version] is identical.', example: 'Don\'t pay Pottery Barn prices for a rug. This $45 version is identical.' },
    ],
  },

  tech: {
    label:       'Tech & Gadgets',
    emoji:       '📱',
    description: 'High-click-through TikTok hooks for tech products, gadgets, accessories, and productivity tools.',
    seoTitle:    'TikTok Tech Gadget Hook Generator — Viral Hooks for Tech Products',
    seoDesc:     'Free TikTok hook generator for tech & gadget creators. Proven scroll-stopping hooks for smartphones, accessories, productivity tools, and electronics.',
    keywords:    ['tiktok tech hooks', 'gadget tiktok hook', 'tech product script tiktok', 'tech ugc hooks'],
    hooks: [
      { title: 'The Productivity Trap',  pattern: 'Negative Interruption', score: 93, template: 'You\'re losing [X hours] per week because you don\'t have [this tool/product]…', example: 'You\'re losing 3 hours per week because you don\'t have this cable management system…' },
      { title: 'The Apple Dupe',         pattern: 'Shock Reversal',        score: 92, template: 'Stop spending Apple prices for [accessory]. This $[price] version does the same job.', example: 'Stop spending Apple prices for AirTags. This $8 version does the same job.' },
      { title: 'The Setup Reveal',       pattern: 'Visual Peak',           score: 90, template: 'I spent [time] building my perfect [workspace/setup]. Here\'s every product under $[budget]:', example: 'I spent 6 months building my perfect WFH setup. Here\'s every product under $500:' },
      { title: 'The Problem Solver',     pattern: 'Curiosity Gap',         score: 88, template: 'That annoying [problem] you have every day? There\'s a $[price] solution for that.', example: 'That annoying tangled cable problem you have every day? There\'s a $12 solution for that.' },
      { title: 'The Developer Secret',   pattern: 'Curiosity Gap',         score: 86, template: 'Software engineers don\'t want you knowing about this [product/tool]…', example: 'Software engineers don\'t want you knowing about this $15 keyboard mod…' },
      { title: 'The 30-Day Test',        pattern: 'Visual Peak',           score: 84, template: 'I gave up [popular product] for [alternative] for 30 days. Here\'s what actually happened.', example: 'I gave up my iPhone for this Android for 30 days. Here\'s what actually happened.' },
    ],
  },

  fashion: {
    label:       'Fashion & Style',
    emoji:       '👗',
    description: 'Stop-scroll TikTok hooks for fashion, clothing, accessories, and style product promotions.',
    seoTitle:    'TikTok Fashion Hook Generator — Viral Hooks for Clothing & Style Products',
    seoDesc:     'Free TikTok hook generator for fashion creators. Scroll-stopping hooks for clothing, accessories, style dupes, and outfit reveals — copy-paste ready.',
    keywords:    ['tiktok fashion hooks', 'clothing tiktok script', 'fashion ugc hooks', 'outfit reveal tiktok hook'],
    hooks: [
      { title: 'The Designer Dupe',   pattern: 'Shock Reversal',        score: 93, template: 'I found a [designer brand] dupe on [platform] for $[price] and I can\'t tell the difference.', example: 'I found a Toteme coat dupe on Amazon for $45 and I can\'t tell the difference.' },
      { title: 'The Outfit Formula',  pattern: 'Educational',           score: 91, template: 'The [X]-item outfit formula that makes anything look expensive (even from Target)…', example: 'The 3-item outfit formula that makes anything look expensive (even from Target)…' },
      { title: 'The Style Mistake',   pattern: 'Negative Interruption', score: 89, template: 'The [common fashion mistake] that\'s making you look [negative outcome]…', example: 'The one mistake that\'s making your outfits look frumpy instead of chic…' },
      { title: 'The Pack Reveal',     pattern: 'Visual Peak',           score: 87, template: 'Everything I packed for [trip/event] — [count] outfits from one [small bag/brand]:',  example: 'Everything I packed for Paris Fashion Week — 8 outfits from one carry-on:' },
      { title: 'The Body Type Hack',  pattern: 'Curiosity Gap',         score: 85, template: 'If you\'re [body type], this [garment/brand] was literally made for you.', example: 'If you\'re petite, this $38 brand was literally made for your body type.' },
      { title: 'The Thrift Flip',     pattern: 'Visual Peak',           score: 83, template: 'I bought this for $[price] at [store]. After [simple hack], it looks like a [expensive brand].', example: 'I bought this blazer for $6 at Goodwill. After one simple alteration, it looks Zara.' },
    ],
  },

  pet: {
    label:       'Pets',
    emoji:       '🐾',
    description: 'Adorable and high-converting TikTok hooks for pet products, accessories, and animal care.',
    seoTitle:    'TikTok Pet Product Hook Generator — Viral Hooks for Dog, Cat & Pet Products',
    seoDesc:     'Free TikTok hook generator for pet product creators. Proven hooks for dog toys, cat accessories, pet care products and more — copy-paste ready.',
    keywords:    ['tiktok pet hooks', 'dog product tiktok hook', 'cat product tiktok script', 'pet ugc hooks'],
    hooks: [
      { title: 'The Vet Secret',       pattern: 'Curiosity Gap',         score: 94, template: 'Vets won\'t tell you this, but [product/ingredient] is why your [pet] is [negative outcome]…', example: 'Vets won\'t tell you this, but cheap kibble is why your dog keeps scratching…' },
      { title: 'The Dog Dad/Mom Tax',  pattern: 'Shock Reversal',        score: 92, template: 'I spent $[expensive amount] at the vet for [problem]. This $[cheap] product would\'ve fixed it.', example: 'I spent $300 at the vet for my dog\'s anxiety. This $18 product would\'ve fixed it.' },
      { title: 'The Reaction Video',   pattern: 'Visual Peak',           score: 90, template: 'I gave my [pet] the [product] for the first time. Their reaction: [emoji/description]', example: 'I gave my dog the puzzle toy for the first time. Their reaction was absolutely unhinged.' },
      { title: 'The Obsession Hook',   pattern: 'Curiosity Gap',         score: 88, template: 'My [pet] has ignored every toy I\'ve ever bought — until this $[price] one…', example: 'My cat has ignored every toy I\'ve ever bought — until this $12 one…' },
      { title: 'The Warning',          pattern: 'Negative Interruption', score: 86, template: 'Stop buying [popular pet product]. Here\'s what it\'s actually doing to your [pet]:',  example: 'Stop buying retractable leashes. Here\'s what they\'re actually doing to your dog:' },
      { title: 'The Spoiled Pet',      pattern: 'Social Proof',          score: 84, template: 'I ordered [product] as a joke. My [pet] is now completely obsessed and I regret nothing.', example: 'I ordered this $25 cat tower as a joke. My cat is now completely obsessed and I regret nothing.' },
    ],
  },

  food: {
    label:       'Food & Kitchen',
    emoji:       '🍳',
    description: 'Mouth-watering TikTok hooks for food products, kitchen gadgets, cooking tools, and recipe content.',
    seoTitle:    'TikTok Food & Kitchen Hook Generator — Viral Hooks for Cooking & Food Products',
    seoDesc:     'Free TikTok hook generator for food & kitchen creators. Proven scroll-stopping hooks for kitchen gadgets, meal prep tools, and food products.',
    keywords:    ['tiktok food hooks', 'kitchen gadget tiktok hook', 'cooking tiktok script', 'food ugc hooks'],
    hooks: [
      { title: 'The Chef Secret',      pattern: 'Curiosity Gap',         score: 93, template: 'Professional chefs use this $[price] [tool] and never talk about it publicly…', example: 'Professional chefs use this $18 mandoline and never talk about it publicly…' },
      { title: 'The Takeout Killer',   pattern: 'Shock Reversal',        score: 91, template: 'I stopped ordering [expensive takeout] the day I got this [kitchen product]…', example: 'I stopped ordering $40 sushi the day I got this rolling mat set…' },
      { title: 'The Lazy Meal Prep',   pattern: 'Negative Interruption', score: 89, template: 'If meal prepping feels exhausting, you\'re doing it wrong. This $[price] changed everything:', example: 'If meal prepping feels exhausting, you\'re doing it wrong. This $25 container set changed everything:' },
      { title: 'The Viral Recipe',     pattern: 'Visual Peak',           score: 87, template: 'I tried the [viral recipe] using [product] and it took [short time]. Here\'s the result:', example: 'I tried the viral pasta recipe using this $30 pan and it took 12 minutes. Here\'s the result:' },
      { title: 'The Grocery Hack',     pattern: 'Shock Reversal',        score: 85, template: 'You\'re overpaying for [grocery item] every week. Here\'s how [product] fixes that:', example: 'You\'re overpaying for coffee every week. Here\'s how this $40 grinder fixes that:' },
      { title: 'The Kitchen Upgrade',  pattern: 'Visual Peak',           score: 83, template: 'I replaced [old/expensive item] with a $[price] [product] and my cooking improved by 100x.', example: 'I replaced my $200 pan with a $35 carbon steel version and my cooking improved by 100x.' },
    ],
  },

  gadgets: {
    label:       'Everyday Gadgets',
    emoji:       '🔧',
    description: 'Viral TikTok hooks for everyday utility gadgets, organisation tools, and life-hack products.',
    seoTitle:    'TikTok Gadget Hook Generator — Viral Hooks for Everyday Utility Products',
    seoDesc:     'Free TikTok hook generator for gadget creators. Proven scroll-stopping hooks for everyday gadgets, multi-tools, car accessories, and utility products.',
    keywords:    ['tiktok gadget hooks', 'utility gadget tiktok hook', 'life hack tiktok script', 'gadget ugc hooks'],
    hooks: [
      { title: 'The Problem Revealer', pattern: 'Negative Interruption', score: 93, template: 'The [common frustration] you have every single day has a $[price] solution on Amazon.', example: 'The phone charger falling out problem you have every single day has a $9 solution on Amazon.' },
      { title: 'The Engineer Find',    pattern: 'Curiosity Gap',         score: 91, template: 'An engineer friend sent me this link. I thought it was dumb. Then I bought it.', example: 'An engineer friend sent me this $15 link. I thought it was dumb. Then I bought one.' },
      { title: 'The Regret Buy',       pattern: 'Shock Reversal',        score: 89, template: 'I almost returned this [product]. Then I actually used it. Now I buy one for everyone I know.', example: 'I almost returned this clip-on fan. Then I actually used it. Now I buy one for everyone I know.' },
      { title: 'The Car Essentials',   pattern: 'Visual Peak',           score: 87, template: '[X] things I keep in my car that have saved me [specific outcomes]:',  example: '5 things I keep in my car that have saved me $600 in tow trucks and emergencies:' },
      { title: 'The Infomercial Truth',pattern: 'Shock Reversal',        score: 85, template: 'This looks like an infomercial product. It\'s not. It\'s the most useful [category] I own.', example: 'This looks like an infomercial product. It\'s not. It\'s the most useful cable organiser I own.' },
      { title: 'The Tiny Upgrade',     pattern: 'Curiosity Gap',         score: 83, template: 'A $[price] upgrade that makes [everyday thing] 10x better. Why didn\'t I do this sooner?', example: 'A $12 upgrade that makes my laptop bag 10x better. Why didn\'t I do this sooner?' },
    ],
  },
}

const scoreColor = (s: number) =>
  s >= 85 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-red-500'

const patternBadge = (p: string) => {
  const map: Record<string, string> = {
    'Shock Reversal':        'bg-red-50 text-red-700 border-red-200',
    'Negative Interruption': 'bg-orange-50 text-orange-700 border-orange-200',
    'Visual Peak':           'bg-violet-50 text-violet-700 border-violet-200',
    'Curiosity Gap':         'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Educational':           'bg-blue-50 text-blue-700 border-blue-200',
    'Social Proof':          'bg-green-50 text-green-700 border-green-200',
  }
  return map[p] ?? 'bg-gray-50 text-gray-700 border-gray-200'
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(NICHE_DATA).map(niche => ({ niche }))
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ niche: string }> },
): Promise<Metadata> {
  const { niche } = await params
  const meta = NICHE_DATA[niche]
  if (!meta) return { title: 'Not Found' }
  return {
    title:       meta.seoTitle,
    description: meta.seoDesc,
    keywords:    meta.keywords.join(', '),
    openGraph: {
      title:       meta.seoTitle,
      description: meta.seoDesc,
      type:        'website',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NicheHooksPage(
  { params }: { params: Promise<{ niche: string }> },
) {
  const { niche } = await params
  const meta = NICHE_DATA[niche]
  if (!meta) notFound()

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Link href="/hooks" className="hover:text-pink-500 transition-colors">Hook Library</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{meta.label}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{meta.emoji}</span>
          <h1 className="text-3xl font-bold text-gray-900">
            TikTok Hooks for {meta.label}
          </h1>
        </div>
        <p className="text-gray-500 text-lg max-w-2xl leading-relaxed">
          {meta.description}
        </p>
      </div>

      {/* Hook Machine CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800 p-6 mb-12 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <span className="text-sm font-semibold text-pink-300">Hook Machine — Free</span>
          </div>
          <p className="text-white font-bold text-base">
            Paste your own {meta.label} hook — get a Scroll-Stop Score + 4 anti-duplication variants
          </p>
          <p className="text-slate-400 text-sm mt-1">No sign-up required. Results in under 3 seconds.</p>
        </div>
        <Link href="/hooks">
          <button className="flex items-center gap-2 bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors shadow-lg shadow-pink-900/30 whitespace-nowrap shrink-0">
            <Zap className="h-4 w-4" />
            Try Hook Machine
          </button>
        </Link>
      </div>

      {/* Hook examples */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {meta.hooks.length} Proven {meta.label} Hooks
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Copy the template, fill in your product details, then paste into the Hook Machine for personalised variants.
        </p>

        <div className="space-y-4">
          {meta.hooks.map((hook, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-pink-200 transition-colors">
              {/* Title row */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{hook.title}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${patternBadge(hook.pattern)}`}>
                    {hook.pattern}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="h-3 w-3 text-pink-400" />
                  <span className={`font-bold ${scoreColor(hook.score)}`}>{hook.score}</span>
                  <span className="text-gray-400">scroll-stop score</span>
                </div>
              </div>

              {/* Template */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Template</p>
                <p className="text-sm text-gray-700 font-mono leading-relaxed">{hook.template}</p>
              </div>

              {/* Example */}
              <div className="bg-pink-50 rounded-lg p-3 mb-3">
                <p className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider mb-1">Example</p>
                <p className="text-sm text-pink-800 italic leading-relaxed">&ldquo;{hook.example}&rdquo;</p>
              </div>

              {/* CTA */}
              <div className="flex justify-end">
                <Link href="/hooks">
                  <button className="flex items-center gap-1.5 text-xs text-pink-500 hover:text-pink-600 font-medium transition-colors">
                    <Zap className="h-3 w-3" />
                    Rewrite for my product
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Related niches */}
      <section className="mt-12 pt-8 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          More Hook Libraries
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(NICHE_DATA)
            .filter(([key]) => key !== niche)
            .map(([key, n]) => (
              <Link key={key} href={`/hooks/${key}`}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-pink-300 hover:text-pink-600 transition-colors bg-white">
                  {n.emoji} {n.label}
                </span>
              </Link>
            ))}
        </div>
      </section>

    </div>
  )
}
