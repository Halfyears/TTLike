import { createServiceClient } from '@/lib/supabase/server'
import { Zap, TrendingUp, BarChart2, Database } from 'lucide-react'
import type { VideoBreakdownPayload, ViralPipeline } from '@/lib/types/intelligence'
import { BatchTrigger } from './BatchTrigger'
import { ViralPipelineLauncher } from './ViralPipelineLauncher'
import { PipelineResultsTable, type PipelineRow } from '@/components/admin/PipelineResultsTable'
import { BreakdownsTable, type BreakdownRow } from '@/components/admin/BreakdownsTable'

export const dynamic = 'force-dynamic'

type RowType = 'v25' | 'health' | 'legacy'

function getRowType(payload: VideoBreakdownPayload): RowType {
  if (payload?.viral_formulas?.length) return 'v25'
  if (payload?.health_report)          return 'health'
  return 'legacy'
}

export default async function BreakdownsAdminPage() {
  const service = createServiceClient()

  const { data: rows, error } = await service
    .from('video_breakdowns')
    .select('id, url_hash, video_id, seo_slug, payload, created_at, user_id, tiktok_videos!left(id, title, product_name, niche, cover_url, views, viral_score)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return <div className="p-6 text-red-400 text-sm">Failed to load breakdowns: {error.message}</div>
  }

  const breakdowns = (rows ?? []) as unknown as BreakdownRow[]

  // ── User lookup for User column ─────────────────────────────────────────────
  const uniqueUserIds = [...new Set(breakdowns.map(b => b.user_id).filter(Boolean))] as string[]
  const { data: userRows } = uniqueUserIds.length > 0
    ? await service.from('users').select('id, email, name').in('id', uniqueUserIds)
    : { data: [] }
  const userMap: Record<string, { email: string; name: string | null }> = Object.fromEntries(
    (userRows ?? []).map((u: { id: string; email: string; name: string | null }) => [u.id, { email: u.email, name: u.name }])
  )

  const total       = breakdowns.length
  const weekAgo     = Date.now() - 7 * 86_400_000
  const thisWeek    = breakdowns.filter(b => new Date(b.created_at).getTime() > weekAgo).length
  const v25Count    = breakdowns.filter(b => getRowType(b.payload) === 'v25').length
  const healthCount = breakdowns.filter(b => getRowType(b.payload) === 'health').length

  // Build pipeline rows for the dedicated table
  const pipelineRows: PipelineRow[] = breakdowns
    .filter(b => !!(b.payload as VideoBreakdownPayload & { viral_pipeline?: ViralPipeline })?.viral_pipeline)
    .map(b => ({
      id:           b.id,
      video_id:     b.video_id,
      created_at:   b.created_at,
      pipeline:     (b.payload as VideoBreakdownPayload & { viral_pipeline: ViralPipeline }).viral_pipeline,
      tiktok_videos: b.tiktok_videos,
    }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-pink-400" /> AI Breakdowns
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Gemini-generated creative workbooks · SEO page auto-generated per entry
        </p>
      </div>

      {/* Batch generator */}
      <BatchTrigger />

      {/* Viral Pipeline launcher */}
      <ViralPipelineLauncher />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Database,   label: 'Total',          value: String(total),       sub: 'all cached entries' },
          { icon: TrendingUp, label: 'This Week',       value: String(thisWeek),    sub: 'new this week' },
          { icon: BarChart2,  label: 'V2.5 Engine',    value: String(v25Count),    sub: 'inspiration engine' },
          { icon: Zap,        label: 'Health Reports', value: String(healthCount), sub: 'forensic audits' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-pink-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-black text-white truncate">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Pipeline Results — client component with filters + pagination + actions */}
      {pipelineRows.length > 0 && (
        <PipelineResultsTable rows={pipelineRows} />
      )}

      {/* All Breakdowns — client component with filters + pagination + delete */}
      <BreakdownsTable rows={breakdowns} userMap={userMap} />

    </div>
  )
}
