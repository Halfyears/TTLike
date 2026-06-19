-- ═══════════════════════════════════════════════════════════════════════════════
-- Studio — AI Drama Disassembly Tables
-- Run in Supabase SQL Editor.
--
-- Design principles:
--   • drama_storyboards uses normalized rows (not JSONB array) for queryability
--   • episode_number defaults to 1 for short video MVP; multi-episode ready
--   • drama_characters is independent for future character-consistency features
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Dramas (main entry) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dramas (
  id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  raw_script  TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  scene_count INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dramas_user_created_idx
  ON dramas (user_id, created_at DESC);

ALTER TABLE dramas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dramas_user_all"
  ON dramas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Characters (independent — future consistency prompts) ──────────────────

CREATE TABLE IF NOT EXISTS drama_characters (
  id                BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  drama_id          BIGINT  NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
  name              TEXT    NOT NULL,
  role              TEXT    NOT NULL DEFAULT 'supporting'
                      CHECK (role IN ('lead', 'supporting', 'minor')),
  description       TEXT,
  -- appearance_prompt: reusable style anchor for image generation consistency
  appearance_prompt TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drama_characters_drama_idx
  ON drama_characters (drama_id);

ALTER TABLE drama_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_characters_via_drama"
  ON drama_characters FOR ALL
  USING (EXISTS (
    SELECT 1 FROM dramas d
    WHERE d.id = drama_id AND d.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM dramas d
    WHERE d.id = drama_id AND d.user_id = auth.uid()
  ));

-- ── 3. Storyboards (normalized rows — queryable by scene / character) ─────────

CREATE TABLE IF NOT EXISTS drama_storyboards (
  id               BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  drama_id         BIGINT  NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
  -- episode_number: 1 for short video MVP; multi-episode adds more rows, no schema change
  episode_number   INTEGER NOT NULL DEFAULT 1,
  scene_no         INTEGER NOT NULL,
  -- character_id: nullable FK — populated on insert; future: enforce NOT NULL
  character_id     BIGINT  REFERENCES drama_characters(id) ON DELETE SET NULL,
  character_name   TEXT,       -- denormalized for display (avoids JOIN on list view)
  image_prompt     TEXT    NOT NULL,
  video_prompt     TEXT    NOT NULL,
  audio_narration  TEXT    NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (drama_id, episode_number, scene_no)
);

CREATE INDEX IF NOT EXISTS drama_storyboards_drama_episode_idx
  ON drama_storyboards (drama_id, episode_number, scene_no ASC);

CREATE INDEX IF NOT EXISTS drama_storyboards_character_idx
  ON drama_storyboards (character_id);

ALTER TABLE drama_storyboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drama_storyboards_via_drama"
  ON drama_storyboards FOR ALL
  USING (EXISTS (
    SELECT 1 FROM dramas d
    WHERE d.id = drama_id AND d.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM dramas d
    WHERE d.id = drama_id AND d.user_id = auth.uid()
  ));
