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
import re
import sys
import math
import json as _json
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

HASHTAGS = [
    'tiktokfinds',
    'tiktokshop',
    'tiktokmademebuyit',
    'amazonfinds',
    'viralproducts',
]

VIDEOS_PER_HASHTAG = 10

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
    eng_score  = min(50.0, engagement * 1000)
    return round(view_score + eng_score, 2)

def detect_niche(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ['health', 'fitness', 'workout', 'posture', 'yoga', 'gym']): return 'Fitness'
    if any(w in t for w in ['beauty', 'makeup', 'skincare', 'glow', 'serum', 'lash']): return 'Beauty'
    if any(w in t for w in ['kitchen', 'cooking', 'food', 'recipe', 'blender', 'chef']): return 'Kitchen'
    if any(w in t for w in ['home', 'decor', 'room', 'house', 'clean', 'organiz']):    return 'Home'
    if any(w in t for w in ['tech', 'gadget', 'phone', 'device', 'smart', 'led', 'light']): return 'Tech'
    if any(w in t for w in ['pet', 'dog', 'cat', 'animal']):                            return 'Pets'
    if any(w in t for w in ['travel', 'trip', 'vacation', 'luggage', 'pillow']):        return 'Travel'
    if any(w in t for w in ['wellness', 'massage', 'pain', 'sleep']):                   return 'Health'
    return 'General'

# ── URL extraction — handles str / list / nested dict ─────────────────────────
def extract_url(field) -> str:
    """Safely extract a URL string from any TikTok API field format."""
    if not field:
        return ''
    if isinstance(field, str):
        return field if field.startswith('http') else ''
    if isinstance(field, list):
        for item in field:
            url = extract_url(item)
            if url:
                return url
        return ''
    if isinstance(field, dict):
        # Most common: url_list array
        url_list = field.get('url_list', [])
        if isinstance(url_list, list) and url_list:
            url = extract_url(url_list[0])
            if url:
                return url
        # Fallback keys
        for key in ('url', 'uri', 'download_url', 'src', 'cover_url'):
            val = field.get(key, '')
            if val and isinstance(val, str) and val.startswith('http'):
                return val
    return ''

# ── Product name extraction from video bio/caption ────────────────────────────
_FILLER = re.compile(
    r'^(pov[:\s]+|omg[!\s]*|wait[!\s]*|ok\s+so[,\s]+|bestie[,\s]+|guys[,\s]+'
    r'|i\s+(got|tried|found|bought|discovered|tested|ordered|used)[,\s]+'
    r'|this\s+(is|was)[,\s]+|check\s+(this\s+out|out)[,\s]+'
    r'|obsessed\s+with[,\s]+|you\s+(need|have\s+to)[,\s]+'
    r'|honestly[,\s]+|literally[,\s]+|not\s+me[,\s]+)',
    re.IGNORECASE,
)

def extract_product_name(title: str) -> str | None:
    """Extract a clean product name from video caption/bio text."""
    if not title:
        return None
    # Text before first hashtag
    base = title.split('#')[0].strip()
    # Remove common filler phrases at the start
    base = _FILLER.sub('', base).strip()
    # Strip trailing punctuation / emoji-like chars
    base = re.sub(r'[\s.,!?:;\-|•@✨🔥💯]+$', '', base).strip()
    # Must be a meaningful length
    if 5 <= len(base) <= 150:
        return base[:150]
    # Fall back to first 100 chars of raw title (before hashtags)
    fallback = title.split('#')[0].strip()[:100].rstrip('.,!? ')
    return fallback if len(fallback) >= 5 else None

# ── RapidAPI ──────────────────────────────────────────────────────────────────
HEADERS = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
}
BASE = f'https://{RAPIDAPI_HOST}'

def _api_get(path: str, params: dict) -> dict:
    resp = requests.get(f'{BASE}/{path}', headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()

def fetch_hashtag(tag: str, count: int = 10) -> list[dict]:
    info_body = _api_get('challenge/info', {'challenge_name': tag})
    log(f"  challenge/info body: {_json.dumps(info_body)[:300]}")

    data = info_body.get('data', {})
    ch   = (data.get('challengeInfo') or data.get('challenge') or {})
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
            # ── Author ──────────────────────────────────────────────────────
            author        = v.get('author', {})
            author_handle = f"@{author.get('unique_id', author.get('uniqueId', ''))}"
            author_name   = author.get('nickname', author_handle)

            # ── Stats ───────────────────────────────────────────────────────
            plays    = int(v.get('play_count')    or v.get('playCount')    or 0)
            likes    = int(v.get('digg_count')    or v.get('diggCount')    or 0)
            shares   = int(v.get('share_count')   or v.get('shareCount')   or 0)
            n_comments = int(v.get('comment_count') or v.get('commentCount') or 0)

            # ── Title / bio ─────────────────────────────────────────────────
            # 'desc' is the video caption/bio; 'title' is a shorter display title
            title = (
                v.get('desc') or v.get('title') or
                v.get('item_title') or v.get('itemTitle') or ''
            )

            # ── Video ID + URL ──────────────────────────────────────────────
            video_id  = str(v.get('video_id') or v.get('id') or v.get('aweme_id') or '')
            video_url = f"https://www.tiktok.com/@{author.get('unique_id', '')}/video/{video_id}"

            # ── Cover image — handle nested dict / list ─────────────────────
            video_obj = v.get('video', {}) or {}
            thumbnail = (
                extract_url(v.get('origin_cover'))   or
                extract_url(v.get('originCover'))    or
                extract_url(video_obj.get('origin_cover')) or
                extract_url(video_obj.get('cover'))  or
                extract_url(v.get('cover'))           or
                extract_url(v.get('cover_url'))       or
                extract_url(video_obj.get('dynamic_cover')) or
                ''
            )

            # ── Author avatar — handle nested dict / list ───────────────────
            author_avatar = (
                extract_url(author.get('avatarLarger')) or
                extract_url(author.get('avatarMedium')) or
                extract_url(author.get('avatarThumb'))  or
                extract_url(author.get('avatar'))       or
                ''
            )

            # ── Published timestamp ─────────────────────────────────────────
            create_time  = v.get('createTime') or v.get('create_time') or v.get('createtime') or 0
            published_at = None
            if create_time:
                try:
                    published_at = datetime.fromtimestamp(int(create_time), tz=timezone.utc).isoformat()
                except Exception:
                    pass

            # ── Product name from bio / caption ─────────────────────────────
            product_name = extract_product_name(title)

            niche = detect_niche(title)
            score = viral_score(plays, likes, shares, n_comments)

            if not video_id:
                continue

            log(f"    video {video_id}: cover={bool(thumbnail)}, "
                f"title={bool(title)}, product={bool(product_name)}")

            videos.append({
                'tiktok_id':        video_id,
                'title':            title[:500],
                'author':           author_name,
                'views':            plays,
                'likes':            likes,
                'shares':           shares,
                'comments':         n_comments,
                'viral_score':      score,
                'video_url':        video_url,
                'cover_url':        thumbnail or None,
                'author_avatar_url': author_avatar or None,
                'niche':            niche,
                'product_name':     product_name,
                'published_at':     published_at,
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
            'status':         status,
            'message':        msg,
            'videos_fetched': fetched,
            'videos_updated': updated,
            'error_details':  error,
            'created_at':     datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        log(f"WARNING: could not write scraper_logs: {e}")

# ── main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    log("=== TTLike Scraper (RapidAPI) ===")

    all_videos: dict[str, dict] = {}

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
