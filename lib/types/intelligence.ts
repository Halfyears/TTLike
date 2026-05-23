// ── TTLike Intelligence Schema ─────────────────────────────────────────────────
// Fixed enumerations keep AI output token-lean: backend passes codes,
// frontend renders the full human-readable explanations.

// 1. 前3秒钩子策略
export enum HookType {
  CURIOSITY_GAP   = 'curiosity_gap',   // 悬念设疑 — 数字悬念/隐藏过程骗完播率
  CONTRARIAN      = 'contrarian',      // 反常识阻断 — 先推翻大众误区
  PROBLEM_FIRST   = 'problem_first',   // 痛点直击 — 开篇放大最具体的生理/心理麻烦
  AUTHORITY_FLEX  = 'authority_flex',  // 背书展示 — 专业身份/真实资产/具体收益
}

// 2. 核心购买动机
export enum EmotionDriver {
  GREED_LAZY      = 'greed_lazy',      // 追求便利/懒人捷径
  ANXIETY_RELIEF  = 'anxiety_relief',  // 缓解焦虑/避坑防骗
  VANITY_STATUS   = 'vanity_status',   // 追求外貌红利/阶层认同
  COST_EFFECTIVE  = 'cost_effective',  // 追求极致性价比
}

// 3. 剪辑与视觉节奏
export enum PacingStyle {
  FAST_CUT    = 'fast_cut',    // 快节奏闪切 — 每2-3秒切换
  DEMO_SHOW   = 'demo_show',   // 第一视角实操特写
  LOOP_REPLAY = 'loop_replay', // 无缝循环骗完播率
}

// ── Human-readable labels for frontend rendering ──────────────────────────────

export const HOOK_TYPE_LABELS: Record<HookType, { en: string; zh: string; desc_zh: string }> = {
  [HookType.CURIOSITY_GAP]:  { en: 'Curiosity Gap',   zh: '悬念设疑',   desc_zh: '利用数字悬念或隐藏过程骗完播率' },
  [HookType.CONTRARIAN]:     { en: 'Contrarian',      zh: '反常识阻断', desc_zh: '先推翻一个大众误区来拦截大拇指' },
  [HookType.PROBLEM_FIRST]:  { en: 'Problem First',   zh: '痛点直击',   desc_zh: '开篇放大最具体的生理/心理麻烦' },
  [HookType.AUTHORITY_FLEX]: { en: 'Authority Flex',  zh: '背书展示',   desc_zh: '展示专业身份、真实资产或具体收益' },
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
