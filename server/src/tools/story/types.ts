// Story Builder - Internal Assembly Types
// MusicConfig, NarrationConfig, AssemblyRequest are in @fligen/shared

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
