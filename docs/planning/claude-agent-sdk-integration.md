# Claude Agent SDK Integration

**Purpose**: Reference documentation for integrating Claude Agent SDK into FliGen (Days 2-3)
**Reference Project**: `/ad/appydave-app-a-day/007-bmad-claude-sdk/`
**Status**: Planning

---

## Overview

The Claude Agent SDK provides ~80% of Claude Code's capabilities for free. This document covers:
- Authentication and authorization mechanisms
- Server-side integration patterns
- Frontend options (simple vs full React)
- What the SDK provides vs. what we implement

---

## Reference Project: 007-bmad-claude-sdk

The 007 project contains excellent documentation for Agent SDK patterns:

```
/ad/appydave-app-a-day/007-bmad-claude-sdk/docs/planning/agent-event-loop/
├── overview.md        # 3-layer architecture
├── core-loop.md       # The event loop pattern
├── sdk-summary.md     # What SDK provides vs. you implement
├── dsl-reference.md   # Language-agnostic implementation spec
└── ...
```

**Key insight from 007**: Transport is irrelevant (CLI, Telegram, HTTP all use identical event loop).

---

## 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Transport (Socket.io / HTTP)                  │
│  - Receives user messages                               │
│  - Sends responses back to client                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Agent Event Loop (WE IMPLEMENT THIS)          │
│  - Initialize client with options                       │
│  - Send query to agent                                  │
│  - Stream response blocks                               │
│  - Execute tools automatically                          │
│  - Manage session state                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Authentication & API (SDK Internal)           │
│  - Handle authentication                                │
│  - Communicate with Anthropic API                       │
│  - Return streaming responses                           │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication

### Development Mode (Default)

```bash
# One-time setup - opens browser for OAuth
claude login

# Stores credentials in ~/.claude/
# Works with Claude Max subscription
# No API keys needed - OAuth handles auth
```

**No API key needed** - SDK automatically reads `~/.claude/` credentials after running `claude login`.

### Production Mode

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Token-based billing, suitable for cloud deployments.

### Alternative Providers

```bash
# Amazon Bedrock
export CLAUDE_CODE_USE_BEDROCK=1
# + AWS credentials

# Google Vertex AI
export CLAUDE_CODE_USE_VERTEX=1
# + Google Cloud credentials
```

### Auth in Code

```typescript
import { query, Options } from '@anthropic-ai/claude-agent-sdk';

// Auth is automatic - no explicit configuration needed
const queryIterator = query({ prompt, options });

// Error handling for auth
try {
  const { value } = await queryIterator.next();
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    console.error('Run: claude login');
  }
}
```

---

## Authorization (Tool Control)

### Allowlisting Tools

```typescript
const options: Options = {
  allowedTools: [
    'Read',                           // Built-in tool
    'Write',                          // Built-in tool
    'mcp__agent-tools__read_json',    // Specific MCP tool
    'mcp__agent-tools',               // All tools in MCP server
  ],
};
```

**Tool naming patterns:**
- `ToolName` - Built-in SDK tool
- `mcp__<server-name>` - All tools in an MCP server
- `mcp__<server-name>__<tool-name>` - Specific MCP tool

### Permission Modes

```typescript
const options: Options = {
  // Auto-approve all tool executions (development)
  permissionMode: 'acceptEdits',

  // Or require manual confirmation (production)
  // permissionMode: 'confirm',
};
```

---

## Server-Side Integration Pattern

### Core Event Loop

```typescript
import { query, Options } from '@anthropic-ai/claude-agent-sdk';
import { Server } from 'socket.io';

// Store session IDs per user/socket
const sessions = new Map<string, string>();

export async function handleAgentQuery(
  socket: Socket,
  userMessage: string
) {
  const options: Options = {
    systemPrompt: 'You are a helpful assistant for FliGen...',
    model: 'claude-sonnet-4-5-20250929',
    allowedTools: ['Read', 'Write', 'Bash'],
    permissionMode: 'acceptEdits',
    maxTurns: 10,
    // Resume previous conversation if exists
    resume: sessions.get(socket.id),
  };

  const queryIterator = query({ prompt: userMessage, options });

  for await (const chunk of queryIterator) {
    switch (chunk?.type) {
      case 'assistant':
        // Stream text to client
        for (const block of chunk.content) {
          if (block.type === 'text') {
            socket.emit('agent:text', { text: block.text });
          }
        }
        break;

      case 'tool_use':
        // Notify client of tool execution
        socket.emit('agent:tool', {
          name: chunk.name,
          input: chunk.input,
        });
        break;

      case 'tool_result':
        // Tool completed (SDK handles automatically)
        socket.emit('agent:tool_result', {
          name: chunk.name,
          success: !chunk.is_error,
        });
        break;

      case 'result':
        // Conversation complete - save session for resume
        sessions.set(socket.id, chunk.session_id);
        socket.emit('agent:complete', {
          sessionId: chunk.session_id,
          usage: chunk.usage,
          cost: chunk.total_cost_usd,
          duration: chunk.duration_ms,
        });
        break;
    }
  }
}
```

