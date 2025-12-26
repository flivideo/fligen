# FR-3: Claude Agent SDK Server Integration

**Status:** Complete
**Added:** 2025-12-26

---

## User Story

As a developer using FliGen, I want the server to integrate Claude Agent SDK with OAuth authentication so that I can send queries from the client and receive streaming AI responses without managing API keys.

## Problem

The FliGen harness (Day 1) and layout (Day 2) are complete, but the server cannot yet communicate with Claude. For Days 2-12 tools to function, we need:

- Server-side Claude Agent SDK integration
- Authentication via `claude login` (OAuth, no API key needed)
- Real-time streaming responses to the client via Socket.io
- Session management for multi-turn conversations
- Error handling for authentication and network issues

Without this foundation, each tool would need to implement its own Claude communication, leading to inconsistent behavior and duplicated code.

## Solution

Integrate `@anthropic-ai/claude-agent-sdk` on the server with a 3-layer architecture:

1. **Transport Layer** (existing Socket.io) - receives user messages, sends responses
2. **Agent Event Loop** (new) - manages Claude SDK interactions
3. **Authentication Layer** (SDK internal) - handles OAuth credentials

This follows the patterns established in the 007-bmad-claude-sdk reference project.

**Reference:** `docs/planning/claude-agent-sdk-integration.md`

---

## Acceptance Criteria

### SDK Installation and Configuration

- [ ] Install `@anthropic-ai/claude-agent-sdk` in server workspace
- [ ] SDK reads credentials from `~/.claude/` automatically (after `claude login`)
- [ ] No API key configuration required for development mode
- [ ] Server starts successfully when credentials are present
- [ ] Clear error message if credentials missing: "Run: claude login"

### Socket.io Agent Events

- [ ] Add `agent:query` event handler for incoming queries
- [ ] Add `agent:cancel` event for canceling in-progress queries
- [ ] Emit `agent:text` events for streaming text responses
- [ ] Emit `agent:tool` events when tools execute
- [ ] Emit `agent:tool_result` events when tools complete
- [ ] Emit `agent:complete` event with session info, usage, cost
- [ ] Emit `agent:error` event for failures with actionable messages

### Shared Types

Update `shared/src/index.ts` with event interfaces:

```typescript
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
  'agent:error': (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  'agent:query': (data: { message: string }) => void;
  'agent:cancel': () => void;
}
```

### Agent Query Handler

- [ ] Implement `handleAgentQuery()` function
- [ ] Configure default model (`claude-sonnet-4-5-20250929`)
- [ ] Set reasonable defaults: `maxTurns: 10`, `permissionMode: 'acceptEdits'`
- [ ] Configure system prompt for FliGen context
- [ ] Allowlist basic tools: `Read`, `Write`, `Bash`
- [ ] Stream response blocks to client as they arrive
- [ ] Return session ID on completion for conversation resume

### Session Management

- [ ] Store session IDs per socket in-memory Map
- [ ] Resume previous session on subsequent queries (multi-turn)
- [ ] Clear session on socket disconnect
- [ ] Session ID included in `agent:complete` event

### Error Handling

- [ ] Catch authentication errors with clear guidance
- [ ] Handle network/timeout errors gracefully
- [ ] Emit `agent:error` with user-friendly message
- [ ] Log detailed errors server-side for debugging
- [ ] Handle canceled queries (via `agent:cancel` event)

---

## Technical Notes

### 3-Layer Architecture

```
+-------------------------------------------------------+
|  Layer 1: Transport (Socket.io / HTTP)                |
|  - Receives user messages                             |
|  - Sends responses back to client                     |
+---------------------+---------------------------------+
                      |
                      v
+-------------------------------------------------------+
|  Layer 2: Agent Event Loop (WE IMPLEMENT THIS)        |
|  - Initialize client with options                     |
|  - Send query to agent                                |
|  - Stream response blocks                             |
|  - Execute tools automatically                        |
|  - Manage session state                               |
+---------------------+---------------------------------+
                      |
                      v
+-------------------------------------------------------+
|  Layer 3: Authentication & API (SDK Internal)         |
|  - Handle authentication                              |
|  - Communicate with Anthropic API                     |
|  - Return streaming responses                         |
+-------------------------------------------------------+
```

### Server Integration Pattern

Reference implementation from planning doc:

