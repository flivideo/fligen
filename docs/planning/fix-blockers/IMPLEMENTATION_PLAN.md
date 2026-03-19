# IMPLEMENTATION_PLAN.md — fix-blockers

**Goal**: Fix 3 security/data BLOCKERs + structural prep before Story Builder (FR-20) and Thumbnail Persistence (FR-19) can be safely built.
**Started**: 2026-03-19
**Target**: npm build + test pass; no execAsync in assembler; no unvalidated kill -9; catalog writes serialised; Day8Thumbnail.tsx < 400 lines; index.ts routes extracted

## Summary
- Total: 6 | Complete: 6 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

### Wave 2 (run after wave 1 — B029 patch must be in place before B030 touches index.ts)

### Wave 2 (run after wave 1 — B029 patch must be in place before B030 touches index.ts)
- [ ] add-behaviour-tests — Write tests: buildFFmpegCommand() pure function, filterAssets() filter logic, saveStoryToCatalog() catalog contract
- [ ] split-day8-thumbnail — Extract Day8Thumbnail.tsx (1,577 lines) into ThumbnailCanvas.tsx, ThumbnailExport.tsx, ThumbnailHistory.tsx; shell component stays
- [ ] extract-routes — Extract all inline HTTP route handlers from server/src/index.ts into route files following routes/batch.ts pattern; index.ts becomes wiring only

## In Progress

## Complete

### Wave 1
- [x] fix-catalog-write-queue — enqueueWrite helper added; addAsset/updateAsset/deleteAsset serialised; signatures unchanged; 8/8 tests pass
- [x] fix-assembler-shell-injection — buildFFmpegArgs() returns string[]; execFileAsync('ffmpeg'/'ffprobe') used; no execAsync remains; exported for B032 tests; build clean
- [x] fix-pid-validation — parseInt+isNaN guard added; process.kill() replaces shell kill -9; build clean; 8/8 tests pass

### Wave 2
- [x] add-behaviour-tests — 18 new tests (8 assembler + 10 catalog); total 38 passing (was 8); example.test.ts stubs replaced
- [x] split-day8-thumbnail — Day8Thumbnail.tsx 1,577→168 lines; thumbnail/ subdir with types.ts, ThumbnailCanvas.tsx, ThumbnailExport.tsx, ThumbnailHistory.tsx, ThumbnailConfig.tsx; build clean; 38 tests pass
- [x] extract-routes — index.ts 1,487→197 lines; 10 route files created; factory pattern for socket-emitting video routes; all paths preserved; 38 tests pass

## Failed / Needs Retry

## Notes & Decisions

- B029 (fix-pid-validation) runs in wave 1. B030 (extract-routes) runs in wave 2 on the already-patched index.ts — no conflict.
- extract-routes is a large refactor (~1,400 lines touched) but all routes are well-defined; the batch.ts pattern is the reference to follow.
- add-behaviour-tests: buildFFmpegCommand() is a pure function (no I/O) — unit test directly. filterAssets() and saveStoryToCatalog() require a temp directory for file I/O — use vitest's tmp dir or mock fs.
- split-day8-thumbnail: component has zero server interaction currently. The split must preserve existing behaviour exactly — no logic changes, just decomposition.
