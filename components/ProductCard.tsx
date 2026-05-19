'use client'

import Link from 'next/link'
import { Eye, Heart, Share2, Play, ExternalLink } from 'lucide-react'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { formatNumber } from '@/lib/utils'

interface ProductCardProps {
  id: string
  productName: string
  niche: string
  viralScore: number
  viewCount: number
  likeCount: number
  shareCount?: number
  authorHandle: string
  thumbnailUrl?: string | null
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
  videoUrl,
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] max-h-52 bg-gray-100 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
            <Play className="h-10 w-10 text-pink-300" />
          </div>
        )}

        {/* Viral score badge overlay */}
        <div className="absolute top-2 right-2">
          <ViralScoreBadge score={viralScore} showLabel={false} />
        </div>

        {/* Watch button overlay */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
          >
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-gray-900 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow">
              <ExternalLink className="h-3 w-3" /> Watch
            </span>
          </a>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 flex-1">
        <div className="flex items-center justify-between">
          <Badge>{niche}</Badge>
        </div>

        <Link href={`/products/${id}`}>
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug hover:text-pink-600 transition-colors line-clamp-2">
            {productName}
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

        {/* Watch button (always visible if no thumbnail hover) */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 transition-colors"
          >
            <Play className="h-3 w-3" /> Watch on TikTok
          </a>
        )}
      </div>
    </div>
  )
}
