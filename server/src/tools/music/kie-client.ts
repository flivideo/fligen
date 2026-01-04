// KIE.AI Suno music generation client for FR-11

import type {
  MusicGenerationRequest,
  GeneratedTrack,
  KieSunoTaskResponse,
  KieSunoTaskResult,
} from './types.js';
import { downloadAudio, bufferToBase64 } from './storage.js';

const BASE_URL = 'https://api.kie.ai';
const TIMEOUT_MS = 15000;
const MAX_POLL_TIME = 180000; // 3 minutes max for music generation
const POLL_INTERVAL = 5000; // 5 seconds between polls
const COST_PER_TRACK = 0.06; // ~$0.06 per generation (12 credits)

/**
 * Get KIE.AI API key from environment
 */
function getApiKey(): string | null {
  const key = process.env.KIE_API_KEY;
  if (!key || key === 'your_kie_api_key_here') {
    return null;
  }
  return key;
}

/**
 * Check if KIE.AI is configured
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Make an authenticated request to KIE.AI
 */
async function kieRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[KIE.AI Music] Request: ${method} ${endpoint}`);
    if (body) {
      console.log(`[KIE.AI Music] Body: ${JSON.stringify(body)}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[KIE.AI Music] Response: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        throw new Error('AUTH_ERROR: Authentication failed.');
      }
      if (response.status === 402) {
        throw new Error('CREDITS_ERROR: Insufficient credits.');
      }
      throw new Error(`API_ERROR: KIE.AI returned ${response.status}`);
    }

    const data = await response.json() as T;
    console.log(`[KIE.AI Music] Response: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT: Request timed out.');
      }
      throw error;
    }
    throw new Error('UNKNOWN_ERROR');
  }
}

/**
 * Submit Suno music generation task
 * API: POST /api/v1/generate
 * Docs: https://docs.kie.ai/suno-api/generate-music
 */
async function submitSunoTask(request: MusicGenerationRequest): Promise<string> {
  console.log('[KIE.AI Music] Submitting Suno task...');

  // Map model versions to API format
  const modelMap: Record<string, string> = {
    'V3.5': 'V4', // V3.5 not supported, fallback to V4
    'V4': 'V4',
    'V4.5': 'V4_5',
    'V5': 'V5',
  };

  const model = modelMap[request.model || 'V4.5'] || 'V4_5';

  // Build request body per API spec
  const body: Record<string, unknown> = {
    model,
    instrumental: request.instrumental || false,
    customMode: true, // Enable custom mode for full control
    prompt: request.lyrics || request.prompt, // In custom mode with vocals, prompt = lyrics
    callBackUrl: 'https://example.com/callback', // Required but we use polling instead
  };

  // Custom mode parameters
  if (request.title) {
    body.title = request.title;
  }

  if (request.style) {
    body.style = request.style;
  }

  // Vocal gender: 'm' for male, 'f' for female
  if (request.vocalGender && !request.instrumental) {
    body.vocalGender = request.vocalGender === 'male' ? 'm' : 'f';
  }

  const response = await kieRequest<KieSunoTaskResponse>(
    'POST',
    '/api/v1/generate',
    body
  );

  if (response.code !== 200 || !response.data?.taskId) {
    throw new Error(`Failed to submit task: ${response.msg}`);
  }

  console.log(`[KIE.AI Music] Task submitted: ${response.data.taskId}`);
  return response.data.taskId;
}

/**
 * Poll for music generation result
 * API: GET /api/v1/generate/record-info?taskId=...
 * Docs: https://docs.kie.ai/suno-api/get-music-details
 */
async function pollForResult(taskId: string): Promise<{ audioUrl: string; duration: number }> {
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    pollCount++;
    console.log(`[KIE.AI Music] Poll #${pollCount} for task ${taskId}...`);

    const result = await kieRequest<KieSunoTaskResult>(
      'GET',
      `/api/v1/generate/record-info?taskId=${taskId}`
    );

    if (result.code !== 200) {
      throw new Error(`API error: ${result.msg}`);
    }

    // Log full response for debugging
    console.log(`[KIE.AI Music] Poll response:`, JSON.stringify(result.data, null, 2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    const status = data.status;

    // Check for success - response contains sunoData with audioUrl
    if (status === 'SUCCESS') {
      // Try multiple possible response structures
      const response = data.response || {};
      const sunoData = response.sunoData?.[0] || response.sunoData || response;
      const audioUrl = sunoData?.audioUrl || sunoData?.streamAudioUrl;

      if (audioUrl) {
        console.log(`[KIE.AI Music] Task complete! Audio URL = ${audioUrl}`);
        return {
          audioUrl,
          duration: sunoData?.duration || 30,
        };
      }
      throw new Error('No audio URL in response');
    }

    // Check for failure
    if (status === 'FAILED' || status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
      const errorMessage = data.errorMessage || data.response?.errorMessage;
      console.log(`[KIE.AI Music] Task failed: ${errorMessage}`);
      throw new Error(errorMessage || 'Music generation failed');
    }

    // Still processing
    console.log(`[KIE.AI Music] Status: ${status}, waiting...`);

    // Wait and poll again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Timeout waiting for music generation');
}

/**
 * Generate music with KIE.AI Suno
 */
export async function generateMusic(
  request: MusicGenerationRequest
): Promise<GeneratedTrack> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  console.log('[KIE.AI Music] Generating with Suno...');
  console.log(`[KIE.AI Music] Prompt: "${request.prompt}"`);
  console.log(`[KIE.AI Music] Model: ${request.model || 'V4.5'}`);

  // Submit the task
  const taskId = await submitSunoTask(request);

  // Poll for result
  const { audioUrl, duration } = await pollForResult(taskId);

  // Download the audio and convert to base64
  const audioBuffer = await downloadAudio(audioUrl);
  const audioBase64 = bufferToBase64(audioBuffer, 'audio/mpeg');

  const durationMs = Date.now() - startTime;

  // Create generated track record
  const track: GeneratedTrack = {
    id: `track-${Date.now()}`,
    name: request.title || `Suno Track ${Date.now()}`,
    audioUrl: audioBase64, // Use base64 for immediate playback
    audioBase64,
    provider: 'kie',
    model: request.model || 'V4.5',
    prompt: request.prompt,
    lyrics: request.lyrics,
    style: request.style,
    duration,
    generatedAt: new Date().toISOString(),
    status: 'ready',
    estimatedCost: COST_PER_TRACK,
    generationTimeMs: durationMs,
  };

  console.log(`[KIE.AI Music] Generation complete in ${(durationMs / 1000).toFixed(1)}s`);

  return track;
}

/**
 * Check KIE.AI music health
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
      error: 'KIE_API_KEY not configured',
    };
  }

  try {
    // Use credit check to verify auth
    await kieRequest<{ code: number; data: number }>('GET', '/api/v1/chat/credit');
    return {
      configured: true,
      authenticated: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      configured: true,
      authenticated: false,
      error: message,
    };
  }
}
