/**
 * Batch Generation Types
 * FR-25: Batch Generation and Query API
 */

export interface BatchJob {
  id: string;
  prompts: PromptRequest[];
  options: BatchOptions;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  results: PromptResult[];
  csvFilePath?: string;
  totalCost: number;
  totalTimeMs: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PromptRequest {
  id: string;
  prompt: string;
  provider: 'fal' | 'kie';
  model: string;
  category?: string;
  filename?: string;
  metadata?: Record<string, any>;
}

export interface BatchOptions {
  save_to_catalog: boolean;
  parallel: boolean;
  delay_seconds: number;
  retry_attempts?: number;
}

export interface PromptResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  asset_id?: string;
  file_path?: string;
  generation_time_ms?: number;
  cost?: number;
  error?: {
    code: string;
    message: string;
    retries: number;
  };
}

export interface CsvRow {
  a: string;
  category: string;
  filename: string;
  prompt: string;
  provider: 'fal' | 'kie';
  model: string;
  style?: string;
  size?: string;
  metadata?: string;
}
