'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { ScriptCard } from '@/components/ScriptCard'
import { HOOK_TYPES, NICHES } from '@/lib/constants'
import { Zap } from 'lucide-react'

interface Script {
  title: string
  hook: string
  body: string
  cta: string
  fullScript: string
}

export function AIScriptGenerator() {
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [niche, setNiche] = useState('')
  const [hookType, setHookType] = useState('SURPRISE')
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setScripts([])

    try {
      const res = await fetch('/api/ai/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, productDescription, targetAudience, niche, hookType }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate scripts')
      setScripts(data.scripts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="productName" label="Product Name" placeholder="e.g., Posture Corrector Pro"
                value={productName} onChange={e => setProductName(e.target.value)} required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Niche</label>
                <select
                  value={niche} onChange={e => setNiche(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                >
                  <option value="">Select niche...</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Product Description</label>
              <textarea
                value={productDescription} onChange={e => setProductDescription(e.target.value)}
                placeholder="Describe your product, its key benefits, and what problem it solves..."
                rows={3}
                required
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
            </div>

            <Input
              id="audience" label="Target Audience" placeholder="e.g., Office workers with back pain, 25-45 years old"
              value={targetAudience} onChange={e => setTargetAudience(e.target.value)} required
            />

            <div className="flex flex-col gap-1">
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
              <p className="text-xs text-gray-500 mt-1">
                {HOOK_TYPES.find(h => h.value === hookType)?.description}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              {loading ? 'Generating 5 Scripts...' : 'Generate 5 Scripts with Claude AI'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {scripts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Scripts ({scripts.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {scripts.map((script, i) => (
              <ScriptCard key={i} script={script} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
