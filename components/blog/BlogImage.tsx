'use client'

/**
 * BlogImage
 *
 * Resilient image component for blog covers and article headers.
 * When the src URL fails to load (expired TikTok CDN URL, 404, etc.),
 * automatically falls back to a category-coloured gradient placeholder
 * that still looks polished.
 *
 * Usage:
 *   <BlogImage src={post.cover_image} alt={post.title} category={post.category} className="..." />
 */

import { useState } from 'react'

interface BlogImageProps {
  src:        string | null | undefined
  alt:        string
  category?:  string | null
  className?: string
  /** Extra classes applied only to the fallback div */
  fallbackClassName?: string
}

// Category → gradient + text colour mapping
const CATEGORY_STYLES: Record<string, { gradient: string; text: string; badge: string }> = {
  Research:  { gradient: 'from-blue-500  via-indigo-500  to-violet-500', text: 'text-blue-100',  badge: 'bg-blue-400/30  text-blue-100'  },
  Strategy:  { gradient: 'from-emerald-500 via-teal-500  to-cyan-500',  text: 'text-emerald-100', badge: 'bg-emerald-400/30 text-emerald-100' },
  Guide:     { gradient: 'from-amber-500  via-orange-500 to-red-400',   text: 'text-amber-100',  badge: 'bg-amber-400/30  text-amber-100'  },
  AI:        { gradient: 'from-pink-500   via-violet-500 to-indigo-500',text: 'text-pink-100',   badge: 'bg-pink-400/30   text-pink-100'   },
}
const DEFAULT_STYLE = { gradient: 'from-pink-500 via-violet-500 to-indigo-500', text: 'text-white', badge: 'bg-white/20 text-white' }

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function BlogImage({ src, alt, category, className = '', fallbackClassName = '' }: BlogImageProps) {
  const [failed, setFailed] = useState(false)

  const style = CATEGORY_STYLES[category ?? ''] ?? DEFAULT_STYLE
  const showFallback = !src || failed

  if (showFallback) {
    return (
      <div
        className={`bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center gap-3 ${className} ${fallbackClassName}`}
        aria-label={alt}
      >
        {/* Initials circle */}
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <span className={`text-xl font-bold ${style.text}`}>{getInitials(alt)}</span>
        </div>
        {/* Category badge */}
        {category && (
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${style.badge}`}>
            {category}
          </span>
        )}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
