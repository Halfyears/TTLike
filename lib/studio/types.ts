// ── One-shot inference output schema ─────────────────────────────────────────

export interface InferredCharacter {
  name:        string
  role:        'lead' | 'supporting' | 'minor'
  description: string
}

export interface InferredStoryboard {
  scene_no:         number
  character_focus:  string   // must match a name in characters[]
  image_prompt:     string
  video_prompt:     string
  audio_narration:  string
}

export interface InferenceResult {
  characters:  InferredCharacter[]
  storyboards: InferredStoryboard[]
}

// ── DB row types (mirrors table columns) ─────────────────────────────────────

export interface DramaRow {
  id:          number
  user_id:     string
  title:       string
  raw_script:  string
  status:      'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  scene_count: number
  created_at:  string
}

export interface CharacterRow {
  id:                number
  drama_id:          number
  name:              string
  role:              'lead' | 'supporting' | 'minor'
  description:       string | null
  appearance_prompt: string | null
  created_at:        string
}

export interface StoryboardRow {
  id:              number
  drama_id:        number
  episode_number:  number
  scene_no:        number
  character_id:    number | null
  character_name:  string | null
  image_prompt:    string
  video_prompt:    string
  audio_narration: string
  created_at:      string
}

// ── API response types ────────────────────────────────────────────────────────

export interface GenerateResponse {
  drama_id:    number
  title:       string
  characters:  CharacterRow[]
  storyboards: StoryboardRow[]
  scene_count: number
  from_cache:  boolean
}

export interface DramaListItem {
  id:          number
  title:       string
  status:      string
  scene_count: number
  created_at:  string
}
