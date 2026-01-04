// FAL.AI SonAuto music generation client for FR-11

import { fal } from '@fal-ai/client';
import type {
  MusicGenerationRequest,
  GeneratedTrack,
  FalSonautoResponse,
} from './types.js';
import { downloadAudio, bufferToBase64 } from './storage.js';

const COST_PER_TRACK = 0.075; // $0.075 per generation

/**
 * Get FAL API key from environment
 */
function getApiKey(): string | null {
  const key = process.env.FAL_API_KEY;
  if (!key || key === 'your_fal_api_key_here') {
    return null;
  }
  return key;
}

/**
 * Check if FAL.AI is configured
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Initialize FAL client
 */
function initClient(): void {
  const apiKey = getApiKey();
  if (apiKey) {
    fal.config({ credentials: apiKey });
  }
}

/**
 * Generate music with FAL.AI SonAuto v2
 */
export async function generateMusic(
  request: MusicGenerationRequest
): Promise<GeneratedTrack> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  initClient();

  console.log('[FAL.AI Music] Generating with SonAuto v2...');
  console.log(`[FAL.AI Music] Prompt: "${request.prompt}"`);

  // Build input parameters
  // API constraint: Do NOT provide all three (prompt, tags, lyrics_prompt) simultaneously
  // If lyrics provided: use prompt + lyrics_prompt (no tags)
  // If no lyrics: use prompt + tags
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    output_format: request.outputFormat || 'mp3',
  };

  const hasLyrics = request.lyrics && !request.instrumental;

  if (hasLyrics) {
    // With lyrics: use prompt + lyrics_prompt only (no tags)
    input.lyrics_prompt = request.lyrics;
  } else {
    // Without lyrics: use prompt + tags
    if (request.tags && request.tags.length > 0) {
      input.tags = request.tags;
    } else if (request.style) {
      // Convert style string to tags array
      input.tags = request.style.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Add BPM if specified (not 'auto')
  if (request.bpm && request.bpm !== 'auto') {
    input.bpm = request.bpm;
  }

  console.log('[FAL.AI Music] Input:', JSON.stringify(input, null, 2));

  // Call SonAuto API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe('sonauto/v2/text-to-music', {
    input,
    logs: true,
  });

  console.log('[FAL.AI Music] Raw response:', JSON.stringify(result, null, 2));

  // Handle nested data property (FAL wraps response in { data: {...}, requestId: ... })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = (result as any).data || result;
  const data = responseData as FalSonautoResponse;

  // Extract audio URL from response
  const audioInfo = data.audio?.[0];
  if (!audioInfo?.url) {
    console.error('[FAL.AI Music] Response structure:', Object.keys(result || {}));
    throw new Error('No audio URL in response');
  }

  const audioUrl = audioInfo.url;
  console.log(`[FAL.AI Music] Audio URL: ${audioUrl}`);

  // Download the audio and convert to base64
  const audioBuffer = await downloadAudio(audioUrl);
  const audioBase64 = bufferToBase64(audioBuffer, 'audio/mpeg');

  const durationMs = Date.now() - startTime;

  // Create generated track record
  const track: GeneratedTrack = {
    id: `track-${Date.now()}`,
    name: request.title || `SonAuto Track ${Date.now()}`,
    audioUrl: audioBase64, // Use base64 for immediate playback
    audioBase64,
    provider: 'fal',
    model: 'sonauto-v2',
    prompt: request.prompt,
    lyrics: data.lyrics || request.lyrics,
    style: request.style || data.tags?.join(', '),
    duration: 30, // SonAuto typically generates ~30s tracks
    generatedAt: new Date().toISOString(),
    status: 'ready',
    estimatedCost: COST_PER_TRACK,
    generationTimeMs: durationMs,
  };

  console.log(`[FAL.AI Music] Generation complete in ${(durationMs / 1000).toFixed(1)}s`);

  return track;
}

/**
 * Check FAL.AI music health
 */
export async function checkHealth(): Promise<{
  configured: boolean;
  authenticated: boolean;
  error?: string;
}> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      configured: false,
      authenticated: false,
      error: 'FAL_API_KEY not configured',
    };
  }

  // FAL doesn't have a simple health check, so we just verify the key is present
  return {
    configured: true,
    authenticated: true,
  };
}
