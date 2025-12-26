# 12 Days of Claude-mas - Resources

Quick reference pointing to source-of-truth locations. Don't duplicate - reference.

---

## Context Brains (Source of Truth)

**Location**: `/ad/brains/brand-dave/`

| File | What it contains |
|------|------------------|
| `INDEX.md` | Navigation hub - start here |
| `operations.md` | Master ecosystem reference (1200 lines) |
| `12-days-brainstorming.md` | Tool planning framework (900 lines) |
| `flivideo-filenamer-chatgpt-handover.md` | FileNamer handoff context |

**Data schemas**: `/ad/brains/brand-dave/data-systems/schemas/`
- `dam-brand-schema.json`
- `storyline-project-schema.json`

---

## Live Skills (Query Running Apps)

| Skill | App | Use for |
|-------|-----|---------|
| `querying-flihub` | FliHub | Projects, recordings, transcripts, chapters |
| `managing-assets` | DAM | Video projects, brands, S3, backups |
| `gathering-context` | - | Collect files for AI context |

**To use**: Ask Claude to invoke the skill, e.g., "Use the querying-flihub skill to show current projects"

---

## Reference Projects

### 007-bmad-claude-sdk

**Location**: `/ad/appydave-app-a-day/007-bmad-claude-sdk/`

**What it is**: Self-editing web app demo using Claude Agent SDK + BMAD Method (b64 video)

**Status**: BMAD artifacts complete (brief, PRD), NO application code exists yet

---

#### Area 1: Full Chatbot UI (Heavy - likely out of scope for MVP)

**What it includes**:
- React 19 + Vite + shadcn/ui + Vercel AI Elements
- Express server + Socket.io streaming
- NPM Workspaces monorepo
- 3 Epics, 14 Stories to implement
- ~250 lines of framework code

**Key docs**:
- `docs/brief.md` - Project spec (564 lines)
- `docs/prd.md` - 14 stories with acceptance criteria (646 lines)
- `CLAUDE.md` - Full project context

**Use if**: You want a full chat interface with streaming

---

#### Area 2: Simple Claude Agent SDK Calls (Light - useful for MVP)

**What it includes**:
- Minimal SDK usage pattern
- 38 lines of code
- One-shot prompt completions
- No UI complexity

**Key file**: `docs/planning/spike/test-minimal.mjs`

**Pattern**:
```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: "your prompt here",
  options: { maxTurns: 1 }
})) {
  // handle response
}
```

**Auth options**:
- `export ANTHROPIC_API_KEY="sk-ant-..."`
- `claude auth login` (OAuth)

**Use if**: You just need to call Claude from your app without chat UI overhead

---

## API Platforms (for media generation)

See: `multimodal-api-platforms-research.md` in this folder

**Quick picks**:
- **fal.ai** - 600+ diffusion models (image/video/audio/3D)
- **kie.ai** - Multimodal aggregator (Veo, Flux, Suno)

---

## Credits (for videos)

See: `credits.md` in this folder

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `project-concept-and-candidates.md` | **PRIMARY** - Core concept, song background, candidates |
| `day-0-intro-and-day-1-planning.md` | Intro video + Day 1 tech stack + Steve's workflows |
| `fligen-harness-and-12-days-framing.md` | FliGen MVP scope, tool modules |
| `multimodal-api-platforms-research.md` | fal.ai, kie.ai research |
| `credits.md` | Video credits checklist |

---

## Navigation Aliases

From `/ad/davidcruwys/shell-aliases-guide.md`:

| Alias | Destination |
|-------|-------------|
| `jfli` | FliVideo |
| `jstory` | Storyline App |
| `jad-tools` | AppyDave CLI tools |
| `jbrains` | Brains folder |

---

## Key Insight

The 12 Days of Claude-mas builds video/presentation tools. Your infrastructure:
- **FliHub** - what you're recording
- **DAM** - where assets live
- **Storyline** - narrative structure
- **007 SDK pattern** - how to call Claude from apps (Area 2: minimal)

Query the apps via skills. Reference the brains.
