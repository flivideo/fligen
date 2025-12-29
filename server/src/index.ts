import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { HealthResponse, ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import { handleAgentQuery, clearSession, cancelQuery } from './agent/index.js';
import { isKybernesisConfigured } from './tools/kybernesis/index.js';
import { checkHealth as checkImageHealth, generateTestImages, compareImages, isFalConfigured, isKieConfigured } from './tools/image/index.js';
import type { CompareRequest } from './tools/image/index.js';
import { isConfigured as isElevenLabsConfigured, getVoices, generateSpeech } from './tools/elevenlabs/index.js';
import type { GenerateSpeechRequest } from './tools/elevenlabs/index.js';

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
app.use(express.json());

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

// TTS generate endpoint - convert text to speech
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, voiceId } = req.body as GenerateSpeechRequest;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid text' });
      return;
    }

    if (!voiceId || typeof voiceId !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid voiceId' });
      return;
    }

    console.log(`[API] /api/tts/generate - voiceId: "${voiceId}", text length: ${text.length}`);
    const result = await generateSpeech(text, voiceId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/tts/generate - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.emit('connection:established', {
    message: 'Connected to FliGen server',
  });

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
└─────────────────────────────────────┘
  `);
});
