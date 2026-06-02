import { Suspense } from 'react'
import { BarChart2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { UsageClient } from './UsageClient'

export const metadata = { title: 'Quota & History · TTLike' }

export default function UsagePage() {
  return (
    <div>
      {/* Back to Account — mobile only, 44px touch target */}
      <Link
        href="/dashboard/account"
        className="md:hidden inline-flex items-center gap-2 min-h-[44px] px-1 -mx-1 text-sm font-medium text-gray-500 hover:text-pink-500 transition-colors mb-2"
      >
        <ChevronLeft className="h-5 w-5 shrink-0" /> Account
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-pink-50 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quota & History</h1>
          <p className="text-xs text-gray-500 mt-0.5">Your Viral Studio quota and analysis history</p>
        </div>
      </div>

      <Suspense>
        <UsageClient />
      </Suspense>
    </div>
  )
}
