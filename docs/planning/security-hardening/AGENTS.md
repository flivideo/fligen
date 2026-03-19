# AGENTS.md — security-hardening campaign

**Project**: FliGen — "12 Days of Claudemas"
**Campaign**: security-hardening — Fix 3 BLOCKERs + 2 MAJORs + test gaps surfaced by quality audit
**Stack**: React 19 + Vite 6 + TailwindCSS v4 | TypeScript 5.6+ | Express 5 + Node.js
**Ports**: Client 5400 | Server 5401

---

## Build & Run Commands

```bash
npm run build                            # shared → server → client
npm run build -w server                  # server only
npm run build -w client                  # client only
npm test                                 # must exit 0; ≥42 tests passing
```

**Baseline**: build CLEAN, 42 tests passing (38 server + 4 client).
**Target**: build CLEAN, ≥42 tests passing (new tests added, none removed).

---

## Directory Structure

```
server/src/
├── tools/catalog/storage.ts            # fix-delete-asset-path — TYPE_DIRS lookup
├── tools/story/assembler.ts            # fix-outputname-sanitise — strip unsafe chars
├── routes/story.ts                     # fix-ffmpeg-volume-injection — validate at route
├── routes/n8n.ts                       # fix-n8n-ssrf — URL prefix validation
└── __tests__/
    ├── example.test.ts                 # replace-example-test — real smoke test
    ├── assembler.test.ts               # add-assembler-tests — path-traversal + guards
    └── catalog.test.ts                 # add-catalog-tests — concurrent write + rename

client/src/components/tools/aspect-ratio/
├── useCalculator.ts                    # fix-gcd-divide-by-zero — guard dimsToRatio
├── Calculator.tsx                      # fix-gcd-divide-by-zero — clamp change handlers
└── VisualPreview.tsx                   # fix-visual-preview-label — use computedRatio.ratio
```

---

## Fix Reference — What to Change and Where

### fix-delete-asset-path (`server/src/tools/catalog/storage.ts` line 125)

**Problem**: `asset.type + 's'` produces `storys` for story assets — file never deleted, disk fills silently.

**Fix**: Replace with a lookup map before the `path.join` call:

```typescript
const TYPE_DIRS: Record<Asset['type'], string> = {
  image: 'images',
  video: 'videos',
  music: 'music',
  narration: 'narration',
  thumbnail: 'thumbnails',
  story: 'stories',
};

// line 125 — replace:
const filePath = path.join(CATALOG_DIR, asset.type + 's', asset.filename);
// with:
const filePath = path.join(CATALOG_DIR, TYPE_DIRS[asset.type], asset.filename);
```

Place `TYPE_DIRS` at module scope (after the `CATALOG_DIR` constant, before `initCatalog`).

---

### fix-ffmpeg-volume-injection (`server/src/routes/story.ts`)

**Problem**: `music.volume` and `narration.volume` from `req.body` flow directly into FFmpeg `filter_complex` string (`volume=${music.volume}`) — a caller can inject arbitrary filter nodes.

**Fix**: Add validation before calling `assembleVideo`. Do this in the route handler, NOT in the assembler:

```typescript
function clampVolume(v: unknown): number {
  const n = Number(v);
  if (!isFinite(n)) throw new Error('volume must be a finite number');
  return Math.min(2, Math.max(0, n));
}

function assertFiniteNumber(v: unknown, name: string): number {
  const n = Number(v);
  if (!isFinite(n)) throw new Error(`${name} must be a finite number`);
  return n;
}
```

Apply before passing `assemblyRequest` to `assembleVideo`:

```typescript
const assemblyRequest = req.body as AssemblyRequest;

// Validate volumes (BLOCKER: prevents FFmpeg filter injection)
if (assemblyRequest.music) {
  assemblyRequest.music.volume = clampVolume(assemblyRequest.music.volume);
  if (assemblyRequest.music.startTime !== undefined)
    assemblyRequest.music.startTime = assertFiniteNumber(assemblyRequest.music.startTime, 'music.startTime');
  if (assemblyRequest.music.endTime !== undefined)
    assemblyRequest.music.endTime = assertFiniteNumber(assemblyRequest.music.endTime, 'music.endTime');
}
if (assemblyRequest.narration?.volume !== undefined) {
  assemblyRequest.narration.volume = clampVolume(assemblyRequest.narration.volume);
}
if (assemblyRequest.targetDuration !== undefined) {
  assemblyRequest.targetDuration = assertFiniteNumber(assemblyRequest.targetDuration, 'targetDuration');
}
```

These helpers can be defined as module-level functions in `routes/story.ts`.

---

### fix-n8n-ssrf (`server/src/routes/n8n.ts`)

**Problem**: `data.image1`, `data.image2`, `data.video` are URLs from an external webhook — fetched without validation. Enables SSRF to internal services or `file://` reads.

**Fix**: Add a URL validation helper and call it before every `fetch()`:

