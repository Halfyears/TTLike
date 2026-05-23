'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Heart, Loader2, ExternalLink, Zap } from 'lucide-react'

interface Comment {
  text:   string
  likes:  number
  author: string
}

export function CommentsPanel({ productId, videoUrl }: { productId: string; videoUrl?: string | null }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [empty,    setEmpty]    = useState(false)
  const [filtered, setFiltered] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${productId}/comments`)
      .then(r => r.json())
      .then(data => {
        const list: Comment[] = data.comments ?? []
        setComments(list)
        setFiltered(Boolean(data.filtered))
        setEmpty(list.length === 0)
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false))
  }, [productId])

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {filtered ? 'Buyer Signals' : 'Featured Comments'}
          </h3>
          {filtered && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-mono uppercase tracking-wide">
              <Zap className="h-2.5 w-2.5" /> AI Filtered
            </span>
          )}
        </div>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-pink-500 transition-colors"
          >
            All comments <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : empty ? (
        <p className="text-xs text-gray-400 text-center py-4">
          No comments available yet.{' '}
          {videoUrl && (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">
              View on TikTok
            </a>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-pink-500">
                  {c.author ? c.author[0]?.toUpperCase() : '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {c.author && (
                  <span className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                    @{c.author}
                  </span>
                )}
                <p className="text-xs text-gray-700 leading-relaxed">{c.text}</p>
                {c.likes > 0 && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                    <Heart className="h-2.5 w-2.5" /> {c.likes.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filtered && (
            <p className="text-[10px] text-gray-400 text-center pt-1 font-mono">
              ⚡ Filtered by buyer-intent keyword signals
            </p>
          )}
        </div>
      )}
    </div>
  )
}
