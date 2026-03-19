# IMPLEMENTATION_PLAN.md — story-and-thumbnails

**Goal**: Complete Day 11 Story Builder (FR-20) and add Thumbnail Persistence & History (FR-19). Pre-flight fixes for path traversal and contract bugs before either FR ships.
**Started**: 2026-03-19
**Target**: FFmpeg assembly end-to-end working in browser; thumbnails saved to catalog with history UI; build clean; tests passing

## Summary
- Total: 8 | Complete: 4 | In Progress: 0 | Pending: 4 | Failed: 0

---

## Pending

### Wave 2 — Server endpoints + toBlob fix (run in parallel — no file conflicts)
- [~] story-history-route — Add GET /api/story/history to story.ts router using getStoriesFromCatalog(); returns Asset[]
- [~] thumbnail-server-route — Create server/src/routes/thumbnail.ts (POST /save + GET /history); mount at /api/thumbnail in index.ts; add catalog/stories/ and catalog/thumbnails/ to initCatalog pre-creation
- [~] fix-toBlob-race — Promisify canvas.toBlob in ThumbnailExport.tsx; await blob before finally block runs; fix unmount race in both handleExport and handleCopyToClipboard

### Wave 3 — FR-19 client (single unit — tightly coupled components)
- [ ] thumbnail-fr19-client — Implement ThumbnailHistory (props: Asset[], rendering); add Save to Catalog button in ThumbnailExport (POST /api/thumbnail/save); wire history state + refresh in Day8Thumbnail.tsx

---

## In Progress

*(coordinator moves items here with [~])*

---

## Complete

- [x] fix-path-traversal — resolveAssetPath extracted to module scope; ASSETS_DIR uses path.resolve; startsWith prefix assertion added; both call sites use module fn; 38 tests pass
- [x] dedupe-story-types — MusicConfig/NarrationConfig/AssemblyRequest removed from story/types.ts; imported from @fligen/shared in assembler.ts, storage.ts, test files; AssemblyResult + AssemblyProgress kept local; 38 tests pass
- [x] fix-story-contracts — 'story' added to Asset.type union; AssemblyResponse uses assetUrl+assetId; saveStoryToCatalog uses type:'story'; getStoriesFromCatalog filters by type:'story'; story.ts route returns asset.url+asset.id; catalog tests updated; 38 tests pass
- [x] fix-story-client — Day11StoryBuilder: download URL, filename, video preview src all use result.assetUrl; catalogId → assetId; video dropdown filter confirmed correct; 42 tests pass (38 server + 4 client)

---

## Failed / Needs Retry

*(coordinator moves items here with [!], adds failure reason)*

---

## Notes & Decisions

- **Wave 0 must complete before Wave 1** — dedupe-story-types changes assembler.ts imports; fix-story-contracts changes shared types. Cannot safely overlap.
- **fix-story-contracts before fix-story-client** — client fix depends on new AssemblyResponse shape (assetUrl field).
- **fix-toBlob-race (Wave 2) before thumbnail-fr19-client (Wave 3)** — Wave 3 adds a third toBlob call (save path); race must be fixed first or we compound the bug.
- **story-history-route is small** — 10 lines in story.ts. Can be combined with fix-story-client if an agent completes early and the coordinator wants to collapse waves.
- **AssemblyResult stays local** — it's the assembler's internal return type, not shared with the client. AssemblyResponse (shared) is the HTTP contract. These are intentionally different shapes.
- **Thumbnail save endpoint shape** — POST /api/thumbnail/save accepts `{ imageDataUrl: string, config: ThumbnailConfig, label?: string }`. Server decodes base64, writes PNG to catalog/thumbnails/, calls addAsset({ type: 'thumbnail', ... }), returns Asset.
- **catalog/stories/ pre-creation** — currently only created lazily in saveStoryToCatalog. Wave 2 (thumbnail-server-route) adds it to initCatalog alongside thumbnails/.
