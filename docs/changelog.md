# Changelog

Implementation history for FliGen.

This file tracks completed work, organized chronologically. Each entry should reference the related requirement document.

## Format

```
## YYYY-MM-DD - [Requirement Title]

**Reference:** [Link to PRD]

### Changes
- Change 1
- Change 2

### Notes
Any important context or decisions made during implementation.
```

---

## 2026-01-04 - FR-17: Asset Persistence Implementation (History UI)

**Reference:** [FR-17: Asset Persistence Implementation](prd/fr-17-asset-persistence-implementation.md)

**Handover:** [FR-17 Handover Document](uat/fr-17-handover.md)

### Changes

#### Backend Persistence
- Created `server/src/tools/elevenlabs/save-to-catalog.ts` - TTS audio persistence
- Refactored `/api/tts/generate` endpoint to use `saveAudioToCatalog()`
- Updated `/api/music/generate` to auto-save to catalog (FR-17 requirement)
- Updated `/api/music/library` to load from BOTH old storage + new catalog
- Video persistence already existed via `saveVideoToCatalog()`
- Image persistence already existed via `saveImageToCatalog()`

#### Frontend History UIs
- **Day 4 (Images):** Added grid history UI with thumbnail display, "Reuse Prompt" functionality
- **Day 5 (TTS):** Added list history UI with audio players, "Reuse Text" functionality, queries both `type=audio` and `type=narration`
- **Day 6 (Videos):** Enhanced to load from catalog + old storage, filters out N8N workflow videos
- **Day 7 (Music):** Enhanced library to load from catalog + old storage, auto-refreshes after generation
- **Day 10 (N8N):** Added workflow history with grouping (2 images + 1 video), "Reuse Prompts" functionality

#### UX Improvements
- All history UIs auto-refresh after generation
- All history UIs sorted by date (newest first)
- Day 4 comparison grid now hidden until first generation
- Day 6 properly separates transition videos from N8N workflow videos
- Day 10 workflow videos now have playback controls

### Files Created
```
server/src/tools/elevenlabs/save-to-catalog.ts
docs/uat/fr-17-handover.md
```

### Files Modified
```
server/src/tools/elevenlabs/index.ts
server/src/index.ts (TTS + music endpoints)
client/src/components/tools/Day4ImageGen.tsx
client/src/components/tools/Day5TTS.tsx
client/src/components/tools/Day6Video.tsx
client/src/components/tools/Day7MusicGen.tsx
client/src/components/tools/Day10N8N.tsx
```

### Status
- ✅ Day 4 (Images) - Complete
- ✅ Day 5 (TTS/Audio) - Complete
- ✅ Day 6 (Videos) - Complete
- ✅ Day 7 (Music) - Complete
- ✅ Day 10 (N8N) - Complete
- ⚠️ Day 8 (Thumbnails) - Not implemented (requires separate PRD)

### Notes
- Implemented backward compatibility by loading from both old storage and new catalog
- Asset type inconsistency: some legacy assets saved as `type: 'audio'` instead of `type: 'narration'`
- Day 8 (Thumbnails) needs server-side persistence (currently client-side only)
- Video types properly separated: Day 6 transition videos vs N8N workflow videos
- All user data preserved and visible across page refreshes

---

## 2026-01-03 - FR-15: Prompt Refinement UI

**Reference:** [FR-15: Prompt Refinement UI](prd/fr-15-prompt-refinement-ui.md)

### Changes

#### Backend Infrastructure
- Created `server/src/tools/prompts/` module for prompt refinement
- `system-prompts.ts` - Hard-coded templates for Seed, Edit, Animation prompts
- `refine.ts` - Claude Agent SDK integration using `query()` API
- Added `GET /api/prompts/system` - Returns system prompt templates
- Added `POST /api/prompts/refine` - Refines human prompts into machine prompts

#### Frontend Implementation
- Created `PromptRefinementPanel.tsx` - 6-panel layout (3 system + 3 machine prompts)
- Integrated into Day10N8N.tsx between INPUT and PROCESS sections
- Modified workflow execution to support dual modes: Human Prompts (blue) and Machine Prompts (amber)
- Machine prompts button disabled until prompts are generated

