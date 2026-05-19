#!/usr/bin/env python3
"""
TTLike TikTok Scraper — RapidAPI (tiktok-scraper7)
Fetches real viral product videos from TikTok via RapidAPI.

Required env vars:
  NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
  SUPABASE_SERVICE_KEY      — Supabase service-role key
  RAPIDAPI_KEY              — RapidAPI key
"""

import os
import sys
import math
import requests
from datetime import datetime, timezone

# ── deps ──────────────────────────────────────────────────────────────────────
try:
    from supabase import create_client
except ImportError:
    print("ERROR: pip install supabase")
    sys.exit(1)

# ── config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '').strip()
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', '').strip()

RAPIDAPI_HOST = 'tiktok-scraper7.p.rapidapi.com'

# Hashtags to scrape — product-focused
HASHTAGS = [
    'tiktokfinds',
    'tiktokshop',
    'tiktokmademebuyit',
    'amazonfinds',
    'viralproducts',
]

VIDEOS_PER_HASHTAG = 10   # stays within 300 req/month budget at 5 tags × 10 = 50/run

# ── validation ────────────────────────────────────────────────────────────────
missing = [k for k, v in {
    'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL,
    'SUPABASE_SERVICE_KEY': SUPABASE_KEY,
    'RAPIDAPI_KEY': RAPIDAPI_KEY,
}.items() if not v]

if missing:
    print(f"ERROR: Missing env vars: {', '.join(missing)}")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── helpers ───────────────────────────────────────────────────────────────────
def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime('%H:%M:%S')
    print(f"[{ts}] {msg}")

def viral_score(views: int, likes: int, shares: int, comments: int) -> float:
    if views == 0:
        return 0.0
    engagement = (likes + shares * 3 + comments * 2) / views
    view_score = min(50.0, math.log10(max(views, 1)) * 10)
    eng_score = min(50.0, engagement * 1000)
    return round(view_score + eng_score, 2)

def detect_niche(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ['health', 'fitness', 'workout', 'posture', 'yoga', 'gym']): return 'Fitness'
    if any(w in t for w in ['beauty', 'makeup', 'skincare', 'glow', 'serum', 'lash']): return 'Beauty'
    if any(w in t for w in ['kitchen', 'cooking', 'food', 'recipe', 'blender', 'chef']): return 'Kitchen'
    if any(w in t for w in ['home', 'decor', 'room', 'house', 'clean', 'organiz']): return 'Home'
    if any(w in t for w in ['tech', 'gadget', 'phone', 'device', 'smart', 'led', 'light']): return 'Tech'
    if any(w in t for w in ['pet', 'dog', 'cat', 'animal']): return 'Pets'
    if any(w in t for w in ['travel', 'trip', 'vacation', 'luggage', 'pillow']): return 'Travel'
    if any(w in t for w in ['health', 'wellness', 'massage', 'pain', 'sleep']): return 'Health'
    return 'General'

# ── RapidAPI fetch ────────────────────────────────────────────────────────────
HEADERS = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
}

BASE = f'https://{RAPIDAPI_HOST}'

import json as _json

