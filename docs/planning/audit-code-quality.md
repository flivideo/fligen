# Code Quality Audit — FliGen

**Date:** 2026-03-19
**Auditor:** Claude Sonnet 4.6 (Senior Software Architect role)
**Scope:** All production source files in `server/src/` and `client/src/` plus `shared/src/`
**Next campaign framing:** Story Builder video assembly (FR-20, FFmpeg pipeline) + Thumbnail Persistence (FR-19, catalog save pattern)

---

## 1. Layer Grades

| Layer | Grade | One-line reason |
|---|---|---|
| `config/` (env, logger) | A | Zod-validated env schema, structured Pino logging, clean separation |
| `middleware/` | A | Request ID propagation and HTTP logging are correct and well-structured |
| `agent/` (handler, session) | B | Solid SDK integration; unbounded in-memory session map leaks on long uptime |
| `tools/catalog/storage.ts` | C | No file-locking: concurrent writes to a single `index.json` will corrupt data |
| `tools/story/assembler.ts` | C | FFmpeg command is built by string interpolation of user-supplied file paths — shell injection vector; `fs.existsSync` sync I/O in async pipeline |
| `tools/story/storage.ts` | B | Clean catalog save; no validation that `result.outputPath` is within expected directory |
| `tools/shots/storage.ts` | B | Reasonable; `generateShotId` uses `Math.max` over full array every call — O(n) scaling concern at volume |
| `tools/video/storage.ts` | B | Same single-index-file pattern as catalog, but lower write frequency |
| `tools/music/storage.ts` | B | Legacy storage alongside new catalog creates duplicate-track UX issue already known |
| `tools/music/save-to-catalog.ts` | B | `import fetch from 'node-fetch'` mixed with native fetch elsewhere — minor inconsistency |
| `tools/image/save-to-catalog.ts` | B | `fetch(imageUrl)` with no timeout; silently stores corrupt image if CDN returns a redirect or error body |
| `tools/elevenlabs/save-to-catalog.ts` | C | Duration estimated as `buffer.length / 16000` — byte-based heuristic is wrong for variable-bitrate MP3 (can be off by 3–5x) |
| `tools/projects/storage.ts` | B | Good input validation; `loadProject` called inside `listProjects` loop — O(n²) I/O |
| `tools/batch/queue.ts` | C | Batch jobs stored in-memory only; process restart silently discards all in-flight work; `FAL_API_KEY` env name differs from `FAL_KEY` used elsewhere |
| `tools/batch/csv.ts` | B | Clean parsing; `updateCsv` uses sync `writeFileSync` inside async function |
| `tools/local-docs/security.ts` | A | Thorough path-traversal + symlink-escape checks; hardcoded base path is the right pattern |
| `tools/widgets/storage.ts` | B | Sequential widget ID (`count + 1`) breaks on delete — IDs reuse after deletions |
| `routes/batch.ts` | B | `return res.status(...)` pattern in Express 5 produces TS warnings; `job.csvFilePath` mutated directly on the job object (bypasses encapsulation) |
| `routes/query/catalog.ts` | B | Loads entire catalog into memory for every paginated query — acceptable at current scale, needs index at >10k assets |
| `server/src/index.ts` | C | 1,483-line God file; `cleanupPort` uses `execSync` and `kill -9` with PID from lsof output (unsanitized shell exec at startup); N8N handler is 230 lines inline with no extraction; `console.log` mixed with structured `log.*` calls throughout |
| `client/src/App.tsx` | B | Giant if-else chain for day routing; hardcoded `localhost:5401` server URL |
| `client/src/hooks/useSocket.ts` | B | Singleton socket not cleaned up on HMR reload (dev-only issue) |
| `client/src/components/tools/Day11StoryBuilder.tsx` | B | Hardcoded `localhost:5401`; no AbortController on long-running fetch; assembles correctly |
| `client/src/components/tools/Day8Thumbnail.tsx` | B | No persistence of thumbnail config; `isExporting` flag not reset if `toBlob` callback never fires (race condition) |
| `client/src/contexts/SettingsContext.tsx` | A | Clean Context + localStorage pattern; cross-tab sync via StorageEvent |
| `shared/src/index.ts` | B | `metadata: Record<string, any>` on `Asset` is an untyped escape hatch that degrades type safety at all boundaries |

---

## 2. Top 5 Issues (Ranked by Severity)

