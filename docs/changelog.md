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
