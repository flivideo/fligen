# Backlog

Requirements index for FliGen.

## Requirements

| # | Requirement | Added | Status |
|---|-------------|-------|--------|
| 1 | [FR-1: Initial Harness](prd/fr-01-initial-harness.md) | 2025-12-25 | Complete |
| 2 | [FR-2: Layout and Navigation](prd/fr-02-layout-and-navigation.md) | 2025-12-25 | Complete |
| 3 | [FR-3: Claude Agent SDK Integration](prd/fr-03-claude-agent-sdk-integration.md) | 2025-12-26 | Complete |
| 4 | [FR-4: Frontend Chat UI](prd/fr-04-frontend-chat-ui.md) | 2025-12-26 | Complete |
| 5 | [FR-5: Local Documentation Reader](prd/fr-05-local-docs.md) | 2025-12-27 | Complete |
| 6 | [FR-6: Kybernesis Memory Integration](prd/fr-06-kybernesis-memory.md) | 2025-12-27 | Complete |
| 7 | [FR-7: Image API Connectivity](prd/fr-07-api-connectivity.md) | 2025-12-28 | Complete |
| 8 | [FR-08: Image Generation Comparison](prd/fr-08-image-comparison.md) | 2025-12-28 | Complete |
| 9 | [FR-09: 11 Labs Text-to-Speech](prd/fr-09-elevenlabs-tts.md) | 2025-12-29 | Complete |
| 10 | [FR-10: Shot List and Video Generation](prd/fr-10-shot-list-and-video.md) | 2025-12-30 | Complete |
| 11 | [FR-11: Music Generation](prd/fr-11-music-generation.md) | 2025-12-31 | Complete |
| 12 | [FR-12: Thumbnail Generator](prd/fr-12-thumbnail-generator.md) | 2026-01-01 | Complete |
| 13 | [FR-13: Prompt Intake and FliHub Interop](prd/fr-13-prompt-intake-interop.md) | 2026-01-02 | Complete |
| 14 | [FR-14: Day 10 N8N Workflow Integration](prd/fr-14-day-10-n8n-workflow.md) | 2026-01-03 | Complete |
| 15 | [FR-15: Prompt Refinement UI](prd/fr-15-prompt-refinement-ui.md) | 2026-01-03 | Complete |
| 16 | [FR-16: Unified Asset Catalog Infrastructure](prd/fr-16-unified-asset-catalog.md) | 2026-01-04 | Complete |
| 17 | [FR-17: Asset Persistence Implementation](prd/fr-17-asset-persistence-implementation.md) | 2026-01-04 | Complete |
| 18 | [FR-18: Asset Browser UI](prd/fr-18-asset-browser-ui.md) | 2026-01-04 | Complete |
| 19 | [FR-19: Thumbnail Persistence & History](prd/fr-19-thumbnail-persistence.md) | 2026-01-04 | Pending |
| 20 | [FR-20: Story Builder - Video Assembly](prd/fr-20-story-builder-video-assembly.md) | 2026-01-04 | Pending |
| 21 | [FR-21: Thumbnail Typography Enhancements](prd/fr-21-thumbnail-typography-enhancements.md) | 2026-01-06 | Pending |
| 22 | [FR-22: Brand Text Generator (HTML)](prd/fr-22-brand-text-generator.md) | 2026-01-06 | Pending |
| 23 | [FR-23: Widget Generator](prd/fr-23-widget-generator.md) | 2026-01-07 | Complete |

## Non-Functional Requirements

| # | Requirement | Added | Status |
|---|-------------|-------|--------|
| 1 | [NFR-1: Git Leak Detection](prd/nfr-01-git-leak-detection.md) | 2025-12-27 | Complete |

## Status Definitions

- **Pending** - Not yet started
- **In Progress** - Currently being implemented
- **UAT** - Implemented, awaiting testing
- **Complete** - Tested and verified
- **Blocked** - Waiting on dependencies

---

## Next Workflow

**Day 11: Story Builder** - See `docs/prd/fr-20-story-builder-video-assembly.md`

Day 11 combines existing assets (Days 5, 7, 6/10) into complete videos:
- Select 1-3 video files
- Select music track (with volume control)
- Optionally select narration track
- Assemble into 15-second story video using FFmpeg
- Save to catalog

This is the next major feature to implement.

---

**Last updated:** 2026-01-07
