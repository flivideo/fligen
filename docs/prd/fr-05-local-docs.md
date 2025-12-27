# FR-05: Local Documentation Reader

**Status:** Implemented
**Added:** 2025-12-27

---

## User Story

As a developer using FliGen, I want the Claude agent to have access to project documentation via a local documentation reader so that it can provide context-aware responses based on the docs folder contents without me having to copy-paste documentation into the conversation.

## Problem

The Claude Agent SDK (FR-03) can process queries and execute tools, but it has no awareness of the project's documentation structure. When users ask questions about the project, Claude cannot:

- See what documentation files exist
- Read file contents from the docs folder
- Understand project structure, planning notes, or PRD files
- Provide answers grounded in actual project documentation

Each query currently operates in isolation without access to the "institutional knowledge" stored in markdown files.

## Solution

Create a local documentation reader using the MCP server pattern that exposes two tools to the Claude agent:

1. **`local_docs_index`** - Returns folder structure and file metadata from the docs folder
2. **`local_docs_content`** - Returns file contents with chunking support for large files

This follows the MCP tool integration pattern established in the Claude Agent SDK, making documentation accessible as a tool the agent can invoke when relevant.

**Day 3 of "12 Days of Claudemas"** - Building smart memory/knowledge capabilities.

**Note:** This is the local file reader version. A future "Kybernesis" version will connect to kybernesis.ai for enhanced knowledge capabilities.

---

## Scope

| Parameter | Value | Notes |
|-----------|-------|-------|
| Base path | `~/dev/ad/flivideo/fligen/docs` | Fixed for security |
| File types | `.md` only | Markdown documentation |
| Subfolders | Recursive | planning/, prd/, uat/ |
| Caching | On-demand | No persistent cache |
| File size limit | 10KB max per response | Prevents token explosion |
| Line limit | 500 lines max per response | Enables chunking |

---

## Acceptance Criteria

### TR-1: Tool Definition

- [x] Create MCP server module in `server/src/tools/local-docs/`
- [x] Define `local_docs_index` tool with `@tool` decorator pattern
- [x] Define `local_docs_content` tool with `@tool` decorator pattern
- [x] Register tools with Claude Agent SDK options
- [x] Tools appear in `agent:tool` events when invoked

### TR-2: Index Mode

- [x] `local_docs_index` returns JSON with folder structure
- [x] Recursive directory scan of docs/ folder
- [x] Returns for each file: `{ path, name, sizeBytes, modifiedAt }`
- [x] Excludes non-.md files
- [x] Returns empty array if folder is empty
- [x] Handles missing directory gracefully

**Example output:**
```json
{
  "basePath": "docs",
  "files": [
    { "path": "docs/backlog.md", "name": "backlog.md", "sizeBytes": 1024, "modifiedAt": "2025-12-27T10:00:00Z" },
    { "path": "docs/prd/fr-01-initial-harness.md", "name": "fr-01-initial-harness.md", "sizeBytes": 3500, "modifiedAt": "2025-12-25T12:00:00Z" }
  ],
  "totalFiles": 2,
  "totalSize": 4524
}
```

### TR-3: Content Mode

- [x] `local_docs_content` accepts `{ path: string, chunk?: number }`
- [x] Validates path is within docs/ (no path traversal)
- [x] Resolves symlinks and validates final path
- [x] Returns file contents as string
- [x] Returns error for non-existent files
- [x] Returns error for non-.md files
- [x] Returns error for paths outside docs/

**Example input:**
```json
{ "path": "docs/backlog.md" }
```

**Example output:**
```json
{
  "path": "docs/backlog.md",
  "content": "# Backlog\n\nRequirements index for FliGen...",
  "totalLines": 30,
  "chunk": 1,
  "totalChunks": 1
}
```

### TR-4: Chunking

- [x] Files over 500 lines return chunked
- [x] First request returns chunk 1 with `totalChunks`
- [x] Subsequent requests can specify `chunk: 2`, `chunk: 3`, etc.
- [x] Each chunk is max 500 lines
- [x] Chunk metadata: `{ chunk: number, totalChunks: number, totalLines: number }`

**Example chunked response:**
```json
{
  "path": "docs/planning/large-doc.md",
  "content": "... lines 1-500 ...",
  "totalLines": 1200,
  "chunk": 1,
  "totalChunks": 3
}
```

### TR-5: Security Guardrails

- [x] Path traversal blocked (e.g., `../../../etc/passwd`)
- [x] Paths normalized with `path.resolve()` and validated
- [x] Symlinks resolved and verified within base path
- [x] Only `.md` extension allowed
- [x] Clear error messages for security violations
- [x] Base path is hardcoded, not configurable via tool input

**Security test cases:**
```typescript
// These should all fail with security error:
{ path: "../../../etc/passwd" }
{ path: "docs/../../../home/user/.ssh/id_rsa" }
{ path: "/etc/passwd" }
{ path: "docs/file.txt" }  // wrong extension
```

---

## Technical Notes

### Tool Registration Pattern

Based on Claude Agent SDK integration (FR-03):

