# FR-2: Layout and Navigation

**Status:** Complete
**Added:** 2025-12-25

---

## User Story

As a user of FliGen, I want a consistent layout with sidebar navigation so that I can easily switch between the 12 daily tools and have a clear workspace for each tool's input and output.

## Problem

The Day 1 harness provides a centered landing page, but as we add tools (Days 2-12), we need:
- A way to navigate between tools
- A consistent layout structure each tool can use
- Shared UI areas (header, status bar)
- A pattern for tool-specific content (input/output panels)

Without this foundation, each day would require building navigation from scratch, leading to inconsistent UX and wasted effort.

## Solution

Implement a collapsible sidebar layout with:
- Fixed header with current tool name and global settings
- Collapsible sidebar showing all 12 days/tools
- Main content area split into input and output panels
- Status bar for connection state and progress indicators

This follows patterns from FliHub (tab navigation) and FliDeck (sidebar navigation) but adapted for FliGen's 12-tool structure.

---

## Acceptance Criteria

### Layout Shell

- [ ] Full-height app layout (no scrolling on shell itself)
- [ ] Three main regions: sidebar, header, main content
- [ ] Responsive: sidebar collapses to icons on smaller screens
- [ ] Dark theme using established color palette

### Header Component

- [ ] Fixed at top of main content area
- [ ] Displays: FliGen logo/title, current tool name, day number
- [ ] Settings button (⚙) opens global config modal
- [ ] Sidebar toggle button (hamburger or ◀/▶)
- [ ] Breadcrumb style: "FliGen › Day 4 - Image Generator"

### Sidebar Component

- [ ] Fixed left sidebar, full height
- [ ] Width: 200px expanded, 48px collapsed (icons only)
- [ ] Collapsible via header toggle or edge drag
- [ ] Collapse state persisted to localStorage
- [ ] Lists all 12 days with:
  - Day number
  - Tool name (truncated if needed)
  - Status indicator (pending/active/complete)
- [ ] Current day highlighted (accent color)
- [ ] Hover states on items
- [ ] Click navigates to that day's tool

### Main Content Area

- [ ] Fills remaining space (viewport - sidebar - header)
- [ ] Scrollable if content exceeds viewport
- [ ] Two-panel layout option (input top, output bottom) - resizable
- [ ] Single-panel layout option (tool decides)
- [ ] Consistent padding/margins

### Status Bar

- [ ] Fixed at bottom of main content area
- [ ] Displays:
  - Server connection status (Connected/Disconnected)
  - Current operation status (Idle/Generating/Error)
  - Active API indicator (which service is in use)
- [ ] Status colors: green (ok), yellow (pending), red (error)

### Config Modal

- [ ] Opens from header settings button
- [ ] Overlay modal (centered, dark backdrop)
- [ ] Sections for:
  - API Keys (FAL.AI, KIE.AI, 11 Labs, Suno, Anthropic)
  - Connection settings
  - UI preferences (sidebar default state, theme)
- [ ] Save/Cancel buttons
- [ ] API keys stored securely (server-side .env or encrypted localStorage)
- [ ] Close on Escape key or backdrop click

### Routing

- [ ] Hash-based routing: `#day-1`, `#day-2`, ... `#day-12`
- [ ] URL updates when switching tools
- [ ] Browser back/forward navigation works
- [ ] Default to `#day-1` if no hash

### Keyboard Navigation

- [ ] `Ctrl/Cmd + 1-9` jumps to Days 1-9
- [ ] `Ctrl/Cmd + 0` jumps to Day 10
- [ ] `Ctrl/Cmd + [` / `]` for prev/next day
- [ ] `Escape` closes any open modal
- [ ] `Ctrl/Cmd + ,` opens settings

---

## Technical Notes

### Color Palette

Use CSS custom properties for theming:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f172a;      /* slate-900 */
  --bg-surface: #1e293b;      /* slate-800 */
  --bg-surface-hover: #334155; /* slate-700 */

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;   /* slate-400 */
  --text-muted: #64748b;       /* slate-500 */

  /* Accent */
  --accent-start: #60a5fa;     /* blue-400 */
  --accent-end: #a855f7;       /* purple-500 */

  /* Status */
  --status-success: #4ade80;   /* green-400 */
  --status-warning: #facc15;   /* yellow-400 */
  --status-error: #f87171;     /* red-400 */

  /* Borders */
  --border-subtle: #334155;    /* slate-700 */
}
```

### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx       # Main layout wrapper
│   │   ├── Header.tsx         # Top header bar
│   │   ├── Sidebar.tsx        # Left navigation
│   │   ├── StatusBar.tsx      # Bottom status bar
│   │   └── MainContent.tsx    # Content area wrapper
│   ├── ui/
│   │   ├── ConfigModal.tsx    # Settings modal
│   │   ├── ToolPanel.tsx      # Reusable input/output panel
│   │   └── StatusIndicator.tsx
│   └── tools/
│       ├── Day1Harness.tsx    # Existing landing (refactored)
│       ├── Day2Kybernesis.tsx # Placeholder
│       └── ...
├── hooks/
│   ├── useNavigation.ts       # Hash routing logic
│   ├── useSidebarState.ts     # Collapse state
│   └── useKeyboardNav.ts      # Keyboard shortcuts
└── styles/
    └── theme.css              # CSS custom properties
```

