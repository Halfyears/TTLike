"""
backend_failover/main.py
TTLike Hook Machine — Python Failover Gateway v2.1

Architecture: Three-plane isolation
  ┌─────────────────────────────────────────────────────────┐
  │  DATA PLANE      │  FastAPI endpoint + multi-provider   │
  │  CONTROL PLANE   │  Inference breaker + Observ. breaker │
  │  TELEMETRY PLANE │  BackgroundTasks — zero main-loop tax │
  └─────────────────────────────────────────────────────────┘

TypeScript JSON schema contract (lib/types/hooks.ts):
  TTLikeHookResponse = {
    original_analysis:   { scroll_stop_score: int, brutal_feedback: str }
    hook_classification: { primary_pattern: str, dominant_emotions: str[] }
    variants:            HookVariant[]   // exactly 4
  }
  HookVariant = {
    id: int, pattern: str, emotion: str, text: str, visual_action: str
  }

Provider waterfall (priority order):
  groq   — llama-3.3-70b-versatile  (fastest, free tier)
  gemini — gemini-2.5-flash          (matches Next.js primary)
  github — gpt-4o-mini               (Azure inference endpoint)
"""

import os
import time
import json
import httpx
from collections import deque
from typing import List, Optional, Deque, Literal
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Response, Header, BackgroundTasks

app = FastAPI(title="TTLike Failover Gateway", version="2.1.0")

# ── Env vars ──────────────────────────────────────────────────────────────────
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY",   "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN",   "")

# =====================================================================
# 📐 SCHEMA CONTRACT LAYER — Mirrors lib/types/hooks.ts exactly
# =====================================================================

class HookVariant(BaseModel):
    """Maps 1-to-1 with TypeScript HookVariant interface."""
    id:            int
    pattern:       Literal["Shock Reversal", "Negative Interruption", "Visual Peak", "Curiosity Gap"]
    emotion:       Literal["Status Anxiety", "Time Scarcity", "Vanity", "Social Proof"]
    text:          str   # ≤ 15 words, ready-to-record
    visual_action: str   # CapCut / phone-framing directive


class OriginalAnalysis(BaseModel):
    scroll_stop_score: int = Field(..., ge=0, le=100)
    brutal_feedback:   str


class HookClassification(BaseModel):
    primary_pattern:   str
    dominant_emotions: List[str] = Field(..., min_length=1, max_length=3)


class TTLikeHookResponse(BaseModel):
    """Root response — aligns with TTLikeHookResponse TypeScript contract."""
    original_analysis:   OriginalAnalysis
    hook_classification: HookClassification
    variants:            List[HookVariant] = Field(..., min_length=4, max_length=4)


class GatewayMetrics(BaseModel):
    """Internal telemetry payload — NOT returned to frontend."""
    request_id:    str
    provider:      str
    latency_ms:    int
    fallback_count: int
    success:       bool
    status_code:   int
    error_message: Optional[str] = None


# =====================================================================
# 🛡️ CONTROL PLANE — LAYER 1: INFERENCE CIRCUIT BREAKER
# =====================================================================

PROVIDER_STATUS: dict[str, dict] = {
    "groq":   {"consecutive_failures": 0, "disabled_until": 0.0},
    "gemini": {"consecutive_failures": 0, "disabled_until": 0.0},
    "github": {"consecutive_failures": 0, "disabled_until": 0.0},
}
INFERENCE_FAILURE_THRESHOLD = 5
COOL_DOWN_PERIOD            = 300  # 5 minutes


def is_provider_available(provider: str) -> bool:
    state = PROVIDER_STATUS.get(provider)
    if not state:
        return False
    if state["disabled_until"] > time.time():
        return False
    if state["disabled_until"] > 0 and time.time() > state["disabled_until"]:
        state["consecutive_failures"] = 0
        state["disabled_until"] = 0.0
        print(f"🟢 [INFERENCE RECOVERY] Provider '{provider}' is back online.")
    return True


def record_inference_result(provider: str, success: bool) -> None:
    state = PROVIDER_STATUS.get(provider)
    if not state:
        return
    if success:
        state["consecutive_failures"] = 0
    else:
        state["consecutive_failures"] += 1
        if state["consecutive_failures"] >= INFERENCE_FAILURE_THRESHOLD:
            state["disabled_until"] = time.time() + COOL_DOWN_PERIOD
            print(
                f"🔴 [INFERENCE BREAKER TRIPPED] '{provider}' failed "
                f"{INFERENCE_FAILURE_THRESHOLD} times consecutively. "
                f"Cooling down for {COOL_DOWN_PERIOD}s."
            )


