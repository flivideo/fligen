# Assessment — story-and-thumbnails campaign
_Completed: 2026-03-19_

## Results
- **Total**: 8 work units | **Complete**: 8 | **Failed**: 0
- **Tests**: 42 passing (38 server + 4 client) — baseline was 42 entering, 42 exiting
- **Build**: all 3 workspaces clean throughout

## Results Summary

| Work Unit | Wave | Outcome |
|---|---|---|
| fix-path-traversal | 0 | resolveAssetPath extracted to module scope; prefix assertion added; both call sites fixed |
| dedupe-story-types | 0 | MusicConfig/NarrationConfig/AssemblyRequest removed from local types; imported from shared |
| fix-story-contracts | 1 | 'story' added to Asset.type; AssemblyResponse: assetUrl+assetId; saveStoryToCatalog type fixed |
| fix-story-client | 1 | Day11StoryBuilder: video preview + download use asset.url (no more 404) |
| story-history-route | 2 | GET /api/story/history wired to getStoriesFromCatalog() |
| thumbnail-server-route | 2 | routes/thumbnail.ts created; POST /save + GET /history; catalog/stories/ in initCatalog |
| fix-toBlob-race | 2 | canvas.toBlob promisified; finally block fires after blob is consumed |
| thumbnail-fr19-client | 3 | ThumbnailHistory grid implemented; Save to Catalog button; history refresh on save |

## What Worked Well

- **Wave gating prevented all file conflicts** — shared/src/index.ts was the critical shared file; Wave 0 prepared imports, Wave 1 edited types, Wave 2 consumed the new types. Zero merge conflicts across 8 agents.
- **Architecture review surfaced two functional blockers before build started** — the broken video URL (outputPath vs asset.url) and wrong Asset.type discriminator would have been found by manual testing but would have wasted a build wave. Paying for arch review upfront was correct.
- **fix-story-contracts agent fixed story.ts route proactively** — it recognised the TypeScript build would fail without the route change and did it in scope, making fix-story-client trivial (just the client-side URL fix). Agents reading ahead and closing small gaps is a good sign.
- **toDataURL for save vs toBlob for export** — using the synchronous `canvas.toDataURL()` for the save path avoided adding a third toBlob call after fixing the race. Clean design choice.
- **Wave 2 ran 3 parallel agents cleanly** — story-history-route, thumbnail-server-route, and fix-toBlob-race touch completely different files; all three completed without interference.

## What Didn't Work / Surprises

- **fix-story-contracts scope crept slightly into fix-story-client's territory** — the agent patched story.ts to make TypeScript build pass, which was technically fix-story-client's job. This was pragmatic and correct, but the coordinator noticed it in the wave summary and adjusted the fix-story-client prompt accordingly. The IMPLEMENTATION_PLAN.md wave descriptions should note which files each agent owns to prevent ambiguity.
- **story-history-route was trivial (~10 lines)** — as noted in the plan, this could have been folded into fix-story-client. It was correctly identified as a small work unit pre-planning but still ran as a separate agent. For future campaigns: if a wave unit is this small, fold it into an adjacent unit.
- **Wave 0 should have launched all three Wave 2 agents simultaneously** — the coordinator sent story-history-route first, then launched the other two a message later. No real delay, but a reminder: all parallel wave units should be launched in a single message.

## Key Learnings — Application

- **`saveStoryToCatalog` returns an Asset** — callers (routes) must capture the return value to get the correct catalog URL. The assembler's internal `catalogId` field is a pre-save generated string that doesn't match what the catalog stores. Always use the catalog's returned Asset for the client-facing URL and ID.
- **`path.resolve` + `startsWith` for path safety** — `path.join` does not canonicalize; always resolve first then assert prefix. This is now the standard in assembler.ts and thumbnail.ts.
- **Asset.type is the correct discriminator** — using metadata fields as type discriminators (`metadata.type === 'story'`) makes filterAssets useless for that type. Always add new types to the Asset.type union.
- **catalog/stories/ must be in initCatalog** — it was the only subdir created lazily. All catalog subdirs should be pre-created at startup for consistency and early-fail detection.

## Key Learnings — Coordinator

- **Arch review before Extend planning is high ROI** — surfaced 2 functional bugs and a security issue before a single line of code was written. The path traversal fix was isolated and reviewable. Recommend for all future campaigns on this codebase.
- **Wave 2 parallel agents are the throughput sweet spot** — 3 agents touching independent files completed faster than any sequential approach. Identify file-independent units early in planning.
- **Read the output of prior agents before writing the next prompt** — fix-story-client's prompt was adapted based on what fix-story-contracts had already done. This avoids duplicate work and keeps agents focused.

## BACKLOG.md Update
- B020 (FR-19 Thumbnail Persistence) → Done
- B021 (FR-20 Story Builder assembly) → Done
- Remaining pending: B022 (FR-21 Typography), B025 (FR-24 Aspect Ratio)

## Scheduled Debt Carried Forward (not addressed this campaign)
- `example.test.ts` still a D-grade placeholder — convert to real smoke test
- Write-queue concurrency test (Promise.all concurrent addAsset) still missing
- `http://localhost:5401` hardcoded in 3+ client files — needs shared API_BASE_URL constant
- `batch.ts` in-memory queue has no TTL/eviction
- `query/catalog.ts` limit param not clamped
