# AGENTS.md — FliGen

**Project**: FliGen — "12 Days of Claudemas" tool-building harness
**Stack**: React 19 + Vite 6 + TailwindCSS v4 | Express 5 + Socket.io | TypeScript 5.6+ | npm workspaces
**Ports**: Client 5400 | Server 5401

---

## Build & Run Commands

```bash
# Install all workspace dependencies
npm install

# Start dev server (both client + server, via Overmind)
./start.sh           # builds shared, port-checks, then launches via Overmind
overmind start       # direct launch (assumes shared already built)

# Start dev server (single terminal)
npm run dev

# Build all workspaces
npm run build        # runs: shared → server → client

# Tests
npm test             # runs vitest across all workspaces

# Workspace-specific
npm run build -w shared
npm run build -w server
npm run build -w client
npm test -w client
npm test -w server
```

**Baseline (2026-03-19)**: Build CLEAN. Tests: 3 files, 8 tests total (4 client / 4 server).

**Dev server check before starting:**
```bash
lsof -i :5400 | grep LISTEN
lsof -i :5401 | grep LISTEN
```
If a process is listed the service is UP — do NOT restart it or change ports.

**Overmind commands:**
```bash
overmind connect client  # attach to client logs (Ctrl+B D to detach)
overmind connect server  # attach to server logs
overmind restart client  # restart just the client
overmind stop            # stop all processes
```

---

## Directory Structure

```
fligen/
├── client/                          # React 19 + Vite + TailwindCSS v4
│   └── src/
│       ├── App.tsx                  # Hash-based routing (#day-1..#day-15)
│       ├── components/
│       │   ├── layout/              # AppShell, Header, Sidebar, StatusBar, MainContent
│       │   ├── tools/               # Day1..Day15 tool components + sub-components
│       │   │   ├── BrandTextGenerator/  # rendering/, templates/ subdirs (Day 13)
│       │   │   └── widget/          # WidgetConfigForm, WidgetHistory, etc. (Day 14)
│       │   └── ui/                  # ConfigModal, ShotListStrip, StatusIndicator, ToolPanel
│       ├── contexts/
│       │   └── SettingsContext.tsx  # API key storage via React Context + localStorage
│       ├── data/days.ts             # Sidebar nav data (reads from shared/config.json)
│       └── hooks/                   # useNavigation, useShots, useSocket, useSidebarState
│
├── server/                          # Express 5 + Socket.io
│   └── src/
│       ├── index.ts                 # Main server file — all route registrations
│       ├── agent/                   # Claude Agent SDK (handler.ts, session.ts)
│       ├── config/                  # env.ts (Zod validation), logger.ts (Pino)
│       ├── middleware/              # requestLogger.ts
│       ├── routes/
│       │   ├── batch.ts             # FR-25 batch CSV generation routes
│       │   └── query/               # FR-25 query API (catalog, config, health)
│       └── tools/
│           ├── catalog/             # Unified asset catalog (storage.ts, index.ts)
│           ├── elevenlabs/          # TTS (client, types, save-to-catalog)
│           ├── flihub/              # FliHub REST client
│           ├── image/               # FAL.AI + KIE.AI image gen (fal-client, kie-client)
│           ├── kybernesis/          # Second brain MCP server
│           ├── local-docs/          # LocalDocs MCP server (security, scanner, reader)
│           ├── music/               # FAL.AI SonAuto + KIE.AI Suno
│           ├── projects/            # Project data persistence (FliHub prompts)
│           ├── prompts/             # Prompt refinement via Claude Agent SDK
│           ├── shots/               # Shot list management
│           ├── story/               # Video assembly (assembler, storage)
│           ├── video/               # KIE.AI Veo + FAL.AI Kling/Wan
│           └── widgets/             # Widget templates + storage (Day 14)
│
├── shared/                          # TypeScript types shared between client/server
│   └── src/
│       ├── index.ts                 # All exported types
│       ├── config.json              # Day status config (source of truth for day completion)
│       └── apiRegistry.ts           # FR-25 API endpoint registry
│
├── assets/                          # Runtime asset storage (NOT under server src)
│   ├── catalog/                     # Unified catalog: index.json + images/videos/music/narration/thumbnails/n8n
│   ├── fox-story/                   # Audio, images, video for Fox story
│   ├── music-library/               # Music library with index.json
│   ├── projects/                    # Saved FliHub projects (JSON)
│   ├── shots/                       # Shot list storage
│   ├── story/                       # Story/video assembly output
│   └── widgets/                     # Widget HTML + config files + index.json
│
├── docs/planning/                   # Ralphy campaign artifacts
├── Procfile                         # Overmind process definitions (PORT=5401 hardcoded)
└── start.sh                         # Startup script with port-check and shared build
```

