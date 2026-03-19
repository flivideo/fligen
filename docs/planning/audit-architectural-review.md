# Architectural Review — FliGen

**Date:** 2026-03-19
**Reviewer lens:** Third lens — structural readiness for growth, not correctness or test coverage.
**Features under assessment:** FR-19 (Thumbnail Persistence) and FR-20 (Story Builder assembly endpoint wiring).
**Prior audits incorporated:** code-quality-audit, test-quality-audit findings acknowledged but not re-investigated.

---

## 1. Module Map

### Shared Layer (`shared/`)

| File | Owns |
|---|---|
| `shared/src/index.ts` | All cross-boundary contracts: `Asset`, `AssetCatalog`, `AssemblyRequest/Response`, `Shot`, `VideoTask`, `BatchJob`, plus all Socket.io event types. ~480 lines. |
| `shared/src/apiRegistry.ts` | Machine-readable API endpoint registry used by the Query API tier. |

The shared layer is appropriately thin and serves as the contract boundary. Types live here correctly.

### Server Layer (`server/src/`)

**Entry point:**

| File | Owns |
|---|---|
| `server/src/index.ts` | 1,482 lines. All HTTP route handlers inline. Socket.io connection management. Server bootstrap. Port cleanup. Graceful shutdown. N8N asset-building logic (~150 lines of inline asset construction). Business logic for music library deduplication/translation. A standalone helper function (`cleanPrompt`). |

**Config:**

| Module | Owns |
|---|---|
| `config/env.ts` | Environment variable parsing |
| `config/logger.ts` | Pino logger singleton |
| `middleware/requestLogger.ts` | Request ID injection, HTTP logging |

**Tools (domain modules):**

| Module | Owns |
|---|---|
| `tools/catalog/storage.ts` | Unified `index.json` CRUD — `addAsset`, `updateAsset`, `filterAssets`, `deleteAsset`, `getNextWorkflowNumber`. No concurrency protection. |
| `tools/catalog/index.ts` | Re-export shim only |
| `tools/image/` | FAL/KIE clients, `save-to-catalog.ts`, types |
| `tools/video/` | FAL/KIE clients, `save-to-catalog.ts`, old `storage.ts` (separate `video-scenes/index.json`), types |
| `tools/music/` | FAL/KIE clients, `save-to-catalog.ts`, old `storage.ts` (separate `music-library/index.json`), types |
| `tools/elevenlabs/` | API client, `save-to-catalog.ts`, types |
| `tools/story/assembler.ts` | FFmpeg subprocess via `exec` + string interpolation; `buildFFmpegCommand()` (shell injection risk per prior audit) |
| `tools/story/storage.ts` | Move-and-register assembled videos to `catalog/stories/` |
| `tools/shots/storage.ts` | `shot-list/index.json` CRUD, image download |
| `tools/widgets/storage.ts` | `assets/widgets/index.json` CRUD, HTML/JSON file pairs |
| `tools/batch/queue.ts` | In-memory `Map<string, BatchJob>`. FAL/KIE generation loop. Writes to catalog via `saveImageToCatalog`. |
| `tools/batch/` | Cost estimation, CSV parsing/updating |
| `tools/projects/storage.ts` | YAML/JSON project files |
| `tools/prompts/` | System prompts, Claude-based refinement |
| `tools/kybernesis/` | MCP client |
| `tools/local-docs/` | File scanner, reader, path security |
| `tools/flihub/` | External API client |
| `tools/agent/` | Claude Agent SDK handler, session management |

**Routes (extracted):**

| Module | Owns |
|---|---|
| `routes/batch.ts` | 5 batch endpoints — properly extracted |
| `routes/query/index.ts` | Query API tier mount — properly extracted |
| `routes/query/catalog.ts`, `config.ts`, `health.ts` | Sub-routers for query tier |

### Client Layer (`client/src/`)

| Module | Owns |
|---|---|
| `components/tools/Day8Thumbnail.tsx` | 1,577-line monolith. Canvas rendering, drag-and-drop, export, config state, all UI sub-components (LayerStack, PreviewCanvas, TextPanelEditor, OverlayEditor, ConfigPanel, ActionBar). Everything for the thumbnail tool, all in one file. No catalog persistence. |
| `components/tools/Day11StoryBuilder.tsx` | 525 lines. Asset loading via direct `http://localhost:5401` fetch. FFmpeg assembly already connected via `/api/story/assemble`. Catalog write happens server-side. No history UI. |
| `contexts/SettingsContext.tsx` | Global settings state |
| `hooks/useShots.ts` | Shot list socket subscription |
| `hooks/useSocket.ts` | Socket.io connection |
| `data/days.ts` | Navigation config |
| `components/tools/BrandTextGenerator/` | Canvas rendering, pixel glyphs, templates — properly decomposed into sub-modules |

