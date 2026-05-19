'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { ScriptCard } from '@/components/ScriptCard'
import { HOOK_TYPES, NICHES } from '@/lib/constants'
import { Zap, Sparkles, RefreshCw } from 'lucide-react'

interface Script {
  title: string
  hook: string
  body: string
  cta: string
  fullScript: string
}

interface Suggestions {
  description: string
  targetAudience: string
  niche: string
  nicheOptions?: string[]
}

const CTA_TYPES = [
  { value: 'bio', label: 'Link in Bio' },
  { value: 'comment', label: 'Comment Below' },
  { value: 'dm', label: 'DM for Info' },
  { value: 'shop', label: 'TikTok Shop' },
]

function FieldSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`bg-gray-100 rounded ${i === rows - 1 && rows > 1 ? 'w-3/4' : 'w-full'}`}
          style={{ height: 16 }} />
      ))}
    </div>
  )
}

export function AIScriptGenerator() {
  const searchParams = useSearchParams()

  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [niche, setNiche] = useState('')
  const [nicheOptions, setNicheOptions] = useState<string[]>([])
  const [hookType, setHookType] = useState('SURPRISE')
  const [keywords, setKeywords] = useState('')
  const [brandName, setBrandName] = useState('')
  const [offer, setOffer] = useState('')
  const [ctaType, setCtaType] = useState('bio')

  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const hasAutoFilled = useRef(false)

  // ── Parse URL params ──────────────────────────────────────────────────────
  useEffect(() => {
    const title = searchParams.get('suggested_title') ?? searchParams.get('product')
    const kw = searchParams.get('keywords')
    const n = searchParams.get('niche')
    if (title) setProductName(title)
    if (kw) setKeywords(kw)
    if (n) setNiche(n)
  }, [searchParams])

  // ── Auto-fetch suggestions when product name is known ─────────────────────
  const fetchSuggestions = useCallback(async (name: string, rawNiche: string, kw: string) => {
    if (!name.trim()) return
    setSuggesting(true)
    setSuggestError('')
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: name, rawNiche, keywords: kw }),
      })
      const data: Suggestions = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      if (data.description) setProductDescription(data.description)
      if (data.targetAudience) setTargetAudience(data.targetAudience)
      if (data.niche) setNiche(data.niche)
      if (data.nicheOptions) setNicheOptions(data.nicheOptions)
    } catch {
      setSuggestError('Could not auto-generate suggestions — fill in manually.')
    } finally {
      setSuggesting(false)
    }
  }, [])

  // Trigger once when arriving from a product page (URL has from_video or suggested_title)
  useEffect(() => {
    if (hasAutoFilled.current) return
    const title = searchParams.get('suggested_title') ?? searchParams.get('product')
    const kw = searchParams.get('keywords') ?? ''
    const n = searchParams.get('niche') ?? ''
    if (title) {
      hasAutoFilled.current = true
      fetchSuggestions(title, n, kw)
    }
  }, [searchParams, fetchSuggestions])

  // ── Generate scripts ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setScripts([])
    try {
      const res = await fetch('/api/ai/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          targetAudience,
          niche,
          hookType,
          keywords: keywords || undefined,
          brandName: brandName || undefined,
          offer: offer || undefined,
          ctaType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate scripts')
      setScripts(data.scripts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [productName, productDescription, targetAudience, niche, hookType, keywords, brandName, offer, ctaType])

  // All known niche options: preset + AI suggestions + current DB value
  const allNicheOptions = Array.from(new Set([
    ...NICHES,
    ...nicheOptions,
    ...(niche && !NICHES.includes(niche) ? [niche] : []),
  ]))

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleGenerate} className="space-y-5">

            {/* ── Row 1: Product Name ── */}
            <Input
              id="productName" label="Product Name"
              placeholder="e.g., Posture Corrector Pro"
              value={productName} onChange={e => setProductName(e.target.value)} required
            />

            {/* ── Niche — with AI suggestion chips ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Niche</label>
                {suggesting && (
                  <span className="flex items-center gap-1 text-xs text-pink-500 animate-pulse">
                    <Sparkles className="h-3 w-3" /> AI suggesting…
                  </span>
                )}
              </div>

              {/* Suggestion chips */}
              {nicheOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {nicheOptions.map(opt => (
                    <button
                      key={opt} type="button"
                      onClick={() => setNiche(opt)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        niche === opt
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <select
                value={niche} onChange={e => setNiche(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              >
                <option value="">Select niche…</option>
                {allNicheOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* ── Product Description — auto-filled + editable ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Product Description
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-500 bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => fetchSuggestions(productName, niche, keywords)}
                  disabled={suggesting || !productName}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${suggesting ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {suggesting ? (
                <div className="rounded-lg border border-gray-200 px-3 py-3 bg-gray-50 min-h-[80px] flex flex-col justify-center gap-2">
                  <FieldSkeleton rows={3} />
                </div>
              ) : (
                <textarea
                  value={productDescription}
                  onChange={e => setProductDescription(e.target.value)}
                  placeholder="Describe your product, its key benefits, and what problem it solves…"
                  rows={3}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                />
              )}
            </div>

            {/* ── Target Audience — auto-filled + editable ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Target Audience
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-500 bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              </label>

              {suggesting ? (
                <div className="rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50 h-10">
                  <FieldSkeleton rows={1} />
                </div>
              ) : (
                <input
                  type="text"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  placeholder="e.g., Office workers with back pain, aged 25–45"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              )}
            </div>

            {suggestError && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{suggestError}</p>
            )}

            {/* ── Keywords ── */}
            <Input
              id="keywords" label="Keywords / Video Title (optional)"
              placeholder="e.g., back pain, posture fix, #wellness"
              value={keywords} onChange={e => setKeywords(e.target.value)}
            />

            {/* ── Brand Name + Exclusive Offer ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="brandName" label="Brand Name (optional)"
                placeholder="e.g., PureComfort, AmazonFinds"
                value={brandName} onChange={e => setBrandName(e.target.value)}
              />
              <Input
                id="offer" label="Exclusive Offer (optional)"
                placeholder="e.g., 30% off with code TIKTOK30"
                value={offer} onChange={e => setOffer(e.target.value)}
              />
            </div>

            {/* ── CTA Type ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Call-to-Action Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CTA_TYPES.map(ct => (
                  <button
                    key={ct.value} type="button"
                    onClick={() => setCtaType(ct.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      ctaType === ct.value
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Hook Style ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Hook Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HOOK_TYPES.map(hook => (
                  <button
                    key={hook.value} type="button"
                    onClick={() => setHookType(hook.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      hookType === hook.value
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {hook.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {HOOK_TYPES.find(h => h.value === hookType)?.description}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              {loading ? 'Generating 5 Scripts…' : 'Generate 5 Scripts with AI'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {scripts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xl font-bold text-gray-900">Generated Scripts</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">{scripts.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {scripts.map((script, i) => (
              <ScriptCard key={i} script={script} index={i} brandName={brandName} offer={offer} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
