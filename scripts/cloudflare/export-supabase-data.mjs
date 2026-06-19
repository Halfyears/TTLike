import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.OLD_SUPABASE_URL;
const SERVICE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const OUT_DIR = process.env.CLOUDFLARE_EXPORT_DIR ?? "cloudflare/export";
const PAGE_SIZE = Number(process.env.SUPABASE_EXPORT_PAGE_SIZE ?? 1000);

const TABLES = [
  "users",
  "user_subscriptions",
  "user_billing_tiers",
  "tiktok_videos",
  "video_comments",
  "video_breakdowns",
  "hook_patterns",
  "trending_topics",
  "blog_posts",
  "user_analytics",
  "payment_configs",
  "spam_rules",
  "badge_logs",
  "affiliate_links",
  "generated_scripts",
  "promotions",
  "ledger_event_kernel",
  "system_truth_contract",
  "script_cache",
  "scraper_logs",
  "dramas",
  "drama_characters",
  "drama_storyboards",
  "admin_config",
  "user_behavior_profiles",
  "feature_click_events",
  "page_dwell_events",
  "upgrade_trigger_events",
  "user_niche_profiles",
];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing OLD_SUPABASE_URL or OLD_SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

async function exportTable(table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const from = offset;
    const to = offset + PAGE_SIZE - 1;
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.set("select", "*");
    const page = await fetchJson(url, {
      headers: {
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      },
    }).catch((error) => {
      throw new Error(`Failed to export ${table}: ${error.message}`);
    });

    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  await writeFile(path.join(OUT_DIR, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`[ok] ${table}: ${rows.length}`);
}

async function exportAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const url = new URL("/auth/v1/admin/users", SUPABASE_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(PAGE_SIZE));
    const data = await fetchJson(url);
    const pageUsers = data.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < PAGE_SIZE) break;
  }

  await writeFile(path.join(OUT_DIR, "auth_users.json"), JSON.stringify(users, null, 2));
  console.log(`[ok] auth_users: ${users.length}`);
}

await mkdir(OUT_DIR, { recursive: true });
await exportAuthUsers();
for (const table of TABLES) {
  await exportTable(table);
}

console.log(`Export complete: ${OUT_DIR}`);
