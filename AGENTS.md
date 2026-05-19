<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 5. Feature Specification: Product Detail & UX Flow Enhancement

### A. Route Flow Architecture
- User selects product card -> Router targets `/admin/products/[id]` (Internal Details).
- Metadata extraction runs asynchronously or hydrates from DB: Parses ASR (Speech-to-Text), Captions, and metrics.
- User clicks "Clone & Rewrite" -> Redirects to `/admin/generate?from_video=[id]&...` pre-populating client state.

### B. UI Mockup Blueprint for `app/admin/products/[id]/page.tsx`
Refactor layout to support a dual-panel or stacked workspace embedding AI insights:

```
+--------------------------------------------------------------------------+
| [Left Panel: Video & Native Insights]  | [Right Panel: AI Deep Dive]    |
| +-----------------------------------+  | +--------------------------+    |
| |                                   |  | | 🚀 AI 爆款拆解面板        |    |
| |    TikTok Player /                |  | +--------------------------+    |
| |    Video Cover                    |  | | * Category:  [Auto-Tag]  |    |
| |                                   |  | | * Painpoint: [Auto-Tag]  |    |
| +-----------------------------------+  | | * Hook/Selling: [Values] |    |
| |    Engagement Metrics             |  | +--------------------------+    |
| |    Likes / Shares / Comments      |  | | 📝 AI Extracted Script   |    |
| +-----------------------------------+  | |  (Raw ASR/Caption Data)  |    |
|                                        | +--------------------------+    |
|                                        | [  ✨ Clone & Rewrite    ]      |
+--------------------------------------------------------------------------+
```

### C. Implementation Steps for Claude Code
1. **Data Hydration**: Ensure the API route or Server Component for `/api/products/[id]` returns `metrics` (likes, shares), `raw_caption`, `asr_transcript`, and an array of AI-generated `tags` (category, painpoints, unique selling propositions).
2. **UI Implementation**: Update the detail view page template to render these metrics cleanly using a modern, minimalist card component layout.
3. **Action Trigger**: Wire up the main CTA button (`[ ✨ Clone & Rewrite ]`) to append these verified data properties straight into the Next.js router query parameters as outlined in Step 2.
