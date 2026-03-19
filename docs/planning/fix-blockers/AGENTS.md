# AGENTS.md — fix-blockers campaign

**Project**: FliGen — "12 Days of Claudemas" tool-building harness
**Campaign**: fix-blockers — security/data fixes + structural prep
**Stack**: React 19 + Vite 6 + TailwindCSS v4 | Express 5 + Socket.io | TypeScript 5.6+ | npm workspaces
**Ports**: Client 5400 | Server 5401

---

## Build & Run Commands

```bash
npm run build        # shared → server → client (all must pass)
npm test             # vitest across all workspaces
npm run build -w shared && npm run build -w server   # server-only check
npm test -w server   # server tests only
npm test -w client   # client tests only
```

**Baseline**: build CLEAN, 8 tests passing before this campaign starts.
**Target**: build CLEAN, more than 8 tests passing when campaign ends.

---

## Directory Structure (files this campaign touches)

```
server/src/
├── index.ts                          # B029: PID fix; B030: route extraction
├── tools/
│   ├── catalog/storage.ts            # B027: write queue
│   └── story/assembler.ts            # B028: execFile refactor
├── routes/
│   ├── batch.ts                      # REFERENCE — follow this pattern for B030
│   └── query/index.ts                # REFERENCE — follow this pattern for B030
│   └── [new route files go here]     # B030 output
├── __tests__/
│   └── example.test.ts               # Replace arithmetic stubs with real tests (B032)
│   └── [new test files go here]      # B032 output

client/src/components/tools/
├── Day8Thumbnail.tsx                  # B031: split this (1,577 lines)
└── thumbnail/                        # B031 output — new sub-components go here
    ├── ThumbnailCanvas.tsx
    ├── ThumbnailExport.tsx
    └── ThumbnailHistory.tsx
```

---

## Success Criteria (every work unit)

- [ ] `npm run build` exits 0 (all three workspaces)
- [ ] `npm test` exits 0
- [ ] No TypeScript errors in modified files
- [ ] No regressions — existing behaviour unchanged
- [ ] At least one test written or updated for the changed logic

---

## Work Unit Specs

### fix-catalog-write-queue (B027)

**File**: `server/src/tools/catalog/storage.ts`

**Problem**: `loadCatalog()` → mutate → `saveCatalog()` is not atomic. Two concurrent `addAsset()` calls (e.g. N8N `Promise.all`) race on the same `index.json` — last write wins, earlier write is lost.

**Fix**: Wrap all mutating operations in a serialised async queue. The simplest correct pattern:

```typescript
// Add at top of storage.ts
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation);
  // Keep the chain alive even if operation rejects
  writeQueue = result.then(() => {}, () => {});
  return result;
}

// Wrap addAsset, updateAsset, deleteAsset:
export async function addAsset(asset: Asset): Promise<Asset> {
  return enqueueWrite(async () => {
    const catalog = await loadCatalog();
    catalog.assets.push(asset);
    await saveCatalog(catalog);
    return asset;
  });
}
// Apply same pattern to updateAsset and deleteAsset
```

**Done when**: concurrent `addAsset()` calls are serialised; build + tests pass; no change to function signatures (callers unaffected).

---

### fix-assembler-shell-injection (B028)

**File**: `server/src/tools/story/assembler.ts`

**Problem**: `buildFFmpegCommand()` returns a shell string, passed to `execAsync(cmd)`. A path like `/assets/catalog/videos/video;rm -rf /` would be shell-executed. `getVideoDuration` has the same pattern with ffprobe.

**Fix**: Refactor to use `execFile` with an args array. The filter_complex becomes a single argument (not shell-parsed):

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

// Change buildFFmpegCommand to return args array
function buildFFmpegArgs(request: AssemblyRequest, outputPath: string): string[] {
  const args: string[] = [];
  // -i inputs
  videoPaths.forEach((video) => args.push('-i', video));
  // ... build args array instead of string
  args.push('-filter_complex', filterComplex);  // filter_complex is one arg — safe
  args.push('-map', '[v]', '-map', '[a]');
  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
  args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-y', outputPath);
  return args;
}

// Call site:
const args = buildFFmpegArgs(request, outputPath);
const { stderr } = await execFileAsync('ffmpeg', args);

