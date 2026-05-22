'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clapperboard, Clock, Film, Trash2, AlertTriangle, X, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { timeAgo } from '@/lib/dateUtils'
import type { DramaListItem } from '@/lib/studio/types'

const STATUS_STYLE: Record<string, string> = {
  COMPLETED:  'text-green-600 bg-green-50 border-green-200',
  FAILED:     'text-red-500 bg-red-50 border-red-200',
  PROCESSING: 'text-amber-500 bg-amber-50 border-amber-200',
  PENDING:    'text-gray-400 bg-gray-50 border-gray-200',
}

function DeleteModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm">Delete this drama?</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              &ldquo;{title}&rdquo; and all its storyboards will be permanently deleted.
            </p>
          </div>
          <button onClick={onCancel} className="shrink-0 text-gray-300 hover:text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} disabled={deleting}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function StudioHistory() {
  const [items,      setItems]      = useState<DramaListItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [deleteId,   setDeleteId]   = useState<number | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => {
    fetch('/api/studio/dramas')
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setItems(data) : setItems([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/studio/dramas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id))
        setDeleteId(null)
      }
    } finally { setDeleting(false) }
  }

  const target = items.find(i => i.id === deleteId)

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
      ))}
    </div>
  )

  if (items.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Clapperboard className="h-10 w-10 mx-auto mb-3 text-gray-200" />
      <p className="text-sm font-medium">No dramas yet</p>
      <p className="text-xs mt-1">Generated storyboards appear here automatically</p>
    </div>
  )

  return (
    <>
      {deleteId !== null && target && (
        <DeleteModal
          title={target.title}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          deleting={deleting}
        />
      )}
      <div className="space-y-3">
        {items.map(item => (
          <Card key={item.id}>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                  <Clapperboard className="h-4 w-4 text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.created_at)}</span>
                    {item.scene_count > 0 && (
                      <span className="flex items-center gap-1"><Film className="h-3 w-3" />{item.scene_count} scenes</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${STATUS_STYLE[item.status] ?? STATUS_STYLE.PENDING}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {item.status === 'COMPLETED' && (
                    <Link
                      href={`/dashboard/studio/${item.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-pink-500 hover:bg-pink-50 transition-colors"
                    >
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
