# Day 9 - Prompt Intake: FliHub to Project

**Preliminary Brief** - To be refined when we start Day 9

## Overview

Day 9 turns spoken prompts (recorded in FliHub) into structured project inputs. Instead of typing prompts, you talk them, import them via FliHub's API, and store them in a project folder.

## The Day 9 "Gift"

> "Talk your prompts → store them as a project."

This proves Interop beyond a copy button - it creates a canonical project structure that Day 10 can consume.

## Video Hook

"I don't want to type prompts. I want to talk, and have the system build the prompt package."

## Core Concept

```
FliHub Recording
    │
    ├── Chapter: "Video Storytelling System"
    │       │
    │       ├── Segment 1: Prompt A (seed image)
    │       ├── Segment 2: Prompt B (edit instruction)
    │       └── Segment 3: Prompt C (animation instruction)
    │
    ▼
FliGen Day 9 UI
    │
    ├── Import A → Human Prompt A text area
    ├── Import B → Human Prompt B text area
    └── Import C → Human Prompt C text area
    │
    ▼
/assets/projects/<projectCode>/
    ├── project.json
    ├── human_prompts.json
    └── source_transcripts.json
```

## UI Layout

### Tab Name
"Day 9: Prompt Intake" (powered by Interop)

### Input Section
| Field | Type | Description |
|-------|------|-------------|
| Project Code | Text input | e.g., `VSS-001` |
| Chapter ID | Text input | FliHub chapter name/ID (shared across segments) |
| Segment A | Number | Segment ID for seed image prompt |
| Segment B | Number | Segment ID for edit instruction prompt |
| Segment C | Number | Segment ID for animation prompt |

### Prompt Section (3 text areas)
| Prompt | Purpose | Import Button |
|--------|---------|---------------|
| Human Prompt A | Scene / Location (seed image) | [Import A] |
| Human Prompt B | Edit instruction (image-to-image) | [Import B] |
| Human Prompt C | Animation instruction (i2v) | [Import C] |

### Actions
- **Import A/B/C** - Pulls transcript from FliHub into respective text area
- **Save Project** - Writes JSON + creates folder
- **Load Project** - Opens existing project (optional)

## Output Schema

### Folder Structure
```
/assets/projects/<projectCode>/
├── project.json         # Metadata
├── human_prompts.json   # The 3 prompts
└── source_transcripts.json  # Raw transcripts (optional)
```

### project.json
```json
{
  "projectCode": "VSS-001",
  "createdAt": "2026-01-02T10:00:00Z",
  "flihub": {
    "chapterId": "Video Storytelling System",
    "segments": {
      "prompt_a": 1,
      "prompt_b": 2,
      "prompt_c": 3
    }
  }
}
```

### human_prompts.json
```json
{
  "projectCode": "VSS-001",
  "prompt_a": "A serene meadow at golden hour with a small cottage...",
  "prompt_b": "Add a quick brown fox running through the grass...",
  "prompt_c": "Slow camera push-in, gentle parallax on the grass..."
}
```

## Technical Notes

### FliHub Integration
- FliHub runs on port 5101
- REST API endpoint: `GET /api/recordings/:id/transcript` (or similar)
- May need to fetch by chapter + segment
- David will ensure API is available

### Why 3 Prompts?
| Prompt | Maps To | Day 10 Usage |
|--------|---------|--------------|
| A | Seed image generation | Text-to-image |
| B | Image editing/variation | Image-to-image |
| C | Animation/video | Image-to-video |

## UI Mock

```
┌─────────────────────────────────────────────────────────────┐
│  DAY 9: PROMPT INTAKE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROJECT SETUP                                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Project Code    │  │ Chapter ID      │                  │
│  │ [VSS-001      ] │  │ [Video Story..] │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  SEGMENTS                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐                                │
│  │ A: 1 │ │ B: 2 │ │ C: 3 │                                │
│  └──────┘ └──────┘ └──────┘                                │
│                                                             │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  HUMAN PROMPT A (Seed Image)                   [Import A]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ A serene meadow at golden hour...                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  HUMAN PROMPT B (Edit Instruction)             [Import B]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Add a quick brown fox running through...            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  HUMAN PROMPT C (Animation)                    [Import C]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Slow camera push-in, gentle parallax...             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Load Project ]                       [ Save Project ]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Dependencies

- FliHub REST API must be available (port 5101)
- API endpoint for fetching transcript by chapter/segment

## Acceptance Criteria

- [ ] Can enter project code and FliHub chapter/segment IDs
- [ ] Import A/B/C buttons fetch transcripts from FliHub
- [ ] Transcripts populate respective text areas
- [ ] Save creates project folder with JSON files
- [ ] Load can restore a previous project
- [ ] Project folder is ready for Day 10 consumption

## Why This Matters

1. **Proves Interop** - Not just a copy button, but real system integration
2. **Creates canonical structure** - Day 10 knows exactly what to expect
3. **Reusable forever** - This becomes a permanent workflow tool
4. **No typing** - Talk your prompts, import them, done

---

**Status:** Preliminary Brief
**Last Updated:** 2026-01-02
