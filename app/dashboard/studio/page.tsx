import { Suspense } from 'react'
import { Clapperboard } from 'lucide-react'
import { StudioGenerator } from './StudioGenerator'
import { StudioHistory } from './StudioHistory'

export const metadata = { title: 'Studio · TTLike' }

export default function StudioPage() {
  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
          <Clapperboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Studio</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            One-shot script → characters + image prompts + video prompts
          </p>
        </div>
      </div>

      {/* Generator */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">New Storyboard</h2>
        <Suspense>
          <StudioGenerator />
        </Suspense>
      </section>

      {/* History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Dramas</h2>
        <Suspense>
          <StudioHistory />
        </Suspense>
      </section>
    </div>
  )
}
