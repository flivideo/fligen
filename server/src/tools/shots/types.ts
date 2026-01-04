// Shot list types for FR-10

/**
 * Provider identifier
 */
export type Provider = 'fal' | 'kie';

/**
 * Individual shot in the shot list
 */
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

/**
 * Shot list index file structure
 */
export interface ShotIndex {
  shots: Shot[];
}

/**
 * Request to add a shot
 */
export interface AddShotRequest {
  imageUrl: string;
  prompt: string;
  provider: Provider;
  model: string;
  width: number;
  height: number;
}

/**
 * Response from adding a shot
 */
export interface AddShotResponse {
  id: string;
  filename: string;
  url: string;
}

/**
 * List shots response
 */
export interface ListShotsResponse {
  shots: Shot[];
}
