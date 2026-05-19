import { Suspense } from 'react'
import { AIScriptGenerator } from './AIScriptGenerator'
import { ScriptHistory } from './ScriptHistory'

export const metadata = { title: 'AI Script Generator · TTLike' }

interface Props { searchParams: Promise<{ tab?: string }> }

export default async function AIScriptsPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const activeTab = tab === 'history' ? 'history' : 'generate'

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Script Generator</h1>
        <p className="text-gray-600">Generate 5 TikTok UGC script variations in seconds using AI</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <a
          href="/dashboard/ai-scripts"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'generate'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✨ Generate
        </a>
        <a
          href="/dashboard/ai-scripts?tab=history"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 History
        </a>
      </div>

      {activeTab === 'generate' ? (
        <Suspense fallback={<div className="animate-pulse bg-white rounded-2xl h-96 border border-gray-100" />}>
          <AIScriptGenerator />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="animate-pulse bg-white rounded-2xl h-64 border border-gray-100" />}>
          <ScriptHistory />
        </Suspense>
      )}
    </div>
  )
}
