# IMPLEMENTATION_PLAN.md — aspect-ratio

**Goal**: Build FR-24 Aspect Ratio Calculator as Day 16 — bidirectional calculator, presets, platform recommendations, visual preview, localStorage history.
**Started**: 2026-03-19
**Target**: Working tool in FliGen navigation; build clean; 42 tests still passing

## Summary
- Total: 2 | Complete: 2 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

## In Progress

## Complete

### Wave 1 (parallel — no file conflicts)
- [x] add-day16-config — Day 16 entry added to shared/src/config.json; Day 11 status updated to 'complete'
- [x] build-aspect-ratio-tool — Day16AspectRatio.tsx + 6 sub-components created; import + route wired in App.tsx; build clean; 42 tests passing

## Failed / Needs Retry

---

## Notes & Decisions

- FR-24 PRD mentions ports 5200/5201 — that's FliDeck, ignore. This lives in FliGen (5400/5401).
- Pure client-side — no server route needed. Calculation logic stays in useCalculator hook.
- History in localStorage only (no catalog persistence).
- Day 16 — series already extended past Day 12; consistent to add Day 16.
- Day 11 Story Builder is now complete — update config status at same time.
- React JSX automatic transform in use — explicit `import React` lines are TS6133 errors; omit them in all new TSX files.
