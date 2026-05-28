import 'server-only'
import type { StructuralHealthReport } from '@/lib/types/intelligence'
import { compileVideoPayload, type VideoSignals } from '@/lib/ai/payloadCompiler'
import { runAIWaterfall }                         from '@/lib/ai/providers'

// ── V2.5 Structural Health Report System Prompt ───────────────────────────────
// Forces specific, non-generic outputs by requiring exact timecodes,
// percentages, and technical production language inferred from engagement signals.
export const HEALTH_REPORT_SYSTEM_PROMPT = `You are a TikTok ad forensics analyst conducting a precision structural audit. Convert viral video metadata and engagement signals into a hard-core commercial audit with ZERO generic language.

CRITICAL RULES:
1. RAW JSON ONLY. No markdown, no commentary, no preambles.
2. Every "detail" field MUST contain specific timecodes (00:XX), specific percentages, and technical production observations.
3. ABSOLUTELY FORBIDDEN: generic phrases like "the video uses good storytelling", "engaging content", "resonates with audience".
4. Derive timecodes from standard 30-35s short-form structure: HOOK 00:00-00:03, DEMO 00:04-00:18, PROOF 00:19-00:28, CTA 00:29-00:35.
5. Infer production techniques and flaws from the engagement signal windows provided.
6. counter_attack fixes must have exact home-executable shooting/editing instructions (camera position, exact words, specific timecode).

ENGAGEMENT SIGNAL INTERPRETATION (derive specific issues from these):
- Like rate [high-retention]: powerful hook mechanism at 00:01-00:02, identify the filtering technique used
- Like rate [mid-retention]: hook partially works, infer viewer dropout at 00:02-00:04
- Like rate [low-retention]: CRITICAL — hook fails to filter target audience, mark as structural leak
- Share rate [viral-spread]: content contains an active shareability trigger, identify the exact mechanism
- Share rate [organic-only]: CRITICAL — no virality mechanism present, identify what specific element is missing
- Engagement [strong-buyer-signal]: CTA converts, note the specific conversion technique used
- Engagement [weak-buyer-signal]: CRITICAL — CTA structural leak, infer passive text-only CTA issue

Output this exact JSON structure:
{
  "hook_retention": {
    "title": "Hook Retention Mechanics",
    "timecode": "00:00-00:03",
    "technique": "Exact name of the hook technique (e.g., Negative Constraint Filter, Identity Challenge, FOMO Trigger, Problem-First Reveal)",
    "detail": "2-3 precise sentences: what exactly appears at 00:01 or 00:02, what psychological mechanism activates, what specific viewer behavior it forces. Reference a concrete production element (text overlay, audio cue, visual element).",
    "algorithm_impact": "1 sentence: exactly how this manipulates the TikTok first-3-second retention graph and what algorithmic classification it triggers (e.g., high-engagement asset, interest-targeted delivery)."
  },
  "trust_transference": {
    "title": "Trust Transference Blueprint",
    "visual_technique": "Name of the visual UGC strategy (e.g., Zero-Shadow Native Angle, Overhead Kitchen Table Shot, Peer-to-Peer Phone Mimicry)",
    "psychological_mechanism": "Name of the psychological principle exploited (e.g., Ad-Fatigue Bypass, Social Proof Anchoring, Cognitive Ease Transfer)",
    "detail": "2-3 precise sentences: exact production choices made (lighting setup or absence of it, camera angle, cut pace in seconds), why these specific choices bypass the viewer's ad-detection filter, and the micro-dopamine mechanism keeping them watching past the 3-second mark."
  },
  "structural_leaks": [
    {
      "severity": "CRITICAL",
      "timecode": "00:XX",
      "issue": "Short issue name (5 words max)",
      "detail": "2 sentences: the exact technical cause of the leak (audio level drop, abrupt scene transition, missing verbal CTA, oversaturated color) and the specific viewer behavior this triggers (scroll-away impulse, purchase hesitation, confusion).",
      "estimated_loss": "~X% [specific type of loss, e.g., checkout traffic, mid-video retention, share amplification]"
    }
  ],
  "counter_attack": {
    "title": "Zero-Cost Counter-Attack Manual",
    "fixes": [
      {
        "action": "Short fix name (3-4 words)",
        "detail": "Exact instruction a home seller can execute today with just their phone. Specify: exact words to say aloud, exact camera position, exact timecode to apply the fix, or exact editing software action."
      }
    ],
    "production_tip": "One specific phone camera or lighting tip that will make the seller's recording visually outperform the original. Include exact setting (e.g., set phone exposure to +0.3, use natural window light at 45 degrees on left side, shoot from overhead at arm's length)."
  }
}`.trim()

// ── Gemini call for structural health report ──────────────────────────────────

export type HealthReportResult = { report: StructuralHealthReport; ai_provider: string }

export async function callHealthReport(signals: VideoSignals): Promise<HealthReportResult> {
  const productLabel = signals.product_name ?? signals.title
  const nicheLabel   = signals.niche ?? 'E-Commerce'

  const productReminder = [
    `FORENSIC TARGET: "${productLabel}" (${nicheLabel})`,
    `ALL technical observations must be derived from the engagement signal windows above.`,
    `Include minimum 2 structural leaks. At least 1 must be CRITICAL severity.`,
    `counter_attack must include exactly 2 fixes, each with a specific timecode reference.`,
  ].join('\n')

  const userContent = compileVideoPayload(signals, productReminder)

  const { text, provider } = await runAIWaterfall(
    HEALTH_REPORT_SYSTEM_PROMPT,
    `---\nVIDEO FORENSICS DATA:\n${userContent}`,
    { groqTimeoutMs: 10_000, geminiTimeoutMs: 20_000, githubTimeoutMs: 15_000 },
  )

  try {
    const report = JSON.parse(text) as StructuralHealthReport
    return { report, ai_provider: provider }
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
  }
}
