// Video storage operations for FR-10

import { promises as fs } from 'fs';
import path from 'path';
import type { VideoTask, VideoIndex } from './types.js';

const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
const VIDEO_DIR = path.join(ASSETS_DIR, 'video-scenes');
const INDEX_FILE = path.join(VIDEO_DIR, 'index.json');

/**
 * Ensure the video-scenes directory exists
 */
async function ensureDir(): Promise<void> {
  await fs.mkdir(VIDEO_DIR, { recursive: true });
}

/**
 * Load the video index from disk
 */
async function loadIndex(): Promise<VideoIndex> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data) as VideoIndex;
  } catch {
    return { videos: [] };
  }
}

/**
 * Save the video index to disk
 */
async function saveIndex(index: VideoIndex): Promise<void> {
  await ensureDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

/**
 * Generate video filename from shot IDs and task ID
 * Format: {startNumber}-{endNumber}-{uniqueId}.mp4
 */
function generateFilename(startShotId: string, endShotId: string, taskId: string): string {
  const startNum = startShotId.replace('shot-', '');
  const endNum = endShotId.replace('shot-', '');
  // Extract unique ID portion from task ID (after the last underscore)
  const uniqueId = taskId.split('_').pop() || 'unknown';
  return `${startNum}-${endNum}-${uniqueId}.mp4`;
}

/**
 * Generate video task ID
 */
function generateTaskId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new video task (pending state)
 */
export async function createVideoTask(
  startShotId: string,
  endShotId: string,
  provider: 'kie' | 'fal',
  model: string,
  duration: number,
  prompt?: string
): Promise<VideoTask> {
  await ensureDir();

  const index = await loadIndex();
  const id = generateTaskId();
  const filename = generateFilename(startShotId, endShotId, id);

  const task: VideoTask = {
    id,
    filename,
    startShot: startShotId,
    endShot: endShotId,
    provider,
    model: model as VideoTask['model'],
    duration,
    prompt,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  index.videos.push(task);
  await saveIndex(index);

  console.log(`[Video] Created task ${id}${prompt ? ` with prompt: "${prompt}"` : ''}`);
  return task;
}

/**
 * Update video task status
 */
export async function updateVideoTask(
  id: string,
  updates: Partial<VideoTask>
): Promise<VideoTask | null> {
  const index = await loadIndex();
  const taskIndex = index.videos.findIndex(v => v.id === id);

  if (taskIndex === -1) {
    console.log(`[Video] Task ${id} not found`);
    return null;
  }

  index.videos[taskIndex] = { ...index.videos[taskIndex], ...updates };
  await saveIndex(index);

  console.log(`[Video] Updated task ${id}: ${JSON.stringify(updates)}`);
  return index.videos[taskIndex];
}

/**
 * Download video from URL and save to disk
 */
export async function saveVideoFile(url: string, filename: string): Promise<string> {
  await ensureDir();

  console.log(`[Video] Downloading video from ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = path.join(VIDEO_DIR, filename);
  await fs.writeFile(filePath, buffer);
  console.log(`[Video] Saved video to ${filePath}`);

  return `/assets/video-scenes/${filename}`;
}

/**
 * List all video tasks
 */
export async function listVideoTasks(): Promise<VideoTask[]> {
  const index = await loadIndex();
  return index.videos;
}

/**
 * Get a video task by ID
 */
export async function getVideoTask(id: string): Promise<VideoTask | null> {
  const index = await loadIndex();
  return index.videos.find(v => v.id === id) ?? null;
}

/**
 * Delete a video task
 */
export async function deleteVideoTask(id: string): Promise<boolean> {
  const index = await loadIndex();
  const taskIndex = index.videos.findIndex(v => v.id === id);

  if (taskIndex === -1) {
    return false;
  }

  const task = index.videos[taskIndex];

  // Delete the video file if it exists
  if (task.filename) {
    try {
      const filePath = path.join(VIDEO_DIR, task.filename);
      await fs.unlink(filePath);
      console.log(`[Video] Deleted file ${filePath}`);
    } catch {
      // Ignore errors
    }
  }

  index.videos.splice(taskIndex, 1);
  await saveIndex(index);

  console.log(`[Video] Deleted task ${id}`);
  return true;
}
