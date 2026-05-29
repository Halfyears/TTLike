'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { LocalDate } from '@/components/ui/LocalDate'
import {
  Pencil, Trash2, Plus, Loader2, CheckCircle, X,
  Zap, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'

interface BlogPost {
  id:          string
  title:       string
  slug:        string
  status:      string
  category:    string | null
  viewCount:   number
  publishedAt: string | null   // ISO string (Date is serialized to string by Next.js)
  excerpt:     string | null
  tags:        string[]
  authorName:  string
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default',
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  post: BlogPost
  onClose: () => void
  onSaved: (updated: BlogPost) => void
}

function EditModal({ post, onClose, onSaved }: EditModalProps) {
  const [title,    setTitle]    = useState(post.title)
  const [slug,     setSlug]     = useState(post.slug)
  const [excerpt,  setExcerpt]  = useState(post.excerpt ?? '')
  const [category, setCategory] = useState(post.category ?? '')
  const [status,   setStatus]   = useState(post.status)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function save() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, slug, excerpt, category, status }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Save failed'); return }
      onSaved({ ...post, title, slug, excerpt, category: category || null, status })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Edit Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Slug</label>
            <input
              value={slug} onChange={e => setSlug(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Excerpt</label>
            <textarea
              value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <select
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">— None —</option>
                {['Strategy','Research','Guide','AI'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {['DRAFT','PUBLISHED','ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2">Cancel</button>
          <button
            onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Post Modal ─────────────────────────────────────────────────────────────

interface NewPostModalProps {
  onClose: () => void
  onCreated: (post: BlogPost) => void
}

function NewPostModal({ onClose, onCreated }: NewPostModalProps) {
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('Guide')
  const [status,  setStatus]  = useState('DRAFT')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function autoSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
  }

  async function create() {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/blog', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, slug: autoSlug(title), content, excerpt, category, status }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Create failed'); return }
      onCreated(json.post as BlogPost)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h3 className="text-white font-semibold">New Blog Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title…"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {['Strategy','Research','Guide','AI'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {['DRAFT','PUBLISHED','ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Excerpt</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2}
              placeholder="Short summary…"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Content * (Markdown)</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={12}
              placeholder="## Introduction&#10;&#10;Write your post here…"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2">Cancel</button>
          <button onClick={create} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Batch Generate Panel ──────────────────────────────────────────────────────

interface BatchResult {
  topic:     string
  ok:        boolean
  id?:       string
  slug?:     string
  title?:    string
  provider?: string
  error?:    string
}

interface BatchPanelProps {
  onGenerated: (posts: BlogPost[]) => void
}

function BatchGeneratePanel({ onGenerated }: BatchPanelProps) {
  const [open,    setOpen]    = useState(false)
  const [topics,  setTopics]  = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])

  async function generate() {
    const list = topics.split('\n').map(t => t.trim()).filter(Boolean)
    if (list.length === 0) return
    if (list.length > 10) { alert('Max 10 topics per batch'); return }

    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/admin/blog/batch-generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topics: list }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Batch generation failed'); return }
      setResults(json.results as BatchResult[])
      // Reload page to show new posts
      const successful = (json.results as BatchResult[]).filter(r => r.ok)
      if (successful.length > 0) {
        // Fetch fresh list
        const postsRes = await fetch('/api/admin/blog')
        if (postsRes.ok) {
          const postsJson = await postsRes.json()
          onGenerated(postsJson.posts as BlogPost[])
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">AI Batch Blog Generator</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 uppercase tracking-wide">
            Groq → Gemini → GitHub
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-700 p-5 space-y-4">
          <p className="text-xs text-gray-400">
            Enter one topic per line (max 10). Each topic generates a full blog post draft using the AI waterfall.
            Posts are saved as <span className="text-amber-300 font-mono">DRAFT</span> — review and publish from the table below.
          </p>
          <textarea
            value={topics}
            onChange={e => setTopics(e.target.value)}
            rows={6}
            placeholder={"TikTok hook formulas for beauty products\nHow to go viral on TikTok in 2024\nBest dropshipping products for TikTok Shop"}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading || !topics.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                : <><Zap className="h-3.5 w-3.5" /> Generate Drafts</>
              }
            </button>
            {loading && <span className="text-xs text-gray-500">This may take 30-90 seconds…</span>}
          </div>

          {results.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Results</p>
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${r.ok ? 'bg-emerald-900/20 text-emerald-300' : 'bg-red-900/20 text-red-300'}`}>
                  <span className="font-bold shrink-0">{r.ok ? '✓' : '✗'}</span>
                  <div className="min-w-0">
                    <span className="font-medium">{r.topic}</span>
                    {r.ok
                      ? <span className="text-gray-400 ml-2">→ &quot;{r.title}&quot; <span className="text-[10px] font-mono bg-gray-700 px-1 rounded">{r.provider}</span></span>
                      : <span className="text-red-400 ml-2">{r.error}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main BlogPostsClient ──────────────────────────────────────────────────────

export function BlogPostsClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts,         setPosts]         = useState(initialPosts)
  const [editPost,      setEditPost]      = useState<BlogPost | null>(null)
  const [showNew,       setShowNew]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<Record<string, boolean>>({})

  async function archivePost(id: string) {
    setDeleting(p => ({ ...p, [id]: true }))
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Soft-delete — update status to ARCHIVED in local state
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'ARCHIVED' } : p))
      } else {
        const json = await res.json()
        alert(`Archive failed: ${json.error ?? 'Unknown'}`)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Network error')
    } finally {
      setDeleting(p => ({ ...p, [id]: false }))
    }
  }

  return (
    <div className="space-y-4">

      {/* Batch Generator */}
      <BatchGeneratePanel onGenerated={setPosts} />

      {/* Blog Posts Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            📝 Blog Posts <span className="text-gray-500 font-normal normal-case">({posts.length})</span>
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all"
          >
            <Plus className="h-3 w-3" /> New Post
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No blog posts found. Use the AI batch generator above or create one manually.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {['Title', 'Category', 'Status', 'Views', 'Published', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {posts.map(post => {
                const isDel = deleting[post.id]
                const isConfirming = confirmDelete === post.id
                return (
                  <tr key={post.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-sm text-blue-400 hover:text-blue-300 truncate block max-w-[220px]"
                        >
                          {post.title}
                        </Link>
                        <Link href={`/blog/${post.slug}`} target="_blank" className="text-gray-600 hover:text-gray-400 shrink-0 mt-0.5">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono mt-0.5 truncate max-w-[220px]">{post.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{post.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[post.status] ?? 'default'}>{post.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{post.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      <LocalDate date={post.publishedAt} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => setEditPost(post)}
                          className="text-gray-500 hover:text-blue-400 transition-colors"
                          title="Edit post"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* Archive / Delete — two-step confirm */}
                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmDelete(post.id)}
                            disabled={isDel || post.status === 'ARCHIVED'}
                            className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30"
                            title={post.status === 'ARCHIVED' ? 'Already archived' : 'Archive post'}
                          >
                            {isDel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => archivePost(post.id)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white"
                            >
                              Archive
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[10px] text-gray-400 hover:text-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editPost && (
        <EditModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSaved={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
            setEditPost(null)
          }}
        />
      )}
      {showNew && (
        <NewPostModal
          onClose={() => setShowNew(false)}
          onCreated={post => {
            setPosts(prev => [post, ...prev])
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}
