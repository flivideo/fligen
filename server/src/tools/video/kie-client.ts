// KIE.AI Veo video generation client for FR-10

import type { KieVeoTaskResponse, KieVeoTaskResult, VideoTask } from './types.js';
import { updateVideoTask, saveVideoFile } from './storage.js';

const BASE_URL = 'https://api.kie.ai';
const TIMEOUT_MS = 10000;
const MAX_POLL_TIME = 180000; // 3 minutes max for video generation
const POLL_INTERVAL = 5000; // 5 seconds between polls

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
 * Check if KIE.AI is configured for video
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

    console.log(`[KIE.AI Video] Request: ${method} ${endpoint}`);
    if (body) {
      console.log(`[KIE.AI Video] Body: ${JSON.stringify(body)}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[KIE.AI Video] Response: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        throw new Error('AUTH_ERROR: Authentication failed.');
      }
      if (response.status === 402) {
        throw new Error('CREDITS_ERROR: Insufficient credits.');
      }
      throw new Error(`API_ERROR: KIE.AI returned ${response.status}`);
    }

    const data = await response.json() as T;
    console.log(`[KIE.AI Video] Response: ${JSON.stringify(data)}`);
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
 * Submit video generation task
 */
async function submitVeoTask(
  startImageData: string,
  endImageData: string,
  prompt: string
): Promise<string> {
  console.log('[KIE.AI Video] Submitting Veo 3.1 task...');

  // Check if we're using base64 data URLs
  const isBase64 = startImageData.startsWith('data:');
  if (isBase64) {
    console.log('[KIE.AI Video] Using base64 data URLs (external APIs cannot access localhost)');
  }

  const response = await kieRequest<KieVeoTaskResponse>(
    'POST',
    '/api/v1/veo/generate',
    {
      generationType: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
      imageUrls: [startImageData, endImageData],
      prompt: prompt || 'Smooth cinematic transition with natural motion',
      model: 'veo3',
      aspectRatio: '16:9',
    }
  );

  if (response.code !== 200 || !response.data?.taskId) {
    throw new Error(`Failed to submit task: ${response.msg}`);
  }

  console.log(`[KIE.AI Video] Task submitted: ${response.data.taskId}`);
  return response.data.taskId;
}

/**
 * Poll for video generation result
 */
async function pollForResult(
  kieTaskId: string,
  internalTaskId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    pollCount++;
    console.log(`[KIE.AI Video] Poll #${pollCount} for task ${kieTaskId}...`);

    const result = await kieRequest<KieVeoTaskResult>(
      'GET',
      `/api/v1/veo/record-info?taskId=${kieTaskId}`
    );

    if (result.code !== 200) {
      throw new Error(`API error: ${result.msg}`);
    }

    const { successFlag, status, response, errorMessage, progress } = result.data;
    console.log(`[KIE.AI Video] Status: successFlag=${successFlag}, status=${status}, progress=${progress}`);

    // Update progress
    if (progress !== undefined && onProgress) {
      onProgress(progress);
    }

    // Check for success
    if (successFlag === 1 || status === 'SUCCESS') {
      const videoUrl = response?.videoUrl || response?.resultVideoUrl || response?.resultUrls?.[0];
      if (videoUrl) {
        console.log(`[KIE.AI Video] Task complete! Video URL = ${videoUrl}`);
        return videoUrl;
      }
      throw new Error('No video URL in response');
    }

    // Check for failure
    if (successFlag === 2 || successFlag === 3 ||
        status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
      console.log(`[KIE.AI Video] Task failed: ${errorMessage}`);
      throw new Error(errorMessage || 'Video generation failed');
    }

    // Update task status
    await updateVideoTask(internalTaskId, {
      status: 'processing',
      progress: progress ?? undefined,
    });

    // Wait and poll again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Timeout waiting for video generation');
}

/**
 * Generate video with KIE.AI Veo 3.1
 */
export async function generateVideo(
  task: VideoTask,
  startImageUrl: string,
  endImageUrl: string,
  onProgress?: (progress: number) => void
): Promise<VideoTask> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ...task,
      status: 'failed',
      error: 'KIE_API_KEY not configured',
    };
  }

  try {
    // Update to processing
    await updateVideoTask(task.id, { status: 'processing' });

    // Submit the task
    const kieTaskId = await submitVeoTask(
      startImageUrl,
      endImageUrl,
      `Smooth cinematic transition with natural motion, duration ${task.duration} seconds`
    );

    // Poll for result
    const videoUrl = await pollForResult(kieTaskId, task.id, onProgress);

    // Download and save the video
    const localUrl = await saveVideoFile(videoUrl, task.filename!);

    // Update task as complete
    const completedTask = await updateVideoTask(task.id, {
      status: 'completed',
      url: localUrl,
      completedAt: new Date().toISOString(),
    });

    return completedTask!;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[KIE.AI Video] Error: ${message}`);

    await updateVideoTask(task.id, {
      status: 'failed',
      error: message,
    });

    return {
      ...task,
      status: 'failed',
      error: message,
    };
  }
}

/**
 * Check KIE.AI video health
 */
export async function checkHealth(): Promise<{ configured: boolean; authenticated: boolean; error?: string }> {
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
