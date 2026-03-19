/**
 * Asset Catalog API Routes
 * FR-16: Asset catalog management
 * FR-18: Asset tagging
 */

import { Router } from 'express';
import * as catalog from '../tools/catalog/index.js';
import type { Asset } from '@fligen/shared';

const router = Router();

// GET /api/catalog - Get all assets
router.get('/', async (_req, res) => {
  try {
    const assets = await catalog.getAllAssets();
    res.json({ assets });
  } catch (error) {
    console.error('[Catalog] Failed to get assets:', error);
    res.status(500).json({ error: 'Failed to retrieve assets' });
  }
});

// GET /api/catalog/filter - Filter assets (must come before /:id route)
router.get('/filter', async (req, res) => {
  try {
    const filter = {
      type: req.query.type as Asset['type'] | undefined,
      provider: req.query.provider as string | undefined,
      status: req.query.status as Asset['status'] | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };
    const assets = await catalog.filterAssets(filter);
    res.json({ assets });
  } catch (error) {
    console.error('[Catalog] Failed to filter assets:', error);
    res.status(500).json({ error: 'Failed to filter assets' });
  }
});

// PATCH /api/catalog/assets/:id/rename - Rename asset
router.patch('/assets/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name: string };

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Missing or invalid name' });
      return;
    }

    console.log(`[API] /api/catalog/assets/${id}/rename - renaming to "${name}"`);

    const asset = await catalog.updateAsset(id, {
      metadata: {
        ...(await catalog.getAsset(id))?.metadata,
        name,
      },
    });

    if (asset) {
      res.json({ success: true, asset });
    } else {
      res.status(404).json({ error: 'Asset not found' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/catalog/assets/${req.params.id}/rename - error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// PUT /api/catalog/:id/tags - Update asset tags (FR-18)
router.put('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'tags must be an array' });
      return;
    }

    const asset = await catalog.updateAsset(req.params.id, { tags });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    res.json({ asset });
  } catch (error) {
    console.error('[Catalog] Failed to update tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// GET /api/catalog/:id - Get asset by ID (must come after specific routes)
router.get('/:id', async (req, res) => {
  try {
    const asset = await catalog.getAsset(req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json({ asset });
  } catch (error) {
    console.error('[Catalog] Failed to get asset:', error);
    res.status(500).json({ error: 'Failed to retrieve asset' });
  }
});

// DELETE /api/catalog/:id - Delete asset
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await catalog.deleteAsset(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Catalog] Failed to delete asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