**Assets directory resolution** (critical): Server resolves assets relative to its working directory:
```typescript
const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
```
The server `cwd()` is `fligen/server/` during dev, so `../assets` = `fligen/assets/`. In worktrees the path resolves to the worktree root, not the main repo — this is correct.

---

## API Key Requirements

All keys stored in `server/.env` (copy from `server/.env.example`):

| Key | Tool | Where to get |
|-----|------|--------------|
| `FAL_API_KEY` | Image gen (Day 4), Music (Day 7), Video (Day 6), Batch (Day 15) | fal.ai/dashboard/keys |
| `KIE_API_KEY` | Image gen (Day 4), Music (Day 7), Video (Day 6) | kie.ai/api-key |
| `ELEVENLABS_API_KEY` | TTS (Day 5) | elevenlabs.io Profile → API Keys |
| `KYBERNESIS_API_KEY` | Second Brain (Day 3) | kybernesis.ai Settings → API Access |
| `N8N_WEBHOOK_URL` | N8N Workflow (Day 10) | N8N instance |

Claude Agent SDK (Day 2) uses `claude login` — Max subscription via browser OAuth. No API key in .env.

---

## Success Criteria

Every work unit is DONE when ALL of these pass:

- [ ] `npm run build` exits 0 (TypeScript compiled across all workspaces)
- [ ] `npm test` exits 0 (all test files pass)
- [ ] No `console.error` or unhandled promise rejections at runtime
- [ ] New server endpoints return correct HTTP status codes (200 on success, 4xx on client error)
- [ ] Any new client-side functionality renders without React errors in browser console
- [ ] **For any new functionality: at least one test was written or updated to cover it**

---

## Reference Patterns

### 1. Tool Module Pattern (server)

Every tool follows this structure. Copy exactly — do not deviate.

```typescript
// server/src/tools/example/types.ts
export interface ExampleRequest { /* ... */ }
export interface ExampleResult  { /* ... */ }

// server/src/tools/example/storage.ts
import fs from 'fs/promises';
import path from 'path';

const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
const EXAMPLE_DIR = path.join(ASSETS_DIR, 'example');
const INDEX_FILE  = path.join(EXAMPLE_DIR, 'index.json');

export async function saveItem(item: ExampleResult): Promise<void> {
  await fs.mkdir(EXAMPLE_DIR, { recursive: true });
  // ...write to INDEX_FILE
}

// server/src/tools/example/client.ts
export async function callExternalApi(req: ExampleRequest): Promise<ExampleResult> {
  // ...
}

// server/src/tools/example/index.ts
export * from './types.js';
export * from './storage.js';
export * from './client.js';
```

### 2. Catalog Save Pattern

All generated assets must be persisted to `assets/catalog/` via the catalog module:

```typescript
// server/src/tools/image/save-to-catalog.ts
import { addAsset, generateAssetId, generateFilename } from '../catalog/storage.js';
import type { Asset } from '@fligen/shared';

export async function saveImageToCatalog(/* ... */): Promise<Asset> {
  const id = generateAssetId('image');
  const filename = generateFilename('image', provider, model, 'png');
  // Write file to ASSETS_DIR/catalog/images/
  const asset: Asset = {
    id,
    type: 'image',
    filename,
    provider,
    model,
    prompt,
    createdAt: new Date().toISOString(),
    status: 'complete',
  };
  return addAsset(asset);
}
```

Asset ID format: `asset_${type}_${timestamp}_${random6}` — generated by `generateAssetId()`.

### 3. Claude Agent SDK Pattern (server)

