# FR-06: Kybernesis Memory Integration

**Status:** Implemented
**Added:** 2025-12-27

---

## User Story

As a developer using FliGen, I want the Claude agent to have access to persistent memory via Kybernesis so that it can search and retrieve relevant context from my "second brain" knowledge base, enabling more informed and contextual responses across sessions.

## Problem

The LocalDocs MCP server (FR-05) provides access to local project documentation, but it has limitations:

- Knowledge is limited to files in the `docs/` folder
- No persistent memory across sessions
- No semantic/hybrid search capabilities
- No way to store learnings or insights from conversations

Kybernesis is a cloud-based AI memory platform that solves these problems by providing:
- Persistent memory storage with intelligent aggregation
- Hybrid search (semantic + keyword)
- Cross-session knowledge retrieval
- Structured memory with entities, relationships, and tiers

## Solution

Create a Kybernesis MCP server following the same pattern as FR-05 (LocalDocs) that exposes tools to the Claude agent:

1. **`kybernesis_search`** - Hybrid search across stored memories
2. **`kybernesis_store`** - Store new memories from conversations (optional, lower priority)

This enables the agent to query the user's "second brain" for relevant context when answering questions.

**Day 3 of "12 Days of Claudemas"** - Building smart memory/knowledge capabilities (Kybernesis integration).

---

## Scope

| Parameter | Value | Notes |
|-----------|-------|-------|
| MCP Endpoint | `https://api.kybernesis.ai/mcp` | Kybernesis MCP server |
| Authentication | Bearer token via env var | `KYBERNESIS_API_KEY` |
| Primary tool | `kybernesis_search` | Hybrid retrieval |
| Secondary tool | `kybernesis_store` | Memory ingestion (optional) |
| Result limit | 10 (default) | Configurable per query |

---

## Acceptance Criteria

### TR-1: Environment Configuration

- [ ] Add `KYBERNESIS_API_KEY` to `.env.example` with placeholder
- [ ] Server validates env var on startup (warns if missing)
- [ ] API key never logged or exposed in error messages
- [ ] Graceful handling when credentials not configured

### TR-2: Tool Definition

- [ ] Create MCP server module in `server/src/tools/kybernesis/`
- [ ] Define `kybernesis_search` tool with zod schema
- [ ] Optionally define `kybernesis_store` tool
- [ ] Register tools with Claude Agent SDK options
- [ ] Tools appear in `agent:tool` events when invoked

### TR-3: Search Tool (`kybernesis_search`)

- [ ] Accepts `{ query: string, limit?: number, includeSummaries?: boolean }`
- [ ] Calls Kybernesis `/retrieval/hybrid` endpoint
- [ ] Returns search results with relevance scores
- [ ] Handles empty results gracefully
- [ ] Handles API errors with user-friendly messages

**Input schema:**
```typescript
{
  query: z.string().describe('Search query for memory retrieval'),
  limit: z.number().optional().default(10).describe('Max results to return'),
  includeSummaries: z.boolean().optional().default(true).describe('Include aggregated summaries')
}
```

**Example input:**
```json
{ "query": "React state management patterns", "limit": 5 }
```

**Example output:**
```json
{
  "query": "React state management patterns",
  "results": [
    {
      "id": "mem_abc123",
      "content": "Context API is preferred for simple state...",
      "score": 0.92,
      "source": "conversation",
      "createdAt": "2025-12-20T10:00:00Z"
    }
  ],
  "totalResults": 3,
  "searchType": "hybrid"
}
```

### TR-4: Store Tool (`kybernesis_store`) - Optional

- [ ] Accepts `{ content: string, priority?: number }`
- [ ] Calls Kybernesis `/ingest/chat` endpoint
- [ ] Uses fixed `userId: "fligen"` for attribution
- [ ] Returns confirmation with memory ID
- [ ] Handles API errors gracefully

