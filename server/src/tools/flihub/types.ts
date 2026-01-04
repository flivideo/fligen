// FliHub API client types for FR-13

export interface FliHubTranscript {
  filename: string;
  chapter: string;
  sequence: string;
  name: string;
  size: number;
  content: string;
}

export interface FliHubTranscriptsResponse {
  success: boolean;
  transcripts?: FliHubTranscript[];
  error?: string;
}

export interface FliHubHealthResponse {
  success?: boolean;
  status: 'ok' | 'error';
  server?: string;
  port?: number;
  project?: string;
  message?: string;
}