# =====================================================================
# 🔭 CONTROL PLANE — LAYER 2: OBSERVABILITY CIRCUIT BREAKER
# =====================================================================

OBSERVABILITY_WINDOW_SIZE:   int   = 20
OBSERVABILITY_TRIP_RATIO:    float = 0.50
OBSERVABILITY_MUTE_SECONDS:  int   = 600

class _ObservabilityState:
    def __init__(self, window: int, trip_ratio: float, mute_secs: int) -> None:
        self._window:     Deque[bool] = deque(maxlen=window)
        self._trip_ratio: float = trip_ratio
        self._mute_secs:  int   = mute_secs
        self.enabled:     bool  = True
        self.muted_until: float = 0.0

    def is_active(self) -> bool:
        if self.enabled:
            return True
        if time.time() > self.muted_until:
            self.enabled = True
            self._window.clear()
            print("🟢 [OBSERVABILITY RECOVERY] Mute window expired. Telemetry pipeline re-probing.")
        return self.enabled

    def record(self, success: bool) -> None:
        self._window.append(success)
        self._evaluate()

    def _evaluate(self) -> None:
        if not self._window:
            return
        total    = len(self._window)
        failures = self._window.count(False)
        rate     = failures / total
        if rate > self._trip_ratio and self.enabled:
            self.enabled     = False
            self.muted_until = time.time() + self._mute_secs
            print(
                f"🚨 [OBSERVABILITY BREAKER TRIPPED] "
                f"Failure rate {rate:.0%} over last {total} events exceeds "
                f"{self._trip_ratio:.0%} threshold. "
                f"Muting telemetry pipeline for {self._mute_secs}s to protect core inference."
            )

    @property
    def failure_rate(self) -> float:
        if not self._window:
            return 0.0
        return self._window.count(False) / len(self._window)

    @property
    def window_depth(self) -> int:
        return len(self._window)


OBSERVABILITY = _ObservabilityState(
    window     = OBSERVABILITY_WINDOW_SIZE,
    trip_ratio = OBSERVABILITY_TRIP_RATIO,
    mute_secs  = OBSERVABILITY_MUTE_SECONDS,
)


# =====================================================================
# ⚡ CONTROL PLANE — LAYER 3: TELEMETRY EVENT BUS
# =====================================================================

async def log_gateway_telemetry_async(metrics: GatewayMetrics) -> None:
    if not OBSERVABILITY.is_active():
        return
    try:
        print(
            f"📊 [TELEMETRY OK] "
            f"id={metrics.request_id} "
            f"provider={metrics.provider} "
            f"latency={metrics.latency_ms}ms "
            f"success={metrics.success} "
            f"window_depth={OBSERVABILITY.window_depth} "
            f"failure_rate={OBSERVABILITY.failure_rate:.0%}"
        )
        OBSERVABILITY.record(success=True)
    except Exception as exc:
        print(f"⚠️  [TELEMETRY JITTER] Upload failed: {exc}")
        OBSERVABILITY.record(success=False)


# =====================================================================
# 🤖 DATA PLANE — AI PROVIDER IMPLEMENTATIONS
# =====================================================================

# ── Shared prompt ──────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a direct-response TikTok scroll-stop analyst for eCommerce media buyers."
)