// Same fix for getVideoDuration:
async function getVideoDuration(filePath: string): Promise<number> {
  const args = ['-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1', filePath];
  const { stdout } = await execFileAsync('ffprobe', args);
  return parseFloat(stdout.trim());
}
```

**Done when**: no `execAsync` calls remain in assembler.ts; `buildFFmpegArgs` returns `string[]`; build + tests pass; assembleVideo behaviour unchanged.

---

### fix-pid-validation (B029)

**File**: `server/src/index.ts` — `cleanupPort()` function (lines ~1394–1406)

**Problem**: `execSync(`kill -9 ${pid}`)` where `pid` comes from `lsof` stdout without integer validation. A maliciously crafted process name could inject into the kill command.

**Fix**:

```typescript
function cleanupPort(port: number | string): void {
  try {
    const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' });
    const pids = result.trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      const numericPid = parseInt(pid.trim(), 10);
      if (isNaN(numericPid) || numericPid <= 0) continue;
      try {
        process.kill(numericPid, 'SIGKILL');
      } catch { /* already gone */ }
    }
    if (pids.length > 0) execSync('sleep 0.5');
  } catch { /* lsof unavailable, continue */ }
}
```

**Done when**: `cleanupPort` uses `parseInt` + `isNaN` guard + `process.kill()`; no `execSync` for the kill; build passes.

---

### add-behaviour-tests (B032)

**Files**: new test files in `server/src/__tests__/`

**Problem**: `example.test.ts` has only `1+1` assertions. `buildFFmpegCommand` (pure function), `filterAssets` (filter logic), `saveStoryToCatalog` (catalog contract) are all untested.

**What to test**:

1. **`buildFFmpegArgs()` in assembler.ts** — pure function, test the args array output:
   - Single video + music → correct `-i`, `-filter_complex`, `-map` args present
   - `targetDuration` → `-t` arg present
   - `narration.enabled` → narration input and amix in filter_complex
   - No shell metacharacters in output (paths with spaces handled correctly)

2. **`filterAssets()` in catalog/storage.ts** — filter logic:
   - Filter by `type` returns only matching assets
   - Filter by `provider` returns only matching assets
   - Filter by `tags` uses AND logic (asset must have ALL tags)
   - `startDate`/`endDate` boundary conditions
   - Empty filter returns all assets

3. **`saveStoryToCatalog()` in story/storage.ts** — catalog contract:
   - Saved asset has `type: 'story'` (or whatever the actual type is — read the file first)
   - Asset appears in catalog after save
   - Filename follows the expected pattern

**Test file pattern** (copy from existing client test):
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('filterAssets', () => {
  it('filters by type', async () => {
    // arrange: catalog with mixed asset types
    // act: filterAssets({ type: 'image' })
    // assert: only image assets returned
  });
});
```

**Read these files before writing tests**: `server/src/tools/story/storage.ts`, `server/src/tools/catalog/storage.ts`, `server/src/tools/story/assembler.ts`

**Done when**: at least 8 new behaviour tests written and passing; `example.test.ts` stubs replaced or supplemented; `npm test` count > 16 total.

---

### split-day8-thumbnail (B031)

**File**: `client/src/components/tools/Day8Thumbnail.tsx` (1,577 lines)

**Goal**: Decompose into sub-components without changing any behaviour. This is pure structural surgery — no logic changes.

**Target structure**:
```
client/src/components/tools/thumbnail/
├── ThumbnailCanvas.tsx     — canvas rendering logic + ref
├── ThumbnailExport.tsx     — export to PNG/clipboard logic
└── ThumbnailHistory.tsx    — history placeholder (empty for now, FR-19 will fill it)
```

**Day8Thumbnail.tsx** becomes the shell: imports + wires sub-components, holds top-level state.

**Rules**:
- Read the full file before splitting — understand all state, all handlers, all refs
- Move code; do not rewrite it
- Props must be explicit TypeScript interfaces
- All existing functionality must work after the split
- The `toBlob` race condition (component unmounts mid-export) is a known issue — note it in a comment but do not fix it in this campaign

**Done when**: `Day8Thumbnail.tsx` < 400 lines; sub-components exist; `npm run build` passes; behaviour unchanged.

---

