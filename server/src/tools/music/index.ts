// Music generation module for FR-11

import type { MusicGenerationRequest, GeneratedTrack, SavedTrack } from './types.js';
import * as falClient from './fal-client.js';
import * as kieClient from './kie-client.js';
import { listLibrary, saveTrack, deleteTrack } from './storage.js';

// Re-export types
export type { MusicGenerationRequest, GeneratedTrack, SavedTrack } from './types.js';

/**
 * Check if FAL.AI music is configured
 */
export function isFalConfigured(): boolean {
  return falClient.isConfigured();
}

/**
 * Check if KIE.AI music is configured
 */
export function isKieConfigured(): boolean {
  return kieClient.isConfigured();
}

/**
 * Check music API health for both providers
 */
export async function checkMusicHealth(): Promise<{
  fal: { configured: boolean; authenticated: boolean; error?: string };
  kie: { configured: boolean; authenticated: boolean; error?: string };
}> {
  const [falHealth, kieHealth] = await Promise.all([
    falClient.checkHealth(),
    kieClient.checkHealth(),
  ]);

  return {
    fal: falHealth,
    kie: kieHealth,
  };
}

/**
 * Generate music with the specified provider
 */
export async function generateMusic(
  request: MusicGenerationRequest
): Promise<GeneratedTrack> {
  console.log(`[Music] Generating with provider: ${request.provider}`);

  if (request.provider === 'fal') {
    return falClient.generateMusic(request);
  } else if (request.provider === 'kie') {
    return kieClient.generateMusic(request);
  } else {
    throw new Error(`Unknown provider: ${request.provider}`);
  }
}

/**
 * List all saved tracks from the library
 */
export async function listLibraryTracks(): Promise<SavedTrack[]> {
  return listLibrary();
}

/**
 * Save a track to the library
 */
export async function saveTrackToLibrary(
  track: GeneratedTrack
): Promise<SavedTrack> {
  if (!track.audioBase64) {
    throw new Error('Track has no audio data to save');
  }

  return saveTrack(track, track.audioBase64);
}

/**
 * Delete a track from the library
 */
export async function deleteLibraryTrack(id: string): Promise<boolean> {
  return deleteTrack(id);
}
