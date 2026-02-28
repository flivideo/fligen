/**
 * Query API - Catalog Endpoint
 * FR25.9: Query Catalog Access
 */

import { Router } from 'express';
import * as catalog from '../../tools/catalog/index.js';

const router = Router();

/**
 * FR25.9: Query Catalog Access
 * GET /api/query/catalog
 *
 * Query params: ?type=image&provider=kie&limit=50&offset=0
 *
 * Returns: Paginated list of catalog assets
 */
router.get('/', async (req, res) => {
  try {
    const { type, provider, status, limit = '50', offset = '0' } = req.query;

    // Load all assets
    const allAssets = await catalog.getAllAssets();

    // Apply filters
    let filtered = allAssets;

    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }

    if (provider) {
      filtered = filtered.filter((a) => a.provider === provider);
    }

    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Paginate
    const offsetNum = parseInt(offset as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

    res.json({
      total: filtered.length,
      offset: offsetNum,
      limit: limitNum,
      assets: paginated.map((asset) => ({
        id: asset.id,
        type: asset.type,
        filename: asset.filename,
        url: asset.url,
        provider: asset.provider,
        model: asset.model,
        prompt: asset.prompt,
        status: asset.status,
        createdAt: asset.createdAt,
        estimatedCost: asset.estimatedCost,
        metadata: asset.metadata,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Query API Catalog] Error:', message);

    res.status(500).json({
      error: message,
    });
  }
});

/**
 * Get single asset by ID
 * GET /api/query/catalog/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const asset = await catalog.getAsset(req.params.id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Query API Catalog] Error:', message);

    res.status(500).json({
      error: message,
    });
  }
});

export default router;
