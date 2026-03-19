/**
 * Story Builder API Routes
 * FR-20 / Day 11: Video story assembly
 */

import { Router } from 'express';
import { assembleVideo, saveStoryToCatalog, getStoriesFromCatalog } from '../tools/story/index.js';
import type { AssemblyRequest, AssemblyResponse } from '@fligen/shared';

const router = Router();

router.post('/assemble', async (req, res) => {
  try {
    const assemblyRequest = req.body as AssemblyRequest;

    console.log('[API] /api/story/assemble - assembling video story');
    console.log('  Videos:', assemblyRequest.videos.length);
    console.log('  Music:', assemblyRequest.music.file);
    console.log(
      '  Narration:',
      assemblyRequest.narration?.enabled ? assemblyRequest.narration.file : 'none'
    );

    // Assemble the video
    const result = await assembleVideo(assemblyRequest);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Assembly failed' });
      return;
    }

    // Save to catalog
    const asset = await saveStoryToCatalog(result, assemblyRequest);

    const response: AssemblyResponse = {
      success: true,
      assetUrl: asset.url,
      assetId: asset.id,
      duration: result.duration,
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/story/assemble - error:', message);
    res.status(500).json({ error: message });
  }
});

router.get('/history', async (_req, res) => {
  try {
    const stories = await getStoriesFromCatalog();
    res.json({ stories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/story/history - error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
