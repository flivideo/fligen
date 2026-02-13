/**
 * Query API - Health Endpoint
 * FR25.8: Query Health Endpoint
 */

import { Router } from 'express';
import * as imageApi from '../../tools/image/index.js';

const router = Router();

/**
 * FR25.8: Query Health Endpoint
 * GET /api/query/health
 *
 * Returns: Provider auth status, rate limits, last error
 */
router.get('/', async (req, res) => {
  try {
    const health = await imageApi.checkHealth();

    const status =
      health.fal.authenticated && health.kie.authenticated
        ? 'healthy'
        : health.fal.authenticated || health.kie.authenticated
          ? 'degraded'
          : 'unhealthy';

    res.json({
      status,
      providers: {
        fal: {
          configured: health.fal.configured,
          authenticated: health.fal.authenticated,
          error: health.fal.error,
        },
        kie: {
          configured: health.kie.configured,
          authenticated: health.kie.authenticated,
          error: health.kie.error,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Query API Health] Error:', message);

    res.status(500).json({
      status: 'error',
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