**Input schema:**
```typescript
{
  content: z.string().describe('Content to store in memory'),
  priority: z.number().min(0).max(1).optional().default(0.5).describe('Memory priority (0-1)')
}
```

**Example input:**
```json
{ "content": "User prefers TypeScript strict mode for all projects", "priority": 0.8 }
```

**Example output:**
```json
{
  "success": true,
  "message": "Memory stored successfully",
  "memoryId": "mem_xyz789"
}
```

### TR-5: Error Handling

- [ ] Auth error (401): "Kybernesis authentication failed. Check KYBERNESIS_API_KEY."
- [ ] Rate limit (429): "Rate limit exceeded. Please wait before retrying."
- [ ] Network error: "Cannot reach Kybernesis API. Check network connection."
- [ ] Missing config: "Kybernesis not configured. Set KYBERNESIS_API_KEY in .env."

### TR-6: Security

- [ ] API key loaded from environment variable only
- [ ] API key never included in error messages or logs
- [ ] API key never sent to frontend
- [ ] Request timeouts to prevent hanging (10s default)

---

## Technical Notes

### MCP Connection (from Ian/Kybernesis)

Kybernesis exposes an MCP server at `https://api.kybernesis.ai/mcp`. The Claude Agent SDK can connect to this using the `mcp-remote` bridge:

**Claude Desktop config (for reference):**
```json
{
  "mcpServers": {
    "kybernesis-brain": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://api.kybernesis.ai/mcp",
        "--header", "Authorization:${KYBERNESIS_AUTH}",
        "--transport", "http-only"
      ],
      "env": {
        "KYBERNESIS_AUTH": "Bearer kb_your_api_key"
      }
    }
  }
}
```

**For FliGen**, we'll create an in-process wrapper that:
1. Makes HTTP calls to the Kybernesis API endpoints
2. Exposes them as MCP tools via `createSdkMcpServer()`

This follows the same pattern as LocalDocs (FR-05) but calls remote API instead of local files.

### Tool Registration Pattern

Following FR-05 pattern:

```typescript
// server/src/tools/kybernesis/index.ts
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const kybernesisSearchTool = tool(
  'kybernesis_search',
  'Search memories and knowledge from the Kybernesis second brain',
  {
    query: z.string().describe('Search query for memory retrieval'),
    limit: z.number().optional().describe('Max results (default 10)'),
    includeSummaries: z.boolean().optional().describe('Include summaries (default true)')
  },
  async ({ query, limit = 10, includeSummaries = true }) => {
    // Implementation calls /retrieval/hybrid
  }
);

export function createKybernesisServer() {
  return createSdkMcpServer({
    name: 'kybernesis',
    version: '1.0.0',
    tools: [kybernesisSearchTool],
  });
}
```

### Agent Options Update

```typescript
// server/src/agent/handler.ts
import { createKybernesisServer } from '../tools/kybernesis/index.js';

const kybernesisServer = createKybernesisServer();

const options: Options = {
  // ... existing options
  allowedTools: [
    'Read', 'Write', 'Bash',
    'mcp__local_docs__local_docs_index',
    'mcp__local_docs__local_docs_content',
    'mcp__kybernesis__kybernesis_search',
    // 'mcp__kybernesis__kybernesis_store',  // if implemented
  ],
  mcpServers: {
    local_docs: localDocsServer,
    kybernesis: kybernesisServer,
  },
};
```

### File Structure

```
server/src/
├── agent/
│   ├── handler.ts     # Update to include kybernesis tools
│   └── ...
└── tools/
    ├── local-docs/    # Existing (FR-05)
    │   └── ...
    └── kybernesis/
        ├── index.ts   # Tool definitions and exports
        ├── client.ts  # HTTP client for Kybernesis API
        └── types.ts   # Response type definitions
```

### Environment Variables

```bash
# .env.example
KYBERNESIS_API_KEY=kb_your_api_key_here
```

---