def _build_hook_prompt(hook_text: str) -> str:
    return f"""Analyse the provided hook and return a structured JSON response.

INPUT HOOK:
"{hook_text}"

OUTPUT RULES:
- Return raw JSON only — no markdown, no code fences, no commentary.
- scroll_stop_score: 0–100 integer (100 = stops everyone)
- brutal_feedback: 1 cold operator sentence — what's weak or strong
- primary_pattern: the dominant hook mechanic detected
- dominant_emotions: up to 3 psychological drivers (e.g. "Fear of Missing Out", "Shame", "Curiosity")
- variants: exactly 4 objects, one per pattern below:
  1. pattern: "Shock Reversal"        emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  2. pattern: "Negative Interruption" emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  3. pattern: "Visual Peak"           emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
  4. pattern: "Curiosity Gap"         emotion: one of [Status Anxiety, Time Scarcity, Vanity, Social Proof]
- Each variant.text must be ≤ 15 words, ready-to-record
- Each variant.visual_action must be a 1-sentence CapCut/phone-shoot directive
- Assign variant.id as 1, 2, 3, 4

JSON schema:
{{
  "original_analysis": {{
    "scroll_stop_score": <number 0-100>,
    "brutal_feedback": "<string>"
  }},
  "hook_classification": {{
    "primary_pattern": "<string>",
    "dominant_emotions": ["<string>", ...]
  }},
  "variants": [
    {{
      "id": 1,
      "pattern": "Shock Reversal",
      "emotion": "<Status Anxiety|Time Scarcity|Vanity|Social Proof>",
      "text": "<ready-to-record hook ≤15 words>",
      "visual_action": "<CapCut/phone framing directive>"
    }},
    ...
  ]
}}

Return only valid JSON."""


# ── Shared response parser + validator ────────────────────────────────────────

_VALID_PATTERNS = ["Shock Reversal", "Negative Interruption", "Visual Peak", "Curiosity Gap"]
_VALID_EMOTIONS = ["Status Anxiety", "Time Scarcity", "Vanity", "Social Proof"]


def _parse_and_validate(raw: str) -> TTLikeHookResponse:
    """Parse raw JSON string from any provider into a validated TTLikeHookResponse."""
    raw = raw.strip()

    # Strip markdown code fences if present (some providers add them despite instructions)
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[:-3].rstrip()

    try:
        parsed: dict = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Provider returned unparseable JSON: {exc}") from exc

    # Validate required top-level structure
    analysis = parsed.get("original_analysis", {})
    if not isinstance(analysis.get("scroll_stop_score"), (int, float)):
        raise ValueError("Missing or invalid scroll_stop_score")

    variants_raw = parsed.get("variants", [])
    if not isinstance(variants_raw, list) or len(variants_raw) < 4:
        raise ValueError(f"Expected ≥4 variants, got {len(variants_raw)}")

    # Build validated variants — clamp Literal fields to allowed values
    variants: list[HookVariant] = []
    for i, v in enumerate(variants_raw[:4]):
        pattern = v.get("pattern", _VALID_PATTERNS[i])
        emotion = v.get("emotion", _VALID_EMOTIONS[0])
        # Fuzzy-match: accept pattern/emotion even if slightly off
        if pattern not in _VALID_PATTERNS:
            pattern = _VALID_PATTERNS[i % len(_VALID_PATTERNS)]
        if emotion not in _VALID_EMOTIONS:
            emotion = _VALID_EMOTIONS[0]
        variants.append(HookVariant(
            id=i + 1,
            pattern=pattern,  # type: ignore[arg-type]
            emotion=emotion,  # type: ignore[arg-type]
            text=str(v.get("text", ""))[:200],
            visual_action=str(v.get("visual_action", ""))[:400],
        ))

    classification = parsed.get("hook_classification", {})
    dominant = classification.get("dominant_emotions", ["Curiosity"])
    if not isinstance(dominant, list) or not dominant:
        dominant = ["Curiosity"]

    return TTLikeHookResponse(
        original_analysis=OriginalAnalysis(
            scroll_stop_score=int(min(100, max(0, analysis["scroll_stop_score"]))),
            brutal_feedback=str(analysis.get("brutal_feedback", "")),
        ),
        hook_classification=HookClassification(
            primary_pattern=str(classification.get("primary_pattern", "Curiosity Gap")),
            dominant_emotions=dominant[:3],
        ),
        variants=variants,
    )


# ── Provider: Groq (llama-3.3-70b-versatile) ─────────────────────────────────

async def call_groq(hook_text: str) -> TTLikeHookResponse:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    async with httpx.AsyncClient(timeout=25.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": _build_hook_prompt(hook_text)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                "max_tokens":  1024,
            },
        )
        if not res.is_success:
            err = res.json().get("error", {}).get("message", f"HTTP {res.status_code}")
            raise RuntimeError(f"Groq error: {err}")
        data    = res.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Groq returned empty choices list")
        raw = choices[0].get("message", {}).get("content", "")
        if not raw:
            raise RuntimeError("Groq returned empty content")
        return _parse_and_validate(raw)


