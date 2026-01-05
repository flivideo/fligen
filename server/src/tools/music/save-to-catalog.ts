import * as catalog from '../catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import type { Asset } from '@fligen/shared';
import type { GeneratedTrack } from './types.js';

/**
 * Save generated music track to the unified asset catalog
 */
export async function saveMusicToCatalog(
  track: GeneratedTrack,
  audioData: Buffer | string
): Promise<Asset> {
  const startTime = Date.now();

  const id = catalog.generateAssetId('music');
  const filename = catalog.generateFilename('music', track.provider, track.model, 'mp3');

  // Handle both Buffer and base64 string
  let buffer: Buffer;
  if (typeof audioData === 'string') {
    // Remove data URL prefix if present
    const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = audioData;
  }

  // Save to catalog/music/
  const assetsDir = path.resolve(process.cwd(), '..', 'assets');
  const filePath = path.join(assetsDir, 'catalog', 'music', filename);
  await fs.writeFile(filePath, buffer);

  const asset: Asset = {
    id,
    type: 'music',
    filename,
    url: `/assets/catalog/music/${filename}`,
    provider: track.provider,
    model: track.model,
    prompt: track.prompt,
    status: 'ready',
    createdAt: track.generatedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: track.estimatedCost,
    generationTimeMs: track.generationTimeMs,
    metadata: {
      name: track.name,
      duration: track.duration,
      lyrics: track.lyrics,
      style: track.style,
      format: 'mp3',
    },
  };

  await catalog.addAsset(asset);
  console.log(`[Music] Saved to catalog: ${id}`);
  return asset;
}

/**
 * Download audio from URL and save to catalog
 */
export async function downloadAndSaveMusicToCatalog(
  audioUrl: string,
  track: Omit<GeneratedTrack, 'audioBase64' | 'audioUrl'>
): Promise<Asset> {
  console.log(`[Music] Downloading audio from ${audioUrl}`);

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  const fullTrack: GeneratedTrack = {
    ...track,
    audioUrl,
  };

  return saveMusicToCatalog(fullTrack, Buffer.from(buffer));
}
