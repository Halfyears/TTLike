import { IS_BETA_PHASE } from '@/lib/constants'
import { Sparkles } from 'lucide-react'

export function BetaBanner() {
  if (!IS_BETA_PHASE) return null
  return (
    <div className="bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm text-center py-2 px-4">
      <Sparkles className="inline h-4 w-4 mr-1" />
      <strong>Beta Phase:</strong> All features are 100% free — no credit card required!
    </div>
  )
}