## Test Plan

### Configuration Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Missing API key | `KYBERNESIS_API_KEY` not set | Tool returns config error message |
| Valid config | API key set in env | Tools work normally |

### Search Tests

| Test | Input | Expected |
|------|-------|----------|
| Search happy path | `{ query: "React patterns" }` | Array of results with scores |
| Empty results | `{ query: "xyzzy123nonexistent" }` | `{ results: [], totalResults: 0 }` |
| Custom limit | `{ query: "test", limit: 3 }` | Max 3 results returned |
| Without summaries | `{ query: "test", includeSummaries: false }` | Raw chunks only |

### Store Tests (if implemented)

| Test | Input | Expected |
|------|-------|----------|
| Store happy path | `{ content: "Test memory" }` | Success with memory ID |
| With priority | `{ content: "Important", priority: 0.9 }` | Success, priority applied |
| Empty content | `{ content: "" }` | Validation error |

### Error Handling Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Invalid API key | Wrong key in env | 401 with friendly message |
| Network timeout | API unreachable | Timeout error message |
| Rate limited | Too many requests | 429 with retry message |

### Integration Tests

| Test | Description | Expected |
|------|-------------|----------|
| Agent uses search | Ask "What do I know about X?" | Agent calls `kybernesis_search` |
| Agent stores memory | Ask "Remember that I prefer Y" | Agent calls `kybernesis_store` |
| Combined with LocalDocs | Ask about project + general knowledge | Agent uses both tools appropriately |

---

## Dependencies

- FR-03: Claude Agent SDK Integration (Complete) - provides tool registration pattern
- FR-04: Frontend Chat UI (Complete) - displays tool execution events
- FR-05: Local Documentation Reader (Complete) - provides MCP server pattern to follow

---

## Out of Scope (Future)

- Memory management UI (browse, edit, delete memories)
- Memory tier configuration
- Entity extraction and relationship mapping
- Custom ingestion strategies
- Memory analytics and insights
- Multi-user support (currently fixed to "fligen" user)
- Automatic conversation memory (store all conversations)

---

## Related Documents

- [FR-05: Local Documentation Reader](fr-05-local-docs.md)
- [FR-03: Claude Agent SDK Integration](fr-03-claude-agent-sdk-integration.md)
- [FR-04: Frontend Chat UI](fr-04-frontend-chat-ui.md)
- [Backlog](../backlog.md)

---

---

## Completion Notes

**What was done:**
- Created Kybernesis MCP server module following FR-05 LocalDocs pattern
- Implemented `kybernesis_search` tool (hybrid search across memories)
- Implemented `kybernesis_store` tool (store new memories)
- Added HTTP client with proper timeout and error handling
- Wired into Claude Agent SDK with allowedTools and mcpServers
- Updated system prompt with Kybernesis usage guidance
- Added startup status indicator for Kybernesis configuration

**Files created:**
- `server/src/tools/kybernesis/types.ts` - API response type definitions
- `server/src/tools/kybernesis/client.ts` - HTTP client for Kybernesis API
- `server/src/tools/kybernesis/index.ts` - MCP tool definitions and server

**Files modified:**
- `server/src/agent/handler.ts` - Added Kybernesis tools and updated system prompt
- `server/src/index.ts` - Added startup configuration status

**Testing notes:**
1. Start server with `npm run dev`
2. Verify startup shows Kybernesis status (configured or warning)
3. In chat, ask "Search my memories for React patterns"
4. Agent should invoke `kybernesis_search` tool
5. If API key not set, tool returns config error gracefully

**Error handling verified:**
- Missing API key → CONFIG_ERROR with friendly message
- Invalid API key → AUTH_ERROR (when API returns 401)
- Network issues → TIMEOUT or NETWORK_ERROR
- Rate limiting → RATE_LIMIT (when API returns 429)

**Status:** Complete

---

**Last updated:** 2025-12-27
