/**
 * Image API Routes
 * FR-04: FAL.AI and KIE.AI image generation
 */

import { Router } from 'express';
import {
  checkHealth as checkImageHealth,
  generateTestImages,
  compareImages,
} from '../tools/image/index.js';
import type { CompareRequest } from '../tools/image/index.js';

const router = Router();

// Image API health check endpoint
router.get('/health', async (_req, res) => {
  try {
    const health = await checkImageHealth();
    res.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      fal: { configured: false, authenticated: false, error: message },
      kie: { configured: false, authenticated: false, error: message },
    });
  }
});

// Image API test generation endpoint
router.get('/test', async (_req, res) => {
  try {
    const results = await generateTestImages();
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      fal: { success: false, error: message, durationMs: 0 },
      kie: { success: false, error: message, durationMs: 0 },
    });
  }
});

// Image comparison endpoint - generates 4 images (2 providers × 2 tiers)
router.post('/compare', async (req, res) => {
  try {
    const { prompt } = req.body as CompareRequest;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing or invalid prompt' });
      return;
    }

    console.log(`[API] /api/image/compare - prompt: "${prompt}"`);
    const results = await compareImages(prompt);
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/image/compare - error: ${message}`);
    res.status(500).json({ error: message, results: [] });
  }
});

export default router;
