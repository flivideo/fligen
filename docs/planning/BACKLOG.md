# Project Backlog — FliGen

**Last updated**: 2026-03-19
**Total**: 32 | Pending: 4 | In Progress: 0 | Done: 28 | Deferred: 0 | Rejected: 0

---

## Pending

- [ ] B020 — FR-19: Thumbnail Persistence & History | Priority: medium
- [ ] B021 — FR-20: Story Builder - Video Assembly (FFmpeg pipeline) | Priority: medium
- [ ] B022 — FR-21: Thumbnail Typography Enhancements | Priority: low
- [ ] B025 — FR-24: Aspect Ratio Calculator | Priority: low

---

## In Progress

*(none)*

---

## Done

- [x] B001 — FR-1: Initial Harness (React/Vite/Express scaffold) | Completed: day-1
- [x] B002 — FR-2: Layout and Navigation (sidebar, hash routing) | Completed: day-1
- [x] B003 — FR-3: Claude Agent SDK Server Integration | Completed: day-2
- [x] B004 — FR-4: Frontend Chat UI (streaming, Socket.io) | Completed: day-2
- [x] B005 — FR-5: Local Documentation Reader (MCP server) | Completed: day-3
- [x] B006 — FR-6: Kybernesis Memory Integration (MCP server) | Completed: day-3
- [x] B007 — FR-7: Image API Connectivity (FAL.AI + KIE.AI health checks) | Completed: day-4
- [x] B008 — FR-8: Image Generation Comparison (2×2 grid) | Completed: day-4
- [x] B009 — FR-9: ElevenLabs Text-to-Speech | Completed: day-5
- [x] B010 — FR-10: Shot List and Video Generation (KIE.AI Veo 3.1, FAL.AI Kling O1) | Completed: day-6
- [x] B011 — FR-11: Music Generation (FAL SonAuto, KIE Suno) | Completed: day-7
- [x] B012 — FR-12: Thumbnail Generator (canvas-based) | Completed: day-8
- [x] B013 — FR-13: Prompt Intake and FliHub Interop | Completed: day-9
- [x] B014 — FR-14: Day 10 N8N Workflow Integration | Completed: day-10
- [x] B015 — FR-15: Prompt Refinement UI (Human→Machine prompts via Claude) | Completed: day-10
- [x] B016 — FR-16: Unified Asset Catalog Infrastructure | Completed: catalog-infra
- [x] B017 — FR-17: Asset Persistence Implementation (all day history UIs) | Completed: catalog-infra
- [x] B018 — FR-18: Asset Browser UI | Completed: catalog-infra
- [x] B019 — NFR-1: Git Leak Detection (gitleaks pre-commit hook) | Completed: day-3
- [x] B023 — FR-22: Brand Text Generator HTML (canvas pixel glyphs, Day 13) | Completed: day-13
- [x] B024 — FR-23: Widget Generator (HTML template system, Day 14) | Completed: day-14
- [x] B026 — FR-25: Batch Generation and Query API (CSV queue, Day 15) | Completed: day-15
- [x] B027 — BLOCKER: Fix catalog/storage.ts concurrent write corruption — enqueueWrite helper | Completed: fix-blockers
- [x] B028 — BLOCKER: Fix story/assembler.ts shell injection — buildFFmpegArgs() returns string[]; execFileAsync | Completed: fix-blockers
- [x] B029 — BLOCKER: Fix server/src/index.ts unvalidated PID in cleanupPort | Completed: fix-blockers
- [x] B030 — STRUCTURAL: Extract routes from index.ts (1,487→197 lines) into 10 route files | Completed: fix-blockers
- [x] B031 — STRUCTURAL: Split Day8Thumbnail.tsx (1,577→168 lines) into 5 sub-components | Completed: fix-blockers
- [x] B032 — TESTS: Add behaviour tests — 38 passing (was 8); assembler.test.ts + catalog.test.ts | Completed: fix-blockers

---

## Deferred

*(none)*

---

## Rejected

*(none)*

---

## Notes

**B020 / FR-19 (Thumbnail Persistence)**: FR-17 explicitly noted "Day 8 (Thumbnails) - Not implemented (requires separate PRD)". FR-19 is that PRD. Day 8 component `Day8Thumbnail.tsx` exists but lacks catalog persistence.

**B021 / FR-20 (Story Builder)**: `Day11StoryBuilder.tsx` and `server/src/tools/story/` (assembler, storage, types) exist on main. Config.json shows Day 11 status as "next". Partially implemented — needs FFmpeg integration to be fully functional. Assess before marking complete.

**B023 / FR-22 (Brand Text Generator)**: Marked Pending in `docs/backlog.md` but config.json shows Day 13 status as "complete" and `client/src/components/tools/Day13BrandText.tsx` + `BrandTextGenerator/` subdirectory exist in main. **The backlog table was stale — corrected here to Done.**

**B026 / FR-25 (Batch Generation)**: Marked Pending in `docs/backlog.md` but `server/src/routes/batch.ts`, `server/src/routes/query/`, and `client/src/components/tools/Day15BatchGen.tsx` + `Day15ApiExplorer.tsx` exist in main, and config.json shows Day 15 as "complete". **The backlog table was stale — corrected here to Done.**
