# FliGen Harness + 12 Days of Claude-mas Framing

Purpose: capture the evolving plan for a reusable creative harness (FliGen), the early-day tools, and how this fits the 12 Days of Claude-mas series.

---

## Overview (Main Points)

- Build the FliGen host harness on Christmas Eve; all tools live inside it.
- Day 1: validate Suno via FAL/KIE and ship fast, simple generators.
- Early tools: image/video/audio/music/tts + FliHub transcript connector.
- Compound tools later: thumbnails, lower-thirds + call-outs, credits.
- Add a day for "animation → video" from the-point scratch files.
- Decide the orchestrator: Kybernesis vs Claude Agent SDK / Claude Code.
- Confirm the first graphics-first deck topic: vOz NAS + DAM integration.

---

## Core Direction

- Build a host application first (Christmas Eve) that becomes the harness for all tools.
- Each tool is a module inside FliGen, not a separate app.
- Keep the 12-day list flexible; experiments can sit in a backup pool.

---

## Day 0 / Day 1 Intent

- Day 0: intro + framing (song metaphor, vision, team)
- Day 1: build the FliGen MVP host/harness (client/server, prompts, basic modules)
- Day 1 output should be fast to produce (Christmas Day constraint)
- Day 1 also validates Suno via FAL or KIE to create the core series song

---

## FliGen (Host Harness) — MVP Scope

Goal: a single UI that can orchestrate creative assets quickly.

Core features for MVP:
- Select module (thumbnail, lower thirds, call-outs, credits)
- Inputs: day number, tool name, hook line, style keyword
- Generate N variants per module
- Save prompt + output metadata for reuse

Implementation note:
- If Kybernesis works, use it as the "second brain / orchestrator."
- If Kybernesis does not work, use Claude Agent SDK (project 0012) or Claude Code directly.
- On Christmas Eve, review existing codebases for patterns:
  - FliDeck + FliHub (menu/asset flow patterns)
  - `007-bmad-claude-sdk` (Claude Agent SDK + Vercel AI chatbot architecture)
  - Prefer Tailwind CSS patterns over ShadCN if possible

---

## Tool Modules (First Wave)

### 1) Simple Generators (Early)

- Text-to-image (FAL/KIE)
- Text-to-video (KIE)
- Text-to-audio / music (Suno via FAL/KIE)
- Text-to-speech (11 Labs or equivalent)

### 2) FliHub Transcription Connector (Early)

Purpose:
- Connect to FliHub
- Pull transcripts for a selected video/project
- Use transcripts to drive content generation across tools

### 3) Thumbnail Layout Tool (Compound, Later)

Thumbnail structure (recurring pattern):
- Background template with simple geometric color blocks
- Full 16:9 generated image as an overlay
- Portrait cut-out overlay (David variants)
- Text headline overlay

Notes:
- Compound tool (layout + imagery + typography)
- Likely not an early entry

### 4) Lower Thirds + Call-Out Cards (Compound)

Use cases:
- Speaker name + role
- Short call-outs in videos
- Clean bullet points for on-screen notes

### 5) Credits / End Slate

Use cases:
- AI tools used (Suno, 11 Labs, FAL/KIE, etc.)
- Contributor thanks
- CTA to the series

### 6) Animation → Video Capture (Day Candidate)

Goal:
- Convert animations in `/Users/davidcruwys/dev/video-projects/v-voz/the-point/data` into video
- Use as a standalone day or demo tool

---

## Presentation Decks (Graphics-First)

Idea: generate decks that are **mostly graphics** rather than text.

Possible early focus:
- Visual explainer on the vOz NAS system and its integration into the DAM system
- Use graphics, icons, and motion/animation to convey structure
- Optional voiceover using 11 Labs

Future expansion:
- Use same approach for each "data system" to turn it into animated visual stories

---

## Music and Voice Timing

Early tooling priorities:
- Suno: generate a musical theme for the series (validate via FAL/KIE on Day 1)
- 11 Labs: voice system ready early for narration

---

## Steve Workflow Integration (Reference)

See `day-0-intro-and-day-1-planning.md` for:
- N8N orchestration pattern
- ComfyUI first-frame → last-frame animation workflow
- Async polling/error handling pattern
- Diffusion/LoRA infographic notes

---

## Data System Location

Absolute path for collections (reference):

`/Users/davidcruwys/dev/ad/brains/brand-dave/data-systems/collections/`

Existing dataset noted:
- `.../claude-plugin-marketplace/current.json`
- `.../collections/index.yaml` (index updated)

---

## Open Questions

- Confirm if the thumbnail generator is Day 1 output or a reusable module only
- Decide if Kybernesis is viable as the second brain/orchestrator
- Confirm the first deck topic: vOz NAS + DAM integration
- Confirm the MVP menu/navigation structure for a multi-tool harness