### Issue 1 — BLOCKER: Catalog Concurrent Write Corruption
**File:** `server/src/tools/catalog/storage.ts:40–43`

`saveCatalog` does a read-modify-write of `index.json` with no file lock or atomic rename. Two concurrent catalog saves (e.g., parallel N8N asset saves at line 985 in `index.ts` using `Promise.all`) will interleave reads and writes, producing a JSON file with only one of the two new assets. The lost asset is unrecoverable.

**Specific fix:** Use an atomic write pattern — write to `index.json.tmp` then `fs.rename()` (atomic on POSIX), and wrap catalog operations in an async mutex (e.g., `async-mutex` package). The `Promise.all(savePromises)` call in `index.ts:985` must be serialised or replaced with sequential saves until the mutex is in place.

---

### Issue 2 — BLOCKER: Shell Injection in FFmpeg Command Builder
**File:** `server/src/tools/story/assembler.ts:124–219`

`buildFFmpegCommand` interpolates file paths directly into a shell string: `` cmd += ` -i "${video}"` ``. If a video URL stored in the catalog contains shell metacharacters (e.g., from a crafted N8N response), the string reaches `execAsync(ffmpegCommand)` as an unescaped shell command. An attacker who can influence asset URLs (via the N8N webhook response or a crafted `/api/story/assemble` request) can achieve arbitrary command execution on the server.

**Specific fix:** Replace shell-string interpolation with the array-argument form: `execFile('ffmpeg', argsArray)` (from `child_process`). Never build shell commands by string concatenation with external data. Also add server-side validation that all video/music/narration URLs in `AssemblyRequest` resolve to paths strictly within the `assets/` directory (re-use the `validatePath` pattern already in `local-docs/security.ts`).

---

### Issue 3 — BLOCKER: `cleanupPort` Uses Unsanitised `execSync` with Shell at Server Startup
**File:** `server/src/index.ts:1394–1406`

```ts
const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' });
const pids = result.trim().split('\n').filter(Boolean);
execSync(`kill -9 ${pid} 2>/dev/null || true`);
```

`port` comes from the Zod-validated `env.PORT` (safe), but `pid` comes from the `lsof` stdout. A compromised or misbehaving `lsof` could return non-numeric output that becomes a shell injection in the `kill -9` command. More critically: `kill -9` on a stale PID racily kills an unrelated process that reused the PID. On a shared developer machine this silently kills another developer's process.

**Specific fix:** Validate that each `pid` is a pure integer before using it (`/^\d+$/.test(pid)`). Prefer `process.kill(parseInt(pid), 'SIGTERM')` (Node built-in, no shell involved) with a fallback to SIGKILL after a short wait.

---

### Issue 4 — MAJOR: Incorrect Audio Duration Heuristic Propagates Wrong Metadata to Story Builder
**File:** `server/src/tools/elevenlabs/save-to-catalog.ts:31`

```ts
const durationSeconds = Math.round(buffer.length / 16000);
```

This assumes 128kbps constant-bitrate MP3. ElevenLabs returns VBR MP3 where the actual bitrate varies; in practice the heuristic is off by 2–5x for short clips. The wrong `durationSeconds` is stored in the catalog and used by `Day11StoryBuilder` to display narration length, compute `targetDuration`, and ultimately drive FFmpeg's `-t` flag. A story assembled with wrong narration duration will either cut off early or run silent.

