# Brainstorming Notes

Ideas, exploration, and decisions for FliGen.

## 2025-12-25 - Project Inception

### Concept: 12 Days of Claudemas

Build 12 daily tools using Claude, starting with a foundational harness (FliGen) that provides:
- Consistent tech stack across all days
- Quick iteration capability
- Patterns borrowed from successful sibling projects (FliDeck, FliHub)

### Tech Stack Rationale

**Why React 19 + Vite 6?**
- Modern, fast development experience
- Proven in FliDeck/FliHub
- React 19 has built-in optimizations

**Why TailwindCSS v4?**
- Current in sibling projects
- NOTE: Syntax changed - use `@import "tailwindcss";` NOT `@tailwind base;`

**Why Express 5 + Socket.io?**
- Real-time capabilities from day 1
- Familiar patterns from FliHub
- Lightweight and flexible

**Why npm workspaces?**
- Clean separation of client/server/shared
- Easy to share TypeScript types
- Single `npm run dev` for both services

### Known Issues to Avoid

From learnings in 007-bmad-claude-sdk project:

1. **Tailwind v4 Syntax**: Must use `@import "tailwindcss";` in CSS, not the old `@tailwind base;` directives
2. **Z-index with Radix UI**: Style prop order matters - `style={{ ...props.style, zIndex: 99999 }}`
3. **Port Confusion**: Clearly document which port is client vs server

### Port Strategy

Following FliDeck/FliHub patterns (52xx range):
- TBD during implementation - check what ports are available
- Document clearly in README

### Daily Tool Ideas (Future)

Ideas for the 12 days (not committed):
- AI-powered file organizer
- Code snippet manager
- Meeting notes formatter
- Data visualization tool
- API testing dashboard
- Markdown previewer with live sync
- Task tracker with AI categorization
- Screenshot annotation tool
- Local vector search UI
- Diff viewer with AI explanations
- Log analyzer
- Template generator

Each day should be a standalone feature that demonstrates a different capability.

---

## 2025-12-26 - Day Naming Evolution

### Original Plan vs Current
The original "12 Days" plan had:
- Day 2: Kybernesis (Second Brain)
- Day 3: Claude Agent SDK

### Evolved to
The config now uses clearer, purpose-driven names:
- Day 2: **Primary Brain** (Claude Agent SDK) - Master Agent/Orchestrator
- Day 3: **Second Brain** (Kybernesis) - Smart Memory

### Rationale
This reordering makes more sense architecturally:
1. Day 2 establishes the core AI agent capability (SDK integration)
2. Day 3 adds memory/knowledge persistence on top of that foundation

The "Primary Brain" name communicates the orchestrator role better than a specific technology name. "Second Brain" evokes the knowledge management concept clearly.

---

**Last updated:** 2025-12-28
