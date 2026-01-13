// Story Builder - Catalog Storage

import * as catalog from '../catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';
import { AssemblyRequest, AssemblyResult } from './types.js';

/**
 * Saves assembled video to the unified catalog
 */
export async function saveStoryToCatalog(
  result: AssemblyResult,
  request: AssemblyRequest
): Promise<Asset> {
  const startTime = Date.now();

  // The video file is already saved by the assembler
  // We just need to move it to the catalog and add metadata

  const id = catalog.generateAssetId('video');
  const filename = path.basename(result.outputPath);

  // Move file from video-scenes to catalog/stories
  const assetsDir = path.resolve(process.cwd(), '..', 'assets');
  const oldPath = path.join(assetsDir, result.outputPath);
  const newFilename = catalog.generateFilename('video', 'ffmpeg', 'assembled', 'mp4');
  const newPath = path.join(assetsDir, 'catalog', 'stories', newFilename);

  // Ensure catalog/stories directory exists
  await fs.mkdir(path.join(assetsDir, 'catalog', 'stories'), { recursive: true });

  // Move the file
  await fs.rename(oldPath, newPath);

  const asset: Asset = {
    id,
    type: 'video',
    filename: newFilename,
    url: `/assets/catalog/stories/${newFilename}`,
    provider: 'ffmpeg',
    model: 'assembled',
    prompt: `Story assembled from ${request.videos.length} videos with music${request.narration?.enabled ? ' and narration' : ''}`,
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0,
    generationTimeMs: Date.now() - startTime,
    metadata: {
      duration: result.duration,
      type: 'story',
      sourceVideos: request.videos,
      music: {
        file: request.music.file,
        volume: request.music.volume,
        startTime: request.music.startTime,
        endTime: request.music.endTime,
      },
      narration: request.narration?.enabled
        ? {
            file: request.narration.file,
            volume: request.narration.volume,
          }
        : undefined,
      outputName: request.outputName,
      targetDuration: request.targetDuration,
      enableZoom: request.enableZoom,
      enableFadeOut: request.enableFadeOut,
    },
  };

  await catalog.addAsset(asset);
  console.log(`[Story] Saved to catalog: ${id}`);
  return asset;
}

/**
 * Gets all story videos from the catalog
 */
export async function getStoriesFromCatalog(): Promise<Asset[]> {
  try {
    const allAssets = await catalog.getAllAssets();

    return allAssets.filter(
      asset => asset.type === 'video' && asset.metadata?.type === 'story'
    );

  } catch (error) {
    console.error('[Story Storage] Error reading catalog:', error);
    return [];
  }
}
