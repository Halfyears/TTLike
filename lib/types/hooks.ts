// ── TTLike Hook Machine v1.0 — Type Contract ──────────────────────────────────
// Structured output schema for the AI hook analyser + variant generator.
// All fields are required — the API route validates before returning.

export interface HookVariant {
  id:            number
  pattern:       'Shock Reversal' | 'Negative Interruption' | 'Visual Peak' | 'Curiosity Gap'
  emotion:       'Status Anxiety' | 'Time Scarcity' | 'Vanity' | 'Social Proof'
  text:          string   // Ready-to-record hook text (≤ 15 words)
  visual_action: string   // Phone-framing / editing directive for CapCut
}

export interface TTLikeHookResponse {
  original_analysis: {
    scroll_stop_score: number   // 0–100 — how hard the hook stops the scroll
    brutal_feedback:   string   // 1-sentence operator-grade critique of the original
  }
  hook_classification: {
    primary_pattern:   string   // The dominant hook pattern detected
    dominant_emotions: string[] // Up to 3 emotion drivers
  }
  variants: HookVariant[]       // Exactly 4 variants, one per pattern
}
