import { Suspense } from 'react'
import { BarChart2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { UsageClient } from './UsageClient'

export const metadata = { title: 'Usage · TTLike' }

export default function UsagePage() {
  return (
    <div>
      {/* Back to Account — visible on mobile */}
      <Link
        href="/dashboard/account"
        className="md:hidden inline-flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Account
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-pink-50 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usage</h1>
          <p className="text-xs text-gray-500 mt-0.5">Your Viral Studio quota and analysis history</p>
        </div>
      </div>

      <Suspense>
        <UsageClient />
      </Suspense>
    </div>
  )
}
