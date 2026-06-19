PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  encrypted_password TEXT,
  raw_user_meta_data TEXT DEFAULT '{}',
  provider TEXT DEFAULT 'email',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_sign_in_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  account_status TEXT NOT NULL DEFAULT 'ACTIVE',
  affiliateCode TEXT,
  whitelabelPdfPasses INTEGER NOT NULL DEFAULT 0,
  referral_source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_affiliate_code_idx ON users(affiliateCode);
CREATE INDEX IF NOT EXISTS users_referral_source_idx ON users(referral_source);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  stripe_customer_id TEXT,
  stripe_sub_id TEXT,
  paypal_sub_id TEXT,
  current_period_end TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_billing_tiers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  video_analysis_used INTEGER NOT NULL DEFAULT 0,
  video_analysis_limit INTEGER NOT NULL DEFAULT 3,
  pdf_pass_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiktok_videos (
  id TEXT PRIMARY KEY,
  tiktok_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  author TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  viral_score REAL DEFAULT 0,
  video_url TEXT,
  cover_url TEXT,
  cover_storage_url TEXT,
  author_avatar_url TEXT,
  niche TEXT,
  product_name TEXT,
  published_at TEXT,
  is_viral_hit INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  sort_order INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tiktok_videos_viral_score_idx ON tiktok_videos(viral_score DESC);
CREATE INDEX IF NOT EXISTS tiktok_videos_niche_idx ON tiktok_videos(niche);
CREATE INDEX IF NOT EXISTS tiktok_videos_created_at_idx ON tiktok_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS tiktok_videos_published_at_idx ON tiktok_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS tiktok_videos_sort_order_idx ON tiktok_videos(sort_order);
CREATE INDEX IF NOT EXISTS tiktok_videos_deleted_at_idx ON tiktok_videos(deleted_at);

CREATE TABLE IF NOT EXISTS video_comments (
  comment_id TEXT PRIMARY KEY,
  tiktok_id TEXT NOT NULL REFERENCES tiktok_videos(tiktok_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  author TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS video_comments_tiktok_id_idx ON video_comments(tiktok_id);

CREATE TABLE IF NOT EXISTS video_breakdowns (
  id TEXT PRIMARY KEY,
  url_hash TEXT UNIQUE NOT NULL,
  video_id TEXT REFERENCES tiktok_videos(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  payload TEXT NOT NULL,
  seo_slug TEXT UNIQUE,
  blog_status TEXT DEFAULT 'NONE',
  blog_post_id TEXT,
  blog_error TEXT,
  trigger_run_id TEXT,
  viral_status TEXT DEFAULT 'PENDING',
  viral_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS video_breakdowns_video_id_idx ON video_breakdowns(video_id);
CREATE INDEX IF NOT EXISTS video_breakdowns_url_hash_idx ON video_breakdowns(url_hash);
CREATE INDEX IF NOT EXISTS video_breakdowns_blog_status_idx ON video_breakdowns(blog_status);
CREATE INDEX IF NOT EXISTS video_breakdowns_seo_slug_idx ON video_breakdowns(seo_slug);
CREATE INDEX IF NOT EXISTS video_breakdowns_user_id_idx ON video_breakdowns(user_id);
CREATE INDEX IF NOT EXISTS video_breakdowns_viral_status_idx ON video_breakdowns(viral_status);

CREATE TABLE IF NOT EXISTS hook_patterns (
  id TEXT PRIMARY KEY,
  hook_type TEXT NOT NULL,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  example TEXT,
  niche TEXT,
  viral_score REAL DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trending_topics (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  hashtag TEXT,
  category TEXT,
  viral_score REAL DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  growth_rate REAL DEFAULT 0,
  peak_date TEXT,
  region TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT,
  tags TEXT DEFAULT '[]',
  author_name TEXT DEFAULT 'TTLike Team',
  author_image TEXT,
  status TEXT DEFAULT 'DRAFT',
  seo_title TEXT,
  seo_desc TEXT,
  view_count INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts(published_at DESC);

CREATE TABLE IF NOT EXISTS user_analytics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  page TEXT,
  feature_name TEXT,
  metadata TEXT,
  context_data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_analytics_user_idx ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS user_analytics_feature_idx ON user_analytics(feature_name);

CREATE TABLE IF NOT EXISTS payment_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'sandbox',
  secret_key TEXT,
  public_key TEXT,
  webhook_secret TEXT,
  client_id TEXT,
  extra_config TEXT,
  is_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spam_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  config TEXT,
  auto_action TEXT,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS badge_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS badge_logs_user_idx ON badge_logs(user_id);
CREATE INDEX IF NOT EXISTS badge_logs_user_type_idx ON badge_logs(user_id, badge_type);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_scripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT '',
  niche TEXT DEFAULT '',
  hook_type TEXT DEFAULT '',
  scripts TEXT NOT NULL DEFAULT '[]',
  source_video_id TEXT,
  keywords TEXT DEFAULT '',
  brand_name TEXT DEFAULT '',
  offer TEXT DEFAULT '',
  script_count INTEGER DEFAULT 5,
  deleted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS generated_scripts_user_created_idx ON generated_scripts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_scripts_active_idx ON generated_scripts(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  video_id TEXT REFERENCES tiktok_videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  destination_url TEXT,
  image_url TEXT,
  cta_label TEXT,
  is_active INTEGER DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS promotions_video_id_idx ON promotions(video_id);
CREATE INDEX IF NOT EXISTS promotions_is_active_idx ON promotions(is_active);
CREATE INDEX IF NOT EXISTS promotions_platform_idx ON promotions(platform);

CREATE TABLE IF NOT EXISTS ledger_event_kernel (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  event_idempotency_key TEXT NOT NULL UNIQUE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '{}',
  emitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ledger_event_kernel_aggregate_seq_idx ON ledger_event_kernel(aggregate_id, sequence_id ASC);
CREATE INDEX IF NOT EXISTS ledger_event_kernel_user_idx ON ledger_event_kernel(user_id, sequence_id DESC);

CREATE TABLE IF NOT EXISTS system_truth_contract (
  contract_name TEXT PRIMARY KEY,
  truth_source TEXT NOT NULL,
  enforcement_mode TEXT NOT NULL
);

INSERT OR IGNORE INTO system_truth_contract(contract_name, truth_source, enforcement_mode)
VALUES ('v4.5.4_event_sourced_system', 'ledger_event_kernel', 'strict_append_only');

CREATE TABLE IF NOT EXISTS script_cache (
  cache_key TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  niche TEXT,
  hook_type TEXT,
  payload TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scraper_logs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS scraper_logs_created_at_idx ON scraper_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS dramas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_script TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  scene_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dramas_user_created_idx ON dramas(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS drama_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drama_id INTEGER NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'supporting',
  description TEXT,
  appearance_prompt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS drama_characters_drama_idx ON drama_characters(drama_id);

CREATE TABLE IF NOT EXISTS drama_storyboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drama_id INTEGER NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL DEFAULT 1,
  scene_no INTEGER NOT NULL,
  character_id INTEGER REFERENCES drama_characters(id) ON DELETE SET NULL,
  character_name TEXT,
  image_prompt TEXT NOT NULL,
  video_prompt TEXT NOT NULL,
  audio_narration TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (drama_id, episode_number, scene_no)
);

CREATE INDEX IF NOT EXISTS drama_storyboards_drama_episode_idx ON drama_storyboards(drama_id, episode_number, scene_no ASC);
CREATE INDEX IF NOT EXISTS drama_storyboards_character_idx ON drama_storyboards(character_id);

CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  peak_hour INTEGER,
  total_analyses INTEGER NOT NULL DEFAULT 0,
  profile_label TEXT,
  time_segment_label TEXT,
  niche_label TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_behavior_profiles_label_idx ON user_behavior_profiles(profile_label);

CREATE TABLE IF NOT EXISTS feature_click_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'dashboard',
  plan TEXT,
  clicked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS feature_click_events_user_idx ON feature_click_events(user_id);
CREATE INDEX IF NOT EXISTS feature_click_events_feature_idx ON feature_click_events(feature_name);

CREATE TABLE IF NOT EXISTS page_dwell_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT 'dashboard',
  dwell_seconds INTEGER NOT NULL,
  plan TEXT,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS page_dwell_events_user_idx ON page_dwell_events(user_id);
CREATE INDEX IF NOT EXISTS page_dwell_events_page_idx ON page_dwell_events(page, recorded_at);

CREATE TABLE IF NOT EXISTS upgrade_trigger_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  cta_label TEXT,
  page TEXT,
  video_id TEXT,
  insight_label TEXT,
  triggered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS upgrade_trigger_events_user_idx ON upgrade_trigger_events(user_id);
CREATE INDEX IF NOT EXISTS upgrade_trigger_events_type_idx ON upgrade_trigger_events(trigger_type);
CREATE INDEX IF NOT EXISTS upgrade_trigger_events_time_idx ON upgrade_trigger_events(triggered_at);

CREATE TABLE IF NOT EXISTS user_niche_profiles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, niche)
);