```typescript
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

const options: Options = {
  systemPrompt: SYSTEM_PROMPT,
  model: 'claude-sonnet-4-5-20250929',
  allowedTools: ['Read', 'Write', 'Glob', 'Grep', 'Bash'],
  permissionMode: 'acceptEdits',
  maxTurns: 10,
  resume: getSession(socket.id),   // for multi-turn; undefined for one-shot
  abortController,
};

// For streaming (chat):
const queryIterator = query({ prompt: userMessage, options });
for await (const message of queryIterator) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') socket.emit('agent:text', { text: block.text });
    }
  }
  if (message.type === 'result') {
    // message.session_id, message.usage, message.total_cost_usd
  }
}

// For one-shot (prompt refinement pattern — 3 parallel refinements):
const results = await Promise.all([
  query({ prompt: seedPrompt, options: { ...options, maxTurns: 1 } }),
  query({ prompt: editPrompt, options: { ...options, maxTurns: 1 } }),
  query({ prompt: animPrompt, options: { ...options, maxTurns: 1 } }),
]);
```

### 4. MCP Server Pattern (in-process)

```typescript
// server/src/tools/kybernesis/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';

export function createKybernesisServer() {
  const server = new McpServer({ name: 'kybernesis', version: '1.0.0' });
  server.tool('kybernesis_search', { query: z.string() }, async ({ query }) => {
    // ...call kybernesis API
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  server.connect(serverTransport);
  return clientTransport;   // passed to Options.mcpServers
}
```

### 5. React Hook for Server Data

```typescript
// client/src/hooks/useShots.ts
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useShots() {
  const socket = useSocket();
  const [shots, setShots] = useState<Shot[]>([]);

  useEffect(() => {
    socket.emit('shots:list');
    socket.on('shots:list', (data) => setShots(data.shots));
    return () => { socket.off('shots:list'); };
  }, [socket]);

  const addShot = useCallback((url: string, prompt: string, provider: Provider, model: string) => {
    socket.emit('shots:add', { url, prompt, provider, model });
  }, [socket]);

  return { shots, addShot };
}
```

### 6. TailwindCSS v4 CSS

```css
/* CORRECT — v4 syntax */
@import 'tailwindcss';
@source "./**/*.{js,ts,jsx,tsx}";

/* For conditionally-rendered elements (modals, dropdowns) safelist them: */
@source inline("m-auto w-96 p-0 backdrop:bg-black/50");
```

### 7. Modal Dialog Fix (v4 preflight breaks native centering)

```tsx
// v4 preflight removes margin:auto from <dialog> — restore it:
<dialog className="m-auto w-96 rounded-lg bg-slate-800 p-0 backdrop:bg-black/50">
  {/* content */}
</dialog>
// Do NOT add: fixed inset-0 h-screen w-screen — these break native sizing
```

### 8. External API: KIE.AI Async Polling Pattern

KIE.AI is async — always poll, never assume instant result.

```typescript
// POST to start job → get taskId
const startRes = await fetch('https://api.kie.ai/api/v1/generate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${KIE_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const { taskId } = await startRes.json();

// Poll until complete (max 60 attempts × 3s = 3 min)
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const statusRes = await fetch(`https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`, {
    headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
  });
  const status = await statusRes.json();
  if (status.data?.resultUrl) return status.data.resultUrl;
}
throw new Error('KIE.AI polling timeout');
```

---

## Anti-Patterns to Avoid

1. **Don't send localhost URLs to external APIs** — KIE.AI and FAL.AI cannot fetch `http://localhost:...`. Read local files and convert to base64 data URLs first. See `server/src/tools/shots/storage.ts` `getShotAsBase64()`.

2. **Don't use `FAL_KEY`** — The env var is `FAL_API_KEY` throughout this codebase. Inconsistency caused "not configured" errors in early campaigns.

3. **Don't skip TypeScript on shared types** — New API payloads need types in `shared/src/index.ts`. All three workspaces import from `@fligen/shared`.

4. **Don't hardcode assets paths** — Always use `path.resolve(process.cwd(), '..', 'assets')`. Never `__dirname`-relative paths in ESM modules.

5. **Don't use Tailwind v3 directives** — No `@tailwind base/components/utilities`. Use `@import 'tailwindcss'` only.

6. **Don't add `position: fixed` to `<dialog>`** — Tailwind v4 preflight already positions it. Add only `m-auto` to restore centering.

7. **Don't send prompt + lyrics + tags simultaneously to FAL SonAuto** — Send only the fields you need; sending all three causes "Unprocessable Entity".

8. **Don't use wrong KIE.AI endpoints** — Generate: `/api/v1/generate`, status: `/api/v1/generate/record-info`. (Early bugs used wrong paths.)

9. **Don't use complex checkbox styling in v4** — Use `accent-{color}` for checkboxes, not `rounded border bg-... text-...`.