---

## 2. Overall Architecture Grade

**C+**

The system delivers working functionality across 12+ tools. The shared-type contract is well-placed, the per-tool module layout (`tools/<domain>/`) is principled, and the recent extraction of `routes/batch.ts` and `routes/query/` shows the team knows how to fix this pattern. However three structural problems compound each other as features are added: the 1,482-line God file at `server/src/index.ts`, a catalog storage layer with no concurrent-write protection, and a proliferating parallel-storage problem (4 separate index.json files coexist alongside the unified catalog). These are not cosmetic; they directly tax every new feature.

---

## 3. Top 5 Structural Concerns

### CONCERN 1 — CRITICAL
**Location:** `server/src/index.ts` (1,482 lines)
**Concern:** God-file entry point containing all route handlers inline. Every new feature (FR-19, FR-20, and beyond) either adds more routes here or opens a large-scope file. The N8N handler alone is ~150 lines of inline asset construction logic that belongs in `tools/n8n/`. Business logic for the music library translation (converting `Asset` → `SavedTrack` in the handler at line 484-510) is duplicated between the route handler and the tool's own save functions. The `cleanPrompt()` helper and `isN8nConfigured()` are loose functions with no home.
**Recommended change:** Extract each domain's routes into `routes/<domain>.ts` files following the `routes/batch.ts` pattern already established. FR-19 thumbnail routes and FR-20 story routes should be in `routes/thumbnail.ts` and `routes/story.ts`, not added to `index.ts`. This is incremental and low-risk: mount the router, move the handlers, delete from `index.ts`. The N8N inline asset construction should be extracted to `tools/n8n/save-to-catalog.ts`.

---

### CONCERN 2 — CRITICAL
**Location:** `server/src/tools/catalog/storage.ts` — `addAsset()`, `updateAsset()`, `deleteAsset()`
**Concern:** All catalog mutations follow the same unsafe read-modify-write pattern with no file lock:
```
loadCatalog() → mutate → saveCatalog()
```
FR-20 story assembly already calls `saveStoryToCatalog()`, which calls `catalog.addAsset()`. FR-19 thumbnail save will do the same. The N8N route calls `Promise.all(savePromises)` (line 985) — three concurrent `addAsset()` calls in parallel on the same index.json. Each one races. Prior audit confirmed this; the architectural implication is that every `save-to-catalog.ts` file that arrives with each new feature increases the window for corruption. The catalog is the single system of record — its corruption is a data loss event.
**Recommended change:** Introduce a write-queue (a simple sequential async queue, not an external dependency) in `catalog/storage.ts` that serialises all writes. All `addAsset` / `updateAsset` / `deleteAsset` calls enqueue and wait. This is a one-file change that does not touch callers. As an interim measure, the `Promise.all` in the N8N handler must be converted to sequential `await` calls.

---

### CONCERN 3 — SIGNIFICANT
**Location:** `server/src/tools/` — parallel storage systems
**Concern:** Four distinct index.json files coexist:
- `assets/catalog/index.json` — the unified catalog (the intended home)
- `assets/shot-list/index.json` — shots module (separate, not in catalog)
- `assets/video-scenes/index.json` — video tasks (separate, not in catalog)
- `assets/music-library/index.json` — old music storage (explicitly marked "backward compatibility" in `index.ts` at line 503)

The music library already has a deduplication hack in the route handler (lines 481-506) that combines catalog and old storage, using an `oldTracks` fallback. Shots and video tasks are entirely outside the catalog. When FR-19 adds thumbnails to the catalog, there will be five storage paths. When Day15/16 features extend the asset browser, each new storage system needs its own scan, filter, and count logic. The `AssetBrowser` client component already fetches from `/api/catalog` only — it cannot see shots or video tasks.
**Recommended change:** Designate `catalog/index.json` as the single canonical store. Shots and video tasks should be migrated to use `catalog.addAsset()` rather than their own index files. Music's old storage can be dropped once a migration step (at server startup) moves legacy tracks to the catalog. This is a two-sprint effort but should be sequenced before adding a fifth storage path.

---

