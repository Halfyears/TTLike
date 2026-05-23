export const IS_BETA_PHASE = true
export const PAYMENT_ENABLED = false

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ttlike.com'
export const SITE_NAME = 'TTLike'
export const SITE_DESCRIPTION = 'AI-powered TikTok viral intelligence for dropshippers and UGC creators'

export const SUBSCRIPTION_PLANS = {
  FREE: { name: 'Free', price: 0, scriptsPerDay: PAYMENT_ENABLED ? 3 : 999 },
  PRO: { name: 'Pro', price: 29, scriptsPerDay: 999 },
  ENTERPRISE: { name: 'Enterprise', price: 99, scriptsPerDay: 999 },
} as const

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
