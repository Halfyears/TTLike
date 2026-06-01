import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'
import HooksClient from './HooksClient'

export const metadata: Metadata = {
  title:       'AI Hook Generator · TTLike',
  description: 'Generate scroll-stopping TikTok hooks in seconds. Free AI-powered hook machine for dropshippers and UGC creators — 8 proven hook types, viral score analysis.',
  alternates:  { canonical: `${SITE_URL}/hooks` },
}

export default function HooksPage() {
  return <HooksClient />
}
