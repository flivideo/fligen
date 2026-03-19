# Assessment — fix-blockers campaign
_Completed: 2026-03-19_

## Summary

All 6 work units delivered. Build clean. Test count: 38 (was 8). The primary security and structural blockers preventing the `story-and-thumbnails` campaign are resolved. Two new issues surfaced by the quality audit require attention before that campaign ships.

---

## Work Units Delivered

| ID | Title | Result |
|---|---|---|
| B027 | fix-catalog-write-queue | `enqueueWrite` helper serialises all mutating ops in storage.ts |
| B028 | fix-assembler-shell-injection | `buildFFmpegArgs()` returns `string[]`; `execFileAsync` used throughout |
| B029 | fix-pid-validation | `parseInt` + `isNaN` guard; `process.kill()` replaces shell `kill -9` |
| B030 | extract-routes | `index.ts` 1,487 → 197 lines; 10 route files in `server/src/routes/` |
| B031 | split-day8-thumbnail | `Day8Thumbnail.tsx` 1,577 → 168 lines; 5 sub-components in `thumbnail/` |
| B032 | add-behaviour-tests | 18 new tests; total 38 passing; `assembler.test.ts` + `catalog.test.ts` created |

---

## Code Quality Audit Results

### Grades

| File / Layer | Grade | Reason |
|---|---|---|
| `server/src/tools/catalog/storage.ts` | B | Write queue correct; `deleteAsset` silently ignores file-delete errors; `generateFilename` millisecond collision risk; no schema validation on catalog load |
| `server/src/tools/story/assembler.ts` | C | **Path traversal**: user-controlled paths only stripped of `/assets/` prefix — `../../etc/passwd` still resolves outside assets tree; sync FS calls block event loop; `resolveAssetPath` duplicated |
| `server/src/index.ts` | C | `cleanupPort` still uses `execSync('lsof -ti:${port}')` — shell injection if PORT ever comes from untrusted input; `execSync('sleep 0.5')` blocks event loop; `50mb` JSON limit is a DoS vector |
| `client/src/components/tools/Day8Thumbnail.tsx` | B | Clean orchestration shell; module-level singleton initialState risk on reset |
| `client/src/components/tools/thumbnail/` | B | `toBlob` fire-and-forget race (acknowledged TODO); hard-coded `http://localhost:5401` will break non-local envs |
| `server/src/routes/story.ts` | B | No input validation before `assembleVideo`; conflated error paths in try/catch |
| `server/src/routes/catalog.ts` | B | Rename has TOCTOU gap (two separate enqueued ops); `id` param unsanitised |
| `server/src/routes/image.ts` | A | Minimal, well-validated, consistent error handling |
| `server/src/routes/images.ts` | B | `imageUrl` not validated — `file://` SSRF risk |
| `server/src/routes/video.ts` | A | Clean factory pattern; validation present |
| `server/src/routes/music.ts` | B | Falsy `audioData` passed silently; dedup missing on migration |
| `server/src/routes/tts.ts` | B | `voiceId` not validated against allowlist |
| `server/src/routes/widgets.ts` | B | `params` passed directly to renderer — template injection surface |
| `server/src/routes/projects.ts` | B | `projectCode` in FS ops; double `loadProject` race on line 174 |
| `server/src/routes/n8n.ts` | C | **SSRF**: fetches arbitrary URLs from webhook response and writes to disk; debug file written on every request |
| `server/src/routes/batch.ts` | C | Unguarded `JSON.parse(row.metadata)` crashes whole upload; in-memory queue grows unboundedly |

### Top 5 Issues from Code Audit

