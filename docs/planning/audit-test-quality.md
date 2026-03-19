# Test Quality Audit — FliGen

**Date:** 2026-03-19
**Auditor role:** Senior Test Engineer
**Scope:** All non-node_modules test files in `client/` and `server/`
**Upcoming campaigns:** Story Builder (FR-20, FFmpeg pipeline) + Thumbnail Persistence (FR-19, catalog save pattern)

---

## 1. Test File Grades

| File | Grade | Reason |
|------|-------|--------|
| `client/src/components/ui/__tests__/StatusIndicator.test.tsx` | C | Covers only text presence and dot visibility; never asserts the colour applied per status type, which is the component's only meaningful differentiator |
| `server/src/__tests__/example.test.ts` | D | Two arithmetic/string identity assertions with no production code under test; the commented-out health check is the actual suite the file was meant to be |

**Total project test files: 2**
**Production source modules with zero test coverage: all of them (dozens of modules)**

---

## 2. Detailed File Analysis

### `StatusIndicator.test.tsx` — Grade C

**What it tests:**
- Label text is rendered (trivially true if the component renders at all)
- A `.rounded-full` element is present when `showDot` is `true` (default)
- The `.rounded-full` element is absent when `showDot={false}`
- The label text changes when the `status` prop cycles through all four values

**What it does NOT test:**
- That each `StatusType` value produces a distinct colour. `statusColors` maps four values to four CSS variables. If the mapping were completely wrong (e.g. `success` and `error` swapped) no test would fail.
- That an unknown/invalid status value does not silently produce `undefined` as a colour (which would render an invisible label).
- That `aria-hidden="true"` is present on the dot span (accessibility contract).
- That the `style` attribute on the label span actually carries `color: <value>` (structural assertion gap).

**Assertion quality:** The `renders different status types` test only checks text presence. Deleting the entire `statusColors` map from production code would not cause any test to fail. This is the defining weakness.

**Structural quality:** AAA pattern is loosely followed. Tests are isolated. No zero-tolerance violations.

---

### `server/src/__tests__/example.test.ts` — Grade D

**What it tests:** `1 + 1 === 2` and `'hello' === 'hello'`. These assert JavaScript itself, not FliGen production code.

**Zero-tolerance concern:** The commented-out block (`// TODO: Add integration tests`) constitutes an explicit acknowledgement that real tests were planned and never written. The file's presence creates false confidence in CI: the server test suite "passes" while covering exactly zero server behaviours.

**Assertion quality:** Zero. No production function is called. No import from `src/` beyond the test framework.

**The placeholder pattern is the worst kind:** it passes CI, appears in coverage reports, and actively misleads contributors into believing server tests exist.

---

## 3. Coverage by Module (Production Code vs Tests)

The following production modules have **zero test coverage**:

| Module | Regression Risk |
|--------|-----------------|
| `tools/story/assembler.ts` — `buildFFmpegCommand()` | **Critical** — FR-20 core, complex branching (zoom, fade, narration mixing), no test |
| `tools/story/storage.ts` — `saveStoryToCatalog()` | **Critical** — FR-19/FR-20 catalog save, file rename + metadata persistence |
| `tools/catalog/storage.ts` — full CRUD + `filterAssets()` | **Critical** — every downstream tool depends on catalog correctness |
| `tools/shots/storage.ts` — `addShot()`, `generateShotId()`, `detectImageFormat()` | High |
| `tools/batch/csv.ts` — `parseCsv()`, `filterActiveRows()`, `updateCsv()` | High |
| `tools/batch/cost.ts` — `estimateCost()` | High |
| `tools/batch/queue.ts` — `createJob()`, `processJob()` | High |
| `server/src/index.ts` — all API route handlers | High |
| `tools/widgets/storage.ts` — `generateWidgetId()`, `extractPreview()` | Medium |
| `client/src/` — all React components, hooks, contexts | Medium–High |

---

## 4. Top 5 Missing Behaviour Tests (Ranked by Regression Risk)

### #1 — FFmpeg command builder correctness (FR-20, Story Builder)
**Regression risk:** Critical

