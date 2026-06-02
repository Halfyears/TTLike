'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Heart, Share2, Play, ExternalLink } from 'lucide-react'
import { ViralScoreBadge }  from '@/components/ui/ViralScoreBadge'
import { Badge }            from '@/components/ui/Badge'
import { formatNumber }     from '@/lib/utils'
import { isTikTokUrlExpired } from '@/lib/tiktokImg'
// NOTE: isTikTokUrlExpired is still used for admin/breakdown pages (non-user-facing).
// ProductCard intentionally attempts the URL regardless — onError handles actual 403s.

interface ProductCardProps {
  id: string
  productName: string
  niche: string
  viralScore: number
  viewCount: number
  likeCount: number
  shareCount?: number
  authorHandle: string
  thumbnailUrl?: string | null       // TikTok CDN URL (may expire)
  coverStorageUrl?: string | null    // Supabase Storage URL (permanent, preferred)
  videoUrl?: string | null
}

export function ProductCard({
  id,
  productName,
  niche,
  viralScore,
  viewCount,
  likeCount,
  shareCount,
  authorHandle,
  thumbnailUrl,
  coverStorageUrl,
  videoUrl,
}: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const displayName = productName.replace(/#[\w一-龥＀-￯]+\s*/g, '').trim() || productName
  const activeCover = coverStorageUrl ?? thumbnailUrl ?? null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/*
        Mobile  (< sm): horizontal card — thumbnail left (fixed w), content right
        Desktop (sm+) : vertical card  — thumbnail top (full w), content below
      */}
      <div className="flex sm:flex-col">

        {/* ── Thumbnail ── */}
        <Link
          href={`/products/${id}`}
          className="relative shrink-0 w-[116px] sm:w-full bg-gray-100 overflow-hidden block group"
        >
          {/* Fixed square on mobile; fixed height on sm+ */}
          <div className="h-[116px] sm:h-52 relative">
            {activeCover && !imgFailed ? (
              <img
                src={activeCover}
                alt={productName.slice(0, 80)}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
                <Play className="h-8 w-8 text-pink-300" />
              </div>
            )}

            {/* Viral score badge */}
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
              <ViralScoreBadge score={viralScore} showLabel={false} />
            </div>

            {/* TikTok external link */}
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="Watch on TikTok"
                className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </a>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
          </div>
        </Link>

        {/* ── Card body ── */}
        <div className="flex-1 p-2.5 sm:p-4 flex flex-col gap-1 sm:gap-2 min-w-0">
          <Badge>{niche}</Badge>

          <Link href={`/products/${id}`}>
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug hover:text-pink-600 transition-colors line-clamp-3 sm:line-clamp-2">
              {displayName}
            </h3>
          </Link>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-gray-500 mt-auto">
            <span className="flex items-center gap-1 shrink-0">
              <Eye className="h-3 w-3" />
              {formatNumber(viewCount)}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Heart className="h-3 w-3" />
              {formatNumber(likeCount)}
            </span>
            {shareCount !== undefined && (
              <span className="flex items-center gap-1 shrink-0">
                <Share2 className="h-3 w-3" />
                {formatNumber(shareCount)}
              </span>
            )}
          </div>

          <p className="text-[11px] sm:text-xs text-gray-400 truncate">{authorHandle}</p>
        </div>

      </div>
    </div>
  )
}
