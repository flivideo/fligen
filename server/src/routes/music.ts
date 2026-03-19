/**
 * Music API Routes
 * FR-11: Music generation with FAL.AI and KIE.AI
 */

import { Router } from 'express';
import {
  checkMusicHealth,
  generateMusic,
  listLibraryTracks,
  saveMusicToCatalog,
} from '../tools/music/index.js';
import type { MusicGenerationRequest, GeneratedTrack } from '../tools/music/index.js';
import * as catalog from '../tools/catalog/index.js';

const router = Router();

// Check music API health
router.get('/health', async (_req, res) => {
  try {
    const health = await checkMusicHealth();
    res.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/music/health - error: ${message}`);
    res.status(500).json({
      fal: { configured: false, authenticated: false, error: message },
      kie: { configured: false, authenticated: false, error: message },
    });
  }
});

// Generate music
router.post('/generate', async (req, res) => {
  try {
    const request = req.body as MusicGenerationRequest;

    if (!request.prompt || typeof request.prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid prompt' });
      return;
    }

    if (!request.provider || !['fal', 'kie'].includes(request.provider)) {
      res.status(400).json({ success: false, error: 'Missing or invalid provider' });
      return;
    }

    console.log(
      `[API] /api/music/generate - provider: ${request.provider}, prompt: "${request.prompt.substring(0, 50)}..."`
    );
    const track = await generateMusic(request);

    // Auto-save to catalog (FR-17 requirement)
    if (track.audioBase64 || track.audioUrl) {
      console.log(`[API] /api/music/generate - auto-saving to catalog: "${track.name}"`);
      const audioData = track.audioBase64 || track.audioUrl;
      await saveMusicToCatalog(track, audioData);
    }

    res.json({ success: true, track });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/music/generate - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// List saved tracks in library (from catalog + old storage for backward compatibility)
router.get('/library', async (_req, res) => {
  try {
    // Get music assets from NEW catalog
    const catalogAssets = await catalog.filterAssets({ type: 'music' });

    // Convert catalog assets to SavedTrack format
    const catalogTracks = catalogAssets.map((asset) => ({
      id: asset.id,
      name: asset.metadata?.name || 'Untitled Track',
      audioUrl: asset.url,
      provider: asset.provider as 'fal' | 'kie',
      model: asset.model,
      prompt: asset.prompt || '',
      lyrics: asset.metadata?.lyrics,
      style: asset.metadata?.style,
      duration: asset.metadata?.duration || 0,
      generatedAt: asset.createdAt,
      status: asset.status === 'ready' ? 'saved' : asset.status,
      estimatedCost: asset.estimatedCost || 0,
      generationTimeMs: asset.generationTimeMs || 0,
      savedAt: asset.completedAt || asset.createdAt,
      filename: asset.filename,
    }));

    // Get music from OLD storage (for backward compatibility)
    const oldTracks = await listLibraryTracks();

    // Combine both sources (catalog first, then old storage)
    const allTracks = [...catalogTracks, ...oldTracks];

    res.json({ tracks: allTracks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/music/library - error: ${message}`);
    res.status(500).json({ error: message, tracks: [] });
  }
});

// Save track to library
router.post('/save', async (req, res) => {
  try {
    const track = req.body as GeneratedTrack;

    if (!track.audioBase64) {
      res.status(400).json({ error: 'Missing audioBase64' });
      return;
    }

    console.log(`[API] /api/music/save - saving track to catalog: "${track.name}"`);
    const asset = await saveMusicToCatalog(track, track.audioBase64);

    // Convert Asset to SavedTrack format for client compatibility
    const savedTrack = {
      id: asset.id,
      name: asset.metadata?.name || track.name,
      audioUrl: asset.url,
      provider: asset.provider as 'fal' | 'kie',
      model: asset.model,
      prompt: asset.prompt || '',
      lyrics: asset.metadata?.lyrics,
      style: asset.metadata?.style,
      duration: asset.metadata?.duration || track.duration,
      generatedAt: asset.createdAt,
      status: 'saved' as const,
      estimatedCost: asset.estimatedCost || 0,
      generationTimeMs: asset.generationTimeMs || 0,
      savedAt: asset.completedAt || asset.createdAt,
      filename: asset.filename,
    };

    res.json(savedTrack);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/music/save - error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Delete track from library (catalog)
router.delete('/library/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[API] /api/music/library/${id} - deleting track from catalog`);
    const success = await catalog.deleteAsset(id);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Track not found' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/music/library/${req.params.id} - error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
