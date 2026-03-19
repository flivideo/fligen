# IMPLEMENTATION_PLAN.md — story-and-thumbnails

**Goal**: Complete Day 11 Story Builder (FR-20) and add Thumbnail Persistence & History (FR-19). Pre-flight fixes for path traversal and contract bugs before either FR ships.
**Started**: 2026-03-19
**Target**: FFmpeg assembly end-to-end working in browser; thumbnails saved to catalog with history UI; build clean; tests passing

## Summary
- Total: 8 | Complete: 0 | In Progress: 0 | Pending: 8 | Failed: 0

---

## Pending

### Wave 0 — Pre-flight (run in parallel — no file conflicts)
- [ ] fix-path-traversal — Extract `resolveAssetPath` to module scope in assembler.ts; add `startsWith(ASSETS_DIR)` prefix assertion; apply to both call sites; throw 400 if path escapes
- [ ] dedupe-story-types — Remove MusicConfig/NarrationConfig/AssemblyRequest from server/src/tools/story/types.ts (duplicates of shared); import from @fligen/shared; keep AssemblyResult + AssemblyProgress as internal-only types

### Wave 1 — Contract alignment (sequential — both touch shared/src/index.ts)
- [ ] fix-story-contracts — Add 'story' to Asset.type union in shared; add assetUrl+assetId fields to AssemblyResponse in shared; update saveStoryToCatalog to use type:'story'; update getStoriesFromCatalog to filter by type:'story' directly
- [ ] fix-story-client — Update story.ts route to capture asset returned by saveStoryToCatalog and return asset.url + asset.id in AssemblyResponse; update Day11StoryBuilder to use result.assetUrl for video src and download link (fixes 404)

### Wave 2 — Server endpoints + toBlob fix (run in parallel — no file conflicts)
- [ ] story-history-route — Add GET /api/story/history to story.ts router using getStoriesFromCatalog(); returns Asset[]
- [ ] thumbnail-server-route — Create server/src/routes/thumbnail.ts (POST /save + GET /history); mount at /api/thumbnail in index.ts; add catalog/stories/ and catalog/thumbnails/ to initCatalog pre-creation
- [ ] fix-toBlob-race — Promisify canvas.toBlob in ThumbnailExport.tsx; await blob before finally block runs; fix unmount race in both handleExport and handleCopyToClipboard

### Wave 3 — FR-19 client (single unit — tightly coupled components)
- [ ] thumbnail-fr19-client — Implement ThumbnailHistory (props: Asset[], rendering); add Save to Catalog button in ThumbnailExport (POST /api/thumbnail/save); wire history state + refresh in Day8Thumbnail.tsx

---

## In Progress

*(coordinator moves items here with [~])*

---

## Complete

*(coordinator moves items here with [x], adds outcome notes)*

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