def _api_get(path: str, params: dict) -> dict:
    resp = requests.get(f'{BASE}/{path}', headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()

def fetch_hashtag(tag: str, count: int = 10) -> list[dict]:
    # Step 1: resolve challenge_id
    info_body = _api_get('challenge/info', {'challenge_name': tag})
    log(f"  challenge/info body: {_json.dumps(info_body)[:300]}")

    data = info_body.get('data', {})
    ch = (data.get('challengeInfo') or data.get('challenge') or {})
    if isinstance(ch, dict):
        ch = ch.get('challenge', ch)
    cid = (ch.get('id') or ch.get('challengeId') or data.get('id')
           or info_body.get('challenge_id'))

    raw_videos = []

    if cid:
        log(f"  challenge_id={cid}")
        posts_body = _api_get('challenge/posts', {'challenge_id': str(cid), 'count': count, 'cursor': 0})
        d = posts_body.get('data', {})
        raw_videos = d.get('videos') or d.get('itemList') or d.get('aweme_list') or []
        if not raw_videos:
            log(f"  challenge/posts body: {_json.dumps(posts_body)[:300]}")
    else:
        log(f"  no challenge_id — trying feed/list keyword search")
        feed_body = _api_get('feed/list', {'keywords': tag, 'count': count, 'cursor': 0, 'region': 'US'})
        log(f"  feed/list body: {_json.dumps(feed_body)[:300]}")
        d = feed_body.get('data', {})
        raw_videos = d.get('videos') or d.get('itemList') or d.get('aweme_list') or []
        if not raw_videos and isinstance(d, list):
            raw_videos = d

    videos = []
    for v in raw_videos:
        try:
            # Author
            author = v.get('author', {})
            author_handle = f"@{author.get('unique_id', author.get('uniqueId', ''))}"
            author_name = author.get('nickname', author_handle)
            cover = author.get('avatar', author.get('avatarThumb', ''))

            # Stats — field names vary across API versions
            plays   = int(v.get('play_count')  or v.get('playCount')  or 0)
            likes   = int(v.get('digg_count')  or v.get('diggCount')  or 0)
            shares  = int(v.get('share_count') or v.get('shareCount') or 0)
            comments = int(v.get('comment_count') or v.get('commentCount') or 0)

            title = v.get('title') or v.get('desc') or ''
            video_id = str(v.get('video_id') or v.get('id') or '')
            video_url = f"https://www.tiktok.com/@{author.get('unique_id', '')}/video/{video_id}"
            thumbnail = v.get('origin_cover') or v.get('cover') or v.get('originCover') or ''
            author_avatar = cover

            niche = detect_niche(title)
            score = viral_score(plays, likes, shares, comments)

            if not video_id:
                continue

            videos.append({
                'tiktok_id': video_id,
                'title': title[:500],
                'author': author_name,
                'views': plays,
                'likes': likes,
                'shares': shares,
                'comments': comments,
                'viral_score': score,
                'video_url': video_url,
                'cover_url': thumbnail or None,
                'author_avatar_url': author_avatar or None,
                'niche': niche,
                'product_name': None,
            })
        except Exception as e:
            log(f"  skip video: {e}")

    return videos

# ── Supabase upsert ───────────────────────────────────────────────────────────
def upsert(videos: list[dict]) -> int:
    if not videos:
        return 0
    result = supabase.table('tiktok_videos').upsert(
        videos, on_conflict='tiktok_id'
    ).execute()
    return len(result.data) if result.data else 0

def log_run(status: str, msg: str, fetched: int = 0, updated: int = 0, error: str | None = None) -> None:
    try:
        supabase.table('scraper_logs').insert({
            'status': status,
            'message': msg,
            'videos_fetched': fetched,
            'videos_updated': updated,
            'error_details': error,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        log(f"WARNING: could not write scraper_logs: {e}")

# ── main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    log("=== TTLike Scraper (RapidAPI) ===")

    all_videos: dict[str, dict] = {}   # deduplicate by tiktok_id

    for tag in HASHTAGS:
        log(f"Fetching #{tag} …")
        try:
            videos = fetch_hashtag(tag, VIDEOS_PER_HASHTAG)
            for v in videos:
                all_videos[v['tiktok_id']] = v
            log(f"  → {len(videos)} videos (total unique: {len(all_videos)})")
        except Exception as e:
            log(f"  ❌ #{tag} failed: {e}")

    unique = list(all_videos.values())
    log(f"Total unique videos: {len(unique)}")

    if not unique:
        log("❌ No videos fetched — check RAPIDAPI_KEY and API quota")
        log_run('error', 'No videos fetched', error='All hashtag requests returned 0 results')
        sys.exit(1)

    updated = upsert(unique)
    log(f"✅ Upserted {updated} rows into tiktok_videos")
    log_run('success', f'Fetched {len(unique)} videos, upserted {updated}', len(unique), updated)

if __name__ == '__main__':
    main()