### CONCERN 4 — SIGNIFICANT
**Location:** `client/src/components/tools/Day8Thumbnail.tsx` (1,577 lines) + `server/src/tools/story/assembler.ts`
**Concern (Thumbnail):** `Day8Thumbnail.tsx` has no catalog persistence at all. Export writes a PNG blob to the browser's download folder with no record in the catalog. FR-19 requires adding persistence, but the component has no server interaction layer whatsoever — no API call pattern is established, no loading/saving state exists beyond `isExporting`. Adding catalog persistence requires introducing a new fetch call, a new response shape, and a new history display, all into a 1,577-line file where rendering logic, canvas logic, and UI are already merged. The component does not follow the separation established by `BrandTextGenerator/` (which properly splits rendering, export, and templates into sub-modules).
**Concern (Story):** `assembler.ts` uses `exec` (string-concatenation command) rather than `execFile` with argument arrays. This is flagged as shell injection risk by the code quality audit. Architecturally, `buildFFmpegCommand()` is a pure function that takes a typed `AssemblyRequest` and returns a shell string — the return type is the wrong abstraction. The function should return a structured argument list `[binary, ...args]` consumed by `execFile`. This is the same issue but viewed from structure: the command-building layer leaks its implementation detail (shell strings) to its caller.
**Recommended change for Thumbnail:** Before implementing FR-19, split `Day8Thumbnail.tsx` into: `Day8Thumbnail.tsx` (layout/state), `ThumbnailCanvas.tsx` (rendering, drag), `ThumbnailExport.ts` (canvas-to-blob, server save), `ThumbnailHistory.tsx` (history list). Then add a `POST /api/thumbnails/save` endpoint following the existing `save-to-catalog.ts` pattern.
**Recommended change for Assembler:** Refactor `buildFFmpegCommand()` to return `{ binary: string; args: string[] }` and switch `execAsync` to `execFile`. This eliminates the injection surface and makes args testable as an array.

---

### CONCERN 5 — MODERATE
**Location:** `server/src/tools/batch/queue.ts` + `Day11StoryBuilder.tsx` client
**Concern (Batch queue):** The batch queue uses an in-memory `Map<string, BatchJob>`. On server restart, all in-progress or queued jobs are lost silently. No client is notified. This is acceptable at MVP scale but becomes a trap when FR-20 story assembly (which takes 30-120 seconds of FFmpeg time) is exposed as a long-running job. If the server restarts during assembly, the client has no recovery path — it polls a job ID that no longer exists. The story assembly route (`POST /api/story/assemble`) currently blocks the HTTP response until FFmpeg completes, which is a synchronous 30-120 second response. This is functionally fragile (client timeout, no progress feedback) and structurally the wrong pattern for long-running operations.
**Concern (Client hardcoded URLs):** `Day11StoryBuilder.tsx` (line 38, 148, 505) and `Day8Thumbnail.tsx` (line 663, 669) hardcode `http://localhost:5401`. This is not in env config and will break in any deployment that isn't local dev. The pattern is inconsistent — `Day6Video.tsx` and others use relative paths or `SettingsContext`.
**Recommended change:** Story assembly should respond immediately with a job token and use Socket.io `video:progress`/`video:completed` events (the pattern already exists for video generation). Hardcoded hostnames should be centralised in a single client-side config constant sourced from Vite's env vars.

---

## 4. Trajectory Assessment

### What compounds if left alone

**The God file** (`server/src/index.ts`) grows by approximately 50-80 lines per new feature endpoint. FR-19 adds 2-3 endpoints (save, list, delete thumbnail). FR-20 may add a job-status endpoint. By Day 15, the file will exceed 1,700 lines. Each new developer (or AI agent) editing this file must parse the entire context to place a route correctly. Naming collisions become likely — the `/api/catalog/assets/:id/rename` endpoint is already embedded among music routes (lines 576-605) despite being a catalog concern.

**The parallel storage problem** becomes a filter and query problem. The `AssetBrowser` component already cannot see shots or video tasks. Every feature that wants cross-asset operations (batch-select for story assembly, tag-search across all media, cost reporting) must either duplicate queries across all five storage locations or hack around it in the route handler. The music deduplication hack (lines 481-506) is a preview of this future.

**The catalog race condition** scales with concurrency. N8N workflows already run three concurrent writes. If story assembly is made async (correct fix for concern 5), and a user triggers assembly while batch generation is running, catalog writes will race. The `index.json` size also grows indefinitely — no archiving, no compaction, no pagination. Large catalogs will make every `loadCatalog()` call slower since the entire array is read into memory.

**Thumbnail component size** blocks FR-19 development velocity. Adding history UI to a 1,577-line single-file component while also adding server persistence means multiple developers editing the same file, with high merge conflict risk and no testability boundary.

### What stays manageable

**The `shared/` contract layer** is healthy. Types are well-named, the `AssemblyRequest`/`AssemblyResponse` and `Asset` types are usable for FR-19 and FR-20 without modification. The `Asset.type` union already includes `'thumbnail'` — FR-19 can be added without a type change.

