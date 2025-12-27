// Kybernesis API types
// Response types for the Kybernesis second brain API

/**
 * A memory result from hybrid search
 */
export interface MemoryResult {
  id: string;
  content: string;
  score: number;
  source?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from /retrieval/hybrid endpoint
 */
export interface SearchResponse {
  query: string;
  results: MemoryResult[];
  totalResults: number;
  searchType: 'hybrid' | 'semantic' | 'keyword';
}

/**
 * Response from /ingest/chat endpoint
 */
export interface StoreResponse {
  success: boolean;
  message: string;
  memoryId?: string;
}

/**
 * Error response from Kybernesis API
 */
export interface KybernesisError {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Configuration for Kybernesis client
 */
export interface KybernesisConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}
