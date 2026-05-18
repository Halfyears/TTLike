#!/usr/bin/env python3
"""
TikTok trending data fetcher.

Pulls trending product videos from TikTok's public discover/trending endpoints
and upserts them into Supabase (tiktok_videos table). Every run is logged to
the scraper_logs table (success or error).

Required env vars:
  SUPABASE_URL          — your project URL
  SUPABASE_SERVICE_KEY  — service-role key (bypasses RLS)
  TIKTOK_API_KEY        — optional; uses mock data if absent (dev mode)

Run manually:
  pip install supabase python-dotenv requests
  python scripts/fetch_tiktok.py
"""

import os
import sys
import math
import uuid
import logging
import datetime

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TIKTOK_API_KEY = os.getenv("TIKTOK_API_KEY", "")

# ---------------------------------------------------------------------------
# Scraper logging
# ---------------------------------------------------------------------------

def log_run(
    supabase: Client,
    *,
    status: str,
    message: str,
    videos_fetched: int = 0,
    videos_updated: int = 0,
    error_details: str | None = None,
) -> None:
    """Write a row to scraper_logs. Swallow errors so a logging failure never
    crashes the scraper itself."""
    try:
        supabase.table("scraper_logs").insert({
            "status": status,
            "message": message,
            "videos_fetched": videos_fetched,
            "videos_updated": videos_updated,
            "error_details": error_details,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        }).execute()
    except Exception as exc:
        log.warning(f"Could not write scraper_logs: {exc}")


# ---------------------------------------------------------------------------
# TikTok data source
# ---------------------------------------------------------------------------

def fetch_trending_videos_mock() -> list[dict]:
    """Return deterministic mock data when no API key is configured."""
    now = datetime.datetime.utcnow().isoformat() + "Z"
    products = [
        ("Posture Corrector Pro", "Health"),
        ("LED Strip Lights Kit", "Home"),
        ("Portable Blender Mini", "Kitchen"),
        ("Silk Sleep Mask", "Beauty"),
        ("Magnetic Phone Stand", "Tech"),
        ("Resistance Bands Set", "Fitness"),
        ("Jade Roller Set", "Beauty"),
        ("Cold Brew Coffee Maker", "Kitchen"),
        ("Smart Jump Rope", "Fitness"),
        ("Aromatherapy Diffuser", "Home"),
    ]
    videos = []
    for i, (name, niche) in enumerate(products):
        views = 500_000 + i * 300_000
        likes = views // 20
        shares = views // 100
        comments = views // 200
        videos.append({
            "videoId": f"mock_{uuid.uuid4().hex[:16]}",
            "title": f"{name} TikTok viral compilation",
            "description": f"Check out this amazing {name}!",
            "authorName": f"TikTok Creator {i + 1}",
            "authorHandle": f"@creator_{i + 1}",
            "viewCount": views,
            "likeCount": likes,
            "shareCount": shares,
            "commentCount": comments,
            "thumbnailUrl": None,
            "videoUrl": None,
            "hashtags": [f"#{niche.lower()}", "#tiktokfinds", "#viral"],
            "productName": name,
            "niche": niche,
            "viralScore": min(99.0, 60 + (views / 500_000) * 5),
            "publishedAt": now,
        })
    return videos


def fetch_trending_videos_api() -> list[dict]:
    """
    Fetch from TikTok Research API (requires approved developer access).
    Docs: https://developers.tiktok.com/doc/research-api-get-videos/

    Replace this implementation with the specific endpoint your key permits.
    """
    endpoint = "https://open.tiktokapis.com/v2/research/video/query/"
    headers = {
        "Authorization": f"Bearer {TIKTOK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "query": {
            "and": [{"operation": "IN", "field_name": "hashtag_name", "field_values": ["tiktokfinds", "tiktokshop"]}]
        },
        "start_date": (datetime.date.today() - datetime.timedelta(days=1)).strftime("%Y%m%d"),
        "end_date": datetime.date.today().strftime("%Y%m%d"),
        "max_count": 50,
        "fields": "id,desc,author,statistics,video",
    }
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    raw = resp.json().get("data", {}).get("videos", [])

    videos = []
    for v in raw:
        stats = v.get("statistics", {})
        views = int(stats.get("view_count", 0))
        likes = int(stats.get("like_count", 0))
        shares = int(stats.get("share_count", 0))
        comments = int(stats.get("comment_count", 0))
        viral_score = compute_viral_score(views, likes, shares, comments)
        author = v.get("author", {})
        videos.append({
            "videoId": str(v.get("id", "")),
            "title": v.get("desc", "")[:500],
            "description": v.get("desc", ""),
            "authorName": author.get("display_name", ""),
            "authorHandle": f"@{author.get('username', '')}",
            "viewCount": views,
            "likeCount": likes,
            "shareCount": shares,
            "commentCount": comments,
            "thumbnailUrl": v.get("video", {}).get("cover_image_url"),
            "videoUrl": f"https://www.tiktok.com/@{author.get('username', '')}/video/{v.get('id', '')}",
            "hashtags": [],
            "productName": None,
            "niche": None,
            "viralScore": viral_score,
            "publishedAt": v.get("create_time"),
        })
    return videos


def compute_viral_score(views: int, likes: int, shares: int, comments: int) -> float:
    if views == 0:
        return 0.0
    engagement = (likes + shares * 3 + comments * 2) / views
    view_score = min(50.0, math.log10(max(views, 1)) * 10)
    engagement_score = min(50.0, engagement * 1000)
    return round(view_score + engagement_score, 2)


# ---------------------------------------------------------------------------
# Supabase upsert
# ---------------------------------------------------------------------------

def upsert_videos(supabase: Client, videos: list[dict]) -> int:
    """Upsert videos into tiktok_videos. Returns count of upserted rows."""
    if not videos:
        return 0

    rows = []
    for v in videos:
        rows.append({
            "id": str(uuid.uuid4()),
            "videoId": v["videoId"],
            "title": v["title"],
            "description": v.get("description"),
            "authorName": v["authorName"],
            "authorHandle": v["authorHandle"],
            "viewCount": v["viewCount"],
            "likeCount": v["likeCount"],
            "shareCount": v["shareCount"],
            "commentCount": v["commentCount"],
            "thumbnailUrl": v.get("thumbnailUrl"),
            "videoUrl": v.get("videoUrl"),
            "hashtags": v.get("hashtags", []),
            "productName": v.get("productName"),
            "niche": v.get("niche"),
            "viralScore": v["viralScore"],
            "publishedAt": v.get("publishedAt"),
        })

    result = (
        supabase.table("tiktok_videos")
        .upsert(rows, on_conflict="videoId")
        .execute()
    )
    return len(result.data) if result.data else len(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    log.info("Connecting to Supabase…")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try:
        if TIKTOK_API_KEY:
            log.info("Fetching from TikTok Research API…")
            videos = fetch_trending_videos_api()
        else:
            log.warning("TIKTOK_API_KEY not set — using mock data")
            videos = fetch_trending_videos_mock()

        log.info(f"Fetched {len(videos)} videos")
        count = upsert_videos(supabase, videos)
        log.info(f"✅ Upserted {count} rows into tiktok_videos")

        log_run(
            supabase,
            status="success",
            message=f"Fetched {len(videos)} videos, upserted {count} rows",
            videos_fetched=len(videos),
            videos_updated=count,
        )

    except Exception as exc:
        log.error(f"❌ Scraper failed: {exc}")
        log_run(
            supabase,
            status="error",
            message="Scraper run failed",
            error_details=str(exc),
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
