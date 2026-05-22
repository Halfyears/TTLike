import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/Badge'
import { LocalDate } from '@/components/ui/LocalDate'
import Link from 'next/link'

export const metadata = { title: 'Blog · Admin · TTLike' }

export default async function AdminBlogPage() {
  let posts: Array<{ id: string; title: string; slug: string; status: string; category: string | null; viewCount: number; publishedAt: Date | null }> = []
  try {
    posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, slug: true, status: true, category: true, viewCount: true, publishedAt: true },
    })
  } catch {
    // DB not connected
  }

  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default',
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Blog Management</h1>
          <p className="text-gray-400 text-sm">{posts.length} posts</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No blog posts found. Connect your database to manage blog content.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {['Title', 'Category', 'Status', 'Views', 'Published'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/blog/${post.slug}`} className="text-sm text-blue-400 hover:text-blue-300 max-w-xs truncate block">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{post.category ?? '—'}</td>
                  <td className="px-4 py-3"><Badge variant={statusColors[post.status]}>{post.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-300">{post.viewCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-400"><LocalDate date={post.publishedAt?.toISOString()} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
