import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/Badge'
import { ViralScoreBadge } from '@/components/ui/ViralScoreBadge'
import { formatNumber } from '@/lib/utils'

export const metadata = { title: 'Videos · Admin · TTLike' }

export default async function AdminVideosPage() {
  let videos: Array<{ id: string; title: string; authorHandle: string; niche: string | null; viralScore: number; viewCount: bigint }> = []
  try {
    videos = await prisma.tiktokVideo.findMany({
      orderBy: { viralScore: 'desc' },
      take: 100,
    })
  } catch {
    // DB not connected
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Video Database</h1>
        <p className="text-gray-400 text-sm">{videos.length} videos tracked</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {videos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No videos found. Import video data to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {['Title', 'Author', 'Niche', 'Views', 'Score'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {videos.map(video => (
                <tr key={video.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-sm text-white max-w-xs truncate">{video.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{video.authorHandle}</td>
                  <td className="px-4 py-3"><Badge>{video.niche ?? 'General'}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatNumber(video.viewCount)}</td>
                  <td className="px-4 py-3"><ViralScoreBadge score={video.viralScore} showLabel={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