### extract-routes (B030)

**File**: `server/src/index.ts` (1,482 lines)

**Reference**: `server/src/routes/batch.ts` and `server/src/routes/query/index.ts` — follow these patterns exactly.

**Goal**: Extract every HTTP route handler out of index.ts into route files. index.ts becomes only: imports, middleware setup, socket.io setup, route mounting, server start.

**Approach**:
1. Read `routes/batch.ts` first — understand the export pattern (Express Router)
2. Group routes by tool domain:
   - `routes/image.ts` — `/api/image/*`
   - `routes/video.ts` — `/api/video/*`, `/api/shots/*`
   - `routes/music.ts` — `/api/music/*`
   - `routes/tts.ts` — `/api/tts/*`
   - `routes/story.ts` — `/api/story/*`
   - `routes/widgets.ts` — `/api/widgets/*`, `/api/widget-templates/*`
   - `routes/projects.ts` — `/api/projects/*`, `/api/prompts/*`, `/api/flihub/*`
   - `routes/catalog.ts` — `/api/catalog/*` (if not already in query/)
3. Mount each router in index.ts: `app.use('/api/image', imageRouter)`
4. Socket.io handlers stay in index.ts (they're already wired to socket, not HTTP)

**Done when**: `server/src/index.ts` < 200 lines; all routes in separate files; `npm run build` passes; all API endpoints still work (spot-check health + image + music endpoints).

---

## Anti-Patterns to Avoid

All anti-patterns from `docs/planning/AGENTS.md` apply. Campaign-specific additions:

- **Do not change function signatures** in B027/B028/B029 — callers must be unaffected
- **Do not rewrite logic** in B031 — move code only, no behaviour changes
- **Do not add routes** in B030 — extract only, no new endpoints
- **Do not use `exec` or `execAsync`** in assembler.ts after B028 — only `execFile`
- **Do not test implementation details** in B032 — test observable behaviour (filter returns correct subset, catalog has the asset after save)

---

## Quality Gates

- `npm run build` exits 0 before marking any work unit complete
- `npm test` exits 0 before marking any work unit complete
- Wave 1 must all be complete before wave 2 starts (B029 patches index.ts before B030 touches it)

---

## Learnings

Inherited from `docs/planning/AGENTS.md`. Campaign-specific discoveries below.

### What worked well
- **Wave gating** (B027+B028+B029 before B030+B031+B032) prevented conflicts on shared files (`index.ts` touched only once, after B029 was already in)
- **Pure-function extraction first** (`buildFFmpegArgs` returning `string[]`) made the shell-injection fix easy to test in isolation — no mocking needed
- **Split before adding features** (B031) proved its value: the post-split `Day8Thumbnail.tsx` dropped from 1,577 → 168 lines, making FR-19 history UI straightforward to add
- **Route extraction pattern** (factory function with socket param) handled the Socket.io broadcast constraint cleanly — callers didn't need to change

### What surfaced unexpectedly
- **Path traversal not caught during implementation** — B028 fixed shell injection via `execFile` but `resolveAssetPath` still does `path.join` without canonicalization. The audit found that `../../etc/passwd` still escapes the assets tree. Fix required before `story-and-thumbnails` ships.
- **Write-queue concurrency test gap** — B027 added the fix; B032 added tests but did not add a concurrent-write test. The most critical behaviour is untested. Add `Promise.all([addAsset(...), addAsset(...)])` test before relying on the queue.
- **SSRF pattern in n8n.ts** — the route team followed the same trust-external-URL pattern already present in `images.ts`. Without an explicit allowlist rule in AGENTS.md, this recurred. Added to anti-patterns below.
- **`example.test.ts` D grade** — placeholder tests that assert nothing about the application inflate test count without providing coverage. Delete or convert to a real smoke test.

### Anti-patterns to carry forward
- **Never `path.join` user-supplied path components without a prefix assertion** — always `path.resolve` then `assert resolved.startsWith(SAFE_DIR)`
- **Never fetch external URLs in a route without origin validation** — https-only + domain allowlist + size cap
- **Never leave concurrency fixes without a concurrent-access test** — the test must use `Promise.all` with real timing, not sequential calls
- **Never leave placeholder test files (example.test.ts) — delete them or convert them**