10. **Don't exceed 100KB Express body limit without setting it** — Music/image routes need `express.json({ limit: '50mb' })`.

---

## Mock Patterns

**This project uses no mocking framework** (no jest.mock, no vitest.mock stubs). Tests are integration-style and minimal:

```typescript
// server/src/__tests__/example.test.ts — current pattern
import { describe, it, expect } from 'vitest';

describe('ExampleModule', () => {
  it('performs basic computation', () => {
    expect(1 + 1).toBe(2);
  });
});

// client/src/components/ui/__tests__/StatusIndicator.test.tsx — current pattern
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders connected state', () => {
    render(<StatusIndicator status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });
});
```

**Why no mocking**: The server tool modules (image gen, video gen, etc.) call external APIs that would need actual keys to run. Tests have stayed at the unit level for pure functions and UI components. If you need to test an API client, write a `scratch/test-*.ts` one-off script instead.

**External API calls in tests** — do not add tests that call FAL.AI, KIE.AI, ElevenLabs, or KIE Suno. These cost money and are flaky in CI.

---

## Quality Gates

Before marking any work unit complete:

1. `npm run build` — all three workspaces (shared → server → client) must exit 0
2. `npm test` — all test files must pass (currently: 3 files, 8 tests)
3. No TypeScript errors in new or modified files
4. Any new endpoint registered in `server/src/index.ts` or a route file
5. Any new shared types exported from `shared/src/index.ts`
6. New functionality has at least one test covering the happy path

**CI**: GitHub Actions workflow at `.github/workflows/ci.yml` runs build + test on PR.

---

## Learnings

### API Integration

- **KIE.AI uses `/api/v1/` prefix** on all endpoints. Early code used wrong paths and got 404.
- **KIE.AI polling endpoint is `/api/v1/generate/record-info`** not `/api/v1/status` or similar.
- **FAL.AI wraps results** in a `data` property: `result.data?.video?.url`, `result.data?.audio?.url`. Always check nested.
- **External APIs cannot fetch localhost** — convert all local images/shots to base64 before sending to KIE.AI or FAL.AI.
- **Express default JSON limit is 100KB** — audio and image base64 payloads exceed this. Set `express.json({ limit: '50mb' })`.
- **FAL.AI SonAuto**: send prompt + tags OR prompt + lyrics, not all three simultaneously.
- **Wan 2.1 FLF2V endpoint**: `fal-ai/wan-flf2v` (not `fal-ai/wan/v2.1/flf2v`). Params: `start_image_url` / `end_image_url` (not `first_frame_url` / `last_frame_url`).

### TailwindCSS v4

- `@source "./**/*.{js,ts,jsx,tsx}"` must have `./` prefix — bare `**/*.{...}` doesn't work.
- Conditionally rendered components (modals, dropdowns) won't have their classes detected — safelist them with `@source inline(...)`.
- v4 preflight removes `margin: auto` from `<dialog>` — add `m-auto` class to restore browser centering.

### Claude Agent SDK

- Agent SDK uses `claude login` (OAuth via browser, Max subscription). No API key needed.
- Model string: `claude-sonnet-4-5-20250929` (used in `handler.ts` — copy exactly).
- `resume: getSession(socket.id)` — pass session ID for multi-turn; omit for one-shot.
- `permissionMode: 'acceptEdits'` — required when agent uses Read/Write/Bash tools.
- For parallel prompt refinement: `Promise.all()` with separate `query()` calls each with `maxTurns: 1`.

### Asset Catalog

- All generated assets go through `assets/catalog/` — use `generateAssetId()` and `generateFilename()` from `server/src/tools/catalog/storage.ts`.
- Legacy assets from before FR-16 may have `type: 'audio'` instead of `type: 'narration'` — Day 5 history UI queries both types.
- Day 6 videos and N8N workflow videos share the same catalog but must be filtered by metadata to display correctly.

### Worktree / Git

- Procfile has `PORT=5401` hardcoded — do NOT rely on tmux/shell PORT env var (it gets inherited from the wrong value).
- `start.sh` does port-check before launching Overmind — if ports are busy it exits early.
- Husky is NOT in this project — no nested git hook issues with worktrees.

### State Management

- React Context (`contexts/SettingsContext.tsx`) is used for API keys — wraps at App level. Changes propagate immediately to all consumers.
- `useSocket()` returns a singleton socket — do not call `io()` directly in components.