**BLOCKER 1 — Path traversal in `assembler.ts:31–35` (`resolveAssetPath`)**
User-controlled URL → strip `/assets/` prefix → `path.join(ASSETS_DIR, relativePath)`. A path like `../../etc/passwd` escapes the assets tree. Fix: `path.resolve` + prefix assertion. Must fix before `story-and-thumbnails` ships (this function's call surface expands directly).

**BLOCKER 2 — SSRF + arbitrary file write in `n8n.ts:154–220`**
Server fetches URLs returned by external N8N webhook with no origin validation. An attacker controlling the webhook response can hit cloud metadata endpoints or exhaust disk. Fix: https-only + domain allowlist + size cap.

**MAJOR 3 — Event-loop blocking in `index.ts:152–165` and `assembler.ts:68–70`**
`execSync('sleep 0.5')` and sync FS calls on the main thread. Fix: async equivalents.

**MAJOR 4 — Unguarded `JSON.parse` in `batch.ts:184`**
One bad CSV row crashes the whole upload. Fix: try/catch with fallback to `{}`.

**MAJOR 5 — `toBlob` fire-and-forget race in `ThumbnailExport.tsx:76–87`**
`finally` block re-enables export button before blob callback fires; state update on unmounted component. Fix: promisify `toBlob` and await it.

---

## Test Quality Audit Results

### Grades

| Test File | Grade | Reason |
|---|---|---|
| `assembler.test.ts` | B | Good behaviour naming; shell-injection fix correctly tested; missing music trim args, `enableZoom` branch, `assembleVideo` validation paths |
| `catalog.test.ts` | C | **Critical gap: write-queue serialisation entirely untested**; `rename()` mock is silent no-op; `updateAsset` and `deleteAsset` absent |
| `example.test.ts` | D | Single `typeof process.version` assertion; protects zero application behaviour |

### Top 5 Missing Behaviour Tests

1. **Concurrent `addAsset` calls do not corrupt the catalog** — the write-queue fix has no concurrency test; a future simplification would silently regress
2. **`updateAsset` merges correctly** — spread merge could be broken without detection; story-and-thumbnails calls this to flip status
3. **`assembleVideo` input validation returns structured error** — not a throw — compound tool depends on this contract
4. **`saveStoryToCatalog` file-move asserts correct paths** — `rename()` mock is a no-op; file could land anywhere silently
5. **Music trim args (`-ss`/`-to`) ordering in FFmpeg args** — positional error produces wrong output with no exception

### Zero Tolerance
No `.skip`, `.only`, `.retry()`, or environment-conditional guards found.

### Regression Verdict
**No** — the suite would not reliably catch a regression in the core data pipeline. The write-queue serialisation (the critical fix from this campaign) has zero test coverage. `example.test.ts` should be deleted or converted to a real integration smoke test.

---

## Readiness for story-and-thumbnails

**Conditionally ready.** The structural blockers (B027–B032) are resolved. Two new issues must be addressed:

| Issue | Must fix before campaign ships? |
|---|---|
| Path traversal in `resolveAssetPath` (assembler.ts) | **Yes** — call surface expands directly |
| SSRF in `n8n.ts` | Strongly advisable — same trust-external-URL pattern will recur |
| Write-queue concurrency test missing | Yes — add before any concurrent catalog feature |
| `example.test.ts` zero coverage | Yes — delete or replace |

Everything else is scheduled debt that won't block the campaign.

---

## Scheduled Debt Carried Forward

- `storage.ts`: full catalog parsed from disk on every read — needs in-memory cache with dirty flag at scale
- `storage.ts:124`: `deleteAsset` silently swallows file-delete errors
- `storage.ts:148`: `generateFilename` millisecond collision risk under batch load
- `ThumbnailCanvas.tsx:99`: `getContext('2d')!` non-null assertion without fallback
- `ThumbnailConfig.tsx:261,267`: hard-coded `http://localhost:5401` — needs shared `API_BASE_URL` constant
- `catalog.ts route:56–60`: rename TOCTOU gap between two `enqueueWrite` calls
- `n8n.ts:87–88`: debug payload file written on every request with no flag or cleanup
- `batch.ts:15`: upload dir from `process.cwd()` — fragile if CWD varies
- `batch.ts` queue: no TTL/eviction, grows unboundedly
- `query/catalog.ts:47–48`: `limit` not clamped — caller can request unlimited catalog serialisation