#### Type Definitions
- Added to `shared/src/index.ts`:
  - `MachinePrompts` - Refined prompts for Seed, Edit, Animation
  - `RefinePromptsRequest` - API request payload
  - `RefinePromptsResponse` - API response payload

### Files Created
```
server/src/tools/prompts/system-prompts.ts     - 48 lines
server/src/tools/prompts/refine.ts             - 92 lines
server/src/tools/prompts/index.ts              - 3 lines
client/src/components/tools/PromptRefinementPanel.tsx - 195 lines
```

### Files Modified
```
server/src/index.ts                            - Added prompts endpoints
client/src/components/tools/Day10N8N.tsx       - Integrated refinement panel
shared/src/index.ts                            - Added prompt types
```

### Technical Implementation

**Claude Agent SDK Integration:**
- Uses `query()` function with `Options` interface
- Runs three refinements in parallel using `Promise.all()`
- Each refinement uses `maxTurns: 1` for simple transformation
- Accumulates streaming text from `assistant` messages and `stream_event` deltas

**System Prompts:**
- **Seed System**: Optimizes for Flux image generation (style, lighting, composition)
- **Edit System**: Optimizes for image-to-image editing (precise modifications)
- **Animation System**: Optimizes for image-to-video (camera movement, subject motion)

**API Flow:**
1. Client loads project → Human prompts populate
2. User clicks "Generate Machine Prompts"
3. Client POSTs to `/api/prompts/refine` with human prompts
4. Server calls `refinePrompts()` → 3 parallel Claude queries
5. Server responds with machine prompts
6. Client displays machine prompts in bottom row
7. User executes workflow with either human or machine prompts

### Notes
Day 10 enhancement - Implements Human → System → Machine prompt refinement pipeline. Users can now:
1. Load human prompts from saved projects
2. Generate machine-optimized prompts using Claude Agent SDK
3. Compare human vs machine prompts side-by-side
4. Execute N8N workflow with either prompt set
5. Experiment with prompt quality improvements

This builds on FR-14 (Day 10 N8N Workflow) and demonstrates practical Claude Agent SDK usage for prompt engineering at scale.

---

## 2025-12-31 - FR-11: Music Generation

**Reference:** [FR-11: Music Generation](prd/fr-11-music-generation.md)

### Changes

#### Server Module
- Created music module at `server/src/tools/music/` (types, storage, fal-client, kie-client, index)
- Implemented FAL.AI SonAuto v2 integration - text-to-music with lyrics support
- Implemented KIE.AI Suno integration - async polling with model selection (V4, V4.5, V5)
- Music library storage at `assets/music-library/` with persistent index.json

#### API Endpoints
- `GET /api/music/health` - Check provider status
- `POST /api/music/generate` - Generate music with provider selection
- `GET /api/music/library` - List saved tracks
- `POST /api/music/save` - Save track to library with custom name
- `DELETE /api/music/library/:id` - Delete saved track

#### Client Integration
- Wired Day7MusicGen.tsx mock UI to real APIs
- Provider toggle between FAL.AI SonAuto and KIE.AI Suno
- Audio playback with editable track names
- Save to library with server persistence

### Files Created
```
server/src/tools/music/types.ts      - Type definitions
server/src/tools/music/storage.ts    - Library storage operations
server/src/tools/music/fal-client.ts - FAL.AI SonAuto v2 client
server/src/tools/music/kie-client.ts - KIE.AI Suno client
server/src/tools/music/index.ts      - Module exports
```

### Files Modified
```
shared/src/index.ts                          - Added music types
shared/src/config.json                       - Day 6 → complete, Day 7 → next
server/src/index.ts                          - Added music API endpoints, 50MB body limit
client/src/App.tsx                           - Added Day 7 routing
client/src/components/tools/Day7MusicGen.tsx - Wired to real APIs
```

### Bug Fixes Applied

| Issue | Root Cause | Fix |
|-------|------------|-----|
| FAL "Unprocessable Entity" | Sent prompt + tags + lyrics together | Don't send all three simultaneously |
| FAL "No audio URL" | Response wrapped in data property | Handle nested data.audio structure |
| Express "Payload too large" | Default 100KB limit | Increased JSON limit to 50MB |
| KIE 404 Not Found | Wrong endpoint path | Fixed to /api/v1/generate |
| KIE polling endpoint | Wrong status path | Fixed to /api/v1/generate/record-info |

