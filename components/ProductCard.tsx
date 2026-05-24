'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Heart, Share2, Play, ExternalLink } from 'lucide-react'
import { ViralScoreBadge }  from '@/components/ui/ViralScoreBadge'
import { Badge }            from '@/components/ui/Badge'
import { formatNumber }     from '@/lib/utils'
import { isTikTokUrlExpired } from '@/lib/tiktokImg'

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
  // Strip hashtags so card title shows only product name / type
  const displayName = productName.replace(/#[\w一-龥＀-￯]+\s*/g, '').trim() || productName

  // Prefer permanent Supabase Storage URL; fall back to TikTok CDN only if not expired
  const activeCover = coverStorageUrl
    ?? (thumbnailUrl && !isTikTokUrlExpired(thumbnailUrl) ? thumbnailUrl : null)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Thumbnail — clicking goes to internal detail page */}
      <Link href={`/products/${id}`} className="relative h-52 w-full bg-gray-100 overflow-hidden block group">
        {activeCover && !imgFailed ? (
          <img
            src={activeCover}
            alt={productName.slice(0, 80)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
            <Play className="h-10 w-10 text-pink-300" />
          </div>
        )}

        {/* Viral score badge overlay */}
        <div className="absolute top-2 left-2">
          <ViralScoreBadge score={viralScore} showLabel={false} />
        </div>

        {/* External TikTok icon — stopPropagation so it doesn't navigate internally */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Watch on TikTok"
            className="absolute bottom-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      </Link>

      {/* Card body */}
      <div className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 flex-1">
        <div className="flex items-center justify-between">
          <Badge>{niche}</Badge>
        </div>

        <Link href={`/products/${id}`}>
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug hover:text-pink-600 transition-colors line-clamp-2">
            {displayName}
          </h3>
        </Link>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {formatNumber(likeCount)}
          </span>
          {shareCount !== undefined && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              {formatNumber(shareCount)}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400">{authorHandle}</p>
      </div>
    </div>
  )
}
