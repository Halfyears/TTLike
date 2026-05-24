/**
 * generateBreakdownPdf
 *
 * Produces a self-contained, print-optimised HTML document for a video
 * breakdown. The HTML is served by /api/user/export-pdf and opened in a
 * new browser tab; the user's browser print dialog handles the final PDF step.
 *
 * White-label: no TTLike branding in the output — suitable for resellers.
 * Custom branding can be injected via `options.brandName`.
 */

import type { VideoBreakdownPayload } from '@/lib/types/intelligence'

export interface PdfOptions {
  /** Optional brand name shown in the PDF header (defaults to none) */
  brandName?:   string
  /** Product or video title */
  title?:       string
  /** Niche context */
  niche?:       string
  /** Viral score (0–100) */
  viralScore?:  number
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateBreakdownPdf(
  data:    VideoBreakdownPayload,
  options: PdfOptions = {},
): string {
  const { brandName = '', title = 'Video Breakdown', niche = '', viralScore } = options
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Viral Formulas section ──────────────────────────────────────────────────
  const formulasHtml = (data.viral_formulas ?? []).map((f, i) => `
    <div class="card">
      <div class="card-header">
        <span class="num">${i + 1}</span>
        <strong>${esc(f.title)}</strong>
        ${f.timestamp ? `<span class="badge mono">${esc(f.timestamp)}</span>` : ''}
      </div>
      <p class="script">${esc(f.example_script ?? '')}</p>
      <p class="mech">Why it works: ${esc(f.mechanism)}</p>
      <div class="your-version">
        <span class="label">Your version</span>
        <p>&ldquo;${esc(f.your_version)}&rdquo;</p>
      </div>
    </div>
  `).join('')

  // ── Visual Timeline section ─────────────────────────────────────────────────
  const PHASES = ['HOOK', 'DEMO', 'PROOF', 'CTA']
  const timelineHtml = (data.visual_timeline ?? []).map((scene, i) => `
    <div class="scene">
      <div class="scene-header">
        <span class="timecode">[${esc(scene.timecode)}]</span>
        <span class="phase phase-${PHASES[i]?.toLowerCase() ?? 'scene'}">${PHASES[i] ?? 'SCENE'}</span>
      </div>
      <div class="scene-body">
        <p><strong>VISUAL</strong> ${esc(scene.visual)}</p>
        <p><strong>SAY</strong> &ldquo;${esc(scene.audio)}&rdquo;</p>
        <p class="why">WHY: ${esc(scene.why_this_works)}</p>
      </div>
    </div>
  `).join('')

  // ── Metrics bar ────────────────────────────────────────────────────────────
  const metricsHtml = data.metrics ? `
    <div class="metrics">
      <span>👁 ${esc(data.metrics.views)} views</span>
      <span>♥ ${esc(data.metrics.likes)} likes</span>
      <span>↗ ${esc(data.metrics.shares)} shares</span>
      ${viralScore != null ? `<span>🔥 Viral Score: ${viralScore}</span>` : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: #111;
      background: #fff;
      padding: 32px 40px;
      max-width: 860px;
      margin: 0 auto;
    }

    @media print {
      body { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .card, .scene { break-inside: avoid; }
    }

    /* ── Header ── */
    .doc-header {
      border-bottom: 2px solid #111;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .doc-header h1 { font-size: 18px; font-weight: 700; }
    .doc-header .meta { font-size: 11px; color: #666; text-align: right; }
    .brand { font-size: 12px; font-weight: 600; color: #444; }

    /* ── Metrics ── */
    .metrics {
      display: flex;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
      color: #555;
      background: #f5f5f5;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 20px;
    }

    /* ── Section title ── */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #888;
      margin-bottom: 10px;
      margin-top: 24px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e5e5;
    }

    /* ── Formula cards ── */
    .card {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .card-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .num {
      font-weight: 700;
      color: #888;
      min-width: 18px;
    }
    .badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      background: #f0f0f0;
      color: #666;
    }
    .mono { font-family: monospace; }
    .script { color: #444; margin-bottom: 4px; }
    .mech { font-size: 11px; color: #888; font-style: italic; margin-bottom: 8px; }
    .your-version {
      background: #f0f4ff;
      border-left: 3px solid #4f6ef7;
      padding: 8px 10px;
      border-radius: 0 4px 4px 0;
    }
    .your-version .label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #4f6ef7;
      margin-bottom: 3px;
    }
    .your-version p { font-size: 13px; color: #2b3a9a; }

    /* ── Timeline scenes ── */
    .scene {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .scene-header {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fafafa;
      padding: 6px 12px;
      border-bottom: 1px solid #e5e5e5;
    }
    .timecode { font-weight: 700; font-family: monospace; font-size: 12px; color: #2a7a5b; }
    .phase {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .phase-hook  { background: #fee2e2; color: #b91c1c; }
    .phase-demo  { background: #dbeafe; color: #1d4ed8; }
    .phase-proof { background: #d1fae5; color: #065f46; }
    .phase-cta   { background: #fef3c7; color: #92400e; }
    .scene-body { padding: 10px 12px; }
    .scene-body p { margin-bottom: 4px; font-size: 12px; }
    .scene-body strong { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; margin-right: 6px; }
    .why { color: #888; font-style: italic; font-size: 11px; }

    /* ── Print button ── */
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 28px;
      padding: 10px 20px;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .print-btn:hover { background: #333; }
    .hint {
      margin-top: 8px;
      font-size: 11px;
      color: #888;
    }
  </style>
</head>
<body>

  <!-- Doc header -->
  <div class="doc-header">
    <div>
      ${brandName ? `<div class="brand">${esc(brandName)}</div>` : ''}
      <h1>${esc(title)}</h1>
      ${niche ? `<div style="font-size:12px;color:#666;margin-top:2px;">${esc(niche)}</div>` : ''}
    </div>
    <div class="meta">
      <div>Ad Reverse-Engineering Report</div>
      <div>${date}</div>
    </div>
  </div>

  <!-- Metrics -->
  ${metricsHtml}

  <!-- Viral Formulas -->
  ${formulasHtml ? `<div class="section-title">🎬 Viral Formulas</div>${formulasHtml}` : ''}

  <!-- Visual Timeline -->
  ${timelineHtml ? `<div class="section-title">⏱ Copy-Paste Script with Visual Notes</div>${timelineHtml}` : ''}

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="margin-top:32px;">
    <button class="print-btn" onclick="window.print()">
      🖨 Save as PDF
    </button>
    <p class="hint">Use browser Print → Save as PDF. Uncheck "Headers and footers" for a cleaner output.</p>
  </div>

</body>
</html>`
}