### Music Providers

| Provider | Model | Cost | Generation Time |
|----------|-------|------|-----------------|
| FAL.AI | SonAuto v2 | $0.075/track | ~40s |
| KIE.AI | Suno V4/V4.5/V5 | ~$0.06/track | ~60s (async) |

### Notes
Day 7 of "12 Days of Claudemas" - Music generation complete. Users can:
1. Select provider (FAL.AI SonAuto or KIE.AI Suno)
2. Enter prompt, optional lyrics, style tags
3. Generate full songs with vocals or instrumentals
4. Play, rename, and save tracks to library
5. Download as MP3

Reuses existing FAL_API_KEY and KIE_API_KEY from Day 4/6 image and video generation.

---

## 2025-12-30 - FR-10: Shot List and Video Generation

**Reference:** [FR-10: Shot List and Video Generation](prd/fr-10-shot-list-and-video.md)

### Changes

#### Part 1: Shot List Infrastructure
- Created shots module at `server/src/tools/shots/` (types, storage, index)
- Implemented `GET /api/shots` - List all shots with metadata
- Implemented `POST /api/shots` - Add image to shot list (downloads from URL)
- Implemented `DELETE /api/shots/:id` - Remove individual shot
- Implemented `DELETE /api/shots/clear` - Clear all shots
- Added Socket.IO events: `shots:list`, `shots:added`, `shots:removed`, `shots:cleared`
- Added static file serving for `/assets` directory
- Created `useShots` hook for client-side shot management
- Created `ShotListStrip` component with thumbnails, remove buttons, clear all

#### Part 2: Day 4 UI Modifications
- Updated Day4ImageGen with clickable images
- Added "Add to Shots" hover overlay on comparison grid images
- Integrated ShotListStrip between Generate button and comparison grid
- Shot list persists across page refreshes via server storage

#### Part 3: Day 6 Video Generation
- Created video module at `server/src/tools/video/` (types, storage, kie-client, fal-client)
- Implemented KIE.AI Veo 3.1 video generation with async polling
- Implemented FAL.AI Kling O1 and Wan 2.1 FLF2V video generation
- Added `GET /api/video/health` - Check video API status
- Added `POST /api/video/generate` - Generate transition video
- Added `GET /api/video/status/:taskId` - Poll video task status
- Added `GET /api/video/list` - List generated videos
- Added Socket.IO events: `video:progress`, `video:completed`, `video:failed`
- Created Day6Video component with drag-and-drop drop zones
- Added provider/model selection, duration options, optional prompt

### Files Created
```
server/src/tools/shots/types.ts     - Shot type definitions
server/src/tools/shots/storage.ts   - File system operations
server/src/tools/shots/index.ts     - Module exports

server/src/tools/video/types.ts     - Video type definitions
server/src/tools/video/storage.ts   - Video file storage
server/src/tools/video/kie-client.ts - KIE.AI Veo 3.1 client
server/src/tools/video/fal-client.ts - FAL.AI Kling/Wan client
server/src/tools/video/index.ts     - Module exports

client/src/hooks/useShots.ts        - Shot list hook
client/src/components/ui/ShotListStrip.tsx - Shot list strip component
client/src/components/tools/Day6Video.tsx  - Day 6 video component
```

### Files Modified
```
server/src/index.ts                 - Added shots and video API endpoints
shared/src/index.ts                 - Added Shot and VideoTask types
shared/src/config.json              - Updated Day 5 to complete, Day 6 to next
client/src/App.tsx                  - Added Day 6 routing
client/src/components/tools/Day4ImageGen.tsx - Added clickable images, shot strip
```

### Video Providers
| Provider | Model | First+Last Frame | Duration | Cost |
|----------|-------|------------------|----------|------|
| KIE.AI | Veo 3.1 | Planned | 5-8s | ~$0.25 |
| FAL.AI | Kling O1 | Single frame | 5-10s | ~$0.56 |
| FAL.AI | Wan 2.1 FLF2V | Yes | ~3s | ~$0.15 |

### Bug Fixes Applied