**Specific fix:** Call `ffprobe` (which is already a dependency since `assembler.ts` uses it) to read the actual duration from the saved MP3 file: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1`. Store this value as `durationSeconds` in metadata. Alternatively, use an npm package such as `music-metadata` that parses MP3 frame headers accurately without spawning a process.

---

### Issue 5 — MAJOR: Thumbnail Config is Never Persisted (FR-19 Gap)
**File:** `client/src/components/tools/Day8Thumbnail.tsx:1445–1576`

The entire `ThumbnailConfig` state lives in React `useState(initialConfig)`. On page navigation (user switches to a different Day), the state is destroyed. There is no save-to-catalog endpoint for thumbnails, no loading from catalog, and no `localStorage` checkpoint. This makes FR-19 (Thumbnail Persistence) entirely absent rather than partially implemented.

Beyond the feature gap: the `handleExport` function sets `isExporting = true` and then calls `canvas.toBlob(callback)`. If the callback fires after the component has unmounted, `setIsExporting(false)` is called on an unmounted component (React warning, potential state corruption in strict mode). The `handleCopyToClipboard` function has the same pattern.

**Specific fix for persistence:** Add a `POST /api/thumbnails/save` endpoint that accepts the `ThumbnailConfig` JSON and optionally a rendered PNG (via the existing canvas renderer). Add a `GET /api/thumbnails` list endpoint. Follow the identical catalog pattern used by images. Store the config as metadata and the rendered PNG in `catalog/thumbnails/`.

**Specific fix for the `toBlob` race:** Wrap canvas exports in a `Promise<Blob>` (`canvas.toBlob` wrapped with `new Promise`) and `await` it before manipulating state, so the cleanup always runs synchronously in the same async frame.

---

## 3. Scheduled Debt (Remaining Issues)

**Architecture / Structure**

- `server/src/index.ts` is 1,483 lines. The N8N workflow handler (~230 lines, lines 773–1008) should be extracted to `routes/n8n.ts` and `tools/n8n/`. The inline helper functions `isN8nConfigured()` and `cleanPrompt()` belong in a dedicated module. Target: no single route file over 200 lines.
- The `app.delete('/api/shots/clear', ...)` route at line 311 is registered AFTER `app.delete('/api/shots/:id', ...)` at line 290. Express will never reach the `/clear` literal because `:id` matches it first. Functional defect: clearing shots via this path calls `removeShot('clear')` which returns `false` and yields a 404. Fix: register `/clear` before `/:id`.

**Type Safety**

- `metadata: Record<string, any>` on `Asset` (shared types) cascades through every catalog save-to-catalog module. Key metadata fields accessed in `Day11StoryBuilder` (`duration`, `durationSeconds`, `name`, `voice`, `startShot`, `endShot`, `workflowId`) should be declared as typed sub-interfaces per asset type and discriminated with the `type` field.
- `BatchJob` in `tools/batch/types.ts` uses `Date` for `createdAt/startedAt/completedAt`, but the shared `shared/src/index.ts` version uses `string`. The two types diverge; the API response serialises `Date` objects inconsistently.
- `req.body as CompareRequest` / `req.body as GenerateSpeechRequest` type assertions throughout `index.ts` bypass runtime validation. Only a subset of routes have manual `typeof` guards. Consider `zod` schema validation on route bodies (the pattern is already used in `config/env.ts`).

**Security**

- `express.json({ limit: '50mb' })` (index.ts:91) is applied globally. Endpoints that only accept small JSON (e.g., tag updates, shot removal) inherit this large limit, giving an attacker a free 50 MB allocation per request for DoS.
- The `x-request-id` header in `addRequestId` middleware (requestLogger.ts:8) is trusted directly from the client without sanitisation. A client can inject an arbitrary string as the request ID which appears in all log entries for that request.
- N8N webhook URL is read directly from `process.env.N8N_WEBHOOK_URL` inside the route handler rather than from the validated `env` object. It bypasses the Zod schema.

**Performance**

- `loadCatalog()` reads and parses `index.json` from disk on every catalog operation. With 500+ assets the file grows to several hundred KB and every `/api/catalog` request re-reads it. Add an in-memory cache with a simple dirty flag, or use SQLite.
- `listProjects()` calls `loadProject()` for every directory entry in a sequential loop (storage.ts:168–175). This is O(n) file reads; for 50 projects it issues 50 file reads sequentially. Switch to `Promise.all` on the directory read or cache project metadata.
- `getNextWorkflowNumber()` scans all catalog assets on every N8N workflow run to find the max workflow ID. This is O(n) on the catalog and races with concurrent N8N calls.

**Data Integrity**

- `deleteAsset` in `catalog/storage.ts:106` constructs the file path as `path.join(CATALOG_DIR, asset.type + 's', asset.filename)`. For `type = 'video'`, this becomes `catalog/videos/`. But videos saved by `story/storage.ts` go to `catalog/stories/` and N8N videos go to `catalog/n8n/{workflowId}/`. The `deleteAsset` path construction misses both, silently failing to delete the physical file while removing the catalog entry — a permanent storage leak.
- Music tracks can be saved both to `music-library/` (old `saveTrack`) and `catalog/music/` (new `saveMusicToCatalog`). The `listLibraryTracks` call in the `/api/music/library` handler combines both sources, creating duplicates if both paths were exercised for the same track.
- `generateWidgetId` uses `catalog.widgets.length + 1`. After deleting widget-002 of 3, the next widget gets ID widget-003, colliding with the existing widget-003.

**Silent Failure Modes**

- In `index.ts:992–995`, N8N asset-save errors are swallowed: `catch (saveError) { console.error(...); }`. A failed save means the catalog entry is missing but the response tells the client the workflow succeeded. The client renders the result but it will vanish on next page load.
- In `batch/queue.ts:264–267`, catalog save failure is also silently swallowed. A batch of 60 images could generate correctly but persist zero to disk with no client-visible error.
- `assembleVideo` (assembler.ts) checks stderr for `'frame='` and `'time='` to suppress FFmpeg noise, but real FFmpeg errors also write to stderr. A failed transcode might not set a non-zero exit code (e.g., output file is 0 bytes but ffmpeg exits 0 due to a filter graph warning). Add an explicit file-size check on the output path before declaring success.

**Client Hardcoded URLs**

- `http://localhost:5401` appears in `useShots.ts:5`, `Day11StoryBuilder.tsx:38`, `Day11StoryBuilder.tsx:148`, `Day11StoryBuilder.tsx:173`, `Day11StoryBuilder.tsx:505`, and `Day8Thumbnail.tsx:663/669`. This should be a shared constant (or an env var at Vite build time via `import.meta.env.VITE_SERVER_URL`). Currently a port change requires editing 6+ files.

