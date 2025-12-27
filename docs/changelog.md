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

**Last updated:** 2025-12-27