| Issue | Root Cause | Fix |
|-------|------------|-----|
| "Image fetch failed" from KIE.AI | External APIs can't access localhost URLs | Convert images to base64 data URLs before sending |
| "FAL_KEY not configured" | Video client used wrong env var name | Changed FAL_KEY → FAL_API_KEY (consistent with image client) |
| "No video URL in response" | FAL wraps response in data property | Added fallback: result.data?.video?.url |
| Wan FLF2V "Not Found" | Wrong endpoint path | Fixed: fal-ai/wan/v2.1/flf2v → fal-ai/wan-flf2v |
| Wan FLF2V "Unprocessable Entity" | Wrong parameter names | Fixed: first_frame_url → start_image_url, last_frame_url → end_image_url |

### Files Modified for Bug Fixes
```
server/src/tools/shots/storage.ts   - Added getShotAsBase64() function
server/src/tools/video/index.ts     - Now reads local files and converts to base64
server/src/tools/video/fal-client.ts - Fixed env var, endpoint, params, response parsing
server/src/tools/video/kie-client.ts - Added base64 logging
```

### Video Model Status (Final)

| Model | Provider | Endpoint | Status |
|-------|----------|----------|--------|
| Veo 3.1 | KIE.AI | /api/v1/veo/generate | Working |
| Kling O1 | FAL.AI | fal-ai/kling-video/o1/image-to-video | Working |
| Wan 2.1 FLF2V | FAL.AI | fal-ai/wan-flf2v | Working |

### Notes
Day 6 of "12 Days of Claudemas" - Shot list and video generation complete. Users can:
1. Generate images in Day 4 and click to add to shot list
2. Shot list persists across sessions via server storage
3. Navigate to Day 6 and drag shots to start/end frame drop zones
4. Select video provider, duration, and optional prompt
5. Generate transition videos with real-time progress
6. View and download completed videos

Key learning: External video APIs (KIE.AI, FAL.AI) cannot fetch images from localhost. Solution: read local files and convert to base64 data URLs before sending to external APIs.

---

## 2025-12-29 - FR-09: 11 Labs Text-to-Speech

**Reference:** [FR-09: 11 Labs Text-to-Speech](prd/fr-09-elevenlabs-tts.md)

### Changes
- Created ElevenLabs module at `server/src/tools/elevenlabs/`
- Implemented `GET /api/tts/voices` - Returns 4 curated voices (Rachel, Bella, Antoni, Elli)
- Implemented `POST /api/tts/generate` - Converts text to MP3 audio (base64 encoded)
- Server startup shows ElevenLabs configuration status
- Created Day5TTS.tsx component with voice selection, text input, audio player, download
- Default text pre-populated with Fox and Lazy Dog narration
- Added ELEVENLABS_API_KEY to .env.example

### Files Created
```
server/src/tools/elevenlabs/types.ts    - Type definitions
server/src/tools/elevenlabs/client.ts   - ElevenLabs API client
server/src/tools/elevenlabs/index.ts    - Module exports
client/src/components/tools/Day5TTS.tsx - Day 5 UI component
assets/fox-story/audio/narration.mp3    - Generated narration audio
assets/fox-story/images/                - Directory for future images
assets/fox-story/video/                 - Directory for future video
```

### Files Modified
```
server/src/index.ts      - Added TTS API endpoints
server/.env.example      - Added ELEVENLABS_API_KEY
client/src/App.tsx       - Added Day 5 routing
shared/src/config.json   - Updated day status
```

### Notes
Day 5 of "12 Days of Claudemas" - Text-to-Speech integration complete. Users can select from 4 voices, enter narration text, generate audio with ElevenLabs API, play it back in browser, and download as MP3. First Fox story narration asset generated and stored.

---

## 2025-12-28 - FR-8: Image Generation Comparison

**Reference:** [FR-8: Image Generation Comparison](prd/fr-08-image-comparison.md)

### Changes
- Extended image API types with `CompareResult`, `CompareRequest`, `CompareResponse` types
- Added `MODELS` configuration mapping providers to model tiers (advanced/midrange)
- Implemented `generateForComparison()` in FAL client (Flux Pro v1.1 + Flux Schnell)
- Implemented `generateForComparison()` in KIE client (Flux Kontext Max + Flux Kontext Pro)
- Added `compareImages()` function using `Promise.allSettled()` for parallel 4-image generation
- Created `POST /api/image/compare` endpoint accepting prompt, returning all 4 results
- Refactored Day4ImageGen.tsx with tab navigation (Comparison + API Status)
- Created 2×2 comparison grid UI (FAL vs KIE columns, Advanced vs Midrange rows)
- Added summary stats showing success rate, total cost, and duration

