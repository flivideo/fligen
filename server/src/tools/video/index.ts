// Video generation module exports for FR-10

export * from './types.js';
export * from './storage.js';
export { generateVideo as generateVideoKie, checkHealth as checkHealthKie, isConfigured as isKieConfigured } from './kie-client.js';
export { generateVideo as generateVideoFal, checkHealth as checkHealthFal, isConfigured as isFalConfigured } from './fal-client.js';
export { saveVideoToCatalog } from './save-to-catalog.js';

import type { VideoHealthResponse, VideoTask, VideoModel } from './types.js';
import { VIDEO_MODELS } from './types.js';
import { createVideoTask, getVideoTask } from './storage.js';
import { getShot, getShotAsBase64 } from '../shots/index.js';
import { generateVideo as generateVideoKie, checkHealth as checkHealthKie } from './kie-client.js';
import { generateVideo as generateVideoFal, checkHealth as checkHealthFal } from './fal-client.js';
import type { Server } from 'socket.io';

/**
 * Check health of all video providers
 */
export async function checkVideoHealth(): Promise<VideoHealthResponse> {
  const [kie, fal] = await Promise.all([
    checkHealthKie(),
    checkHealthFal(),
  ]);

  return { kie, fal };
}

/**
 * Generate a transition video between two shots
 */
export async function generateTransitionVideo(
  startShotId: string,
  endShotId: string,
  model: VideoModel,
  duration: number,
  prompt?: string,
  io?: Server
): Promise<VideoTask> {
  // Get the shot data
  const startShot = await getShot(startShotId);
  const endShot = await getShot(endShotId);

  if (!startShot) {
    throw new Error(`Start shot ${startShotId} not found`);
  }
  if (!endShot) {
    throw new Error(`End shot ${endShotId} not found`);
  }

  // Get model config
  const modelConfig = VIDEO_MODELS[model];
  if (!modelConfig) {
    throw new Error(`Unknown video model: ${model}`);
  }

  // Create the task
  const task = await createVideoTask(
    startShotId,
    endShotId,
    modelConfig.provider,
    model,
    duration,
    prompt
  );

  // Convert local images to base64 data URLs (external APIs can't access localhost)
  console.log(`[Video] Generating transition: ${startShotId} -> ${endShotId}`);
  console.log(`[Video] Reading local image files...`);

  const startImageBase64 = await getShotAsBase64(startShot);
  const endImageBase64 = await getShotAsBase64(endShot);

  console.log(`[Video] Start image: ${startShot.filename} (${Math.round(startImageBase64.length / 1024)}KB base64)`);
  console.log(`[Video] End image: ${endShot.filename} (${Math.round(endImageBase64.length / 1024)}KB base64)`);
  console.log(`[Video] Model: ${model}, Duration: ${duration}s`);

  // Generate video based on provider
  const onProgress = (progress: number) => {
    if (io) {
      io.emit('video:progress', { taskId: task.id, progress });
    }
  };

  // Run generation in background
  (async () => {
    try {
      let result: VideoTask;

      if (modelConfig.provider === 'kie') {
        result = await generateVideoKie(task, startImageBase64, endImageBase64, onProgress);
      } else {
        result = await generateVideoFal(task, startImageBase64, endImageBase64, onProgress);
      }

      if (result.status === 'completed' && io) {
        io.emit('video:completed', result);
      } else if (result.status === 'failed' && io) {
        io.emit('video:failed', { taskId: task.id, error: result.error || 'Unknown error' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Video] Generation error: ${message}`);
      if (io) {
        io.emit('video:failed', { taskId: task.id, error: message });
      }
    }
  })();

  return task;
}

/**
 * Get video task status
 */
export async function getVideoStatus(taskId: string): Promise<VideoTask | null> {
  return getVideoTask(taskId);
}
