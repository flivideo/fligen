# 12 Days of Claude-mas - Index

**Status**: Day 1 starting (December 25, 2025)
**Hook**: "Imagine if you could build 12 applications or tools in 12 days using a large language model. Well, on the first day of Claude-mas, my code bot said to me... it's probably possible. I'm AppyDave. Let's see if Claude is correct."

---

## Day Structure (Revised)

| Day | Tool/Focus | APIs/Tech |
|-----|-----------|-----------|
| 1 | **FliGen Harness** - Scaffolding + Intro | React/Vite, Express, Socket.io |
| 2 | **Kybernesis** - Second Brain | Claude Agent SDK |
| 3 | **Claude Agent SDK** - AI Integration | Claude Agent SDK patterns from 007 |
| 4 | **Image Generator** | FAL.AI, KIE.AI (Flux, Nano Banana) |
| 5 | **Text-to-Speech** | 11 Labs |
| 6 | **Video Animation** | KIE.AI (VO3), ComfyUI patterns |
| 7 | **Music Generator** | Suno via FAL/KIE |
| 8 | **Thumbnail Generator** | Compound (layout + imagery + text) |
| 9 | **Interop** | FliHub, DAM, FliDeck connectors |
| 10 | **N8N/ComfyUI** | Orchestration patterns |
| 11 | **Story Builder** | "A day in the life of..." narrative |
| 12 | **12 Days Song** | Final visual story + generated song |
| 13 | **Wrap-up** | Overview video of all 12 tools |

---

## Documentation Map

### Planning Documents (`planning/`)

| File | Purpose | Status |
|------|---------|--------|
| `claude-agent-sdk-integration.md` | Agent SDK patterns, auth, frontend options | **Day 2-3 Guide** |
| `project-concept-and-candidates.md` | Song metaphors, team, 12 capabilities draft | Reference |
| `day-0-intro-and-day-1-planning.md` | Steve's ComfyUI/N8N workflows, diffusion models | **Most complete** |
| `fligen-harness-and-12-days-framing.md` | FliGen MVP scope, tool modules | Current |
| `multimodal-api-platforms-research.md` | FAL.AI, KIE.AI research | Reference |
| `resources.md` | Links to brains, skills, reference projects | Reference |
| `credits.md` | Video credits checklist | Reference |

### PRD Documents (`prd/`)

| File | Purpose | Status |
|------|---------|--------|
| `fr-01-initial-harness.md` | Day 1: Foundation harness setup | Complete |
| `fr-02-layout-and-navigation.md` | Day 1: Layout shell and sidebar navigation | Pending |

### Other Docs

| File | Purpose |
|------|---------|
| `backlog.md` | Requirements tracking |
| `changelog.md` | Implementation history |
| `brainstorming-notes.md` | Ideas and exploration |

---

## Reference Projects

| Project | Location | What to Learn |
|---------|----------|---------------|
| **007-bmad-claude-sdk** | `/ad/appydave-app-a-day/007-bmad-claude-sdk/` | Claude Agent SDK patterns, **avoid ShadCN pitfalls** |
| **FliHub** | `/ad/flivideo/flihub/` | Menu/asset flow patterns, Socket.io |
| **FliDeck** | `/ad/flivideo/flideck/` | Presentation patterns |
| **Storyline App** | `/ad/storyline-app/` | Video planning |

---

## Tech Stack Decision

```
Client (React/Vite)
    ↕ Socket.io
Server (Express/Node)
    ↕ APIs
External Services (FAL, KIE, 11 Labs, Suno, Claude)
```

### ShadCN Warning (from 007 post-mortem)

**Prefer plain Tailwind CSS over ShadCN** due to:
- TailwindCSS v4 migration complexity
- Radix UI z-index/stacking context issues
- Prop spreading order bugs
- Time lost debugging CSS instead of building features

If using ShadCN:
- Check Tailwind version (v4 syntax: `@import "tailwindcss"`)
- Use inline styles for critical positioning
- Put custom styles AFTER `...props.style` spread

---

## Team

| Person | Role |
|--------|------|
| David | Lead builder, presenter |
| Mary | Team member |
| Jan | Team member |
| Steve | Day 12 integration - ComfyUI workflows |

---

## Quick Links

- **Brand Dave Brain**: `/ad/brains/brand-dave/`
- **Data Collections**: `/ad/brains/brand-dave/data-systems/collections/`
- **Shell Aliases**: `jfli` (FliVideo), `jstory` (Storyline), `jbrains` (Brains)

---

**Last updated**: 2025-12-26
