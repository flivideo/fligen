/**
 * Query API - Discovery Endpoint
 * FR25.7: Query API Discovery
 */

import { Router } from 'express';
import { MODEL_REGISTRY, getProviderModels } from '../../tools/image/types.js';

const router = Router();

/**
 * FR25.7: Query API Discovery
 * GET /api/query/config
 *
 * Returns: Supported providers, models, pricing, API version
 */
router.get('/', (req, res) => {
  const version = '1.0.0';

  const providers = [
    {
      id: 'fal' as const,
      name: 'FAL.AI',
      models: getProviderModels('fal').map((m) => ({
        id: m.id,
        name: m.name,
        cost: m.cost,
        tier: m.id.includes('pro') ? 'advanced' : 'midrange',
      })),
      auth_configured: !!process.env.FAL_API_KEY,
    },
    {
      id: 'kie' as const,
      name: 'KIE.AI',
      models: getProviderModels('kie').map((m) => ({
        id: m.id,
        name: m.name,
        cost: m.cost,
        tier: m.id.includes('max') ? 'advanced' : 'midrange',
      })),
      auth_configured: !!process.env.KIE_API_KEY,
    },
  ];

  const endpoints = [
    {
      path: '/api/query/config',
      method: 'GET',
      description: 'API discovery - providers, models, pricing',
    },
    {
      path: '/api/query/health',
      method: 'GET',
      description: 'Provider health checks',
    },
    {
      path: '/api/query/catalog',
      method: 'GET',
      description: 'Browse asset catalog',
    },
    {
      path: '/api/image/batch',
      method: 'POST',
      description: 'Start batch generation',
    },
    {
      path: '/api/image/batch/:id',
      method: 'GET',
      description: 'Check batch progress',
    },
    {
      path: '/api/image/batch/upload-csv',
      method: 'POST',
      description: 'Upload CSV for batch generation',
    },
    {
      path: '/api/image/batch/:id/update-csv',
      method: 'POST',
      description: 'Update CSV with completion flags',
    },
    {
      path: '/api/image/batch/estimate',
      method: 'POST',
      description: 'Estimate batch generation cost',
    },
  ];

  res.json({
    version,
    providers,
    endpoints,
    model_registry: Object.keys(MODEL_REGISTRY).length,
  });
});

export default router;
