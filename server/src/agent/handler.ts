// Agent query handler
// Handles incoming queries and streams responses via Socket.io

import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@fligen/shared';
import {
  getSession,
  setSession,
  getAbortController,
} from './session.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const SYSTEM_PROMPT = `You are a helpful assistant for FliGen, a tool-building harness.
You help users with coding tasks, file operations, and general questions.
Be concise and helpful.`;

export async function handleAgentQuery(
  socket: TypedSocket,
  userMessage: string
): Promise<void> {
  const startTime = Date.now();
  const abortController = getAbortController(socket.id);

  try {
    const options: Options = {
      systemPrompt: SYSTEM_PROMPT,
      model: 'claude-sonnet-4-5-20250929',
      allowedTools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
      permissionMode: 'acceptEdits',
      maxTurns: 10,
      resume: getSession(socket.id),
      abortController,
    };

    console.log(`[Agent] Query from ${socket.id}: ${userMessage.substring(0, 50)}...`);

    const queryIterator = query({ prompt: userMessage, options });

    for await (const message of queryIterator) {
      if (abortController.signal.aborted) {
        console.log(`[Agent] Query aborted for ${socket.id}`);
        break;
      }

      await processMessage(socket, message, startTime);
    }
  } catch (error) {
    handleError(socket, error);
  }
}

async function processMessage(
  socket: TypedSocket,
  message: SDKMessage,
  startTime: number
): Promise<void> {
  switch (message.type) {
    case 'assistant': {
      // Process content blocks from assistant message
      for (const block of message.message.content) {
        if (block.type === 'text') {
          socket.emit('agent:text', { text: block.text });
        } else if (block.type === 'tool_use') {
          socket.emit('agent:tool', {
            name: block.name,
            input: block.input,
          });
        }
      }
      break;
    }

    case 'stream_event': {
      // Handle streaming events for real-time text
      const event = message.event;
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta && delta.text) {
          socket.emit('agent:text', { text: delta.text });
        }
      }
      break;
    }

    case 'result': {
      // Conversation complete - save session and emit completion
      setSession(socket.id, message.session_id);

      const duration = Date.now() - startTime;
      socket.emit('agent:complete', {
        sessionId: message.session_id,
        usage: {
          input: message.usage.input_tokens,
          output: message.usage.output_tokens,
        },
        cost: message.total_cost_usd,
        duration,
      });

      console.log(`[Agent] Complete for ${socket.id}: ${duration}ms, $${message.total_cost_usd.toFixed(4)}`);
      break;
    }

    case 'system': {
      // Log system messages for debugging
      if (message.subtype === 'init') {
        console.log(`[Agent] Session initialized: ${message.model}`);
      }
      break;
    }

    default: {
      // Ignore other message types
      break;
    }
  }
}

function handleError(socket: TypedSocket, error: unknown): void {
  console.error('[Agent] Error:', error);

  let message = 'An error occurred';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;

    // Check for authentication errors
    if (
      message.includes('auth') ||
      message.includes('credential') ||
      message.includes('login')
    ) {
      message = 'Authentication required. Run: claude login (uses Max subscription via browser OAuth)';
      code = 'AUTH_REQUIRED';
    } else if (message.includes('rate limit')) {
      message = 'Rate limit exceeded. Please wait and try again.';
      code = 'RATE_LIMIT';
    } else if (message.includes('abort')) {
      message = 'Query was cancelled';
      code = 'CANCELLED';
    }
  }

  socket.emit('agent:error', { message, code });
}