# ── Provider: Gemini 2.5 Flash (mirrors Next.js app implementation) ───────────

async def call_gemini(hook_text: str) -> TTLikeHookResponse:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=25.0) as client:
        res = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": _build_hook_prompt(hook_text)}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature":      0.7,
                    "maxOutputTokens":  1024,
                },
            },
        )
        if not res.is_success:
            err = res.json().get("error", {}).get("message", f"HTTP {res.status_code}")
            raise RuntimeError(f"Gemini error: {err}")
        data       = res.json()
        candidates = data.get("candidates", [])
        if not candidates:
            block_reason = data.get("promptFeedback", {}).get("blockReason", "unknown")
            raise RuntimeError(f"Gemini returned no candidates (blockReason: {block_reason})")
        candidate = candidates[0]
        parts = candidate.get("content", {}).get("parts", [])
        raw   = parts[0].get("text", "").strip() if parts else ""
        if not raw:
            raise RuntimeError("Gemini returned empty content")
        return _parse_and_validate(raw)


# ── Provider: GitHub Models / Azure Inference (gpt-4o-mini) ──────────────────

async def call_github(hook_text: str) -> TTLikeHookResponse:
    if not GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN not configured")
    async with httpx.AsyncClient(timeout=25.0) as client:
        res = await client.post(
            "https://models.inference.ai.azure.com/chat/completions",
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": _build_hook_prompt(hook_text)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                "max_tokens":  1024,
            },
        )
        if not res.is_success:
            err = res.json().get("error", {}).get("message", f"HTTP {res.status_code}")
            raise RuntimeError(f"GitHub Models error: {err}")
        data    = res.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("GitHub Models returned empty choices list")
        raw = choices[0].get("message", {}).get("content", "")
        if not raw:
            raise RuntimeError("GitHub Models returned empty content")
        return _parse_and_validate(raw)


# ── Provider dispatch map ─────────────────────────────────────────────────────

_PROVIDER_CALLS = {
    "groq":   call_groq,
    "gemini": call_gemini,
    "github": call_github,
}

# ── Dev-mode mock (used only when ALL API keys are absent) ────────────────────

def _build_mock_response(hook_text: str, provider: str) -> TTLikeHookResponse:
    """
    Deterministic stub for local development when no API keys are set.
    Never reached in production.
    """
    return TTLikeHookResponse(
        original_analysis=OriginalAnalysis(
            scroll_stop_score=88,
            brutal_feedback=(
                f"[DEV MOCK via {provider}] Hook triggers curiosity but lacks a concrete "
                "price anchor — add a dollar figure to double the stop rate."
            ),
        ),
        hook_classification=HookClassification(
            primary_pattern="Curiosity Gap",
            dominant_emotions=["Status Anxiety", "Vanity"],
        ),
        variants=[
            HookVariant(id=1, pattern="Shock Reversal",        emotion="Status Anxiety",
                        text="Stop paying $300 when this $12 gadget does it better.",
                        visual_action="🎬 Overhead flat-lay unbox, hold price tag to lens at 0.5s."),
            HookVariant(id=2, pattern="Negative Interruption", emotion="Time Scarcity",
                        text="Still wasting 2 hours on this? There's a smarter way.",
                        visual_action="🎬 POV countdown timer overlay, cut to solution at 3s."),
            HookVariant(id=3, pattern="Visual Peak",           emotion="Vanity",
                        text="My before vs after after 7 days shocked even me.",
                        visual_action="🎬 Split-screen jump-cut, zoom-punch on the 'after' frame."),
            HookVariant(id=4, pattern="Curiosity Gap",         emotion="Social Proof",
                        text="Everyone's buying this — here's why they're right.",
                        visual_action="🎬 Rapid montage of 4× micro-testimonials, text pop at each cut."),
        ],
    )

_DEV_MODE = not any([GROQ_API_KEY, GEMINI_API_KEY, GITHUB_TOKEN])
if _DEV_MODE:
    print("⚠️  [DEV MODE] No API keys found — mock responses will be used for all providers.")


# =====================================================================
# 🚀 DATA PLANE — PRIMARY INFERENCE ENDPOINT
# =====================================================================

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Raw hook text to analyse")


PROVIDER_PRIORITY: list[str] = ["groq", "gemini", "github"]


