/**
 * Video and Shot List API Routes
 * FR-10: Shot list management and video generation
 */

import { Router } from 'express';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import { listShots, addShot, removeShot, clearAllShots } from '../tools/shots/index.js';
import type { AddShotRequest } from '../tools/shots/index.js';
import {
  checkVideoHealth,
  generateTransitionVideo,
  getVideoStatus,
  listVideoTasks,
} from '../tools/video/index.js';
import type { VideoModel } from '../tools/video/index.js';

export function createVideoRouter(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): Router {
  const router = Router();

  // ============================================
  // Shot List API Endpoints (FR-10)
  // ============================================

  // List all shots
  router.get('/shots', async (_req, res) => {
    try {
      const shots = await listShots();
      res.json({ shots });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/shots - error: ${message}`);
      res.status(500).json({ error: message, shots: [] });
    }
  });

  // Add shot to list
  router.post('/shots', async (req, res) => {
    try {
      const { imageUrl, prompt, provider, model, width, height } = req.body as AddShotRequest;

      if (!imageUrl || typeof imageUrl !== 'string') {
        res.status(400).json({ error: 'Missing or invalid imageUrl' });
        return;
      }

      console.log(`[API] /api/shots - adding shot from ${provider}/${model}`);
      const shot = await addShot({ imageUrl, prompt, provider, model, width, height });

      // Broadcast to all connected clients
      io.emit('shots:added', shot);

      res.json({ id: shot.id, filename: shot.filename, url: shot.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/shots - error: ${message}`);
      res.status(500).json({ error: message });
    }
  });

  // Clear all shots — must come before /:id to avoid route conflict
  router.delete('/shots/clear', async (_req, res) => {
    try {
      console.log('[API] /api/shots/clear - clearing all shots');
      await clearAllShots();

      // Broadcast to all connected clients
      io.emit('shots:cleared');

      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/shots/clear - error: ${message}`);
      res.status(500).json({ error: message });
    }
  });

  // Remove shot by ID
  router.delete('/shots/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[API] /api/shots/${id} - removing shot`);
      const success = await removeShot(id);

      if (success) {
        // Broadcast to all connected clients
        io.emit('shots:removed', id);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Shot not found' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/shots/${req.params.id} - error: ${message}`);
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // Video API Endpoints (FR-10)
  // ============================================

  // Check video API health
  router.get('/video/health', async (_req, res) => {
    try {
      const health = await checkVideoHealth();
      res.json(health);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/video/health - error: ${message}`);
      res.status(500).json({
        kie: { configured: false, authenticated: false, error: message },
        fal: { configured: false, authenticated: false, error: message },
      });
    }
  });

  // Generate transition video
  router.post('/video/generate', async (req, res) => {
    try {
      const { startShotId, endShotId, model, duration, prompt } = req.body as {
        startShotId: string;
        endShotId: string;
        model: VideoModel;
        duration: number;
        prompt?: string;
      };

      if (!startShotId || !endShotId) {
        res.status(400).json({ error: 'Missing startShotId or endShotId' });
        return;
      }

      if (!model) {
        res.status(400).json({ error: 'Missing model' });
        return;
      }

      console.log(
        `[API] /api/video/generate - ${startShotId} -> ${endShotId}, model: ${model}, duration: ${duration}s${prompt ? `, prompt: "${prompt}"` : ''}`
      );

      const task = await generateTransitionVideo(
        startShotId,
        endShotId,
        model,
        duration || 5,
        prompt,
        io
      );

      res.json({
        taskId: task.id,
        status: task.status,
        estimatedTime: 60,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/video/generate - error: ${message}`);
      res.status(500).json({ error: message });
    }
  });

  // Get video task status
  router.get('/video/status/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await getVideoStatus(taskId);

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/video/status - error: ${message}`);
      res.status(500).json({ error: message });
    }
  });

  // List all video tasks
  router.get('/video/list', async (_req, res) => {
    try {
      const videos = await listVideoTasks();
      res.json({ videos });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] /api/video/list - error: ${message}`);
      res.status(500).json({ error: message, videos: [] });
    }
  });

  return router;
}
