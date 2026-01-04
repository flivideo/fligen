// Music library storage for FR-11

import fs from 'fs/promises';
import path from 'path';
import type { SavedTrack, MusicLibraryIndex, GeneratedTrack } from './types.js';

// Library directory path
const LIBRARY_DIR = path.resolve(process.cwd(), '..', 'assets', 'music-library');
const INDEX_FILE = path.join(LIBRARY_DIR, 'index.json');

/**
 * Ensure the library directory exists
 */
async function ensureLibraryDir(): Promise<void> {
  try {
    await fs.mkdir(LIBRARY_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

/**
 * Read the library index
 */
async function readIndex(): Promise<MusicLibraryIndex> {
  try {
    const content = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(content) as MusicLibraryIndex;
  } catch {
    return { tracks: [] };
  }
}

/**
 * Write the library index
 */
async function writeIndex(index: MusicLibraryIndex): Promise<void> {
  await ensureLibraryDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

/**
 * Generate a unique track ID
 */
function generateTrackId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `music-${timestamp}-${random}`;
}

/**
 * Get next available track number for filename
 */
async function getNextTrackNumber(): Promise<number> {
  const index = await readIndex();
  if (index.tracks.length === 0) return 1;

  // Find highest existing number
  let maxNum = 0;
  for (const track of index.tracks) {
    const match = track.filename.match(/^music-(\d+)\./);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum + 1;
}

/**
 * List all saved tracks from library
 */
export async function listLibrary(): Promise<SavedTrack[]> {
  const index = await readIndex();
  return index.tracks;
}

/**
 * Save a track to the library
 */
export async function saveTrack(
  track: GeneratedTrack,
  audioData: Buffer | string
): Promise<SavedTrack> {
  await ensureLibraryDir();

  const trackNum = await getNextTrackNumber();
  const id = generateTrackId();
  const filename = `music-${trackNum.toString().padStart(3, '0')}.mp3`;
  const filePath = path.join(LIBRARY_DIR, filename);

  // Handle both Buffer and base64 string
  let buffer: Buffer;
  if (typeof audioData === 'string') {
    // Remove data URL prefix if present
    const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = audioData;
  }

  // Write the audio file
  await fs.writeFile(filePath, buffer);
  console.log(`[Music Storage] Saved track to ${filePath}`);

  // Create saved track record
  const savedTrack: SavedTrack = {
    ...track,
    id,
    filename,
    audioUrl: `/assets/music-library/${filename}`,
    savedAt: new Date().toISOString(),
    status: 'saved',
  };

  // Update index
  const index = await readIndex();
  index.tracks.unshift(savedTrack);
  await writeIndex(index);

  return savedTrack;
}

/**
 * Delete a track from the library
 */
export async function deleteTrack(id: string): Promise<boolean> {
  const index = await readIndex();
  const trackIndex = index.tracks.findIndex(t => t.id === id);

  if (trackIndex === -1) {
    return false;
  }

  const track = index.tracks[trackIndex];

  // Delete the file
  try {
    const filePath = path.join(LIBRARY_DIR, track.filename);
    await fs.unlink(filePath);
    console.log(`[Music Storage] Deleted file ${filePath}`);
  } catch (error) {
    console.warn(`[Music Storage] Could not delete file: ${error}`);
  }

  // Remove from index
  index.tracks.splice(trackIndex, 1);
  await writeIndex(index);

  return true;
}

/**
 * Download audio from URL and return as Buffer
 */
export async function downloadAudio(url: string): Promise<Buffer> {
  console.log(`[Music Storage] Downloading audio from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert audio buffer to base64 data URL
 */
export function bufferToBase64(buffer: Buffer, mimeType = 'audio/mpeg'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