**The `tools/<domain>/save-to-catalog.ts` pattern** is consistent and well-established. Four tools follow it identically. FR-19 thumbnail persistence should add `tools/thumbnail/save-to-catalog.ts` following this exact pattern — it will be a predictable 50-line file. The pattern works.

**The story module** (`tools/story/`) is already structurally complete: `assembler.ts`, `storage.ts`, `types.ts`, `index.ts`. The assembly endpoint in `server/src/index.ts` (lines 708-744) is already wired and calls `assembleVideo()` + `saveStoryToCatalog()`. FR-20 is functionally connected. The work remaining is making it async (concern 5) and fixing the injection risk (concern 4).

**The routes/ extraction pattern** is working. `routes/batch.ts` is 336 clean lines. `routes/query/` is properly decomposed. These serve as templates for extracting the remaining domains.

---

## 5. Readiness Verdict for FR-19 and FR-20

### FR-20: Story Builder — assembly endpoint wiring

**Structural readiness: HIGH for the happy path, LOW for production robustness.**

The endpoint exists (`POST /api/story/assemble`), it is wired to `assembleVideo()` and `saveStoryToCatalog()`, and the client (`Day11StoryBuilder.tsx`) already calls it correctly. The feature is functionally connected today. The structural problems are:

1. The endpoint is synchronous (blocks for 30-120 seconds). If the client closes the connection or the server restarts, the assembled file may exist on disk without a catalog entry, or may not exist at all. There is no progress event emitted to the client during assembly.
2. `buildFFmpegCommand()` uses string interpolation for file paths (shell injection, prior audit). File paths coming from `AssemblyRequest.videos` traverse `resolveAssetPath()` but are not sanitised against shell metacharacters.
3. `saveStoryToCatalog()` calls `catalog.addAsset()` which has the race-condition problem. This is low risk for FR-20 specifically (single write per assembly) but is part of the broader catalog concern.

**Verdict for FR-20:** Wire it as-is for the demo. Before stabilisation, make the endpoint async (return job token, emit Socket.io progress events), and fix `buildFFmpegCommand` to use `execFile` with arg arrays.

---

### FR-19: Thumbnail Persistence

**Structural readiness: MODERATE — the server pattern is ready, the client is not.**

The server side is straightforward: add `tools/thumbnail/save-to-catalog.ts` following the image/music/narration pattern (the `Asset.type` union already includes `'thumbnail'`, the catalog directory already has `thumbnails/` created at init). Add a `POST /api/thumbnails/save` endpoint to a new `routes/thumbnail.ts`. This is ~80 lines of new code following established patterns.

The client side is the blocker. `Day8Thumbnail.tsx` is 1,577 lines with no server interaction layer, no history state, and no component decomposition. Correctly implementing FR-19 with history UI requires:
- A server call on export (currently only writes to browser download)
- A history list panel (requires new state and a new sub-component)
- A load-from-history action (requires reading catalog assets of type `thumbnail`)

Adding these to the existing monolith is possible but will produce a 1,800+ line component with three distinct concerns merged together. The recommended path is to split the file first (2-4 hours of refactoring) then implement FR-19. If timeline pressure prevents this, at minimum extract a `useThumbnailCatalog` hook that owns the server interaction, so the component itself does not grow further.

**Verdict for FR-19:** Implement the server side now (it is ready). Split `Day8Thumbnail.tsx` before or in parallel with adding the history UI. Do not implement the full history feature inside the existing monolith — it will degrade the component to a point where future changes require full rewrites.

---

## Summary Table

| # | Severity | Location | Concern | Fix Before |
|---|---|---|---|---|
| 1 | CRITICAL | `server/src/index.ts` | God file — 1,482 lines, all routes inline, business logic mixed in | FR-21 or next domain addition |
| 2 | CRITICAL | `catalog/storage.ts` | No file lock on `index.json` writes — concurrent saves corrupt index | FR-19 (multiple concurrent saves possible) |
| 3 | SIGNIFICANT | `tools/shots/`, `tools/video/storage.ts`, `tools/music/storage.ts` | 4 parallel storage systems — catalog fragmentation | Day 16 asset browser extension |
| 4 | SIGNIFICANT | `Day8Thumbnail.tsx` (1,577 lines) + `story/assembler.ts` | Thumbnail is un-decomposed monolith; assembler uses shell interpolation | FR-19 history UI; FR-20 stabilisation |
| 5 | MODERATE | `batch/queue.ts` + client hardcoded URLs | In-memory queue lost on restart; `localhost:5401` hardcoded in client | Story assembly async upgrade |
