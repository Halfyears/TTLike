// ── TTLike Intelligence Schema v2.5 — Inspiration Engine ─────────────────────
// Replaces classification-based hook/emotion/pacing with actionable creative assets.
// Each breakdown = 3 copy-pasteable viral formulas + full scene-by-scene timeline.
// Field note: V2.5 uses example_script (renamed from action_step in earlier builds).

export interface ViralFormula {
  title:          string  // e.g. "The Negative Filter Opener"
  example_script: string  // Say: / Do: / Edit: + exact instruction from original video
  mechanism:      string  // 1-sentence why this spikes retention or cheats the algorithm
  your_version:   string  // Product-specific copy-pasteable version for the seller
}

export interface TimelineScene {
  timecode:      string  // e.g. "00:01-00:03"
  visual:        string  // Phone-shooting/framing directive
  audio:         string  // Exact spoken transcript line
  why_this_works: string // Psychological micro-trigger for this scene
}

// ── Core breakdown payload (stored in video_breakdowns.payload) ───────────────
export interface VideoBreakdownPayload {
  url_hash: string
  category?: string  // Legacy field — present in V1/V2 records, omitted in V2.5+
  metrics: {
    views:  string
    likes:  string
    shares: string
  }
  viral_formulas:  ViralFormula[]   // Exactly 3 high-impact formulas
  visual_timeline: TimelineScene[]  // Full 4-scene timeline breakdown
}