`buildFFmpegCommand()` in `assembler.ts` is a pure function that constructs a shell command string. It has complex conditional branches:
- Music trim with `-ss`/`-to` only when `startTime`/`endTime` are defined
- `tpad` freeze + `zoompan` Ken Burns effect only when `targetDuration > 0` AND `enableZoom`
- Narration `amix` vs bare `anull` passthrough based on `narration.enabled`
- `afade` only when `enableFadeOut && targetDuration > 2`
- `-shortest` vs `-t ${targetDuration}` output duration control

None of these branches have a test. The function is pure (no side effects, takes a request and returns a string) — ideal for unit testing. If any branch were deleted or the filter-graph label stitching were broken, the assembled video would either fail silently (FFmpeg error swallowed by the catch-and-return-false block) or produce a video with no audio, no zoom, or wrong duration. No test would catch it.

**What to test:** Assert the exact shape of the returned command string for: (a) 1 video + music only, (b) 3 videos + music + narration, (c) targetDuration + enableZoom, (d) enableFadeOut, (e) music with startTime/endTime trim.

---

### #2 — Catalog `saveStoryToCatalog()` persistence contract (FR-19/FR-20)
**Regression risk:** Critical

`saveStoryToCatalog()` renames a file from `video-scenes/` into `catalog/stories/`, constructs an `Asset` record, and calls `catalog.addAsset()`. If `fs.rename` fails (e.g. cross-device move), or if the asset ID format changes, or if required metadata fields are omitted, the story catalog entry will be corrupt or absent. There is no test asserting:
- The asset added to the catalog has `type: 'video'` and `metadata.type: 'story'` (required for `getStoriesFromCatalog()` to find it again).
- The `url` field matches the new path under `catalog/stories/`.
- A failed `fs.rename` returns `success: false` rather than throwing an unhandled rejection.

**What to test:** Use a temp directory fixture. Call `saveStoryToCatalog()` with a known `AssemblyResult` and `AssemblyRequest`. Assert the returned asset has the correct `type`, `url`, `metadata.sourceVideos`, and that the file no longer exists at the old path.

---

### #3 — Catalog `filterAssets()` correctness (underpins FR-16, FR-17, FR-19)
**Regression risk:** Critical

`filterAssets()` is called by the music library endpoint, the query API, and story retrieval. It filters by `type`, `provider`, `status`, `tags`, `startDate`, and `endDate`. The tag filter uses `Array.every()` which means **all tags must be present** — a behaviour that could easily be reversed to `some` by a refactor. The date filter is a simple string compare which works only if dates are ISO-8601 and consistent. There is no test for any filter combination. An incorrect filter would cause the music library to show all assets, the catalog browser to return wrong results, or story videos to disappear from the story list.

**What to test:** Unit test with an in-memory asset array. Assert: (a) `type: 'music'` returns only music assets, (b) multi-tag filter requires all tags, (c) date range boundaries are inclusive/exclusive as intended, (d) combined filters compose correctly (AND semantics).

---

### #4 — Shot ID sequential generation (`generateShotId()`) and index persistence
**Regression risk:** High

`generateShotId()` parses existing IDs (`shot-001` → 1), takes `Math.max`, and increments. If the index is empty it starts at 1. If any ID is malformed (e.g. `shot-abc`) `parseInt` returns `NaN` and `Math.max` returns `NaN`, producing `shot-NaN001`. After `addShot()` the new shot must appear in `listShots()`. After `removeShot()` the shot must be gone and its file deleted. None of this is tested. A regression that duplicates IDs would silently corrupt the shot list and break video generation (two shots with the same ID = non-deterministic selection).

**What to test:** Unit test `generateShotId()` with: empty index, one existing shot, non-contiguous IDs. Integration test: add → list (appears), remove → list (gone), remove non-existent ID (returns false).

---

### #5 — CSV `filterActiveRows()` and `updateCsv()` batch pipeline (FR-25)
**Regression risk:** High

The batch CSV pipeline is: parse → filter `a=1` → generate → mark `a=9` on completed rows. `filterActiveRows()` is a one-liner but it is the gate that controls which prompts are submitted for expensive API calls. If the filter condition were changed from `=== '1'` to `== 1` (loose equality), all rows with truthy values would be activated. `updateCsv()` mutates `a` to `'9'` on completed filenames — if the filename matching uses strict equality and a trailing space crept in from CSV parsing, completed rows would not be marked. The entire deduplication of "don't re-generate already done images" depends on these two functions. Neither is tested.