### Socket.io Events (Server → Client)

```typescript
// Add to shared/src/index.ts
export interface ServerToClientEvents {
  'connection:established': (data: { message: string }) => void;
  'agent:text': (data: { text: string }) => void;
  'agent:tool': (data: { name: string; input: unknown }) => void;
  'agent:tool_result': (data: { name: string; success: boolean }) => void;
  'agent:complete': (data: {
    sessionId: string;
    usage: { input: number; output: number };
    cost: number;
    duration: number;
  }) => void;
  'agent:error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  'agent:query': (data: { message: string }) => void;
  'agent:cancel': () => void;
}
```

---

## Frontend Options

### Option A: Simple Text Box + Dialog (Quick Start)

Minimal implementation - plain HTML/React with Socket.io streaming.

```
┌─────────────────────────────────────┐
│  [User input text box]    [Send]   │
├─────────────────────────────────────┤
│  Agent: Hello! How can I help?     │
│  User: Generate an image           │
│  Agent: [Tool: image_gen...]       │
│  Agent: Here's your image!         │
└─────────────────────────────────────┘
```

**Implementation:**

```tsx
// Simple chat component
function SimpleChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socket = useSocket();

  useEffect(() => {
    socket.on('agent:text', ({ text }) => {
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    });

    socket.on('agent:tool', ({ name }) => {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `[Executing: ${name}...]`
      }]);
    });

    return () => socket.off('agent:text').off('agent:tool');
  }, [socket]);

  const send = () => {
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    socket.emit('agent:query', { message: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
            <span className="inline-block p-2 rounded bg-slate-700">
              {msg.content}
            </span>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-700 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 p-2 rounded bg-slate-800"
          placeholder="Type a message..."
        />
        <button onClick={send} className="px-4 py-2 bg-blue-600 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
```

**Pros:**
- Minimal complexity
- Fast to implement (Day 2)
- Easy to debug
- Works with TailwindCSS v4

**Cons:**
- No typing indicators
- Basic message rendering
- Manual streaming accumulation

**Best for:** Days 2-3, rapid prototyping, tool-focused interfaces

---

### Option B: Full React Chat with Vercel AI SDK

Production-quality chat using shadcn/ui + Vercel AI SDK.

```
┌──────────────────────────────────────────────────────────┐
│  FliGen › Day 3 - Claude Agent SDK              [⚙]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🤖 Claude                                          │  │
│  │ Hello! I can help you with various tasks.         │  │
│  │ What would you like to do today?                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 👤 You                                             │  │
│  │ Generate an image of a sunset                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🤖 Claude                                          │  │
│  │ ┌──────────────────────────────────────────────┐  │  │
│  │ │ 🔧 Executing: image_generator                │  │  │
│  │ │ prompt: "sunset over ocean, golden hour"    │  │  │
│  │ └──────────────────────────────────────────────┘  │  │
│  │ I've generated your sunset image! ████████████   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Type your message...                        ] [Send]   │
└──────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- `shadcn/ui` - Base components
- `ai` - Vercel AI SDK (`useChat()` hook)
- `socket.io-client` - Real-time streaming
- AI Elements (optional) - Pre-built chat components

**Implementation:**

```tsx
import { useChat } from 'ai/react';
import { useSocket } from '@/hooks/useSocket';