```typescript
function assertHttpsUrl(url: string, field: string): void {
  if (!url.startsWith('https://')) {
    throw new Error(`${field} must be an https:// URL`);
  }
}
```

Apply before each fetch block:

```typescript
if (data.image1) {
  assertHttpsUrl(data.image1, 'data.image1');
  const imageBuffer = await fetch(data.image1).then((r) => r.arrayBuffer());
  // ...
}
if (data.image2) {
  assertHttpsUrl(data.image2, 'data.image2');
  // ...
}
if (data.video) {
  assertHttpsUrl(data.video, 'data.video');
  // ...
}
```

Place `assertHttpsUrl` at module scope (top of file, near other helpers).

**Important**: `routes/n8n.ts` is a large file. Read it entirely before editing to understand the structure. The fetch calls appear inside a nested function/handler — find all three by searching for `.then((r) => r.arrayBuffer())`.

---

### fix-outputname-sanitise (`server/src/tools/story/assembler.ts` lines 63–66)

**Problem**: `request.outputName` is used directly in the output filename. A value like `../../etc/cron.d/evil` could write outside `VIDEO_SCENES_DIR`.

**Fix**: Sanitise before use (lines 63–66):

```typescript
// Sanitise outputName — strip path separators and limit to safe characters
const rawOutputName = request.outputName ?? '';
const safeOutputName = rawOutputName.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100) || 'story';

const outputName = `${safeOutputName}-${timestamp}.mp4`;
```

Replace the existing block:
```typescript
// BEFORE (lines 63–66):
const outputName = request.outputName
  ? `${request.outputName}-${timestamp}.mp4`
  : `story-${timestamp}.mp4`;
```

---

### fix-gcd-divide-by-zero (`client/src/components/tools/aspect-ratio/useCalculator.ts` + `Calculator.tsx`)

**Problem**: `gcd(0, 0)` returns 0; `dimsToRatio(0, any)` produces NaN ratio and crashes the display. `min={1}` HTML attribute is advisory only.

**Fix in `useCalculator.ts`** — guard `dimsToRatio`:

```typescript
export function dimsToRatio(width: number, height: number): { ratio: string; decimal: number } {
  if (!width || !height) return { ratio: 'N/A', decimal: 0 };
  const d = gcd(width, height);
  return { ratio: `${width / d}:${height / d}`, decimal: parseFloat((width / height).toFixed(3)) };
}
```

**Fix in `Calculator.tsx`** — clamp change handlers to reject <= 0:

```typescript
onChange={e => {
  const v = Number(e.target.value);
  if (v > 0) onWidthChange(v);
}}
```

Apply same pattern to the height input's `onChange`.

---

### fix-visual-preview-label (`client/src/components/tools/aspect-ratio/VisualPreview.tsx`)

**Problem**: Line 38 shows `{width}:{height}` as the ratio label — displays `1920:1080` instead of the simplified `16:9`. Wrong domain semantics.

**Fix**: Add `computedRatio: { ratio: string; decimal: number }` to the Props interface and use it in the label:

```typescript
interface Props {
  width: number;
  height: number;
  computedRatio: { ratio: string; decimal: number };
}

// In JSX, replace:
// Ratio: <span className="text-yellow-400 font-semibold">{width}:{height}</span>
// · Decimal: <span className="text-yellow-400 font-semibold">{(width / height).toFixed(3)}</span>
// With:
// Ratio: <span className="text-yellow-400 font-semibold">{computedRatio.ratio}</span>
// · Decimal: <span className="text-yellow-400 font-semibold">{computedRatio.decimal}</span>
```

Then update `Day16AspectRatio.tsx` to pass `computedRatio={calc.computedRatio}` to `<VisualPreview>`.

---

### replace-example-test (`server/src/__tests__/example.test.ts`)

**Problem**: File contains one tautological assertion (`typeof process.version === 'string'`). Grade D. Zero regression protection.

**Fix**: Replace entirely with a real server smoke test:

```typescript
import { describe, it, expect } from 'vitest';

