/**
 * GET /api/og/hook?score=88&pattern=Shock+Reversal&hook=Stop+using+luxury...&v1=...&v2=...&v3=...&v4=...
 *
 * Generates a 1200×630 PNG share card for a Hook Machine result.
 * Used by ActionableHookCard's "Share Card" button.
 *
 * Query params (all optional with defaults):
 *   score   — 0-100 integer
 *   pattern — primary hook pattern label
 *   hook    — original hook text (truncated)
 *   v1..v4  — variant texts (up to 4)
 */

import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

function scoreColor(score: number) {
  if (score >= 75) return '#34d399'  // emerald-400
  if (score >= 50) return '#fbbf24'  // amber-400
  return '#f87171'                   // red-400
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const score   = Math.min(100, Math.max(0, parseInt(searchParams.get('score') ?? '0', 10)))
  const pattern = searchParams.get('pattern') ?? 'Hook Machine'
  const hook    = (searchParams.get('hook') ?? '').slice(0, 120)
  const variants = [
    searchParams.get('v1'), searchParams.get('v2'),
    searchParams.get('v3'), searchParams.get('v4'),
  // 40 chars each keeps total URL well under 2 KB (safe for CDN/proxy layers)
  ].filter(Boolean).map(v => v!.slice(0, 40)) as string[]

  const accent = scoreColor(score)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
          background: 'linear-gradient(90deg, #ec4899, #6366f1, #ec4899)',
        }} />

        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.4)',
              borderRadius: '8px', padding: '6px 12px',
              fontSize: '14px', fontWeight: 700, color: '#f9a8d4',
              letterSpacing: '0.05em',
            }}>
              ⚡ TTLike Hook Machine
            </div>
          </div>

          {/* Score circle */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(15,23,42,0.8)', border: `2px solid ${accent}`,
            borderRadius: '16px', padding: '12px 24px',
          }}>
            <span style={{ fontSize: '52px', fontWeight: 900, color: accent, lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.12em', marginTop: '4px' }}>
              SCROLL-STOP SCORE
            </span>
          </div>
        </div>

        {/* Original hook */}
        {hook && (
          <div style={{
            background: 'rgba(30,27,75,0.6)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '11px', color: '#6366f1', letterSpacing: '0.1em', marginBottom: '6px' }}>
              ORIGINAL HOOK
            </div>
            <div style={{ fontSize: '18px', color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.4 }}>
              &ldquo;{hook}&rdquo;
            </div>
          </div>
        )}

        {/* Pattern badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '12px', fontWeight: 600, color: '#a5b4fc',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '6px', padding: '4px 10px',
          }}>
            🧠 {pattern}
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>→ {variants.length} anti-duplication variants</div>
        </div>

        {/* Variants grid */}
        {variants.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1,
          }}>
            {variants.slice(0, 4).map((v, i) => (
              <div key={i} style={{
                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.5)',
                borderRadius: '10px', padding: '10px 14px',
                fontSize: '14px', color: '#cbd5e1',
                lineHeight: 1.4,
                flex: '1 1 45%',
                maxWidth: '48%',
              }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, marginRight: '6px' }}>
                  {i + 1}.
                </span>
                &ldquo;{v}&rdquo;
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: '13px', color: '#475569' }}>ttlike.com/hooks</div>
          <div style={{ fontSize: '11px', color: '#334155' }}>Free at TTLike — Try yours now</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
