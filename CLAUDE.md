# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

- `/progress` - Get quick project status
- `/po` - Product Owner mode (requirements, specs)
- `/dev` - Developer mode (implementation)
- `docs/backlog.md` - Active requirements
- `docs/changelog.md` - What's been implemented

---

## Project Overview

FliGen is the foundational harness for the "12 Days of Claudemas" tool building series. It provides a consistent tech stack and development environment for building 12 daily tools.

**Hook**: "Imagine if you could build 12 applications or tools in 12 days using a large language model. Well, on the first day of Claude-mas, my code bot said to me... it's probably possible. I'm AppyDave. Let's see if Claude is correct."

**Tech Stack:**
- React 19 + Vite 6
- TailwindCSS v4
- Express 5 + Socket.io
- TypeScript 5.6+
- npm workspaces

## The 12 Days

| Day | Tool/Focus | APIs/Tech |
|-----|-----------|-----------|
| 1 | **FliGen Harness** | React/Vite, Express, Socket.io |
| 2 | **Kybernesis** (Second Brain) | Claude Agent SDK |
| 3 | **Claude Agent SDK** | Patterns from 007 |
| 4 | **Image Generator** | FAL.AI, KIE.AI |
| 5 | **Text-to-Speech** | 11 Labs |
| 6 | **Video Animation** | KIE.AI (VO3), ComfyUI |
| 7 | **Music Generator** | Suno |
| 8 | **Thumbnail Generator** | Compound tool |
| 9 | **Interop** | FliHub, DAM, FliDeck |
| 10 | **N8N/ComfyUI** | Orchestration |
| 11 | **Story Builder** | Narrative tool |
| 12 | **Final Song** | All tools unite |

**Full details**: See `docs/index.md` and `docs/planning/`

## Commands

```bash
npm install              # Install all workspace dependencies
npm run dev              # Start both server and client concurrently
npm run build            # Build all workspaces
```

## Architecture

**Monorepo Structure** (npm workspaces):
- `client/` - React 19 + Vite + TailwindCSS v4 (port 5400)
- `server/` - Express 5 + Socket.io (port 5401)
- `shared/` - TypeScript types shared between client/server

## Documentation

```
docs/
├── index.md          # START HERE - Master index
├── prd/              # Feature specs (FR-XX.md)
├── uat/              # User acceptance testing results
├── planning/         # 12 Days planning docs
│   ├── claude-agent-sdk-integration.md  # Day 2-3 Guide - SDK patterns, auth, frontend options
│   ├── project-concept-and-candidates.md
│   ├── fligen-harness-and-12-days-framing.md
│   ├── day-0-intro-and-day-1-planning.md
│   ├── multimodal-api-platforms-research.md
│   ├── resources.md
│   └── credits.md
├── backlog.md        # Requirements index
├── changelog.md      # Implementation history
└── brainstorming-notes.md
```

**Key Planning Doc**: `docs/planning/claude-agent-sdk-integration.md` - Covers authentication, authorization, server patterns, frontend options (simple vs full React), and links to 007 reference project.

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/po` | Product Owner - requirements, specs |
| `/dev` | Developer - implementation |
| `/uat` | User acceptance testing |
| `/progress` | Quick project status |
| `/brainstorm` | Creative exploration |

## Critical Notes

### TailwindCSS v4 Syntax

Use the new import syntax:

```css
/* CORRECT */
@import "tailwindcss";

/* INCORRECT (old v3 syntax) */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### TailwindCSS v4 Content Scanning (@source)

**Critical:** Tailwind v4 uses `@source` directive for content scanning. Incorrect patterns will result in missing CSS classes.

```css
/* CORRECT - recursive glob with ./ prefix */
@import "tailwindcss";
@source "./**/*.{js,ts,jsx,tsx}";

/* INCORRECT - these patterns don't work properly */
@source "*.{js,ts,jsx,tsx}";
@source "**/*.{js,ts,jsx,tsx}";
```

**For conditionally rendered components** (modals, dropdowns, etc.), classes may not be detected. Safelist them:

```css
@source inline("m-auto w-96 p-0 backdrop:bg-black/50");
```

**Reference:** [Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)

### Modal Dialogs with TailwindCSS v4

**Root cause:** TailwindCSS v4's preflight removes `margin: auto` from `<dialog>` elements. The browser centers dialogs using `margin: auto` combined with `position: fixed` and `inset: 0`. When preflight resets margin to 0, centering breaks.

**The fix is simple - restore `margin: auto`:**
```tsx
<dialog className="m-auto w-96 rounded-lg bg-slate-800 p-0 backdrop:bg-black/50">
  {/* Content directly inside - no wrapper needed */}
</dialog>
```

**Key points:**
- `m-auto` - restores the margin that preflight removed, enabling native centering
- Do NOT add `fixed`, `inset-0`, `h-screen`, `w-screen` - these break native dialog sizing
- `backdrop:bg-black/50` - styles the native backdrop
- Content goes directly inside, no wrapper div needed

**Alternative - add to base CSS layer:**
```css
@layer base {
  dialog {
    margin: auto;
  }
}
```

**Backdrop click handling:**
```tsx
const handleBackdropClick = (e: React.MouseEvent) => {
  if (e.target === dialogRef.current) {
    onClose();
  }
};
```

**Reference:** [TailwindCSS v4 preflight removes dialog margin](https://github.com/tailwindlabs/tailwindcss/issues/16372)

### Checkbox Styling

Use `accent-{color}` for simple checkbox coloring:

```tsx
// CORRECT - Simple and works
<input type="checkbox" className="w-4 h-4 accent-blue-500" />

// AVOID - Complex form styling that may not render in v4
<input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-blue-500" />
```

### React Context for Shared State

When multiple components need to share state (e.g., settings), use React Context:

```tsx
// contexts/SettingsContext.tsx
export function SettingsProvider({ children }) {
  const [values, setValues] = useState(loadFromStorage());
  // ... update functions
  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// App.tsx - Wrap at top level
<SettingsProvider>
  <AppContent />
</SettingsProvider>
```

This ensures state changes propagate to all consumers immediately.

### Port Allocation

FliGen uses the 54xx range:
- Client: 5400
- Server: 5401

### Related Projects

- **FliDeck** - Presentation viewer (ports 5200/5201)
- **FliHub** - Video recording workflows (port 5101)

Both share similar workspace structure and patterns.
