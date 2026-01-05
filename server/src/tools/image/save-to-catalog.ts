import * as catalog from '../catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';

export async function saveImageToCatalog(
  imageUrl: string,
  prompt: string,
  provider: string,
  model: string,
  width: number,
  height: number,
  metadata: Record<string, any> = {}
): Promise<Asset> {
  const startTime = Date.now();

  // Generate unique ID and filename
  const id = catalog.generateAssetId('image');
  const extension = 'jpg';
  const filename = catalog.generateFilename('image', provider, model, extension);

  // Download image from provider URL
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  // Save to catalog/images/
  const assetsDir = path.resolve(process.cwd(), '..', 'assets');
  const filePath = path.join(assetsDir, 'catalog', 'images', filename);
  await fs.writeFile(filePath, Buffer.from(buffer));

  // Create asset record
  const asset: Asset = {
    id,
    type: 'image',
    filename,
    url: `/assets/catalog/images/${filename}`,
    provider,
    model,
    prompt,
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: provider === 'fal' ? 0.05 : 0.03,
    generationTimeMs: Date.now() - startTime,
    metadata: {
      width,
      height,
      ...metadata,
    },
  };

  // Add to catalog
  await catalog.addAsset(asset);

  console.log(`[Images] Saved to catalog: ${id}`);
  return asset;
}
