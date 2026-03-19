# AGENTS.md — story-and-thumbnails campaign

**Project**: FliGen — "12 Days of Claudemas" tool-building harness
**Campaign**: story-and-thumbnails — FR-19 (Thumbnail Persistence) + FR-20 (Story Builder assembly)
**Stack**: React 19 + Vite 6 + TailwindCSS v4 | Express 5 + Socket.io | TypeScript 5.6+ | npm workspaces
**Ports**: Client 5400 | Server 5401

---

## Build & Run Commands

```bash
npm run build                            # shared → server → client (all must pass)
npm test                                 # vitest across all workspaces
npm run build -w shared && npm run build -w server   # server-only check
npm test -w server                       # server tests only
npm test -w client                       # client tests only
npm run build -w shared                  # must run before server/client builds
```

**Baseline**: build CLEAN, 38 tests passing.

---

## Directory Structure

```
server/src/
├── index.ts                          # mounts routers; add thumbnail router here (Wave 2)
├── tools/
│   ├── catalog/
│   │   ├── storage.ts                # addAsset, filterAssets, generateAssetId, generateFilename, initCatalog
│   │   └── index.ts                  # re-exports
│   └── story/
│       ├── assembler.ts              # buildFFmpegArgs() + assembleVideo() — Wave 0 fix here
│       ├── storage.ts                # saveStoryToCatalog, getStoriesFromCatalog — Wave 1 fix here
│       ├── types.ts                  # AssemblyResult, AssemblyProgress (keep); MusicConfig etc. (remove — use shared)
│       └── index.ts                  # re-exports
├── routes/
│   ├── story.ts                      # POST /assemble (fix Wave 1), GET /history (add Wave 2)
│   ├── thumbnail.ts                  # CREATE THIS in Wave 2: POST /save, GET /history
│   ├── image.ts                      # REFERENCE — follow this pattern for thumbnail.ts
│   └── video.ts                      # REFERENCE — factory pattern with socket
│
shared/src/
└── index.ts                          # Asset, AssemblyRequest, AssemblyResponse — edit in Wave 1
│
client/src/components/tools/
├── Day11StoryBuilder.tsx             # fix video src URL in Wave 1
├── Day8Thumbnail.tsx                 # wire history state in Wave 3
└── thumbnail/
    ├── ThumbnailCanvas.tsx           # no changes this campaign
    ├── ThumbnailConfig.tsx           # no changes this campaign
    ├── ThumbnailExport.tsx           # fix toBlob race (Wave 2), add Save to Catalog (Wave 3)
    ├── ThumbnailHistory.tsx          # implement in Wave 3
    └── types.ts                      # no changes this campaign
```

---

## Success Criteria (every work unit)

- [ ] `npm run build` exits 0 (all three workspaces)
- [ ] `npm test` exits 0 (38 tests minimum — do not regress)
- [ ] No TypeScript errors in modified files
- [ ] No regressions — existing behaviour unchanged
- [ ] New functionality covered by at least one test or a documented reason why testing is impractical (e.g. canvas/browser-only API)

---

## Key Data Contracts

### Asset.type (shared/src/index.ts)
After Wave 1: `'image' | 'video' | 'music' | 'narration' | 'thumbnail' | 'story'`

Stories use `type: 'story'` (not `type: 'video'` + metadata discriminator).

### AssemblyResponse (shared/src/index.ts)
After Wave 1 fix:
```typescript
export interface AssemblyResponse {
  success: boolean;
  assetUrl: string;    // served HTTP path: /assets/catalog/stories/filename.mp4
  assetId: string;     // catalog asset id — matches what getStoriesFromCatalog returns
  duration: number;
  error?: string;
  // outputPath and catalogId removed — they were wrong/broken
}
```

### Thumbnail save request (POST /api/thumbnail/save)
```typescript
{
  imageDataUrl: string;   // data:image/png;base64,... from canvas.toDataURL()
  config: ThumbnailConfig; // from thumbnail/types.ts
  label?: string;          // optional user label
}
```
Server decodes base64, writes PNG to `assets/catalog/thumbnails/`, calls `catalog.addAsset({ type: 'thumbnail', ... })`, returns `Asset`.