**What to test:** `filterActiveRows`: rows with `a='1'`, `a='0'`, `a='9'`, `a=''`. `updateCsv`: write a temp CSV, call `updateCsv`, re-parse the output file, assert completed IDs have `a='9'` and incomplete IDs retain `a='1'`. Assert the output path follows the `_updated.csv` naming convention.

---

## 5. Zero Tolerance Checklist

| Item | Status |
|------|--------|
| `it.skip` / `describe.skip` | Not found |
| `it.only` / `describe.only` | Not found |
| `.retry()` calls | Not found |
| Environment-conditional guards (`if (process.env.CI)`) | Not found |
| Commented-out test stubs presented as passing suite | **PRESENT** — `server/src/__tests__/example.test.ts` lines 14–24 |

The commented-out block is not a `.skip` violation but it is a first-class zero-tolerance concern: a placeholder file that passes CI while the `TODO` comment documents that the suite was never written.

---

## 6. Regression Verdict

**Would this test suite catch a regression in the core data pipeline?**

No. Not a single regression in any production code path would be detected by the current test suite.

The two existing test files cover:

1. A pure presentational component's text rendering and dot visibility — not its colour logic.
2. Arithmetic identities in the JavaScript runtime — no production code.

**Unprotected behaviours (sample, not exhaustive):**

- `buildFFmpegCommand()` generating an invalid filter graph → FFmpeg fails or produces silent/mono output. **Not caught.**
- `saveStoryToCatalog()` writing an asset with wrong `metadata.type` → `getStoriesFromCatalog()` returns empty list, story catalog shows nothing. **Not caught.**
- `filterAssets({ type: 'music' })` returning all assets instead of music only → music library shows images and videos. **Not caught.**
- `generateShotId()` producing `shot-NaN001` on a malformed index → next add succeeds but shot is unfindable by ID. **Not caught.**
- `filterActiveRows()` activating already-completed rows → duplicate image generation charges and catalog duplicates. **Not caught.**
- Any API route returning 500 with no body → client receives unhandled JSON parse error. **Not caught** (no route handler tests exist).

**Framing for upcoming campaigns:**

- **Story Builder (FR-20):** The FFmpeg pipeline (`assembler.ts`) is about to become the most important code in the project. It is entirely untested. A mistake in the `filter_complex` string — a missing semicolon, a wrong stream index, a broken `zoompan` expression — will cause silent assembly failure or corrupted video output. There is no regression net.
- **Thumbnail Persistence (FR-19):** The catalog save pattern (`saveStoryToCatalog`, `saveImageToCatalog`, `catalog.addAsset`) is also entirely untested. The save-to-catalog pattern is used by every tool. If a shared utility like `generateAssetId` or `generateFilename` regresses, all persistence silently breaks. There is no regression net.

**Conclusion:** The test suite provides zero protection for the Story Builder or Thumbnail Persistence campaigns. Both features will ship into a regression-free void. Any refactor of `assembler.ts`, `catalog/storage.ts`, or `story/storage.ts` carries full risk of silent breakage.

---

## Appendix: File Inventory

**Project test files (excluding node_modules):**

```
client/src/components/ui/__tests__/StatusIndicator.test.tsx
server/src/__tests__/example.test.ts
```

**Production modules with zero coverage (partial list):**

```
server/src/index.ts                          (all REST endpoints)
server/src/tools/story/assembler.ts
server/src/tools/story/storage.ts
server/src/tools/catalog/storage.ts
server/src/tools/shots/storage.ts
server/src/tools/batch/csv.ts
server/src/tools/batch/cost.ts
server/src/tools/batch/queue.ts
server/src/tools/image/save-to-catalog.ts
server/src/tools/widgets/storage.ts
server/src/tools/projects/storage.ts
server/src/tools/prompts/refine.ts
server/src/routes/batch.ts
server/src/routes/query/catalog.ts
client/src/App.tsx
client/src/hooks/*.ts  (all hooks)
client/src/contexts/SettingsContext.tsx
client/src/components/tools/*.tsx  (all tool panels)
```
