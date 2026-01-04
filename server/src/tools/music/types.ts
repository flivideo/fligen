// Music generation types for FR-11

// ============================================
// Provider Types
// ============================================

export type MusicProvider = 'fal' | 'kie';
export type MusicOutputFormat = 'wav' | 'mp3' | 'flac' | 'ogg' | 'm4a';
export type MusicTrackStatus = 'generating' | 'ready' | 'saved' | 'error';

// ============================================
// Request/Response Types
// ============================================

export interface MusicGenerationRequest {
  provider: MusicProvider;
  prompt: string;
  lyrics?: string;
  style?: string;
  tags?: string[];
  instrumental: boolean;
  outputFormat: MusicOutputFormat;
  bpm?: number | 'auto';
  // KIE-specific options
  title?: string;
  model?: string; // V3.5, V4, V4.5, V5
  vocalGender?: 'male' | 'female';
}

export interface GeneratedTrack {
  id: string;
  name: string;
  audioUrl: string;
  audioBase64?: string;
  provider: MusicProvider;
  model: string;
  prompt: string;
  lyrics?: string;
  style?: string;
  duration: number;
  generatedAt: string;
  status: MusicTrackStatus;
  estimatedCost: number;
  generationTimeMs: number;
}

export interface SavedTrack extends GeneratedTrack {
  savedAt: string;
  filename: string;
}

export interface MusicLibraryIndex {
  tracks: SavedTrack[];
}

// ============================================
// FAL.AI SonAuto Types
// ============================================

export interface FalSonautoRequest {
  prompt: string;
  tags?: string[];
  lyrics_prompt?: string;
  bpm?: number | 'auto';
  output_format?: MusicOutputFormat;
  num_songs?: number;
  prompt_strength?: number;
  balance_strength?: number;
}

export interface FalSonautoAudio {
  url: string;
  file_name: string;
  content_type: string;
}

export interface FalSonautoResponse {
  seed: number;
  tags: string[];
  lyrics: string;
  audio: FalSonautoAudio[];
}

// ============================================
// KIE.AI Suno Types
// ============================================

export interface KieSunoRequest {
  model: string; // V3.5, V4, V4.5, V5
  title: string;
  prompt?: string;
  lyrics?: string;
  style?: string;
  instrumental?: boolean;
  vocalGender?: 'male' | 'female';
}

export interface KieSunoTaskResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    status: string;
  };
}

export interface KieSunoTaskResult {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0=processing, 1=success, 2=failed
    status: string;
    progress?: number;
    response?: {
      audioUrl?: string;
      duration?: number;
      title?: string;
    };
    errorMessage?: string;
  };
}