### Thumbnail history response (GET /api/thumbnail/history)
Returns `Asset[]` where `type === 'thumbnail'`. Uses `catalog.filterAssets({ type: 'thumbnail' })`.

---

## Reference Patterns

### Pattern: Adding a route to story.ts
```typescript
// In server/src/routes/story.ts
router.get('/history', async (_req, res) => {
  try {
    const stories = await getStoriesFromCatalog();
    res.json({ stories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
```

### Pattern: New route file (copy from image.ts pattern)
```typescript
// server/src/routes/thumbnail.ts
import { Router } from 'express';
import * as catalog from '../tools/catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';

const router = Router();

router.post('/save', async (req, res) => {
  try {
    const { imageDataUrl, config, label } = req.body;
    // decode base64, write file, add to catalog
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = catalog.generateFilename('thumbnail', 'canvas', 'generated', 'png');
    const assetsDir = path.resolve(process.cwd(), '..', 'assets');
    const filePath = path.join(assetsDir, 'catalog', 'thumbnails', filename);
    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
    const asset: Asset = {
      id: catalog.generateAssetId('thumbnail'),
      type: 'thumbnail',
      filename,
      url: `/assets/catalog/thumbnails/${filename}`,
      provider: 'canvas',
      model: 'generated',
      prompt: label || 'Canvas thumbnail',
      status: 'ready',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      estimatedCost: 0,
      generationTimeMs: 0,
      metadata: { config },
    };
    await catalog.addAsset(asset);
    res.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/history', async (_req, res) => {
  try {
    const assets = await catalog.filterAssets({ type: 'thumbnail' });
    res.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
```

### Pattern: Mounting a new router in index.ts
```typescript
// Find the existing router imports and mounts in server/src/index.ts
import thumbnailRouter from './routes/thumbnail.js';
// ...
app.use('/api/thumbnail', thumbnailRouter);
```

### Pattern: Path traversal fix for resolveAssetPath
```typescript
const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');

function resolveAssetPath(assetUrl: string): string {
  // Strip the /assets/ prefix to get relative path
  const relativePath = assetUrl.replace(/^\/assets\//, '');
  const resolvedPath = path.resolve(ASSETS_DIR, relativePath);
  // SECURITY: ensure resolved path stays inside ASSETS_DIR
  if (!resolvedPath.startsWith(ASSETS_DIR + path.sep)) {
    throw new Error(`Path traversal detected: ${assetUrl}`);
  }
  return resolvedPath;
}
```
Extract to module scope. Call from both `assembleVideo` and `buildFFmpegArgs` (currently each has its own inline copy).

### Pattern: Promisify canvas.toBlob (fixes unmount race)
```typescript
// WRONG — callback fires after finally block
canvas.toBlob(async (blob) => {
  // ... use blob
});
// finally runs here — too early

// CORRECT — await the blob
const blob = await new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))));
});
// finally runs after blob is fully handled
```

### Pattern: initCatalog subdirectory pre-creation
```typescript
// In server/src/tools/catalog/storage.ts — initCatalog()
const subdirs = ['images', 'videos', 'music', 'narration', 'thumbnails', 'stories'];
// Add 'stories' alongside existing 'thumbnails'
await Promise.all(
  subdirs.map((dir) => fs.mkdir(path.join(assetsDir, 'catalog', dir), { recursive: true }))
);
```

---

## ThumbnailHistory Component Spec (Wave 3)

```typescript
export interface ThumbnailHistoryProps {
  assets: Asset[];               // passed from Day8Thumbnail.tsx state
  onSelect: (asset: Asset) => void; // optional: restore config from history item
}

export function ThumbnailHistory({ assets, onSelect }: ThumbnailHistoryProps) {
  if (assets.length === 0) return <p>No saved thumbnails yet.</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((asset) => (
        <img
          key={asset.id}
          src={asset.url}
          onClick={() => onSelect(asset)}
          className="cursor-pointer rounded border border-slate-700 hover:border-blue-400"
        />
      ))}
    </div>
  );
}
```

Day8Thumbnail.tsx holds `historyAssets: Asset[]` state, fetches from `/api/thumbnail/history` on mount and after each save. Passes to `<ThumbnailHistory assets={historyAssets} />`. ThumbnailExport receives `onSave` callback that triggers the refresh.

