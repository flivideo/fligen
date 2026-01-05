import * as catalog from '../catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';

export async function saveVideoToCatalog(
  videoUrl: string,
  prompt: string,
  provider: string,
  model: string,
  duration: number,
  metadata: Record<string, any> = {}
): Promise<Asset> {
  const startTime = Date.now();

  const id = catalog.generateAssetId('video');
  const filename = catalog.generateFilename('video', provider, model, 'mp4');

  // Download video
  const response = await fetch(videoUrl);
  const buffer = await response.arrayBuffer();

  // Save to catalog/videos/
  const assetsDir = path.resolve(process.cwd(), '..', 'assets');
  const filePath = path.join(assetsDir, 'catalog', 'videos', filename);
  await fs.writeFile(filePath, Buffer.from(buffer));

  const asset: Asset = {
    id,
    type: 'video',
    filename,
    url: `/assets/catalog/videos/${filename}`,
    provider,
    model,
    prompt,
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0.15,
    generationTimeMs: Date.now() - startTime,
    metadata: {
      duration,
      fps: 24,
      resolution: '1024x1024',
      animationPrompt: prompt,
      ...metadata,
    },
  };

  await catalog.addAsset(asset);
  console.log(`[Videos] Saved to catalog: ${id}`);
  return asset;
}
