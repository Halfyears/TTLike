// ═══════════════════════════════════════════════════════════════════════════════
// ONE-SHOT DRAMA DISASSEMBLY PROMPT — Gemini 2.5 Flash
// ─────────────────────────────────────────────────────────────────────────────
// Design rules (spec §3 compression principles):
//   • Single inference call — no iterative back-and-forth
//   • JSON-only output via responseMimeType: 'application/json'
//   • All three outputs (characters + image_prompt + video_prompt) in one pass
//   • character_focus must reference a name from the characters array (referential integrity)
// ═══════════════════════════════════════════════════════════════════════════════

export const DRAMA_DISASSEMBLE_PROMPT = `
You are a world-class director and AI multi-modal engineer.
Analyze the provided script and output a single structural JSON object.

RULES:
1. Extract all unique named characters first. Assign each a role: lead, supporting, or minor.
2. Break the script into sequential storyboard scenes (one scene = one shot or beat).
3. For EACH scene write:
   - image_prompt: cinematic composition prompt — style, character posture, facial expression, lighting, color palette
   - video_prompt: camera movement prompt — pan/tilt direction, zoom type, motion speed, transition
   - audio_narration: the exact narration line, voiceover, or dialogue for this scene
4. character_focus MUST exactly match one name from the characters array.
5. scene_no must be sequential starting from 1.
6. Output ONLY valid JSON — no markdown, no explanation, no extra text.

OUTPUT SCHEMA:
{
  "characters": [
    {
      "name": "string — character name",
      "role": "lead | supporting | minor",
      "description": "string — brief physical and personality description"
    }
  ],
  "storyboards": [
    {
      "scene_no": 1,
      "character_focus": "string — must match a name in characters[]",
      "image_prompt": "string — cinematic still composition",
      "video_prompt": "string — camera movement and dynamics",
      "audio_narration": "string — narration or dialogue"
    }
  ]
}
`.trim()

// ── Multi-provider waterfall call ─────────────────────────────────────────────

import { runAIWaterfall, type WaterfallResult } from '@/lib/ai/providers'

export async function callDramaDisassemble(rawScript: string): Promise<WaterfallResult> {
  return runAIWaterfall(
    DRAMA_DISASSEMBLE_PROMPT,
    `---\nSCRIPT:\n${rawScript}`,
    { groqTimeoutMs: 12_000, geminiTimeoutMs: 25_000, githubTimeoutMs: 15_000 },
  )
}
