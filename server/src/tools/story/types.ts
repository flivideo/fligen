// Story Builder - Video Assembly Types

export interface MusicConfig {
  file: string;
  volume: number; // 0.0 to 1.0
  startTime?: number; // seconds
  endTime?: number; // seconds
}

export interface NarrationConfig {
  file: string;
  volume: number; // 0.0 to 1.0
  enabled: boolean;
}

export interface AssemblyRequest {
  videos: string[]; // 1-3 video file paths
  music: MusicConfig;
  narration?: NarrationConfig;
  outputName?: string; // optional custom name
  targetDuration?: number; // optional target duration in seconds (for freezing last frame)
  enableZoom?: boolean; // enable Ken Burns zoom effect on frozen frame
  enableFadeOut?: boolean; // enable audio fade out in last 2 seconds
}

export interface AssemblyResult {
  success: boolean;
  outputPath: string;
  duration: number; // seconds
  catalogId: string;
  error?: string;
}

export interface AssemblyProgress {
  stage: 'preparing' | 'assembling' | 'saving' | 'complete' | 'error';
  message: string;
  progress?: number; // 0-100
}