### Files Modified
```
server/src/tools/image/types.ts        - Added comparison types and MODELS config
server/src/tools/image/fal-client.ts   - Added generateForComparison()
server/src/tools/image/kie-client.ts   - Added generateForComparison()
server/src/tools/image/index.ts        - Added compareImages() export
server/src/index.ts                    - Added POST /api/image/compare endpoint
client/src/components/tools/Day4ImageGen.tsx - Complete rewrite with tabs
```

### Models
| Provider | Tier | Model ID | Resolution | Cost |
|----------|------|----------|------------|------|
| FAL.AI | Advanced | fal-ai/flux-pro/v1.1 | 1024×1024 | $0.04/MP |
| FAL.AI | Mid-range | fal-ai/flux/schnell | 512×512 | $0.003/MP |
| KIE.AI | Advanced | flux-kontext-max | 1024×1024 | $0.025/image |
| KIE.AI | Mid-range | flux-kontext-pro | 512×512 | $0.004/image |

### Notes
Day 4 of "12 Days of Claudemas" - Image comparison feature complete. Users can enter a prompt and generate 4 images in parallel across 2 providers and 2 quality tiers. Results display with timing, cost, and resolution info. FR-07 API status UI moved to second tab.

---

## 2025-12-28 - FR-7: Image API Connectivity

**Reference:** [FR-7: Image API Connectivity](prd/fr-07-api-connectivity.md)

### Changes
- Created image API client modules in `server/src/tools/image/`
- Implemented FAL.AI client using `@fal-ai/client` npm package (Flux Schnell model)
- Implemented KIE.AI client using REST API with async polling pattern (Flux Kontext Pro model)
- Added `/api/image/health` endpoint that checks both providers
- Added `/api/image/test` endpoint that generates test images in parallel
- Created Day 4 UI component with provider cards, status indicators, and test buttons
- Updated server startup to show FAL.AI and KIE.AI configuration status
- Integrated Day 4 UI into App.tsx routing

### Files Created/Modified
```
server/src/tools/image/types.ts        - Type definitions (new)
server/src/tools/image/fal-client.ts   - FAL.AI client (new)
server/src/tools/image/kie-client.ts   - KIE.AI client (new)
server/src/tools/image/index.ts        - Module exports (new)
client/src/components/tools/Day4ImageGen.tsx - Day 4 UI (new)
server/src/index.ts                    - Added image API endpoints
client/src/App.tsx                     - Added Day 4 routing
server/package.json                    - Added @fal-ai/client dependency
```

### Notes
Day 4 of "12 Days of Claudemas" - Image API connectivity verification complete. Both FAL.AI and KIE.AI integrations working with health checks and test image generation. FAL.AI generates in ~2s, KIE.AI in ~24s (async polling). Foundation ready for FR-08 full image generation feature.

---

## 2025-12-27 - FR-6: Kybernesis Memory Integration

**Reference:** [FR-6: Kybernesis Memory Integration](prd/fr-06-kybernesis-memory.md)

### Changes
- Created Kybernesis MCP server module following FR-05 LocalDocs pattern
- Implemented `kybernesis_search` tool (hybrid search across memories)
- Implemented `kybernesis_store` tool (store new memories)
- Added HTTP client with proper timeout and error handling
- Integrated with Claude Agent SDK via mcpServers
- Updated system prompt with Kybernesis usage guidance
- Added startup status indicator for API key configuration

### Files Created/Modified
```
server/src/tools/kybernesis/types.ts   - API response type definitions (new)
server/src/tools/kybernesis/client.ts  - HTTP client for Kybernesis API (new)
server/src/tools/kybernesis/index.ts   - MCP tool definitions and server (new)
server/src/agent/handler.ts            - Added Kybernesis tools and updated system prompt
server/src/index.ts                    - Added startup configuration status
server/.env.example                    - Added KYBERNESIS_API_KEY placeholder
server/scratch/test-kybernesis.ts      - Test script (new)
```