function FullChat() {
  const socket = useSocket();
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat', // or use socket directly
  });

  // Bridge Socket.io to useChat state
  useEffect(() => {
    socket.on('agent:text', ({ text }) => {
      // Append to current assistant message
    });
  }, [socket]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Pros:**
- Production-quality UX
- Typing indicators, message grouping
- Built-in streaming state management
- Accessible components

**Cons:**
- shadcn/ui has TailwindCSS v4 issues (see 007 post-mortem)
- More complex setup
- Heavier dependencies

**Best for:** Final polish, production deployment

---

### Recommendation

| Phase | Approach | Why |
|-------|----------|-----|
| Day 2-3 | Option A | Fast iteration, prove SDK works |
| Day 8+ | Option B | Polish for demo/production |

---

## Current Backend Status

The FliGen server is currently a **blank slate**:

```typescript
// server/src/index.ts - Current state
io.on('connection', (socket) => {
  socket.emit('connection:established', { message: '...' });
  socket.on('ping', () => { /* ... */ });
});
```

**No agent SDK integration yet.** This is intentional - Days 2-3 add the SDK.

### Backend Design: Chat vs Tool Chain

The current Socket.io setup supports **both patterns**:

**Chat Pattern** (conversational, multi-turn):
```typescript
socket.on('agent:query', async ({ message }) => {
  // Resume session for multi-turn conversation
  await handleAgentQuery(socket, message);
});
```

**Tool Chain Pattern** (single-shot, task-focused):
```typescript
socket.on('tool:generate-image', async ({ prompt, style }) => {
  // One-off tool execution, no session resume
  await executeImageTool(socket, { prompt, style });
});
```

**FliGen will use both:**
- Day 2-3: Chat pattern for general agent interaction
- Day 4-8: Tool chain pattern for specific generators (image, TTS, video, music)
- Day 9+: Hybrid - chat orchestrates tool chains

---

## What SDK Provides vs. What We Implement

### SDK Provides (Built-in)

| Capability | Notes |
|------------|-------|
| Agent reasoning loop | Automatic |
| Tool execution | Automatic, no manual calls |
| Streaming responses | Block-level (complete thoughts) |
| Session ID generation | Capture from result message |
| Token/cost tracking | In result message |
| MCP server integration | Define in options |

### We Implement

| Capability | Notes |
|------------|-------|
| Transport (Socket.io) | Already in place |
| Session storage | Map or Redis |
| Multi-user isolation | Per-socket sessions |
| Path sandboxing | For file operations |
| Custom tools (MCP) | Day 4+ generators |
| Error handling | Auth, network, tool errors |

---

## Session Management

### In-Memory (Development)

```typescript
const sessions = new Map<string, string>();

// On query complete
sessions.set(socket.id, result.session_id);

// On new query
const options = {
  resume: sessions.get(socket.id),
  // ...
};

// On disconnect
socket.on('disconnect', () => {
  sessions.delete(socket.id);
});
```

### Persistent (Production)

```typescript
// Redis or database
await redis.set(`session:${userId}`, sessionId, 'EX', 86400);
const sessionId = await redis.get(`session:${userId}`);
```

---

## Security Considerations

From 007 project analysis:

**Safe for:**
- Local development
- Internal tools with trusted users
- Rapid prototyping

**Not safe for (without hardening):**
- Public-facing applications
- Untrusted users
- Sensitive data handling

**Mitigations:**
- Path sandboxing (restrict file operations)
- Tool allowlisting
- Rate limiting
- Authentication layer

---

## Implementation Checklist

### Day 2: Kybernesis (Second Brain)

- [ ] Install `@anthropic-ai/claude-agent-sdk`
- [ ] Add `agent:query` socket event
- [ ] Implement basic streaming to client
- [ ] Add Option A simple chat UI
- [ ] Test with `claude auth login`

### Day 3: Claude Agent SDK Patterns

- [ ] Add session management
- [ ] Implement tool execution notifications
- [ ] Add error handling
- [ ] Test multi-turn conversations
- [ ] Document patterns for Days 4+

---

## Dependencies to Add

```bash
# Server
npm install @anthropic-ai/claude-agent-sdk --workspace=server

# Optional: production enhancements
npm install helmet compression morgan --workspace=server
```

---

## References

- **007 Project**: `/ad/appydave-app-a-day/007-bmad-claude-sdk/`
- **007 Event Loop Docs**: `007-bmad-claude-sdk/docs/planning/agent-event-loop/`
- **Claude Agent SDK**: https://docs.anthropic.com/en/docs/agents-sdk
- **Vercel AI SDK**: https://sdk.vercel.ai/docs

---

**Last updated**: 2025-12-26