describe('Server smoke test', () => {
  it('process.env is available', () => {
    expect(typeof process.env).toBe('object');
  });

  it('Node.js version is v18+', () => {
    const major = parseInt(process.version.slice(1), 10);
    expect(major).toBeGreaterThanOrEqual(18);
  });
});
```

Keep it simple — a test that exercises something real about the runtime environment. Do not add HTTP server tests (too complex for this work unit — the server isn't imported in tests).

---

### add-assembler-tests (`server/src/__tests__/assembler.test.ts`)

Read the existing file first. Add these tests to the existing `describe` blocks (or new nested `describe` blocks):

**1. Path-traversal rejection:**
```typescript
describe('resolveAssetPath (via buildFFmpegArgs)', () => {
  it('throws on path traversal in video path', () => {
    expect(() =>
      buildFFmpegArgs(
        { videos: ['/../../../etc/passwd'], music: { file: '/assets/music/x.mp3', volume: 0.8 }, targetDuration: 5 },
        '/tmp/out.mp4'
      )
    ).toThrow(/path traversal/i);
  });
});
```

**2. `assembleVideo` entry guards (these require mocking `execFile` — check existing mock pattern first):**

Actually `assembleVideo` calls `fs.existsSync`, `execFileAsync`, etc. The existing tests focus on `buildFFmpegArgs` (pure function). Add pure-function guard tests where possible. The validation in `assembleVideo` re-runs `buildFFmpegArgs` internally, so the path-traversal test above via `buildFFmpegArgs` covers that path.

Add these to the `buildFFmpegArgs` describe block:
```typescript
it('throws when music file has path traversal', () => {
  expect(() =>
    buildFFmpegArgs(
      { videos: ['/assets/videos/a.mp4'], music: { file: '/../../../etc/passwd', volume: 0.8 } },
      '/tmp/out.mp4'
    )
  ).toThrow(/path traversal/i);
});
```

---

### add-catalog-tests (`server/src/__tests__/catalog.test.ts`)

Read the existing file first. Add to the existing test suite:

**1. Concurrent write queue serialisation:**
```typescript
it('serialises concurrent addAsset calls — both assets persist', async () => {
  const asset1 = makeAsset('image', 'concurrent-1.png');
  const asset2 = makeAsset('image', 'concurrent-2.png');

  // Fire both simultaneously — write queue must serialize
  await Promise.all([addAsset(asset1), addAsset(asset2)]);

  const catalog = await loadCatalog();
  const ids = catalog.assets.map((a) => a.id);
  expect(ids).toContain(asset1.id);
  expect(ids).toContain(asset2.id);
});
```

Use whatever `makeAsset` helper already exists in the file (or create a minimal one that returns a valid `Asset` object).

**2. `deleteAsset` TYPE_DIRS — correct directory used:**
After the fix lands, add a test that verifies the file path built for deletion is correct. This requires checking the mock call args. Look at how existing mock patterns work in the file.

If `fs.unlink` is already mocked, assert it was called with a path containing `stories/` (not `storys/`) for a story asset.

---

## Anti-Patterns to Avoid

- Do NOT add a domain allowlist for N8N URLs — CDN hostnames vary too much; `https://` prefix is sufficient for a local dev tool
- Do NOT move validation into `assembler.ts` — validate at the route boundary (`routes/story.ts`), not deep in the assembler
- Do NOT change `AssemblyRequest` types in `shared/src/index.ts` — the types are correct; only the runtime validation is missing
- Do NOT use `Number()` without an `isFinite` check — `Number('abc')` returns `NaN`, `Number(Infinity)` returns `Infinity`; both bypass the clamp
- Do NOT skip reading the target file before editing — `n8n.ts` is large; editing blindly will introduce conflicts
- Do NOT break existing tests — read the test file before adding to ensure mock patterns match
- Do NOT use `import React` in TSX files — the project uses React JSX automatic transform; explicit imports produce TS6133 errors

---

## Test Patterns

```typescript
// Vitest imports used in this project
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// fs mock pattern (already established in catalog.test.ts — inherit it)
vi.mock('fs/promises', () => ({ ... }));

// makeAsset helper pattern — look for it in catalog.test.ts and reuse
```

---

## Quality Gates

- `npm run build -w server` exits 0
- `npm run build -w client` exits 0
- `npm test` exits 0 with ≥42 passing (new tests increase the count)
- `deleteAsset` for a `story` type builds path with `stories/` not `storys/`
- `routes/story.ts` rejects `{ music: { volume: '1,aevalsrc=0[music]' } }` with an error before reaching FFmpeg
- `routes/n8n.ts` rejects `data.image1 = 'file:///etc/passwd'` with an error
- `dimsToRatio(0, 1080)` returns `{ ratio: 'N/A', decimal: 0 }` without throwing
- `VisualPreview` displays `16:9` not `1920:1080` for a 1920×1080 input

---

## Learnings (from prior campaigns)

- **React JSX automatic transform** — do NOT write `import React from 'react'` in TSX files; produces TS6133 unused-import errors
- **path.resolve + startsWith for traversal** — `path.join` does not canonicalize; always `path.resolve` first then assert prefix includes `path.sep` (e.g. `ASSETS_DIR + path.sep`)
- **enqueueWrite serialises writes** — `addAsset`, `updateAsset`, `deleteAsset` all go through `enqueueWrite`; reads (`getAsset`, `filterAssets`) do not — this is by design
- **Asset.type is the correct discriminator** — do not use `metadata.type` for filtering; use `asset.type` directly
- **catalog/stories/ pre-created** — `initCatalog` pre-creates all subdirs including `stories/`; no lazy mkdir needed
- **Wave file conflict discipline** — before launching parallel agents, list every file each agent touches; abort parallelism if any two agents share a file
- **assembler.test.ts tests `buildFFmpegArgs` (pure function)** — `assembleVideo` is not unit tested (needs `execFile` mock); add pure-function tests to `buildFFmpegArgs` describe block
