import { execSync } from 'child_process';
import { env } from './config/env.js';
import { log } from './config/logger.js';
import { addRequestId, httpLogger } from './middleware/requestLogger.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import type { HealthResponse, ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import { handleAgentQuery, clearSession, cancelQuery } from './agent/index.js';
import { isKybernesisConfigured } from './tools/kybernesis/index.js';
import { isFalConfigured, isKieConfigured } from './tools/image/index.js';
import { isConfigured as isElevenLabsConfigured } from './tools/elevenlabs/index.js';
import {
  isFalConfigured as isFalMusicConfigured,
  isKieConfigured as isKieMusicConfigured,
} from './tools/music/index.js';
import { isFliHubConfigured } from './tools/flihub/index.js';
import { listShots } from './tools/shots/index.js';
import * as catalog from './tools/catalog/index.js';
import imageRouter from './routes/image.js';
import imagesRouter from './routes/images.js';
import { createVideoRouter } from './routes/video.js';
import musicRouter from './routes/music.js';
import ttsRouter from './routes/tts.js';
import storyRouter from './routes/story.js';
import widgetsRouter from './routes/widgets.js';
import projectsRouter from './routes/projects.js';
import catalogRouter from './routes/catalog.js';
import n8nRouter, { isN8nConfigured } from './routes/n8n.js';
import batchRouter from './routes/batch.js';
import queryRouter from './routes/query/index.js';
import thumbnailRouter from './routes/thumbnail.js';

const PORT = env.PORT;
const CLIENT_URL = env.CLIENT_URL;

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
app.use(addRequestId);
app.use(httpLogger);
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '50mb' })); // Increased for base64 audio files

// Serve static assets (shot-list images, fox-story assets, etc.)
const assetsDir = path.resolve(process.cwd(), '..', 'assets');
app.use('/assets', express.static(assetsDir));

// Health check endpoint (server-level)
app.get('/health', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  res.json(response);
});

// Route mounting
app.use('/api/image', imageRouter);
app.use('/api/images', imagesRouter);
app.use('/api', createVideoRouter(io));  // /api/shots/* and /api/video/*
app.use('/api/music', musicRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/story', storyRouter);
app.use('/api', widgetsRouter);          // /api/widgets/* and /api/widget-templates/*
app.use('/api', projectsRouter);         // /api/projects/*, /api/prompts/*, /api/flihub/*
app.use('/api/catalog', catalogRouter);
app.use('/api/n8n', n8nRouter);
app.use('/api/image', batchRouter);      // FR-25 batch routes
app.use('/api/query', queryRouter);      // FR-25 query routes
app.use('/api/thumbnail', thumbnailRouter);

// Socket.io
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

function logStartup(port: number | string): void {
  const s = (ok: boolean, yes: string, no: string) => (ok ? `✓ ${yes}` : `⚠ ${no}`);
  const rows = [
    s(isKybernesisConfigured(), 'Kybernesis configured', 'Kybernesis not configured'),
    s(isFalConfigured(), 'FAL.AI configured', 'FAL.AI not configured'),
    s(isKieConfigured(), 'KIE.AI configured', 'KIE.AI not configured'),
    s(isElevenLabsConfigured(), 'ElevenLabs configured', 'ElevenLabs not configured'),
    s(isFalMusicConfigured(), 'FAL.AI Music configured', 'FAL.AI Music not configured'),
    s(isKieMusicConfigured(), 'KIE.AI Music configured', 'KIE.AI Music not configured'),
    s(isFliHubConfigured(), 'FliHub available (port 5101)', 'FliHub not configured'),
    s(isN8nConfigured(), 'N8N webhook configured', 'N8N webhook not configured'),
  ];
  log.info(`
┌─────────────────────────────────────┐
│  FliGen Server                      │
├─────────────────────────────────────┤
│  HTTP:      http://localhost:${port}  │
│  Socket.io: ws://localhost:${port}    │
│  Health:    http://localhost:${port}/health │
├─────────────────────────────────────┤
${rows.map((r) => `│  ${r.padEnd(35)} │`).join('\n')}
└─────────────────────────────────────┘
  `);
}

function cleanupPort(port: number | string): void {
  try {
    const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' });
    const pids = result.trim().split('\n').filter(Boolean);
    if (pids.length > 0) {
      log.info(`Cleaning up port ${port}: killing PIDs ${pids.join(', ')}`);
      for (const pid of pids) {
        const numericPid = parseInt(pid.trim(), 10);
        if (isNaN(numericPid) || numericPid <= 0) continue;
        try {
          process.kill(numericPid, 'SIGKILL');
        } catch { /* already gone */ }
      }
      execSync('sleep 0.5');
    }
  } catch { /* lsof unavailable, continue */ }
}

// Start server
cleanupPort(PORT);
httpServer.listen(PORT, () => logStartup(PORT));

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
  log.info(`\nReceived ${signal}, starting graceful shutdown...`, { signal });

  // Close Socket.io server (stops accepting new connections and closes existing ones)
  io.close(() => {
    log.info('Socket.io server closed');
  });

  // Close HTTP server (stops accepting new connections)
  httpServer.close(() => {
    log.info('HTTP server closed');
    log.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit after 3 seconds if graceful shutdown hangs
  setTimeout(() => {
    log.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 3000);
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
