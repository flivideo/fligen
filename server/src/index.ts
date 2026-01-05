import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import type { HealthResponse, ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import { handleAgentQuery, clearSession, cancelQuery } from './agent/index.js';
import { isKybernesisConfigured } from './tools/kybernesis/index.js';
import { checkHealth as checkImageHealth, generateTestImages, compareImages, isFalConfigured, isKieConfigured, saveImageToCatalog } from './tools/image/index.js';
import type { CompareRequest } from './tools/image/index.js';
import { isConfigured as isElevenLabsConfigured, getVoices, generateSpeech, saveAudioToCatalog } from './tools/elevenlabs/index.js';
import type { GenerateSpeechRequest } from './tools/elevenlabs/index.js';
import { listShots, addShot, removeShot, clearAllShots } from './tools/shots/index.js';
import type { AddShotRequest } from './tools/shots/index.js';
import { checkVideoHealth, generateTransitionVideo, getVideoStatus, listVideoTasks, isKieConfigured as isKieVideoConfigured, isFalConfigured as isFalVideoConfigured, saveVideoToCatalog } from './tools/video/index.js';
import type { VideoModel } from './tools/video/index.js';
import { checkMusicHealth, generateMusic, listLibraryTracks, saveTrackToLibrary, deleteLibraryTrack, saveMusicToCatalog, isFalConfigured as isFalMusicConfigured, isKieConfigured as isKieMusicConfigured } from './tools/music/index.js';
import type { MusicGenerationRequest, GeneratedTrack } from './tools/music/index.js';
import { checkFliHubHealth, fetchTranscripts, isFliHubConfigured } from './tools/flihub/index.js';
import { saveProject, loadProject, listProjects, projectExists } from './tools/projects/index.js';
import type { SaveProjectRequest, ProjectData, SourceTranscript, RefinePromptsRequest, RefinePromptsResponse } from '@fligen/shared';
import { SYSTEM_PROMPTS, refinePrompts } from './tools/prompts/index.js';
import { assembleVideo, saveStoryToCatalog } from './tools/story/index.js';
import type { AssemblyRequest, AssemblyResponse } from '@fligen/shared';
import * as catalog from './tools/catalog/index.js';
import type { Asset } from '@fligen/shared';

const PORT = parseInt(process.env.PORT || '5401', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5400';

const app = express();
const httpServer = createServer(app);

// Socket.io setup with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '50mb' })); // Increased for base64 audio files

// Serve static assets (shot-list images, fox-story assets, etc.)
const assetsDir = path.resolve(process.cwd(), '..', 'assets');
app.use('/assets', express.static(assetsDir));

// Health check endpoint
app.get('/health', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  res.json(response);
});

// Image API health check endpoint
app.get('/api/image/health', async (_req, res) => {
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
app.get('/api/image/test', async (_req, res) => {
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
app.post('/api/image/compare', async (req, res) => {
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

// Image save to catalog endpoint - saves generated images to catalog
app.post('/api/images/save-to-catalog', async (req, res) => {
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

// TTS voices endpoint - list available voices
app.get('/api/tts/voices', (_req, res) => {
  try {
    const voices = getVoices();
    res.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message, voices: [] });
  }
});

// TTS generate endpoint - convert text to speech and save to catalog
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, voiceId, name } = req.body as GenerateSpeechRequest;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid text' });
      return;
    }

    if (!voiceId || typeof voiceId !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid voiceId' });
      return;
    }

    console.log(`[API] /api/tts/generate - voiceId: "${voiceId}", text length: ${text.length}, name: "${name || 'none'}"`);
    const result = await generateSpeech(text, voiceId);

    if (!result.success || !result.audioBase64) {
      res.json(result);
      return;
    }

    // Save audio to catalog as narration
    const asset = await saveAudioToCatalog(
      result.audioBase64,
      text,
      voiceId,
      result.voiceName || 'Unknown',
      result.model || 'eleven_multilingual_v2',
      result.characterCount || text.length,
      result.durationMs || 0,
      {},
      name
    );

    // Return asset info instead of base64
    res.json({
      success: true,
      audioUrl: asset.url,
      assetId: asset.id,
      durationMs: result.durationMs,
      voiceName: result.voiceName,
      model: result.model,
      characterCount: result.characterCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/tts/generate - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================
// Shot List API Endpoints (FR-10)
// ============================================

// List all shots
app.get('/api/shots', async (_req, res) => {
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
app.post('/api/shots', async (req, res) => {
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

// Remove shot by ID
app.delete('/api/shots/:id', async (req, res) => {
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

// Clear all shots
app.delete('/api/shots/clear', async (_req, res) => {
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

// ============================================
// Video API Endpoints (FR-10)
// ============================================

// Check video API health
app.get('/api/video/health', async (_req, res) => {
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
app.post('/api/video/generate', async (req, res) => {
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

    console.log(`[API] /api/video/generate - ${startShotId} -> ${endShotId}, model: ${model}, duration: ${duration}s${prompt ? `, prompt: "${prompt}"` : ''}`);

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
app.get('/api/video/status/:taskId', async (req, res) => {
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
app.get('/api/video/list', async (_req, res) => {
  try {
    const videos = await listVideoTasks();
    res.json({ videos });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/video/list - error: ${message}`);
    res.status(500).json({ error: message, videos: [] });
  }
});

// ============================================
// Music API Endpoints (FR-11)
// ============================================

// Check music API health
app.get('/api/music/health', async (_req, res) => {
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
app.post('/api/music/generate', async (req, res) => {
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

    console.log(`[API] /api/music/generate - provider: ${request.provider}, prompt: "${request.prompt.substring(0, 50)}..."`);
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
app.get('/api/music/library', async (_req, res) => {
  try {
    // Get music assets from NEW catalog
    const catalogAssets = await catalog.filterAssets({ type: 'music' });

    // Convert catalog assets to SavedTrack format
    const catalogTracks = catalogAssets.map(asset => ({
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
app.post('/api/music/save', async (req, res) => {
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
app.delete('/api/music/library/:id', async (req, res) => {
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

// Rename track in catalog
app.patch('/api/catalog/assets/:id/rename', async (req, res) => {
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

// ============================================
// FliHub Integration API Endpoints (FR-13)
// ============================================

// Check FliHub health
app.get('/api/flihub/health', async (_req, res) => {
  try {
    const health = await checkFliHubHealth();
    res.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/flihub/health - error: ${message}`);
    res.status(500).json({ status: 'error', message });
  }
});

// Fetch transcripts from FliHub
app.get('/api/flihub/transcripts', async (req, res) => {
  try {
    const { projectCode, chapter, segments } = req.query;

    if (!projectCode || typeof projectCode !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid projectCode' });
      return;
    }

    if (!chapter || typeof chapter !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid chapter' });
      return;
    }

    if (!segments || typeof segments !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid segments' });
      return;
    }

    // Parse segments (comma-separated string like "1,2,3")
    const segmentArray = segments.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

    if (segmentArray.length === 0) {
      res.status(400).json({ success: false, error: 'No valid segments provided' });
      return;
    }

    console.log(`[API] /api/flihub/transcripts - project: "${projectCode}", chapter: "${chapter}", segments: [${segmentArray.join(', ')}]`);
    const result = await fetchTranscripts(projectCode, chapter, segmentArray);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/flihub/transcripts - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================
// Prompt Refinement API Endpoints (FR-15)
// ============================================

// Get system prompts
app.get('/api/prompts/system', (_req, res) => {
  try {
    res.json({ systemPrompts: SYSTEM_PROMPTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/prompts/system - error:', message);
    res.status(500).json({ error: message });
  }
});

// Refine human prompts into machine prompts using Claude Agent SDK
app.post('/api/prompts/refine', async (req, res) => {
  try {
    const { humanPrompts } = req.body as RefinePromptsRequest;

    if (!humanPrompts || !humanPrompts.seed || !humanPrompts.edit || !humanPrompts.animation) {
      res.status(400).json({ error: 'Missing humanPrompts (seed, edit, animation required)' });
      return;
    }

    console.log('[API] /api/prompts/refine - refining prompts with Claude Agent SDK');

    const machinePrompts = await refinePrompts(humanPrompts);

    const response: RefinePromptsResponse = { machinePrompts };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/prompts/refine - error:', message);
    res.status(500).json({ error: message });
  }
});

// ============================================
// Story Builder API Endpoints (FR-20 / Day 11)
// ============================================

app.post('/api/story/assemble', async (req, res) => {
  try {
    const assemblyRequest = req.body as AssemblyRequest;

    console.log('[API] /api/story/assemble - assembling video story');
    console.log('  Videos:', assemblyRequest.videos.length);
    console.log('  Music:', assemblyRequest.music.file);
    console.log('  Narration:', assemblyRequest.narration?.enabled ? assemblyRequest.narration.file : 'none');

    // Assemble the video
    const result = await assembleVideo(assemblyRequest);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Assembly failed' });
      return;
    }

    // Save to catalog
    await saveStoryToCatalog(result, assemblyRequest);

    const response: AssemblyResponse = {
      success: true,
      outputPath: result.outputPath,
      duration: result.duration,
      catalogId: result.catalogId,
    };

    res.json(response);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/story/assemble - error:', message);
    res.status(500).json({ error: message });
  }
});

// ============================================
// N8N Workflow API Endpoints (FR-14 / Day 10)
// ============================================

// Check if N8N webhook is configured
function isN8nConfigured(): boolean {
  return !!process.env.N8N_WEBHOOK_URL;
}

// Clean prompts - remove "Prompt" prefix, punctuation, newlines
function cleanPrompt(text: string): string {
  return text
    // Remove "Prompt" or "Prompt," or similar from the beginning
    .replace(/^(Prompt|prompt)[,:\s]*/i, '')
    // Remove newlines and carriage returns
    .replace(/[\r\n]+/g, ' ')
    // Remove all punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, '')
    // Collapse multiple spaces into single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

// Trigger N8N workflow
app.post('/api/n8n/workflow', async (req, res) => {
  try {
    const { seedImage, editInstruction, animation } = req.body;

    if (!seedImage || !editInstruction || !animation) {
      res.status(400).json({ error: 'Missing required prompts' });
      return;
    }

    // Clean prompts - remove punctuation
    const cleanedSeedImage = cleanPrompt(seedImage);
    const cleanedEditInstruction = cleanPrompt(editInstruction);
    const cleanedAnimation = cleanPrompt(animation);

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('[API] /api/n8n/workflow - N8N_WEBHOOK_URL not configured');
      res.status(500).json({ error: 'N8N webhook not configured' });
      return;
    }

    // Anonymize webhook URL for logging
    const anonymizedUrl = webhookUrl.replace(/\/webhook\/[^\/]+$/, '/webhook/***');

    console.log('[API] /api/n8n/workflow - triggering N8N workflow');
    console.log('[API] Webhook URL:', anonymizedUrl);
    console.log('[API] Original prompts:', {
      seedImage: seedImage.substring(0, 50) + '...',
      editInstruction: editInstruction.substring(0, 50) + '...',
      animation: animation.substring(0, 50) + '...',
    });
    console.log('[API] Cleaned prompts:', {
      seedImage: cleanedSeedImage.substring(0, 50) + '...',
      editInstruction: cleanedEditInstruction.substring(0, 50) + '...',
      animation: cleanedAnimation.substring(0, 50) + '...',
    });

    // Prepare payload with cleaned prompts
    const dataObject = {
      prompt_a: cleanedSeedImage,
      prompt_b: cleanedEditInstruction,
      prompt_c: cleanedAnimation,
    };

    // Convert to clean, valid JSON string
    const jsonString = JSON.stringify(dataObject);
    console.log('[API] JSON payload length:', jsonString.length, 'bytes');

    // Save payload to file for debugging/sharing with Steve
    const fs = await import('fs/promises');
    const payloadPath = path.resolve(process.cwd(), 'n8n-last-payload.json');
    await fs.writeFile(payloadPath, JSON.stringify(dataObject, null, 2));
    console.log('[API] Payload saved to:', payloadPath);

    // Call N8N webhook with clean JSON string
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    console.log('[API] N8N response status:', n8nResponse.status);

    // Get raw response text first
    const responseText = await n8nResponse.text();
    console.log('[API] N8N raw response:', responseText || '(empty)');

    if (!n8nResponse.ok) {
      // Anonymize webhook ID in error messages
      const anonymizedError = responseText.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, '***');
      console.error('[API] N8N webhook error:', anonymizedError);
      res.status(500).json({ error: 'N8N workflow failed to start', details: anonymizedError });
      return;
    }

    // Parse JSON if response has content
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
        console.log('[API] N8N response data:', data);
      } catch (err) {
        console.error('[API] Failed to parse N8N response as JSON:', err);
      }
    }

    // Save generated assets to catalog in sequential workflow folder
    let savedAssets: any[] = [];
    if (data && (data.image1 || data.image2 || data.video)) {
      try {
        // Get next workflow number (0001, 0002, etc.)
        const workflowId = await catalog.getNextWorkflowNumber();
        const assetsDir = path.resolve(process.cwd(), '..', 'assets');
        const workflowFolder = path.join(assetsDir, 'catalog', 'n8n', workflowId);
        const fs = await import('fs/promises');
        await fs.mkdir(workflowFolder, { recursive: true });

        console.log(`[API] Saving N8N workflow ${workflowId} assets...`);

        const workflowMetadata = {
          workflowId,
          workflowType: 'image-edit-and-animate',
          workflowName: seedImage.substring(0, 50),
          runDate: new Date().toISOString(),
          prompts: {
            seedImage: { human: seedImage, cleaned: cleanedSeedImage },
            editInstruction: { human: editInstruction, cleaned: cleanedEditInstruction },
            animation: { human: animation, cleaned: cleanedAnimation },
          },
        };

        const savePromises: Promise<Asset>[] = [];

        // Save Image 1 (start frame) to workflow folder
        if (data.image1) {
          const imageBuffer = await fetch(data.image1).then(r => r.arrayBuffer());
          const filename = 'image-start.png';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(imageBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('image'),
            type: 'image',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'flux-pro',
            prompt: seedImage,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.04,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'start',
              step: 'seed-image',
              humanPrompt: seedImage,
              cleanedPrompt: cleanedSeedImage,
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        // Save Image 2 (end frame) to workflow folder
        if (data.image2) {
          const imageBuffer = await fetch(data.image2).then(r => r.arrayBuffer());
          const filename = 'image-end.png';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(imageBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('image'),
            type: 'image',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'flux-edit',
            prompt: editInstruction,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.04,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'end',
              step: 'edit-image',
              humanPrompt: editInstruction,
              cleanedPrompt: cleanedEditInstruction,
              sourceImageUrl: data.image1,
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        // Save Video to workflow folder
        if (data.video) {
          const videoBuffer = await fetch(data.video).then(r => r.arrayBuffer());
          const filename = 'video.mp4';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(videoBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('video'),
            type: 'video',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'veo-3',
            prompt: animation,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.15,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'video',
              step: 'animate',
              duration: 5,
              humanPrompt: animation,
              cleanedPrompt: cleanedAnimation,
              sourceImages: [data.image1, data.image2].filter(Boolean),
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        savedAssets = await Promise.all(savePromises);
        console.log('[N8N] Saved', savedAssets.length, 'assets to catalog:', savedAssets.map(a => a.id));
      } catch (saveError) {
        console.error('[N8N] Failed to save assets to catalog:', saveError);
        // Don't fail the request - just log the error
      }
    }

    res.json({
      success: true,
      data,
      savedAssets: savedAssets.map(a => ({ id: a.id, url: a.url, type: a.type })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/n8n/workflow - error:', message);
    res.status(500).json({ error: message });
  }
});

// ============================================
// Projects API Endpoints (FR-13)
// ============================================

// List all projects
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects - error: ${message}`);
    res.status(500).json({ error: message, projects: [] });
  }
});

// Get specific project
app.get('/api/projects/:projectCode', async (req, res) => {
  try {
    const { projectCode } = req.params;
    console.log(`[API] /api/projects/${projectCode} - loading project`);

    const project = await loadProject(projectCode);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects/${req.params.projectCode} - error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Save project
app.post('/api/projects/save', async (req, res) => {
  try {
    const {
      projectCode,
      chapterId,
      segmentA,
      segmentB,
      segmentC,
      promptA,
      promptB,
      promptC,
      sourceTranscripts,
    } = req.body as SaveProjectRequest;

    // Validation
    if (!projectCode || typeof projectCode !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid projectCode' });
      return;
    }

    if (!chapterId || typeof chapterId !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid chapterId' });
      return;
    }

    if (!promptA && !promptB && !promptC) {
      res.status(400).json({ success: false, error: 'At least one prompt is required' });
      return;
    }

    console.log(`[API] /api/projects/save - saving project: ${projectCode}`);

    // Check if project already exists
    const exists = await projectExists(projectCode);
    if (exists) {
      // Allow overwrite, but log it
      console.log(`[API] /api/projects/save - overwriting existing project: ${projectCode}`);
    }

    const now = new Date().toISOString();

    // Build project data
    const projectData: ProjectData = {
      metadata: {
        projectCode,
        createdAt: exists ? (await loadProject(projectCode))?.metadata.createdAt || now : now,
        updatedAt: now,
        flihub: {
          chapterId,
          segments: {
            prompt_a: segmentA,
            prompt_b: segmentB,
            prompt_c: segmentC,
          },
        },
      },
      humanPrompts: {
        projectCode,
        prompt_a: promptA || '',
        prompt_b: promptB || '',
        prompt_c: promptC || '',
      },
    };

    // Add source transcripts if provided
    if (sourceTranscripts) {
      projectData.sourceTranscripts = {
        projectCode,
        transcripts: {
          prompt_a: sourceTranscripts.a,
          prompt_b: sourceTranscripts.b,
          prompt_c: sourceTranscripts.c,
        },
      };
    }

    const result = await saveProject(projectData);

    if (result.success) {
      res.json({ success: true, projectCode });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects/save - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================
// Asset Catalog API Endpoints (FR-16)
// ============================================

// GET /api/catalog - Get all assets
app.get('/api/catalog', async (_req, res) => {
  try {
    const assets = await catalog.getAllAssets();
    res.json({ assets });
  } catch (error) {
    console.error('[Catalog] Failed to get assets:', error);
    res.status(500).json({ error: 'Failed to retrieve assets' });
  }
});

// GET /api/catalog/filter - Filter assets (must come before /:id route)
app.get('/api/catalog/filter', async (req, res) => {
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

// GET /api/catalog/:id - Get asset by ID
app.get('/api/catalog/:id', async (req, res) => {
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
app.delete('/api/catalog/:id', async (req, res) => {
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

// PUT /api/catalog/:id/tags - Update asset tags (FR-18)
app.put('/api/catalog/:id/tags', async (req, res) => {
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

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.emit('connection:established', {
    message: 'Connected to FliGen server',
  });

  // Send current shot list to new client
  try {
    const shots = await listShots();
    socket.emit('shots:list', shots);
  } catch (error) {
    console.error('[Socket.io] Failed to send shot list:', error);
  }

  socket.on('ping', () => {
    console.log(`[Socket.io] Ping from ${socket.id}`);
  });

  // Agent query handler
  socket.on('agent:query', async (data) => {
    console.log(`[Socket.io] Agent query from ${socket.id}`);
    await handleAgentQuery(socket, data.message);
  });

  // Cancel in-progress query
  socket.on('agent:cancel', () => {
    console.log(`[Socket.io] Cancel query from ${socket.id}`);
    cancelQuery(socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    clearSession(socket.id);
  });
});

// Initialize catalog on startup
await catalog.initCatalog();
console.log('[Catalog] Asset catalog initialized');

// Start server
httpServer.listen(PORT, () => {
  const kybernesisStatus = isKybernesisConfigured()
    ? '✓ Kybernesis configured'
    : '⚠ Kybernesis not configured';

  const falStatus = isFalConfigured()
    ? '✓ FAL.AI configured'
    : '⚠ FAL.AI not configured';

  const kieStatus = isKieConfigured()
    ? '✓ KIE.AI configured'
    : '⚠ KIE.AI not configured';

  const elevenLabsStatus = isElevenLabsConfigured()
    ? '✓ ElevenLabs configured'
    : '⚠ ElevenLabs not configured';

  const falMusicStatus = isFalMusicConfigured()
    ? '✓ FAL.AI Music configured'
    : '⚠ FAL.AI Music not configured';

  const kieMusicStatus = isKieMusicConfigured()
    ? '✓ KIE.AI Music configured'
    : '⚠ KIE.AI Music not configured';

  const fliHubStatus = isFliHubConfigured()
    ? '✓ FliHub available (port 5101)'
    : '⚠ FliHub not configured';

  const n8nStatus = isN8nConfigured()
    ? '✓ N8N webhook configured'
    : '⚠ N8N webhook not configured';

  console.log(`
┌─────────────────────────────────────┐
│  FliGen Server                      │
├─────────────────────────────────────┤
│  HTTP:      http://localhost:${PORT}  │
│  Socket.io: ws://localhost:${PORT}    │
│  Health:    http://localhost:${PORT}/health │
├─────────────────────────────────────┤
│  ${kybernesisStatus.padEnd(35)} │
│  ${falStatus.padEnd(35)} │
│  ${kieStatus.padEnd(35)} │
│  ${elevenLabsStatus.padEnd(35)} │
│  ${falMusicStatus.padEnd(35)} │
│  ${kieMusicStatus.padEnd(35)} │
│  ${fliHubStatus.padEnd(35)} │
│  ${n8nStatus.padEnd(35)} │
└─────────────────────────────────────┘
  `);
});
