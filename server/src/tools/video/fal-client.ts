// FAL.AI video generation client for FR-10

import { fal } from '@fal-ai/client';
import type { VideoTask, FalVideoResponse } from './types.js';
import { updateVideoTask, saveVideoFile } from './storage.js';

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
 * Check if FAL.AI is configured for video
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
 * Generate video with FAL.AI Kling O1
 */
async function generateWithKling(
  startImageData: string,
  _endImageData: string, // Reserved for future first+last frame support
  prompt: string,
  duration: number
): Promise<string> {
  console.log('[FAL.AI Video] Generating with Kling O1...');

  // Log if using base64
  if (startImageData.startsWith('data:')) {
    console.log('[FAL.AI Video] Using base64 data URL for start image');
  }

  const durationStr = duration === 10 ? '10' : '5';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe('fal-ai/kling-video/o1/image-to-video', {
    input: {
      prompt: prompt || 'Smooth cinematic transition with natural motion',
      start_image_url: startImageData,
      duration: durationStr,
    },
    logs: true,
  });

  console.log('[FAL.AI Video] Kling O1 raw response:', JSON.stringify(result, null, 2));

  const data = result as FalVideoResponse;
  // Try multiple possible response structures
  const videoUrl = data.video?.url || (result as any).data?.video?.url || (result as any).url;
  if (!videoUrl) {
    console.error('[FAL.AI Video] Response structure:', Object.keys(result || {}));
    throw new Error('No video URL in response');
  }

  console.log(`[FAL.AI Video] Kling O1 complete: ${videoUrl}`);
  return videoUrl;
}

/**
 * Generate video with FAL.AI Wan 2.1 FLF2V
 */
async function generateWithWan(
  startImageData: string,
  endImageData: string,
  prompt: string
): Promise<string> {
  console.log('[FAL.AI Video] Generating with Wan 2.1 FLF2V...');

  // Log if using base64
  if (startImageData.startsWith('data:')) {
    console.log('[FAL.AI Video] Using base64 data URLs for first+last frames');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe('fal-ai/wan-flf2v', {
    input: {
      prompt: prompt || 'Smooth transition between frames',
      start_image_url: startImageData,
      end_image_url: endImageData,
    },
    logs: true,
  });

  console.log('[FAL.AI Video] Wan FLF2V raw response:', JSON.stringify(result, null, 2));

  // Try multiple possible response structures
  const videoUrl = (result as any).data?.video?.url || (result as any).video?.url || (result as any).url;
  if (!videoUrl) {
    console.error('[FAL.AI Video] Response structure:', Object.keys(result || {}));
    throw new Error('No video URL in response');
  }

  console.log(`[FAL.AI Video] Wan FLF2V complete: ${videoUrl}`);
  return videoUrl;
}

/**
 * Generate video with FAL.AI
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
      error: 'FAL_API_KEY not configured',
    };
  }

  try {
    initClient();

    // Update to processing
    await updateVideoTask(task.id, { status: 'processing' });
    if (onProgress) onProgress(10);

    const prompt = `Smooth cinematic transition with natural motion, duration ${task.duration} seconds`;
    let videoUrl: string;

    if (task.model === 'kling-o1') {
      videoUrl = await generateWithKling(startImageUrl, endImageUrl, prompt, task.duration);
    } else if (task.model === 'wan-flf2v') {
      videoUrl = await generateWithWan(startImageUrl, endImageUrl, prompt);
    } else {
      throw new Error(`Unknown FAL model: ${task.model}`);
    }

    if (onProgress) onProgress(80);

    // Download and save the video
    const localUrl = await saveVideoFile(videoUrl, task.filename!);
    if (onProgress) onProgress(100);

    // Update task as complete
    const completedTask = await updateVideoTask(task.id, {
      status: 'completed',
      url: localUrl,
      completedAt: new Date().toISOString(),
    });

    return completedTask!;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FAL.AI Video] Error: ${message}`);

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
 * Check FAL.AI video health
 */
export async function checkHealth(): Promise<{ configured: boolean; authenticated: boolean; error?: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      configured: false,
      authenticated: false,
      error: 'FAL_API_KEY not configured',
    };
  }

  try {
    initClient();
    // FAL doesn't have a simple health check, so we just verify the key is present
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