@app.post(
    "/api/analyze",
    response_model=TTLikeHookResponse,
    summary="Analyse a TikTok hook and return 4 anti-duplication variants",
)
async def analyze_tiktok_hook(
    request:          AnalyzeRequest,
    response:         Response,
    background_tasks: BackgroundTasks,
    x_request_id:    Optional[str] = Header(None),
) -> TTLikeHookResponse:
    """
    Main inference endpoint.
    - Waterfall failover across PROVIDER_PRIORITY list
    - Real AI calls (Groq → Gemini → GitHub); dev-mode mock when no keys
    - Telemetry emitted asynchronously — never touches the return path
    """
    start_time = time.time()
    req_id     = x_request_id or f"loc_{int(start_time * 1000)}"
    fallbacks  = 0

    selected_provider: Optional[str] = None
    last_error: Optional[Exception]  = None

    for provider in PROVIDER_PRIORITY:
        if not is_provider_available(provider):
            fallbacks += 1
            continue
        try:
            if _DEV_MODE:
                # Dev fallback: return mock immediately on first available provider
                result = _build_mock_response(request.text, provider)
            else:
                call_fn = _PROVIDER_CALLS[provider]
                result  = await call_fn(request.text)

            record_inference_result(provider, success=True)
            selected_provider = provider
            break

        except Exception as exc:
            record_inference_result(provider, success=False)
            last_error = exc
            fallbacks += 1
            print(f"⚡ [FAILOVER] Provider '{provider}' errored: {exc}. Trying next.")

    if selected_provider is None:
        latency = int((time.time() - start_time) * 1000)
        background_tasks.add_task(
            log_gateway_telemetry_async,
            GatewayMetrics(
                request_id=req_id, provider="all_failed",
                latency_ms=latency, fallback_count=fallbacks,
                success=False, status_code=502,
                error_message=str(last_error),
            ),
        )
        raise HTTPException(status_code=502, detail="All inference providers unavailable.")

    latency = int((time.time() - start_time) * 1000)
    background_tasks.add_task(
        log_gateway_telemetry_async,
        GatewayMetrics(
            request_id=req_id, provider=selected_provider,
            latency_ms=latency, fallback_count=fallbacks,
            success=True, status_code=200,
        ),
    )

    response.headers["X-TTLike-Executing-Provider"] = selected_provider
    response.headers["X-Request-ID"]                = req_id
    response.headers["X-Fallback-Count"]            = str(fallbacks)
    response.headers["X-Dev-Mode"]                  = str(_DEV_MODE).lower()

    return result


# =====================================================================
# 📡 OPS ENDPOINTS
# =====================================================================

@app.get("/health", include_in_schema=False)
async def health() -> dict:
    return {
        "status":   "ok",
        "ts":       time.time(),
        "dev_mode": _DEV_MODE,
        "providers": {
            p: bool(key)
            for p, key in [
                ("groq",   GROQ_API_KEY),
                ("gemini", GEMINI_API_KEY),
                ("github", GITHUB_TOKEN),
            ]
        },
    }


@app.get("/ops/circuit-breakers", tags=["ops"])
async def circuit_breaker_status() -> dict:
    now = time.time()
    return {
        "observability": {
            "enabled":                   OBSERVABILITY.enabled,
            "failure_rate":              round(OBSERVABILITY.failure_rate, 4),
            "window_depth":              OBSERVABILITY.window_depth,
            "window_size":               OBSERVABILITY_WINDOW_SIZE,
            "trip_ratio":                OBSERVABILITY_TRIP_RATIO,
            "muted_until_epoch":         OBSERVABILITY.muted_until,
            "muted_seconds_remaining":   max(0.0, round(OBSERVABILITY.muted_until - now, 1)),
        },
        "inference_providers": {
            provider: {
                "available":                  is_provider_available(provider),
                "key_configured":             bool(
                    GROQ_API_KEY   if provider == "groq"   else
                    GEMINI_API_KEY if provider == "gemini" else
                    GITHUB_TOKEN
                ),
                "consecutive_failures":       state["consecutive_failures"],
                "disabled_until_epoch":       state["disabled_until"],
                "cooldown_seconds_remaining": max(0.0, round(state["disabled_until"] - now, 1)),
            }
            for provider, state in PROVIDER_STATUS.items()
        },
        "dev_mode": _DEV_MODE,
    }
