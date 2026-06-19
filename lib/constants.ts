export const PAYMENT_ENABLED = true

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ttlike.com').replace(/\/$/, '')
export const SITE_NAME = 'TTLike'
export const SITE_DESCRIPTION = 'AI-powered TikTok viral intelligence for dropshippers and UGC creators'

export const SUBSCRIPTION_PLANS = {
  FREE:    { name: 'Free',    price: 0,  tier: 'free',    scriptsPerDay: 3 },
  CREATOR: { name: 'Creator', price: 39, tier: 'creator', scriptsPerDay: 999 },
  SCALE:   { name: 'Scale',   price: 99, tier: 'scale',   scriptsPerDay: 999 },
} as const

/** Quota limits per tier — mirrors user_billing_tiers DB defaults */
export const TIER_LIMITS = {
  free:    { video_analysis: 5,   strategy_audit: 0,  custom_hook: 0   },
  creator: { video_analysis: 50,  strategy_audit: 20, custom_hook: 100 },
  scale:   { video_analysis: 500, strategy_audit: 50, custom_hook: 500 },
} as const

export type TierName = 'free' | 'creator' | 'scale'

export const HOOK_TYPES = [
  { value: 'SURPRISE',    label: 'Surprise',    label_zh: '反转惊喜',   description: 'You won\'t believe this...' },
  { value: 'QUESTION',    label: 'Question',    label_zh: '悬念设疑',   description: 'Did you know that...' },
  { value: 'EMOTIONAL',   label: 'Emotional',   label_zh: '痛点直击',   description: 'This changed my life...' },
  { value: 'FOMO',        label: 'FOMO',        label_zh: '悬念设疑',   description: 'Everyone is buying this...' },
  { value: 'CONTRARIAN',  label: 'Contrarian',  label_zh: '反常识阻断', description: 'Stop doing X, do this instead...' },
  { value: 'STORY',       label: 'Story',       label_zh: '真实故事',   description: 'I spent $500 on this product and...' },
  { value: 'EDUCATIONAL', label: 'Educational', label_zh: '背书展示',   description: 'Here\'s how to...' },
] as const

export const NICHES = [
  'Beauty & Skincare', 'Fashion', 'Home & Garden', 'Tech & Gadgets',
  'Health & Fitness', 'Food & Kitchen', 'Baby & Kids', 'Pets',
  'Sports & Outdoors', 'Travel', 'DIY & Crafts', 'Books & Education',
]

export const PROTECTED_ROUTES = ['/dashboard', '/admin']
export const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/reset-password']
export const ADMIN_ROUTES = ['/admin']
