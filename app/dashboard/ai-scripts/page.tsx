import { AIScriptGenerator } from './AIScriptGenerator'

export const metadata = { title: 'AI Script Generator · TTLike' }

export default function AIScriptsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Script Generator</h1>
        <p className="text-gray-600">Generate 5 TikTok UGC script variations in seconds using Claude AI</p>
      </div>
      <AIScriptGenerator />
    </div>
  )
}