### Notes
Day 3 of "12 Days of Claudemas" - Second Brain integration complete. Enables the Claude agent to search and store memories via Kybernesis API. Gracefully handles missing API key with config error message. Combined with LocalDocs (FR-05), the agent now has access to both local project docs and cloud-based memory.

---

## 2025-12-27 - FR-5: Local Documentation Reader

**Reference:** [FR-5: Local Documentation Reader](prd/fr-05-local-docs.md)

### Changes
- Created LocalDocs MCP server module in `server/src/tools/local-docs/`
- Implemented `local_docs_index` tool that scans docs/ folder recursively
- Implemented `local_docs_content` tool with 500-line chunking support
- Added comprehensive security layer:
  - Path traversal prevention
  - Symlink escape protection
  - Extension validation (.md only)
  - Absolute path blocking
- Integrated with Claude Agent SDK via in-process MCP server
- Updated agent system prompt to describe LocalDocs tools

### Files Created/Modified
```
server/src/tools/local-docs/security.ts  - Path validation utilities (new)
server/src/tools/local-docs/scanner.ts   - Directory scanning logic (new)
server/src/tools/local-docs/reader.ts    - File reading with chunking (new)
server/src/tools/local-docs/index.ts     - MCP tool definitions (new)
server/src/agent/handler.ts              - Added local-docs server integration
server/scratch/test-local-docs.ts        - Test script (new)
```

### Notes
Day 3 of "12 Days of Claudemas" - Local documentation reader complete. The agent can now list and read all .md files in the docs/ folder. Security-hardened against path traversal and symlink escape attacks. Returns 18 documentation files with metadata.

---

## 2025-12-27 - NFR-1: Git Leak Detection

**Reference:** [NFR-1: Git Leak Detection](prd/nfr-01-git-leak-detection.md)

### Changes
- Created `.gitleaksignore` file for false positive suppression
- Created pre-commit hook at `.git/hooks/pre-commit`
- Hook runs `gitleaks protect --staged --verbose` on every commit
- Added gitleaks documentation section to CLAUDE.md

### Files Created/Modified
```
.gitleaksignore              - false positive patterns (new)
.git/hooks/pre-commit        - gitleaks pre-commit hook (new)
CLAUDE.md                    - added gitleaks section
```

### Notes
Adopted from FliDeck reference implementation. This prevents accidental commits of API keys, tokens, and other secrets. Requires gitleaks installed via `brew install gitleaks` (already installed system-wide as v8.28.0).

---

## 2025-12-26 - FR-4: Frontend Chat UI

**Reference:** [FR-4: Frontend Chat UI](prd/fr-04-frontend-chat-ui.md)

### Changes
- Created `useSocket` hook for singleton socket connection management
- Created `ChatPanel` component implementing Option A (Minimal) design
- Real-time streaming text accumulation via `agent:text` events
- Tool execution indicators: `[Gear] Executing:` and `[Check] Completed:`
- Completion stats bar showing tokens, cost, and duration
- Error display with styled error messages
- Enter-to-send with input disabled while processing
- Created `Day2AgentSDK` wrapper component for Day 2
- Updated App.tsx to render chat UI on Day 2 (app starts on Day 2 by default)

### Files Created/Modified
```
client/src/hooks/useSocket.ts              - singleton socket hook (new)
client/src/components/tools/ChatPanel.tsx  - main chat component (new)
client/src/components/tools/Day2AgentSDK.tsx - Day 2 wrapper (new)
client/src/App.tsx                         - wired Day 2 to show chat
```

### Notes
Day 2 of "12 Days of Claudemas" - frontend chat UI connects to backend Claude Agent SDK. The chat panel provides real-time streaming, tool visibility, and completion metrics. Ready for UAT testing.

---

## 2025-12-26 - FR-3: Claude Agent SDK Server Integration

**Reference:** [FR-3: Claude Agent SDK Integration](prd/fr-03-claude-agent-sdk-integration.md)

