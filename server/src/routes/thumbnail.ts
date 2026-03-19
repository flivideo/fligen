/**
 * Thumbnail Routes
 * FR-19: Thumbnail Persistence & History
 */

import { Router } from 'express';
import * as catalog from '../tools/catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';

const router = Router();

const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');

router.post('/save', async (req, res) => {
  try {
    const { imageDataUrl, config, label } = req.body;

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,')) {
      res.status(400).json({ error: 'imageDataUrl must be a PNG data URL' });
      return;
    }

    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = catalog.generateFilename('thumbnail', 'canvas', 'generated', 'png');
    const filePath = path.join(ASSETS_DIR, 'catalog', 'thumbnails', filename);

    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));

    const asset: Asset = {
      id: catalog.generateAssetId('thumbnail'),
      type: 'thumbnail',
      filename,
      url: `/assets/catalog/thumbnails/${filename}`,
      provider: 'canvas',
      model: 'generated',
      prompt: label || 'Canvas thumbnail',
      status: 'ready',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      estimatedCost: 0,
      generationTimeMs: 0,
      metadata: { config: config || {} },
    };

    await catalog.addAsset(asset);
    console.log(`[API] /api/thumbnail/save - saved ${asset.id}`);
    res.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/thumbnail/save - error:', message);
    res.status(500).json({ error: message });
  }
});

router.get('/history', async (_req, res) => {
  try {
    const assets = await catalog.filterAssets({ type: 'thumbnail' });
    res.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/thumbnail/history - error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
