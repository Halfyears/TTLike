// ── TTLike Intelligence Schema v2 ────────────────────────────────────────────
// Fixed enumerations keep AI output token-lean: backend passes codes,
// frontend renders the full human-readable labels.
// Enum values are passed verbatim to Gemini — do not rename without updating parserPrompt.ts.

// 1. Opening hook taxonomy
export enum HookType {
  CURIOSITY_GAP        = 'curiosity_gap',        // Suspense/number listicles to inflate retention
  CONTRARIAN_INTERRUPT = 'contrarian_interrupt', // Attacking industry beliefs to force cognitive dissonance
  PROBLEM_INTERRUPT    = 'problem_interrupt',    // Amplifying a specific physical/psychological inconvenience
  AUTHORITY_FLEX       = 'authority_flex',       // Hard assets, credentials, or massive revenue figures
}

// 2. Core buying motivation
export enum EmotionDriver {
  GREED_LAZY      = 'greed_lazy',      // Shortcuts, zero configuration, plug-and-play
  ANXIETY_RELIEF  = 'anxiety_relief',  // Shielding against mistakes, scams, or degradation
  VANITY_STATUS   = 'vanity_status',   // Appearance capital, social envy, peer confirmation
  COST_EFFECTIVE  = 'cost_effective',  // Price drops, liquidations, extreme clearance delta
}

// 3. Editing & visual pacing
export enum PacingStyle {
  FAST_CUT    = 'fast_cut',    // Frame transitions every 2-3s to lock attention
  DEMO_SHOW   = 'demo_show',   // First-person close-ups on sterile background
  LOOP_REPLAY = 'loop_replay', // Seamless audio-visual stitching to trick retention algorithm
}

// ── Human-readable labels for frontend rendering ──────────────────────────────

export const HOOK_TYPE_LABELS: Record<HookType, { en: string; zh: string; desc_zh: string }> = {
  [HookType.CURIOSITY_GAP]:        { en: 'Curiosity Gap',        zh: '悬念设疑',   desc_zh: '利用数字悬念或隐藏过程骗完播率' },
  [HookType.CONTRARIAN_INTERRUPT]: { en: 'Contrarian Interrupt', zh: '反常识阻断', desc_zh: '先推翻一个大众误区来拦截大拇指' },
  [HookType.PROBLEM_INTERRUPT]:    { en: 'Problem Interrupt',    zh: '痛点直击',   desc_zh: '开篇放大最具体的生理/心理麻烦' },
  [HookType.AUTHORITY_FLEX]:       { en: 'Authority Flex',       zh: '背书展示',   desc_zh: '展示专业身份、真实资产或具体收益' },
}

export const EMOTION_DRIVER_LABELS: Record<EmotionDriver, { en: string; zh: string }> = {
  [EmotionDriver.GREED_LAZY]:     { en: 'Lazy / Convenience', zh: '懒人捷径' },
  [EmotionDriver.ANXIETY_RELIEF]: { en: 'Anxiety Relief',     zh: '避坑焦虑' },
  [EmotionDriver.VANITY_STATUS]:  { en: 'Vanity / Status',    zh: '外貌红利' },
  [EmotionDriver.COST_EFFECTIVE]: { en: 'Cost Effective',     zh: '极致性价比' },
}

export const PACING_STYLE_LABELS: Record<PacingStyle, { en: string; zh: string; desc_zh: string }> = {
  [PacingStyle.FAST_CUT]:    { en: 'Fast Cut',    zh: '快节奏闪切',   desc_zh: '每2-3秒切换画面，保持注意力' },
  [PacingStyle.DEMO_SHOW]:   { en: 'Demo Show',   zh: '第一视角特写', desc_zh: '干净背景只拍手和产品交互' },
  [PacingStyle.LOOP_REPLAY]: { en: 'Loop Replay', zh: '无缝循环',     desc_zh: '首尾衔接，最大化完播率' },
}

// ── Core breakdown payload (stored in video_breakdowns.payload) ───────────────
export interface VideoBreakdownPayload {
  url_hash:  string
  category:  string
  metrics: {
    views:   string
    likes:   string
    shares:  string
  }
  analysis: {
    hook: {
      type:             HookType
      raw_text:         string  // 原视频前3秒核心文案
      mechanism:        string  // 核心机理白话解释（1句）
      actionable_advice: string // 卖家实操建议（1句）
    }
    emotion: {
      driver:            EmotionDriver
      pain_point:        string
      actionable_advice: string
    }
    pacing: {
      style:             PacingStyle
      raw_behavior:      string  // 原视频剪辑手法描述
      actionable_advice: string  // 用剪映复现的具体步骤（1句）
    }
    cta: {
      raw_behavior:      string  // 原视频结尾如何导流
      actionable_advice: string  // 如何收单（1句）
    }
  }
}
