// Shared types for FliGen
import config from './config.json';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

export interface ServerConfig {
  port: number;
  clientUrl: string;
}

// ============================================
// Shot List Types (FR-10)
// ============================================

export type Provider = 'fal' | 'kie';

export interface Shot {
  id: string;
  filename: string;
  url: string;
  prompt: string;
  provider: Provider;
  model: string;
  width: number;
  height: number;
  createdAt: string;
}

// ============================================
// Video Types (FR-10)
// ============================================

export interface VideoTask {
  id: string;
  filename?: string;
  url?: string;
  startShot: string;
  endShot: string;
  provider: Provider;
  model: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdAt: string;
}

// ============================================
// Music Types (FR-11)
// ============================================

export type MusicProvider = 'fal' | 'kie';
export type MusicOutputFormat = 'wav' | 'mp3' | 'flac';
export type MusicTrackStatus = 'generating' | 'ready' | 'saved' | 'error';

export interface MusicGenerationRequest {
  provider: MusicProvider;
  prompt: string;
  lyrics?: string;
  style?: string;
  tags?: string[];
  instrumental: boolean;
  outputFormat: MusicOutputFormat;
  bpm?: number | 'auto';
  // KIE-specific
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

// ============================================
// Project Types (FR-13)
// ============================================

export interface FliHubReference {
  chapterId: string;
  segments: {
    prompt_a: number;
    prompt_b: number;
    prompt_c: number;
  };
}

export interface ProjectMetadata {
  projectCode: string;
  createdAt: string;
  updatedAt: string;
  flihub: FliHubReference;
}

export interface HumanPrompts {
  projectCode: string;
  prompt_a: string;
  prompt_b: string;
  prompt_c: string;
}

export interface SourceTranscript {
  segmentId: number;
  text: string;
  fetchedAt: string;
}

export interface SourceTranscripts {
  projectCode: string;
  transcripts: {
    prompt_a: SourceTranscript;
    prompt_b: SourceTranscript;
    prompt_c: SourceTranscript;
  };
}

export interface ProjectData {
  metadata: ProjectMetadata;
  humanPrompts: HumanPrompts;
  sourceTranscripts?: SourceTranscripts;
}

export interface SaveProjectRequest {
  projectCode: string;
  chapterId: string;
  segmentA: number;
  segmentB: number;
  segmentC: number;
  promptA: string;
  promptB: string;
  promptC: string;
  sourceTranscripts?: {
    a: SourceTranscript;
    b: SourceTranscript;
    c: SourceTranscript;
  };
}

export interface FliHubTranscriptRequest {
  chapterId: string;
  segmentId: number;
}

export interface FliHubTranscriptResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export interface ProjectListItem {
  projectCode: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Prompt Refinement Types (FR-15)
// ============================================

export interface MachinePrompts {
  seed: string;
  edit: string;
  animation: string;
}

export interface RefinePromptsRequest {
  humanPrompts: {
    seed: string;
    edit: string;
    animation: string;
  };
}

export interface RefinePromptsResponse {
  machinePrompts: MachinePrompts;
}

// ============================================
// Asset Catalog Types (FR-16)
// ============================================

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'thumbnail';
  filename: string;
  url: string;
  provider: string;
  model: string;
  prompt: string;
  status: 'generating' | 'ready' | 'failed' | 'archived';
  error?: string;
  createdAt: string;
  completedAt?: string;
  parentId?: string;
  sourceAssetIds?: string[];
  tags?: string[];
  estimatedCost: number;
  generationTimeMs: number;
  metadata: Record<string, any>;
}

export interface AssetCatalog {
  version: string;
  lastUpdated: string;
  assets: Asset[];
}

// Socket.io event types
export interface ServerToClientEvents {
  'connection:established': (data: { message: string }) => void;
  'agent:text': (data: { text: string }) => void;
  'agent:tool': (data: { name: string; input: unknown }) => void;
  'agent:tool_result': (data: { name: string; success: boolean }) => void;
  'agent:complete': (data: {
    sessionId: string;
    usage: { input: number; output: number };
    cost: number;
    duration: number;
  }) => void;
  'agent:error': (data: { message: string; code?: string }) => void;
  // Shot list events (FR-10)
  'shots:list': (shots: Shot[]) => void;
  'shots:added': (shot: Shot) => void;
  'shots:removed': (id: string) => void;
  'shots:cleared': () => void;
  // Video events (FR-10)
  'video:progress': (data: { taskId: string; progress: number }) => void;
  'video:completed': (video: VideoTask) => void;
  'video:failed': (data: { taskId: string; error: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  'agent:query': (data: { message: string }) => void;
  'agent:cancel': () => void;
}

// Day tool configuration
export interface DayTool {
  day: number;
  name: string;
  shortName: string;
  icon: string;
  status: 'pending' | 'active' | 'complete' | 'next';
  route: string;
  purpose?: string;
  apisTech?: string[];
}

// Settings configuration
export interface SettingConfigBase {
  name: string;
  label: string;
  type: string;
}

export interface PasswordSettingConfig extends SettingConfigBase {
  type: 'password';
  placeholder: string;
}

export interface ToggleSettingConfig extends SettingConfigBase {
  type: 'toggle';
  defaultValue: boolean;
}

export type SettingConfig = PasswordSettingConfig | ToggleSettingConfig;

// Config structure
export interface FliGenConfig {
  meta: {
    id: string;
    version: string;
    source: string;
    lastUpdated: string;
  };
  days: DayTool[];
  settings: SettingConfig[];
}

// Export config data
export const fliGenConfig = config as FliGenConfig;
export const DAYS = config.days as DayTool[];
export const SETTINGS = config.settings as SettingConfig[];