**Thumbnail Export Race Condition (Day8)**

- `handleExport` and `handleCopyToClipboard` both call `setIsExporting(false)` inside a `toBlob` callback (not a promise await). If the component unmounts before the callback fires (e.g., user navigates away), the state update runs on a dead component. Wrap `toBlob` in a `Promise<Blob>` and `await` it inside the async handler.

---

## 4. Verdict

**Is the codebase ready to build Story Builder (FR-20, FFmpeg pipeline) + Thumbnail Persistence (FR-19) on top of, or does something need fixing first?**

The codebase is **not ready to build FR-19 and FR-20 reliably** without addressing Issues 1 and 2 first.

**For FR-20 (Story Builder / FFmpeg pipeline):** The pipeline itself is already wired end-to-end and functional for the happy path. However, Issue 2 (shell injection in `buildFFmpegCommand`) is a BLOCKER before any user-facing launch — anyone who can craft a video URL in the catalog (already possible via the N8N workflow endpoint or a direct POST to `/api/story/assemble`) can execute arbitrary server commands. The fix is straightforward (switch to `execFile` with an array of arguments) and should take 2–3 hours. Issue 4 (wrong narration duration) is a MAJOR correctness bug that will cause silently wrong video output the first time a user tries narration + target-duration together; fix before launching to users. Additionally, the routing bug in Item 3 of scheduled debt (`/api/shots/clear` masked by `/:id`) means the "clear all shots" button in the UI silently fails — this directly affects Day 11 workflow.

**For FR-19 (Thumbnail Persistence):** The feature is entirely absent — there is no server endpoint and no client persistence code (Issue 5). FR-19 is a net-new feature, not a regression, so it is not a blocker on the existing codebase per se. However, the catalog concurrent-write bug (Issue 1) must be fixed before wiring up thumbnail saves, since the catalog is the obvious persistence target and concurrent saves will corrupt it. The incorrect `isExporting` race condition in Day 8 should be fixed in the same PR as FR-19 since both touch the same component.

**Recommended pre-work order (hours estimate):**
1. Fix catalog concurrent write (Issue 1) — 3–4 hrs (add `async-mutex`, atomic rename)
2. Fix FFmpeg shell injection (Issue 2) — 2–3 hrs (switch to `execFile` + path validation)
3. Fix `/api/shots/clear` route ordering (Scheduled Debt) — 15 min
4. Fix `kill -9` PID handling (Issue 3) — 1 hr
5. Add FR-19 thumbnail persistence — build on clean catalog layer
6. Fix narration duration calculation (Issue 4) — 2 hrs (use ffprobe or music-metadata)
7. Extract N8N handler to dedicated router — 2 hrs (quality, not blocking)

The underlying architecture is sound for a 12-day build series: the catalog pattern is the right abstraction, the monorepo workspace separation is clean, the Zod env validation and Pino structured logging are production-quality choices, and the local-docs security layer is genuinely well-implemented. The BLOCKERs are all fixable in under a day combined. Grade the overall codebase as **C+** — safe to demo, unsafe to ship without addressing the top three issues.