### Sidebar Data Structure

```typescript
interface DayTool {
  day: number;
  name: string;
  shortName: string;      // For collapsed sidebar
  icon: string;           // Emoji or icon component
  status: 'pending' | 'active' | 'complete';
  route: string;          // e.g., '#day-4'
}

const DAYS: DayTool[] = [
  { day: 1, name: 'FliGen Harness', shortName: 'Harness', icon: '🏗️', status: 'complete', route: '#day-1' },
  { day: 2, name: 'Kybernesis', shortName: 'Brain', icon: '🧠', status: 'pending', route: '#day-2' },
  { day: 3, name: 'Claude Agent SDK', shortName: 'SDK', icon: '🤖', status: 'pending', route: '#day-3' },
  { day: 4, name: 'Image Generator', shortName: 'Image', icon: '🖼️', status: 'pending', route: '#day-4' },
  { day: 5, name: 'Text-to-Speech', shortName: 'TTS', icon: '🔊', status: 'pending', route: '#day-5' },
  { day: 6, name: 'Video Animation', shortName: 'Video', icon: '🎬', status: 'pending', route: '#day-6' },
  { day: 7, name: 'Music Generator', shortName: 'Music', icon: '🎵', status: 'pending', route: '#day-7' },
  { day: 8, name: 'Thumbnail Generator', shortName: 'Thumb', icon: '🎨', status: 'pending', route: '#day-8' },
  { day: 9, name: 'Interop', shortName: 'Interop', icon: '🔗', status: 'pending', route: '#day-9' },
  { day: 10, name: 'N8N/ComfyUI', shortName: 'N8N', icon: '⚙️', status: 'pending', route: '#day-10' },
  { day: 11, name: 'Story Builder', shortName: 'Story', icon: '📖', status: 'pending', route: '#day-11' },
  { day: 12, name: '12 Days Song', shortName: 'Song', icon: '🎄', status: 'pending', route: '#day-12' },
];
```

### Reference Patterns

**From FliHub:**
- Hash-based tab navigation pattern
- HeaderDropdown component for menus
- Status indicators with tooltips

**From FliDeck:**
- Sidebar with collapsible sections
- Display mode persistence (localStorage)
- Keyboard navigation patterns

### Accessibility

- Sidebar items have `role="navigation"` and proper `aria-labels`
- Current item has `aria-current="page"`
- Keyboard focus visible on all interactive elements
- Modal traps focus when open
- Status bar uses `role="status"` for screen readers

---

## Visual Reference

### Expanded Sidebar
```
┌──────────────────────────────────────────────────────────┐
│ FliGen › Day 4 - Image Generator              [⚙] [◀]  │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│ 🏗️ Day 1  ✓│  INPUT PANEL                               │
│ 🧠 Day 2   │  ┌─────────────────────────────────────┐   │
│ 🤖 Day 3   │  │ Prompt: [________________]          │   │
│ 🖼️ Day 4  ●│  │ Style:  [Realistic     ▾]          │   │
│ 🔊 Day 5   │  │ [Generate]                          │   │
│ 🎬 Day 6   │  └─────────────────────────────────────┘   │
│ 🎵 Day 7   │                                             │
│ 🎨 Day 8   │  OUTPUT PANEL                              │
│ 🔗 Day 9   │  ┌─────────────────────────────────────┐   │
│ ⚙️ Day 10  │  │                                     │   │
│ 📖 Day 11  │  │      [Generated Image Here]         │   │
│ 🎄 Day 12  │  │                                     │   │
│            │  └─────────────────────────────────────┘   │
├────────────┴─────────────────────────────────────────────┤
│ ● Connected │ Idle │ FAL.AI                              │
└──────────────────────────────────────────────────────────┘
```

### Collapsed Sidebar
```
┌──────────────────────────────────────────────────────────┐
│ FliGen › Day 4 - Image Generator              [⚙] [▶]  │
├────┬─────────────────────────────────────────────────────┤
│ 🏗️ │                                                     │
│ 🧠 │  INPUT PANEL                                        │
│ 🤖 │  ...                                                │
│ 🖼️●│                                                     │
│ 🔊 │  OUTPUT PANEL                                       │
│ 🎬 │  ...                                                │
│ 🎵 │                                                     │
│ 🎨 │                                                     │
│ 🔗 │                                                     │
│ ⚙️ │                                                     │
│ 📖 │                                                     │
│ 🎄 │                                                     │
├────┴─────────────────────────────────────────────────────┤
│ ● Connected │ Idle │ FAL.AI                              │
└──────────────────────────────────────────────────────────┘
```

---

## Success Metrics

- User can navigate between all 12 days using sidebar
- Sidebar collapse state persists across page reloads
- URL hash updates and browser navigation works
- Keyboard shortcuts work for power users
- Config modal saves and retrieves settings
- Status bar reflects actual connection state
- Layout works on screens 1024px and wider

---

## Out of Scope (Future)

- Mobile-first responsive design (tablet/phone)
- Drag-and-drop sidebar reordering
- Custom themes beyond dark mode
- Tool-specific sidebar sections
- Multi-window/tab sync

---

**Related Documents:**
- [FR-1: Initial Harness](fr-01-initial-harness.md)
- [Backlog](../backlog.md)
- [Planning Index](../index.md)
