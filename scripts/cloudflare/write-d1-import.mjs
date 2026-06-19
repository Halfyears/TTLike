import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IN_DIR = process.env.CLOUDFLARE_EXPORT_DIR ?? "cloudflare/export";
const OUT_FILE = process.env.CLOUDFLARE_D1_IMPORT_SQL ?? "cloudflare/d1/import-data.sql";
const SCHEMA_FILE = process.env.CLOUDFLARE_D1_SCHEMA_SQL ?? "cloudflare/d1/schema.sql";

const AUTH_USER_COLUMNS = [
  "id",
  "email",
  "encrypted_password",
  "raw_user_meta_data",
  "provider",
  "created_at",
  "updated_at",
  "last_sign_in_at",
];

const COLUMN_ALIASES = {
  users: {
    avatarUrl: "avatar_url",
    accountStatus: "account_status",
    referralSource: "referral_source",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  user_subscriptions: {
    userId: "user_id",
    stripeCustomerId: "stripe_customer_id",
    stripeSubId: "stripe_sub_id",
    paypalSubId: "paypal_sub_id",
    currentPeriodEnd: "current_period_end",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  tiktok_videos: {
    videoId: "tiktok_id",
    authorName: "author",
    authorHandle: "author",
    viewCount: "views",
    likeCount: "likes",
    shareCount: "shares",
    commentCount: "comments",
    thumbnailUrl: "cover_url",
    videoUrl: "video_url",
    authorAvatarUrl: "author_avatar_url",
    productName: "product_name",
    viralScore: "viral_score",
    publishedAt: "published_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  ai_breakdowns: {
    videoId: "video_id",
    hookType: "hook_type",
    hookText: "hook_text",
    hookScore: "hook_score",
    emotionTrigger: "emotion_trigger",
    ctaStyle: "cta_style",
    targetAudience: "target_audience",
    productFit: "product_fit",
    whyItWorks: "why_it_works",
    scriptTemplate: "script_template",
    keyInsights: "key_insights",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  hook_patterns: {
    hookType: "hook_type",
    viralScore: "viral_score",
    useCount: "use_count",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  trending_topics: {
    viralScore: "viral_score",
    videoCount: "video_count",
    growthRate: "growth_rate",
    peakDate: "peak_date",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  blog_posts: {
    coverImage: "cover_image",
    authorName: "author_name",
    authorImage: "author_image",
    seoTitle: "seo_title",
    seoDesc: "seo_desc",
    viewCount: "view_count",
    publishedAt: "published_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  user_analytics: {
    userId: "user_id",
    featureName: "feature_name",
    contextData: "context_data",
    createdAt: "created_at",
  },
  payment_configs: {
    secretKey: "secret_key",
    publicKey: "public_key",
    webhookSecret: "webhook_secret",
    clientId: "client_id",
    extraConfig: "extra_config",
    isEnabled: "is_enabled",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  spam_rules: {
    ruleType: "rule_type",
    autoAction: "auto_action",
    isEnabled: "is_enabled",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  badge_logs: {
    userId: "user_id",
    badgeType: "badge_type",
    createdAt: "created_at",
  },
  affiliate_links: {
    userId: "user_id",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  generated_scripts: {
    userId: "user_id",
    productName: "product_name",
    hookType: "hook_type",
    sourceVideoId: "source_video_id",
    brandName: "brand_name",
    scriptCount: "script_count",
    deletedAt: "deleted_at",
    createdAt: "created_at",
  },
  promotions: {
    videoId: "video_id",
    destinationUrl: "destination_url",
    imageUrl: "image_url",
    ctaLabel: "cta_label",
    isActive: "is_active",
    startsAt: "starts_at",
    endsAt: "ends_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  scraper_logs: {
    createdAt: "created_at",
  },
};

function sqlIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${text.replaceAll("'", "''")}'`;
}

function normalizeAuthUser(row) {
  return {
    id: row.id,
    email: row.email,
    encrypted_password: row.encrypted_password ?? null,
    raw_user_meta_data: row.raw_user_meta_data ?? row.user_metadata ?? {},
    provider: row.app_metadata?.provider ?? "email",
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_sign_in_at: row.last_sign_in_at,
  };
}

function camelToSnake(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function parseD1SchemaColumns(schemaSql) {
  const tables = new Map();
  const createTablePattern = /CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z0-9_]+)"?\s*\(([\s\S]*?)\);/g;
  for (const match of schemaSql.matchAll(createTablePattern)) {
    const [, table, body] = match;
    const columns = new Set();
    for (const line of body.split("\n")) {
      const trimmed = line.trim().replace(/,$/, "");
      if (!trimmed || /^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(trimmed)) continue;
      const columnMatch = trimmed.match(/^"?([A-Za-z0-9_]+)"?\s+/);
      if (columnMatch) columns.add(columnMatch[1]);
    }
    tables.set(table, columns);
  }
  return tables;
}

function normalizeTableRow(table, sourceRow, tableColumns) {
  if (!tableColumns) return sourceRow;
  if (table === "auth_users") return normalizeAuthUser(sourceRow);

  const aliases = COLUMN_ALIASES[table] ?? {};
  const normalized = {};

  for (const [sourceColumn, value] of Object.entries(sourceRow)) {
    const candidates = [
      sourceColumn,
      aliases[sourceColumn],
      camelToSnake(sourceColumn),
    ].filter(Boolean);

    const targetColumn = candidates.find((candidate) => tableColumns.has(candidate));
    if (targetColumn) normalized[targetColumn] = value;
  }

  return normalized;
}

function insertStatement(table, row, tableColumns, fixedColumns) {
  if (!tableColumns) throw new Error(`Table ${table} is not present in ${SCHEMA_FILE}`);

  const columns = (fixedColumns ?? Object.keys(row))
    .filter((column) => tableColumns.has(column))
    .filter((column) => fixedColumns || row[column] !== undefined);
  if (columns.length === 0) return null;

  const names = columns.map(sqlIdent).join(", ");
  const values = columns.map((column) => sqlValue(row[column])).join(", ");
  return `INSERT OR REPLACE INTO ${sqlIdent(table)} (${names}) VALUES (${values});`;
}

await mkdir(path.dirname(OUT_FILE), { recursive: true });
let files;
try {
  files = (await readdir(IN_DIR)).filter((file) => file.endsWith(".json")).sort();
} catch (error) {
  if (error && error.code === "ENOENT") {
    console.error(`Missing export directory: ${IN_DIR}`);
    console.error("Run `npm run cf:export:supabase` before generating the D1 import SQL.");
    process.exit(1);
  }
  throw error;
}
const statements = [
  "PRAGMA foreign_keys = OFF;",
  "BEGIN TRANSACTION;",
];
const schemaColumns = parseD1SchemaColumns(await readFile(SCHEMA_FILE, "utf8"));

for (const file of files) {
  const table = path.basename(file, ".json");
  const rows = JSON.parse(await readFile(path.join(IN_DIR, file), "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) continue;

  statements.push(`-- ${table}: ${rows.length} rows`);
  for (const sourceRow of rows) {
    const tableColumns = schemaColumns.get(table);
    const row = normalizeTableRow(table, sourceRow, tableColumns);
    const statement = insertStatement(
      table,
      row,
      tableColumns,
      table === "auth_users" ? AUTH_USER_COLUMNS : undefined,
    );
    if (statement) statements.push(statement);
  }
}

statements.push("COMMIT;", "PRAGMA foreign_keys = ON;");
await writeFile(OUT_FILE, `${statements.join("\n")}\n`);
console.log(`Wrote ${OUT_FILE}`);
