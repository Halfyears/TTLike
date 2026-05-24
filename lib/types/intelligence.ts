// ── TTLike Intelligence Schema v2.5 — Inspiration Engine ─────────────────────
// Replaces classification-based hook/emotion/pacing with actionable creative assets.
// Each breakdown = 3 copy-pasteable viral formulas + full scene-by-scene timeline.

export interface ViralFormula {
  title:          string   // e.g. "The Negative Filter Opener"
  timestamp?:     string   // Approximate video timestamp, e.g. "00:03"
  example_script: string   // Say: / Do: / Edit: + exact instruction from original video
  mechanism:      string   // 1-sentence why this spikes retention or cheats the algorithm
  your_version:   string   // Product-specific copy-pasteable version for the seller
}

export interface TimelineScene {
  timecode:       string  // e.g. "00:01-00:03"
  visual:         string  // Phone-shooting/framing directive
  audio:          string  // Exact spoken transcript line
  why_this_works: string  // Psychological micro-trigger for this scene
}

// ── Structural Health Report types (generated on-demand, premium) ──────────────

export interface HealthReportLeak {
  severity:       'CRITICAL' | 'HIGH' | 'MEDIUM'
  timecode:       string
  issue:          string
  detail:         string
  estimated_loss: string  // e.g. "~15% checkout leakage"
}

export interface StructuralHealthReport {
  hook_retention: {
    title:            string
    timecode:         string
    technique:        string
    detail:           string
    algorithm_impact: string
  }
  trust_transference: {
    title:                   string
    visual_technique:        string
    psychological_mechanism: string
    detail:                  string
  }
  structural_leaks: HealthReportLeak[]
  counter_attack: {
    title:          string
    fixes:          Array<{ action: string; detail: string }>
    production_tip: string
  }
}

// ── Core breakdown payload (stored in video_breakdowns.payload) ───────────────
export interface VideoBreakdownPayload {
  url_hash:        string
  category?:       string  // Legacy field — present in V1/V2 records, omitted in V2.5+
  metrics: {
    views:  string
    likes:  string
    shares: string
  }
  viral_formulas:  ViralFormula[]   // Exactly 3 high-impact formulas
  visual_timeline: TimelineScene[]  // Full 4-scene timeline breakdown
  health_report?:  StructuralHealthReport  // generated on-demand, cached separately
}

// ── TTLike Commerce Payload v1 ────────────────────────────────────────────────
// Rigid data contract for the Workflow Friction Layer.
// Derived client-side from VideoBreakdownPayload — no extra AI calls.

export interface TTLikeCommercePayload {
  /** Core indexing layer — persuasion power defined in minimal numbers */
  indexing_engine: {
    /** 0–100 viral pressure index based on emotional density of transcribed text */
    ttlike_viral_pressure_index: number
    /** 0–100 commerce conversion probability based on persuasion logic closure */
    commerce_intent_index: number
    /** Primary psychological lever driving audience attention */
    primary_attention_taxonomy:
      | 'status_anxiety'
      | 'pain_intercept'
      | 'curiosity_loop'
      | 'roi_proof'
  }
  /** Minimum workflow execution layer — plug-and-play, zero copy-paste overhead */
  execution_payload: {
    /** 3-second emotional intercept variants — drop directly into teleprompter */
    hook_library: Array<{
      timestamp: string
      type: string
      raw_text: string
      /** 3 ready-to-record variants that defeat platform de-duplication filters */
      anti_duplication_variants: string[]
    }>
    /** Industrial-grade slide structure optimised for MakeUGC / Canva 9:16 */
    storyboard_flow: Array<{
      slide_number: number
      type: 'hook' | 'agitate_pain' | 'value_proposition' | 'cta'
      exact_copy: string
    }>
    /** Zero-cost asset sourcing — copy these into Pinterest search bar */
    upstream_search_queries: {
      /** 3 high-contrast 9:16 image search terms ready to paste */
      pinterest_search_terms: string[]
    }
  }
}

// ── Taxonomy classifier ───────────────────────────────────────────────────────

function classifyTaxonomy(
  title: string,
  mechanism: string,
): TTLikeCommercePayload['indexing_engine']['primary_attention_taxonomy'] {
  const text = `${title} ${mechanism}`.toLowerCase()
  if (/roi|result|proof|stat|before.after|transform/.test(text)) return 'roi_proof'
  if (/pain|problem|suffer|struggle|hate|frustrat/.test(text))   return 'pain_intercept'
  if (/secret|hidden|nobody|reveal|discover|trick/.test(text))   return 'curiosity_loop'
  return 'status_anxiety'
}