---

## Type Locations — Where Things Live

| Type | File | Note |
|---|---|---|
| `Asset`, `AssetCatalog` | `shared/src/index.ts` | Canonical — never redefine |
| `AssemblyRequest`, `AssemblyResponse` | `shared/src/index.ts` | HTTP contract — client + server |
| `MusicConfig`, `NarrationConfig` | `shared/src/index.ts` | Also duplicated in story/types.ts — remove from local after Wave 0 |
| `AssemblyResult` | `server/src/tools/story/types.ts` | Internal assembler result — keep local |
| `AssemblyProgress` | `server/src/tools/story/types.ts` | Internal progress type — keep local |
| `ThumbnailConfig` | `client/src/components/tools/thumbnail/types.ts` | Client-only — no server equivalent needed |

---

## Anti-Patterns to Avoid

### Inherited from fix-blockers campaign

- **Never `path.join` user-supplied path components without a prefix assertion** — always `path.resolve` then assert `resolvedPath.startsWith(ASSETS_DIR + path.sep)`
- **Never fetch external URLs in a route without origin validation** — https-only + domain allowlist + size cap. The n8n route already violates this — do not copy its pattern.
- **Never leave concurrency fixes without a concurrent-access test** — tests must use `Promise.all`, not sequential calls
- **Never leave placeholder test files** — delete or replace with real tests
- **Do not use `exec` or `execAsync`** in assembler.ts — only `execFileAsync`

### New for this campaign

- **Do not use `outputPath` from AssemblyResult as a client-facing URL** — it is a relative filesystem path that gets moved by saveStoryToCatalog. Use `asset.url` from the returned catalog Asset instead.
- **Do not use `canvas.toBlob` with a raw callback in async functions** — always promisify and await. See Pattern above.
- **Do not let Day11StoryBuilder filter assets by `type === 'video'`** for its video dropdown — after Wave 1, assembled stories have `type: 'story'`. The dropdown should filter `type === 'video'` only, which correctly excludes assembled stories.
- **Do not hardcode `http://localhost:5401`** when a constant or env var is available. Note: existing hardcoded URLs are a known debt item — do not add new ones, but do not refactor existing ones unless you're already in that file.
- **Do not redefine types that already exist in shared** — import from `@fligen/shared`. Check before creating local interfaces.
- **Do not skip `npm run build -w shared` before building server/client** — shared changes break dependent workspaces silently if not rebuilt first.

---

## Quality Gates

- `npm run build` exits 0 before marking any work unit complete
- `npm test` exits 0 before marking any work unit complete
- 38 tests remain passing after every wave (do not regress)
- No TypeScript errors (`tsc --noEmit` passes in all workspaces)
- Wave dependencies respected: Wave N cannot start until Wave N-1 is complete and quality gates pass

---

## Learnings (Inherited from fix-blockers)

### What works well in this codebase
- **Wave gating** prevents conflicts on shared files — index.ts and shared/index.ts are touched by multiple work units; wave ordering prevents races
- **Pure-function extraction first** — makes security/correctness fixes easy to test in isolation (buildFFmpegArgs pattern)
- **Route factory pattern** with socket param handles Socket.io broadcast cleanly — video.ts is the reference
- **enqueueWrite** serialises all catalog mutations — all new catalog writes must go through `catalog.addAsset()`, never write index.json directly

### Anti-patterns that surfaced unexpectedly
- **Path traversal missed during implementation** — `path.join` with user input does not canonicalize. Always `path.resolve` + prefix check.
- **Concurrency fix without concurrency test** — a `Promise.all([addAsset(), addAsset()])` test was not written for the write queue. Add one when writing catalog tests.
- **SSRF via trusted external URLs** — n8n.ts fetches arbitrary webhook URLs. Do not repeat this pattern in any new route.
- **Broken client video URL** — assembler returns a pre-move filesystem path; saveStoryToCatalog moves the file. Client must use catalog asset.url, not result.outputPath.
- **Wrong catalog type discriminator** — using `type: 'video'` + `metadata.type: 'story'` makes filtering impossible via the catalog API. Always use the correct type field.