### Changes
- Installed `@anthropic-ai/claude-agent-sdk` v0.1.76 in server workspace
- Updated shared types with full agent Socket.io event interfaces
- Created agent module (`server/src/agent/`) with handler and session management
- Implemented `handleAgentQuery()` with streaming response processing
- Added session persistence per socket for multi-turn conversations
- Wired up `agent:query` and `agent:cancel` events in server
- Added session cleanup on socket disconnect
- Error handling with categorized error codes (AUTH_REQUIRED, RATE_LIMIT, CANCELLED)

### Files Created/Modified
```
server/package.json           - added @anthropic-ai/claude-agent-sdk dependency
shared/src/index.ts           - added agent event types
server/src/agent/session.ts   - session management utilities (new)
server/src/agent/handler.ts   - query handler with streaming (new)
server/src/agent/index.ts     - module exports (new)
server/src/index.ts           - wired up socket events
server/scratch/test-sdk.ts    - verification script (new)
```

### Notes
Day 2 of "12 Days of Claudemas" - backend ready for frontend chat UI. Requires `claude login` before sending queries. Test script verified working with Max subscription.

---

## 2025-12-25 - FR-2: Layout and Navigation Implementation

**Reference:** [FR-2: Layout and Navigation](prd/fr-02-layout-and-navigation.md)

### Changes
- Added CSS custom properties for theming (colors, layout variables)
- Created layout components: AppShell, Header, Sidebar, StatusBar, MainContent
- Created UI components: ConfigModal, ToolPanel, StatusIndicator
- Created hooks: useNavigation (hash routing), useSidebarState (localStorage persistence), useKeyboardNav
- Created Day1Harness and DayPlaceholder tool components
- Implemented hash-based routing (#day-1 through #day-12)
- Keyboard shortcuts: Cmd/Ctrl+1-9 (days), Cmd/Ctrl+[ ] (nav), Cmd/Ctrl+, (settings), Esc (close modal)
- Collapsible sidebar with localStorage persistence
- Config modal for API key management
- Status bar with connection and operation status

### Files Created
```
client/src/
├── data/days.ts
├── hooks/
│   ├── useNavigation.ts
│   ├── useSidebarState.ts
│   └── useKeyboardNav.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatusBar.tsx
│   │   └── MainContent.tsx
│   ├── ui/
│   │   ├── ConfigModal.tsx
│   │   ├── ToolPanel.tsx
│   │   └── StatusIndicator.tsx
│   └── tools/
│       ├── Day1Harness.tsx
│       └── DayPlaceholder.tsx
└── vite-env.d.ts
```

### Notes
Full implementation of FR-2 spec. All 12 days accessible via sidebar navigation. Ready for Day 2+ tool implementations.

---

## 2025-12-25 - FR-2: Layout and Navigation Spec

**Reference:** [FR-2: Layout and Navigation](prd/fr-02-layout-and-navigation.md)

### Changes
- Created FR-2 specification for collapsible sidebar layout
- Defined color palette CSS custom properties
- Specified component structure (AppShell, Header, Sidebar, StatusBar)
- Added keyboard navigation shortcuts
- Defined 12-day tool data structure with icons and status

### Notes
This establishes the layout pattern all 12 tools will use. Follows patterns from FliHub (hash routing) and FliDeck (sidebar navigation).

---

## 2025-12-25 - FR-1: Initial Harness Complete

**Reference:** [FR-1: Initial Harness](prd/fr-01-initial-harness.md)

### Changes
- Created npm workspaces monorepo (client/, server/, shared/)
- React 19 + Vite 6 + TailwindCSS v4 client on port 5400
- Express 5 + Socket.io server on port 5401
- Shared TypeScript types with HealthResponse and Socket.io events
- Concurrent dev script, hot reload working
- Landing page with health status and socket connection display

### Notes
Day 1 of "12 Days of Claudemas" complete. Key learning: Tailwind v4 requires `@source` directives in CSS to specify where to scan for utility classes.

---

## 2025-12-25 - Documentation Scaffolding

**Reference:** Project initialization

### Changes
- Created documentation structure (docs/README.md, backlog.md, changelog.md, brainstorming-notes.md)
- Created FR-1: Initial FliGen Harness Setup
- Set up prd/, uat/, and planning/ directories

### Notes
This is Day 1 of the "12 Days of Claudemas" series. The FliGen harness will serve as the foundation for 12 daily tool builds.

---

**Last updated:** 2025-12-28