```typescript
import { query, Options } from '@anthropic-ai/claude-agent-sdk';
import { Socket } from 'socket.io';

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
    resume: sessions.get(socket.id),
  };

  const queryIterator = query({ prompt: userMessage, options });

  for await (const chunk of queryIterator) {
    switch (chunk?.type) {
      case 'assistant':
        for (const block of chunk.content) {
          if (block.type === 'text') {
            socket.emit('agent:text', { text: block.text });
          }
        }
        break;

      case 'tool_use':
        socket.emit('agent:tool', {
          name: chunk.name,
          input: chunk.input,
        });
        break;

      case 'tool_result':
        socket.emit('agent:tool_result', {
          name: chunk.name,
          success: !chunk.is_error,
        });
        break;

      case 'result':
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

### Authentication Setup

One-time setup before running the server:

```bash
# Opens browser for OAuth
claude login

# Credentials stored in ~/.claude/
# Works with Max subscription - no API keys needed
```

For production, set `ANTHROPIC_API_KEY` environment variable.

### Tool Authorization

Default allowlist for FliGen:

```typescript
const options: Options = {
  allowedTools: [
    'Read',     // Read files
    'Write',    // Write files
    'Bash',     // Execute commands
  ],
  // Future: Add MCP tools for image/audio generation
  // 'mcp__fligen-tools__generate_image',
};
```

### File Structure

```
server/src/
├── index.ts           # Express + Socket.io setup (existing)
├── agent/
│   ├── handler.ts     # handleAgentQuery() function
│   ├── session.ts     # Session management utilities
│   └── types.ts       # Agent-specific types
└── ...
```

### Dependencies

```bash
npm install @anthropic-ai/claude-agent-sdk --workspace=server
```

---

## Visual Reference

### Server Event Flow

```
Client                    Server                      Claude SDK
  |                         |                              |
  |-- agent:query --------->|                              |
  |   { message: "..." }    |                              |
  |                         |-- query() ------------------>|
  |                         |                              |
  |<-- agent:text ----------|<-- assistant chunk ----------|
  |   { text: "..." }       |                              |
  |                         |                              |
  |<-- agent:tool ----------|<-- tool_use chunk -----------|
  |   { name, input }       |                              |
  |                         |                              |
  |<-- agent:tool_result ---|<-- tool_result chunk --------|
  |   { name, success }     |                              |
  |                         |                              |
  |<-- agent:complete ------|<-- result chunk -------------|
  |   { sessionId, ...}     |                              |
```

### Error Handling Flow

```
Client                    Server
  |                         |
  |-- agent:query --------->|
  |                         |
  |                         |-- (auth check fails)
  |                         |
  |<-- agent:error ---------|
  |   { message: "Run: claude login",
  |     code: "AUTH_REQUIRED" }
```

---

## Success Metrics

- Server starts without errors when `~/.claude/` credentials exist
- Client can send query and receive streamed text responses
- Tool execution notifications appear in real-time
- Session persists across multiple queries (same socket)
- Session clears on socket disconnect
- Clear error message when authentication missing
- Server handles network errors gracefully

---

## Out of Scope (Future)

- Custom MCP tool servers (Day 4+ generators)
- Production API key authentication
- Persistent session storage (Redis)
- Multi-user isolation beyond socket-based sessions
- Rate limiting and quotas
- Path sandboxing for file operations
- Client-side chat UI (separate requirement)

---

## Dependencies

- FR-1: Initial Harness (Complete) - provides server and Socket.io setup
- FR-2: Layout and Navigation (Complete) - client ready for tool integration

---

## Related Documents

- [FR-1: Initial Harness](fr-01-initial-harness.md)
- [FR-2: Layout and Navigation](fr-02-layout-and-navigation.md)
- [Planning: Claude Agent SDK Integration](../planning/claude-agent-sdk-integration.md)
- [007 Reference Project](file:///ad/appydave-app-a-day/007-bmad-claude-sdk/)
- [Backlog](../backlog.md)

---

## Completion Notes

**What was done:**
- Installed `@anthropic-ai/claude-agent-sdk` v0.1.76 in server workspace
- Updated shared types with full agent Socket.io event interfaces
- Created agent module with handler and session management
- Implemented `handleAgentQuery()` with streaming response processing
- Added session persistence per socket for multi-turn conversations
- Wired up `agent:query`, `agent:cancel` events in server
- Added session cleanup on socket disconnect
- Error handling with categorized error codes (AUTH_REQUIRED, RATE_LIMIT, CANCELLED)

**Files changed:**
- `server/package.json` - added @anthropic-ai/claude-agent-sdk dependency
- `shared/src/index.ts` - added agent event types (modified)
- `server/src/agent/session.ts` - session management utilities (new)
- `server/src/agent/handler.ts` - query handler with streaming (new)
- `server/src/agent/index.ts` - module exports (new)
- `server/src/index.ts` - wired up socket events (modified)

**Testing notes:**
- Server builds and starts successfully on port 5401
- Socket.io connections established from client
- Ready for client-side chat UI implementation
- Requires `claude auth login` before sending queries

**Status:** Complete
