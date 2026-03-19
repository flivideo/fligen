/**
 * Images Save-to-Catalog API Route
 * Handles /api/images/save-to-catalog (plural path — distinct from /api/image/*)
 */

import { Router } from 'express';
import { saveImageToCatalog } from '../tools/image/index.js';

const router = Router();

// Image save to catalog endpoint - saves generated images to catalog
router.post('/save-to-catalog', async (req, res) => {
  try {
    const { imageUrl, prompt, provider, model, width, height, metadata } = req.body;

    if (!imageUrl || !prompt || !provider || !model) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const asset = await saveImageToCatalog(
      imageUrl,
      prompt,
      provider,
      model,
      width || 1024,
      height || 1024,
      metadata || {}
    );

    res.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/images/save-to-catalog - error:', message);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

export default router;
