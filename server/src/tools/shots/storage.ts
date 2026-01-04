// Shot list file system operations for FR-10

import { promises as fs } from 'fs';
import path from 'path';
import type { Shot, ShotIndex, AddShotRequest } from './types.js';

const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
const SHOTS_DIR = path.join(ASSETS_DIR, 'shot-list');
const INDEX_FILE = path.join(SHOTS_DIR, 'index.json');

/**
 * Ensure the shot-list directory exists
 */
async function ensureDir(): Promise<void> {
  await fs.mkdir(SHOTS_DIR, { recursive: true });
}

/**
 * Load the shot index from disk
 */
async function loadIndex(): Promise<ShotIndex> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data) as ShotIndex;
  } catch {
    // Return empty index if file doesn't exist
    return { shots: [] };
  }
}

/**
 * Save the shot index to disk
 */
async function saveIndex(index: ShotIndex): Promise<void> {
  await ensureDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

/**
 * Generate the next shot ID (shot-001, shot-002, etc.)
 */
function generateShotId(index: ShotIndex): string {
  const existingIds = index.shots.map(s => parseInt(s.id.replace('shot-', ''), 10));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `shot-${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * Detect image format from content-type header or URL
 */
function detectImageFormat(contentType: string | null, url: string): string {
  // Check content-type header first
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif')) return 'gif';
  }

  // Fall back to URL extension
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
  if (urlLower.includes('.png')) return 'png';
  if (urlLower.includes('.webp')) return 'webp';
  if (urlLower.includes('.gif')) return 'gif';

  // Default to jpg (most common for AI-generated images)
  return 'jpg';
}

/**
 * Download image from URL and save to disk
 * Returns the actual file extension used
 */
async function downloadImage(url: string, baseFilename: string): Promise<string> {
  await ensureDir();

  console.log(`[Shots] Downloading image from ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  // Detect actual format
  const contentType = response.headers.get('content-type');
  const format = detectImageFormat(contentType, url);
  const filename = `${baseFilename}.${format}`;

  console.log(`[Shots] Detected format: ${format} (content-type: ${contentType})`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = path.join(SHOTS_DIR, filename);
  await fs.writeFile(filePath, buffer);
  console.log(`[Shots] Saved image to ${filePath} (${buffer.length} bytes)`);

  return filename;
}

/**
 * List all shots
 */
export async function listShots(): Promise<Shot[]> {
  const index = await loadIndex();
  return index.shots;
}

/**
 * Add a shot to the list
 */
export async function addShot(request: AddShotRequest): Promise<Shot> {
  await ensureDir();

  const index = await loadIndex();
  const id = generateShotId(index);

  // Download the image and get actual filename with correct extension
  const filename = await downloadImage(request.imageUrl, id);

  // Create the shot record
  const shot: Shot = {
    id,
    filename,
    url: `/assets/shot-list/${filename}`,
    prompt: request.prompt,
    provider: request.provider,
    model: request.model,
    width: request.width,
    height: request.height,
    createdAt: new Date().toISOString(),
  };

  // Add to index and save
  index.shots.push(shot);
  await saveIndex(index);

  console.log(`[Shots] Added shot ${id} as ${filename}`);
  return shot;
}

/**
 * Remove a shot by ID
 */
export async function removeShot(id: string): Promise<boolean> {
  const index = await loadIndex();
  const shotIndex = index.shots.findIndex(s => s.id === id);

  if (shotIndex === -1) {
    console.log(`[Shots] Shot ${id} not found`);
    return false;
  }

  const shot = index.shots[shotIndex];

  // Delete the image file
  try {
    const filePath = path.join(SHOTS_DIR, shot.filename);
    await fs.unlink(filePath);
    console.log(`[Shots] Deleted file ${filePath}`);
  } catch (error) {
    console.log(`[Shots] Warning: Could not delete file for ${id}`);
  }

  // Remove from index
  index.shots.splice(shotIndex, 1);
  await saveIndex(index);

  console.log(`[Shots] Removed shot ${id}`);
  return true;
}

/**
 * Clear all shots
 */
export async function clearAllShots(): Promise<void> {
  const index = await loadIndex();

  // Delete all image files
  for (const shot of index.shots) {
    try {
      const filePath = path.join(SHOTS_DIR, shot.filename);
      await fs.unlink(filePath);
    } catch {
      // Ignore errors
    }
  }

  // Clear the index
  await saveIndex({ shots: [] });
  console.log('[Shots] Cleared all shots');
}

/**
 * Get a shot by ID
 */
export async function getShot(id: string): Promise<Shot | null> {
  const index = await loadIndex();
  return index.shots.find(s => s.id === id) ?? null;
}

/**
 * Get the full file path for a shot
 */
export function getShotFilePath(shot: Shot): string {
  return path.join(SHOTS_DIR, shot.filename);
}

/**
 * Read a shot image as base64 data URL
 */
export async function getShotAsBase64(shot: Shot): Promise<string> {
  const filePath = getShotFilePath(shot);
  const buffer = await fs.readFile(filePath);

  // Determine MIME type from extension
  const ext = path.extname(shot.filename).toLowerCase().slice(1);
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}
