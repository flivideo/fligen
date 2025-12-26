import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { HealthResponse, ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import { handleAgentQuery, clearSession, cancelQuery } from './agent/index.js';

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
  console.log(`
┌─────────────────────────────────────┐
│  FliGen Server                      │
├─────────────────────────────────────┤
│  HTTP:      http://localhost:${PORT}  │
│  Socket.io: ws://localhost:${PORT}    │
│  Health:    http://localhost:${PORT}/health │
└─────────────────────────────────────┘
  `);
});
