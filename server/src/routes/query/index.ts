/**
 * Query API Tier - Unified external access layer
 * FR25.7-25.11
 *
 * Follows FliHub NFR-68 pattern:
 * - Discovery endpoint
 * - Hierarchical access
 * - Inline documentation
 * - Request logging
 */

import { Router } from 'express';
import configRouter from './config.js';
import healthRouter from './health.js';
import catalogRouter from './catalog.js';

const router = Router();

/**
 * FR25.11: Request Logging Middleware
 *
 * Logs all Query API requests for debugging and analytics
 */
router.use((req, res, next) => {
  console.log(`[Query API] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Mount sub-routers
 */
router.use('/config', configRouter);
router.use('/health', healthRouter);
router.use('/catalog', catalogRouter);

export default router;
