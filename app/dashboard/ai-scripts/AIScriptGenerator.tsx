'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { ScriptCard } from '@/components/ScriptCard'
import { HOOK_TYPES, NICHES } from '@/lib/constants'
import { Zap, Sparkles, RefreshCw, Plus, X } from 'lucide-react'

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
  const [niches, setNiches] = useState<string[]>([])
  const [nicheOptions, setNicheOptions] = useState<string[]>([])
  const [customNiches, setCustomNiches] = useState<string[]>([])
  const [customNicheInput, setCustomNicheInput] = useState('')
  const [hookTypes, setHookTypes] = useState<string[]>(['SURPRISE'])
  const [keywords, setKeywords] = useState('')
  const [brandName, setBrandName] = useState('')
  const [offer, setOffer] = useState('')
  const [ctaType, setCtaType] = useState('bio')
  const [sourceVideoId, setSourceVideoId] = useState('')

  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)

  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const hasAutoFilled = useRef(false)

  // ── Parse URL params ──────────────────────────────────────────────────────
  useEffect(() => {
    const title = searchParams.get('suggested_title') ?? searchParams.get('product')
    const kw = searchParams.get('keywords')
    const n = searchParams.get('niche')
    const vid = searchParams.get('from_video')
    if (title) setProductName(title)
    if (kw) setKeywords(kw)
    if (n) setNiches([n])
    if (vid) setSourceVideoId(vid)
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
      // Pre-select AI-suggested niches (best match + options, max 3)
      if (data.nicheOptions?.length) {
        setNicheOptions(data.nicheOptions)
        setNiches(data.nicheOptions.slice(0, 1))   // pre-select top suggestion
      } else if (data.niche) {
        setNiches([data.niche])
      }
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
          niches,
          hookTypes,
          keywords: keywords || undefined,
          brandName: brandName || undefined,
          offer: offer || undefined,
          ctaType,
          sourceVideoId: sourceVideoId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate scripts')
      setScripts(data.scripts)
      setFromCache(!!data.fromCache)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [productName, productDescription, targetAudience, niches, hookTypes, keywords, brandName, offer, ctaType, sourceVideoId])

  // Add a custom niche, auto-select it
  function addCustomNiche() {
    const val = customNicheInput.trim()
    if (!val) return
    setCustomNiches(prev => prev.includes(val) ? prev : [...prev, val])
    setNiches(prev => prev.includes(val) ? prev : [...prev, val])
    setCustomNicheInput('')
  }

  // All known niche options: AI suggestions first, then custom, then presets, de-duped
  const allNicheOptions = Array.from(new Set([
    ...nicheOptions,
    ...customNiches,
    ...niches.filter(n => !NICHES.includes(n)),  // any DB-sourced values
    ...NICHES,
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

            {/* ── Niche — multi-select chips ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Niche
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-500 bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  {suggesting && (
                    <span className="flex items-center gap-1 text-xs text-pink-500 animate-pulse">
                      <Sparkles className="h-3 w-3" /> AI suggesting…
                    </span>
                  )}
                  {niches.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {niches.length} selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allNicheOptions.map(opt => {
                  const selected = niches.includes(opt)
                  const isAiSuggested = nicheOptions.includes(opt)
                  const isCustom = customNiches.includes(opt)
                  return (
                    <span key={opt} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (selected) {
                            if (niches.length > 1) setNiches(niches.filter(n => n !== opt))
                          } else {
                            setNiches([...niches, opt])
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isCustom ? 'rounded-r-none border-r-0' : ''
                        } ${
                          selected
                            ? 'bg-pink-500 text-white border-pink-500'
                            : isAiSuggested
                              ? 'bg-pink-50 text-pink-700 border-pink-300 hover:bg-pink-100'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600'
                        }`}
                      >
                        {isAiSuggested && !selected && <span className="mr-1">✦</span>}
                        {opt}
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          title="Remove custom niche"
                          onClick={() => {
                            setCustomNiches(customNiches.filter(n => n !== opt))
                            setNiches(niches.filter(n => n !== opt))
                          }}
                          className={`px-1.5 py-1 rounded-r-full text-xs border border-l-0 transition-colors ${
                            selected
                              ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600'
                              : 'bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-300'
                          }`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
              {/* Custom niche input */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex flex-1 items-center rounded-lg border border-dashed border-gray-300 focus-within:border-pink-400 focus-within:ring-1 focus-within:ring-pink-400 overflow-hidden bg-white transition-colors">
                  <input
                    type="text"
                    value={customNicheInput}
                    onChange={e => setCustomNicheInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomNiche() } }}
                    placeholder="Add custom niche…"
                    maxLength={60}
                    className="flex-1 px-3 py-1.5 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomNiche}
                    disabled={!customNicheInput.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-pink-500 hover:text-white hover:bg-pink-500 border-l border-dashed border-gray-300 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Select one or more · <span className="text-pink-400">✦ AI suggested</span> · type to add custom
              </p>
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
                  onClick={() => fetchSuggestions(productName, niches[0] ?? '', keywords)}
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

            {/* ── Hook Style — multi-select, max 5 ── */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Hook Style</label>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  hookTypes.length === 5
                    ? 'bg-pink-100 text-pink-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {hookTypes.length} / 5 selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HOOK_TYPES.map(hook => {
                  const selected = hookTypes.includes(hook.value)
                  const maxed = hookTypes.length >= 5 && !selected
                  return (
                    <button
                      key={hook.value} type="button"
                      disabled={maxed}
                      onClick={() => {
                        if (selected) {
                          // Deselect — keep at least 1
                          if (hookTypes.length > 1) setHookTypes(hookTypes.filter(h => h !== hook.value))
                        } else {
                          setHookTypes([...hookTypes, hook.value])
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors relative ${
                        selected
                          ? 'bg-pink-500 text-white border-pink-500'
                          : maxed
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      {selected && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-white border border-pink-300 text-pink-500 text-[9px] font-black flex items-center justify-center leading-none">
                          {hookTypes.indexOf(hook.value) + 1}
                        </span>
                      )}
                      {hook.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400">
                Select 1–5 styles · one script generated per style
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              {loading
                ? `Generating ${hookTypes.length} Script${hookTypes.length > 1 ? 's' : ''}…`
                : `Generate ${hookTypes.length} Script${hookTypes.length > 1 ? 's' : ''} with AI`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {scripts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">Generated Scripts</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">{scripts.length}</span>
            {fromCache && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                ⚡ Instant — served from shared cache
              </span>
            )}
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