```typescript
// server/src/tools/local-docs/index.ts
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

const localDocsIndexTool = tool(
  'local_docs_index',
  'List all markdown documentation files in the project docs folder with metadata',
  {},
  async () => {
    // Implementation
  }
);

const localDocsContentTool = tool(
  'local_docs_content',
  'Read contents of a specific markdown documentation file',
  {
    path: z.string().describe('Relative path to file within docs/'),
    chunk: z.number().optional().describe('Chunk number for large files (1-based)')
  },
  async ({ path, chunk }) => {
    // Implementation
  }
);

export function createLocalDocsServer() {
  return createSdkMcpServer({
    name: 'local_docs',
    version: '1.0.0',
    tools: [localDocsIndexTool, localDocsContentTool],
  });
}
```

### Agent Options Update

Update handler to include new tools:

```typescript
// server/src/agent/handler.ts
import { createLocalDocsServer } from '../tools/local-docs/index.js';

const localDocsServer = createLocalDocsServer();

const options: Options = {
  // ... existing options
  allowedTools: [
    'Read', 'Write', 'Bash',
    'mcp__local_docs__local_docs_index',
    'mcp__local_docs__local_docs_content'
  ],
  mcpServers: {
    local_docs: localDocsServer,
  },
};
```

### File Structure

```
server/src/
├── agent/
│   ├── handler.ts     # Update to include local-docs tools
│   └── ...
└── tools/
    └── local-docs/
        ├── index.ts   # Tool definitions and exports
        ├── scanner.ts # Directory scanning logic
        ├── reader.ts  # File reading with chunking
        └── security.ts # Path validation utilities
```

---

## Test Plan

### Index Mode Tests

| Test | Input | Expected |
|------|-------|----------|
| Index happy path | `local_docs_index()` | JSON with all .md files in docs/ |
| Empty folder | Empty docs/ | `{ files: [], totalFiles: 0 }` |
| Nested folders | docs/prd/, docs/planning/ | All nested .md files included |

### Content Mode Tests

| Test | Input | Expected |
|------|-------|----------|
| Content happy path | `{ path: "docs/backlog.md" }` | File contents as string |
| File not found | `{ path: "docs/missing.md" }` | Error: "File not found" |
| Large file chunking | `{ path: "docs/large.md" }` (1200 lines) | chunk 1/3 with metadata |
| Request specific chunk | `{ path: "docs/large.md", chunk: 2 }` | Lines 501-1000 |

### Security Tests

| Test | Input | Expected |
|------|-------|----------|
| Path traversal blocked | `{ path: "../../../etc/passwd" }` | Error: "Path traversal blocked" |
| Absolute path blocked | `{ path: "/etc/passwd" }` | Error: "Path traversal blocked" |
| Wrong extension | `{ path: "docs/file.txt" }` | Error: "Only .md files accessible" |
| Symlink escape | Symlink pointing outside docs/ | Error: "Symlink escape blocked" |

### Integration Tests

| Test | Description | Expected |
|------|-------------|----------|
| Agent uses index | Ask "what docs exist?" | Agent calls `local_docs_index` |
| Agent reads file | Ask "what's in backlog?" | Agent calls `local_docs_content` |
| Multi-turn memory | Read file, then ask follow-up | Agent references previous content |

---

## Dependencies

- FR-03: Claude Agent SDK Integration (Complete) - provides tool registration pattern
- FR-04: Frontend Chat UI (Complete) - displays tool execution events

---

## Completion Notes

**What was done:**
- Created LocalDocs MCP server module in `server/src/tools/local-docs/`
- Implemented `local_docs_index` tool that scans docs/ folder recursively
- Implemented `local_docs_content` tool with 500-line chunking support
- Added comprehensive security layer:
  - Path traversal prevention
  - Symlink escape protection
  - Extension validation (.md only)
  - Absolute path blocking
- Integrated with Claude Agent SDK via in-process MCP server
- Updated agent system prompt to describe LocalDocs tools

**Files changed:**
- `server/src/tools/local-docs/security.ts` (new) - Path validation utilities
- `server/src/tools/local-docs/scanner.ts` (new) - Directory scanning logic
- `server/src/tools/local-docs/reader.ts` (new) - File reading with chunking
- `server/src/tools/local-docs/index.ts` (new) - MCP tool definitions
- `server/src/agent/handler.ts` (modified) - Added local-docs server integration
- `server/scratch/test-local-docs.ts` (new) - Test script

**Testing notes:**
- Run `npx tsx server/scratch/test-local-docs.ts` to verify tools work
- Index returns 18 documentation files with metadata
- Content reading works with/without "docs/" prefix
- All security tests pass (path traversal, wrong extension, absolute paths)
- To test via chat: Start `npm run dev` and ask "What documentation files exist?"

**Status:** Complete

---

## Out of Scope (Future)

- Caching layer for frequently accessed files
- Full-text search within documentation
- File modification/creation via tool
- Non-markdown file types (e.g., .json, .yaml)
- Multiple base paths or project selection
- Vector embeddings for semantic search
- Persistent knowledge across sessions
- **Kybernesis integration** (kybernesis.ai) - future enhancement

---

## Related Documents

- [FR-03: Claude Agent SDK Integration](fr-03-claude-agent-sdk-integration.md)
- [FR-04: Frontend Chat UI](fr-04-frontend-chat-ui.md)
- [Planning: Claude Agent SDK Integration](../planning/claude-agent-sdk-integration.md)
- [Backlog](../backlog.md)

---

**Last updated:** 2025-12-27