// ── Hook variant generator ────────────────────────────────────────────────────

function makeVariants(yourVersion: string, type: string): string[] {
  // Strip Say:/Do:/Edit: prefix to get raw hook body
  const body = yourVersion.replace(/^(Say|Do|Edit):\s*/i, '').replace(/^["']|["']$/g, '').trim()

  const openers: Record<string, string[]> = {
    SURPRISE:    ['I had no idea that', 'Can\'t believe nobody told me —', 'Wait — this actually works:'],
    QUESTION:    ['Be honest —', 'Quick question:', 'Real talk —'],
    EMOTIONAL:   ['This hit different:', 'Not gonna lie,', 'Okay but why is this so relatable —'],
    FOMO:        ['Everyone is talking about this.', 'You\'re the last to know:', 'This is selling out fast.'],
    CONTRARIAN:  ['Unpopular opinion:', 'Stop what you\'re doing.', 'Hot take:'],
    STORY:       ['So there I was.', 'Day 1 of trying this:', 'This changed my whole routine:'],
    EDUCATIONAL: ['Did you know:', 'Here\'s the science:', 'Quick tip that saved me hours:'],
  }
  const prefixes = openers[type.toUpperCase()] ?? openers['SURPRISE']!

  return prefixes.map(p => `${p} ${body}`)
}

// ── Storyboard slide map ──────────────────────────────────────────────────────

const SLIDE_TYPES: Array<TTLikeCommercePayload['execution_payload']['storyboard_flow'][number]['type']> =
  ['hook', 'agitate_pain', 'value_proposition', 'cta']

// ── Pinterest term builder ────────────────────────────────────────────────────

function buildPinterestTerms(productName: string, niche: string): string[] {
  const clean = productName.replace(/#[\w一-鿿]+\s*/g, '').trim().split(/\s+/).slice(0, 3).join(' ')
  return [
    `${clean} aesthetic product photography 9:16`,
    `${niche.toLowerCase()} before after transformation vertical`,
    `${niche.toLowerCase()} lifestyle flat lay high contrast`,
  ]
}

/**
 * Derive a TTLikeCommercePayload from an existing VideoBreakdownPayload.
 * Pure function — no network calls, no side effects.
 *
 * @param payload   The stored breakdown payload
 * @param productName  Raw product/title string (with hashtags OK)
 * @param niche        Niche label e.g. "Health", "Beauty"
 * @param viralScore   0–100 from tiktok_videos.viral_score
 */
export function deriveCommercePayload(
  payload:     VideoBreakdownPayload,
  productName: string,
  niche:       string,
  viralScore:  number,
): TTLikeCommercePayload {
  const formulas = payload.viral_formulas ?? []
  const timeline = payload.visual_timeline ?? []

  // ── indexing_engine ─────────────────────────────────────────────────────────
  const ttlike_viral_pressure_index = Math.min(100, Math.round(viralScore * 0.9 + formulas.length * 3))
  const commerce_intent_index = Math.min(100, Math.round(
    (formulas.filter(f => /buy|get|order|shop|link|cta/i.test(f.mechanism + f.your_version)).length / Math.max(formulas.length, 1)) * 40
    + ttlike_viral_pressure_index * 0.6,
  ))
  const primary_attention_taxonomy = formulas.length > 0
    ? classifyTaxonomy(formulas[0]!.title, formulas[0]!.mechanism)
    : 'pain_intercept'

  // ── hook_library ────────────────────────────────────────────────────────────
  const hook_library = formulas.map(f => ({
    timestamp:               f.timestamp ?? '00:00',
    type:                    f.title,
    raw_text:                f.example_script,
    anti_duplication_variants: makeVariants(f.your_version, f.title),
  }))

  // ── storyboard_flow ─────────────────────────────────────────────────────────
  const storyboard_flow = timeline.map((scene, idx) => ({
    slide_number: idx + 1,
    type:         SLIDE_TYPES[idx] ?? 'value_proposition',
    exact_copy:   `${scene.audio}\n📷 ${scene.visual}`,
  }))

  // ── upstream_search_queries ─────────────────────────────────────────────────
  const pinterest_search_terms = buildPinterestTerms(productName, niche)

  return {
    indexing_engine: {
      ttlike_viral_pressure_index,
      commerce_intent_index,
      primary_attention_taxonomy,
    },
    execution_payload: {
      hook_library,
      storyboard_flow,
      upstream_search_queries: { pinterest_search_terms },
    },
  }
}
