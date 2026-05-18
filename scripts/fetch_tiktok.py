#!/usr/bin/env python3
import os
import sys
from datetime import datetime

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

# ── env vars ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '').strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing environment variables.")
    print(f"  NEXT_PUBLIC_SUPABASE_URL = {'SET' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_SERVICE_KEY     = {'SET' if SUPABASE_KEY else 'MISSING'}")
    print()
    print("Fix: Add these as GitHub Secrets at:")
    print("  https://github.com/Halfyears/TTLike/settings/secrets/actions")
    sys.exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to Supabase: {SUPABASE_URL[:40]}…")
except Exception as e:
    print(f"ERROR: Could not connect to Supabase: {e}")
    sys.exit(1)

# ── logging ───────────────────────────────────────────────────────────────────

def log_run(status, msg, fetched=0, updated=0, error=None):
    try:
        supabase.table('scraper_logs').insert({
            'status': status,
            'message': msg,
            'videos_fetched': fetched,
            'videos_updated': updated,
            'error_details': error,
            'created_at': datetime.utcnow().isoformat() + 'Z',
        }).execute()
        print(f"Logged: [{status}] {msg}")
    except Exception as e:
        # Don't crash the scraper if logging fails
        print(f"WARNING: Could not write to scraper_logs: {e}")
        print("Make sure you ran prisma/migrations/scraper_logs.sql in Supabase SQL Editor.")

# ── mock data ─────────────────────────────────────────────────────────────────

def generate_mock_videos():
    products = [
        ('Posture Corrector Pro', 'Health'),
        ('LED Strip Lights Kit', 'Home'),
        ('Portable Blender Mini', 'Kitchen'),
        ('Silk Sleep Mask', 'Beauty'),
        ('Magnetic Phone Stand', 'Tech'),
        ('Resistance Bands Set', 'Fitness'),
        ('Jade Roller Set', 'Beauty'),
        ('Cold Brew Coffee Maker', 'Kitchen'),
        ('Smart Jump Rope', 'Fitness'),
        ('Aromatherapy Diffuser', 'Home'),
        ('UV Nail Lamp', 'Beauty'),
        ('Pet Hair Remover', 'Pets'),
        ('Car Phone Holder', 'Tech'),
        ('Glass Straw Set', 'Kitchen'),
        ('Knee Support Brace', 'Health'),
        ('Foot Massage Roller', 'Health'),
        ('Scalp Massager', 'Beauty'),
        ('Bamboo Organizer', 'Home'),
        ('Travel Pillow', 'Travel'),
        ('Foam Roller Set', 'Fitness'),
    ]
    videos = []
    for i, (name, niche) in enumerate(products, start=1):
        views = 100_000 + i * 50_000
        videos.append({
            'tiktok_id': f'mock_video_{i:03d}',
            'title': f'{name} — TikTok Viral',
            'author': f'@creator_{i}',
            'views': views,
            'likes': views // 20,
            'shares': views // 100,
            'comments': views // 50,
            'viral_score': round(50.0 + i * 2.2, 1),
            'video_url': f'https://www.tiktok.com/@creator_{i}/video/mock_{i}',
            'cover_url': None,
            'author_avatar_url': None,
            'niche': niche,
            'product_name': name,
        })
    return videos

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== TTLike Scraper ===")
    print(f"Started at {datetime.utcnow().isoformat()}Z")

    try:
        videos = generate_mock_videos()
        print(f"Generated {len(videos)} videos")

        # Single upsert call — much faster and atomic
        result = supabase.table('tiktok_videos').upsert(
            videos,
            on_conflict='tiktok_id',
        ).execute()

        if not result.data:
            raise RuntimeError(
                "Upsert returned no data. Possible causes:\n"
                "  1. tiktok_videos table does not exist — run prisma/migrations/tiktok_videos_v2.sql in Supabase SQL Editor\n"
                "  2. Column mismatch — make sure the migration was run after the schema change\n"
                f"  Raw result: {result}"
            )

        updated = len(result.data)
        print(f"✅ Upserted {updated} rows into tiktok_videos")
        log_run('success', f'Upserted {updated} videos', len(videos), updated)

    except Exception as e:
        print(f"❌ Scraper failed: {e}")
        import traceback
        traceback.print_exc()
        log_run('error', 'Scraper failed', error=str(e))
        sys.exit(1)

if __name__ == '__main__':
    main()
