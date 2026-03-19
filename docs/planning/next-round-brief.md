# Next Round Brief

**Goal**: Complete the unfinished Day 11 Story Builder and add thumbnail persistence (FR-19)
**Background**: Days 1–10, 13–15 are fully shipped. Days 11–12 remain. The story/assembler module exists on the server but needs FFmpeg integration. Thumbnail persistence (FR-19) was deliberately deferred from FR-17.
**Suggested campaign name**: `story-and-thumbnails`

---

## Suggested Work Units

### High Priority

1. **FR-20 / Day 11: Story Builder video assembly** — wire `server/src/tools/story/assembler.ts` to an FFmpeg subprocess. Accept ordered shots + audio track, concatenate to output video, save to catalog. `Day11StoryBuilder.tsx` component exists, needs assembly endpoint connected.

2. **FR-19: Thumbnail Persistence & History** — extend `Day8Thumbnail.tsx` to save generated thumbnails to the asset catalog (following the `save-to-catalog.ts` pattern used by image/video/music/audio). Add history UI (reuse existing history patterns from Day 4/5/6).

### Medium Priority

3. **FR-21: Thumbnail Typography Enhancements** — see `docs/prd/fr-21-thumbnail-typography-enhancements.md` for details.

### Low Priority

4. **FR-24: Aspect Ratio Calculator** — see `docs/prd/fr-24-aspect-ratio-calculator.md`. May belong in Day 15 (Batch Gen) tooling.

---

## Key Context for Agents

- Server story module: `server/src/tools/story/` (assembler.ts, storage.ts, types.ts, index.ts)
- Client component: `client/src/components/tools/Day11StoryBuilder.tsx`
- FFmpeg availability: verify with `which ffmpeg` before building — may need brew install
- Catalog save pattern: copy `server/src/tools/image/save-to-catalog.ts` — same pattern for thumbnails
- AGENTS.md: `docs/planning/AGENTS.md` — read before starting any work unit
- Baseline: build CLEAN, 8 tests passing as of 2026-03-19

---

## Stale Worktrees to Address

Three worktrees exist from previous sessions — review before starting:
- `apd-10` — 0 unique commits vs main (safe to remove)
- `apd-11` — 1 unmerged commit: "feat: Add LEGO-style AppyDave logo to header"
- `apd-13` — 1 unmerged commit: "feat: Add AppyDave logo to application header"

Decision needed: merge the logo commits or discard? Both apd-11 and apd-13 add a logo to the header — likely the same feature attempted twice. Review `client/src/components/layout/Header.tsx` in each worktree and decide.
