# Day 10 - Prompt Refinery: Claude Agent SDK + N8N Orchestration

**Preliminary Brief** - To be refined when we start Day 10

## Overview

Day 10 loads the human prompts from Day 9 and refines them into machine-ready prompts using Claude Agent SDK. Then it triggers Steve's N8N workflow to generate assets.

## The Day 10 "Gift"

> "Turn human prompts into machine prompts, then hit the workflow."

This is the Prompt Refinery + Orchestration Trigger.

## Video Hook

"Yesterday we imported raw prompts. Today we refine them with Claude and send them to N8N to generate real assets."

## Core Concept

```
Day 9 Output                    Day 10 Refinery
     │                               │
human_prompts.json ──────────► Load Project
     │                               │
     │                          ┌────┴────┐
     │                          │ 9 Text  │
     │                          │  Areas  │
     │                          └────┬────┘
     │                               │
     │    ┌──────────────────────────┼──────────────────────────┐
     │    │                          │                          │
     ▼    ▼                          ▼                          ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│ Human A     │              │ Human B     │              │ Human C     │
│ (seed)      │              │ (edit)      │              │ (animation) │
└──────┬──────┘              └──────┬──────┘              └──────┬──────┘
       │                            │                            │
       ▼                            ▼                            ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│ System A    │              │ System B    │              │ System C    │
│ (editable)  │              │ (editable)  │              │ (editable)  │
└──────┬──────┘              └──────┬──────┘              └──────┬──────┘
       │ Refine                     │ Refine                     │ Refine
       ▼                            ▼                            ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│ Machine A   │              │ Machine B   │              │ Machine C   │
│ (output)    │              │ (output)    │              │ (output)    │
└──────┬──────┘              └──────┬──────┘              └──────┬──────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
                            [ Run Workflow ]
                                    │
                                    ▼
                              N8N Webhook
                                    │
                                    ▼
                            3 Images + 2 Videos
```

## UI Layout

### Tab Name
"Day 10: Prompt Refinery"

### 9 Text Areas (3 columns × 3 rows)

| Row | Prompt A (Seed) | Prompt B (Edit) | Prompt C (Animation) |
|-----|-----------------|-----------------|----------------------|
| **Human** | Imported from Day 9 | Imported from Day 9 | Imported from Day 9 |
| **System** | Editable template | Editable template | Editable template |
| **Machine** | Generated output | Generated output | Generated output |

### Buttons

**Refinement Actions:**
- [Refine A] - Claude refines Human A → Machine A
- [Refine B] - Claude refines Human B → Machine B
- [Refine C] - Claude refines Human C → Machine C
- [Refine All] - Refine all three at once

**Orchestration:**
- [Run Workflow] - Send machine prompts to N8N

## Prompt Refinement Flow

Each "Refine" button:
1. Takes Human Prompt (user's raw input)
2. Combines with System Prompt (template for that prompt type)
3. Calls Claude Agent SDK
4. Outputs Machine Prompt (production-ready)

### System Prompt Examples

**System Prompt A (Image Generator):**
```
You are a prompt engineer for Flux image generation.
Convert the user's description into an optimized image prompt.
Include: style keywords, lighting, composition, quality boosters.
Output only the refined prompt, no explanation.
```

**System Prompt B (Image Editor):**
```
You are a prompt engineer for image-to-image editing.
Convert the user's edit instruction into precise modification language.
Be specific about what to add, change, or enhance.
Output only the refined prompt, no explanation.
```

**System Prompt C (Animator):**
```
You are a prompt engineer for image-to-video generation.
Convert the user's animation description into camera and motion terms.
Include: camera movement, subject motion, timing, transitions.
Output only the refined prompt, no explanation.
```

## N8N Integration

### Webhook Endpoint
```
POST https://n8n.dreamingcomputers.com/webhook-test/...
```

### Request Payload
```json
{
  "project_code": "VSS-001",
  "prompt_a": "<machine prompt A>",
  "prompt_b": "<machine prompt B>",
  "prompt_c": "<machine prompt C>"
}
```

### Optional Extended Payload
```json
{
  "project_code": "VSS-001",
  "prompt_a": "...",
  "prompt_b": "...",
  "prompt_c": "...",
  "style": "cinematic",
  "seed": 12345,
  "ratio": "16:9"
}
```

### Response (Immediate)
```json
{
  "project_code": "VSS-001",
  "runId": "run-123",
  "status": "queued"
}
```

### Response (Completion)
```json
{
  "project_code": "VSS-001",
  "runId": "run-123",
  "status": "complete",
  "assets": {
    "image_1": "https://.../image1.png",
    "image_2": "https://.../image2.png",
    "image_3": "https://.../image3.png",
    "video_12": "https://.../video12.mp4",
    "video_23": "https://.../video23.mp4"
  },
  "meta": {
    "runtime_sec": 240,
    "models": ["flux-kontext-pro", "kling-o1"],
    "cost": 0.42
  }
}
```

## Results UI

After N8N returns results:
- Show image grid (3 images)
- Show video grid (2 videos)
- Download buttons for each
- Save all to project folder

### Output Storage
```
/assets/projects/<projectCode>/outputs/
├── image_1.png
├── image_2.png
├── image_3.png
├── video_12.mp4
├── video_23.mp4
└── results.json
```

## UI Mock

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DAY 10: PROMPT REFINERY                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PROJECT: [VSS-001 ▼]                              [ Load Project ]    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│        PROMPT A (Seed)      PROMPT B (Edit)      PROMPT C (Animation)  │
│                                                                         │
│  HUMAN ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│        │ A serene     │    │ Add a quick  │    │ Slow camera  │       │
│        │ meadow...    │    │ brown fox... │    │ push-in...   │       │
│        └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                         │
│  SYSTEM ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│        │ You are a    │    │ You are a    │    │ You are a    │       │
│        │ prompt eng...│    │ prompt eng...│    │ prompt eng...│       │
│        └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                         │
│        [ Refine A ]        [ Refine B ]        [ Refine C ]            │
│                                                                         │
│  MACHINE ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│        │ Cinematic    │    │ Add dynamic  │    │ Smooth dolly │       │
│        │ golden hour..│    │ orange fox...│    │ forward...   │       │
│        └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  [ Refine All ]                                   [ Run Workflow ]     │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  RESULTS                                          Status: Complete ✓   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  ┌─────────────┐ ┌─────────────┐ │
│  │ Image 1 │ │ Image 2 │ │ Image 3 │  │  Video 1→2  │ │  Video 2→3  │ │
│  │   🖼️    │ │   🖼️    │ │   🖼️    │  │     ▶️      │ │     ▶️      │ │
│  └─────────┘ └─────────┘ └─────────┘  └─────────────┘ └─────────────┘ │
│                                                                         │
│  [ Download All ]                              [ Save to Project ]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technical Notes

### Claude Agent SDK
- Uses local Max plan (already working from Day 2/3)
- Each refine call is independent
- System prompts should be editable and saveable

### N8N Endpoint
- Steve provides the webhook URL
- May need polling for long-running jobs
- We already have polling patterns from Day 6

### What Steve Needs From Us
Simple JSON with the 3 machine prompts. He tells us what else to add.

## Dependencies

- Day 9 project must exist
- Claude Agent SDK (Day 2/3)
- Steve's N8N workflow ready

## Acceptance Criteria

- [ ] Can load project from Day 9
- [ ] 9 text areas display correctly (3×3 grid)
- [ ] System prompts are editable
- [ ] Refine A/B/C calls Claude and populates Machine prompt
- [ ] Refine All processes all three
- [ ] Run Workflow sends to N8N
- [ ] Status polling works (or webhook callback)
- [ ] Results display: 3 images + 2 videos
- [ ] Can download and save outputs

## The Compounding Effect

```
Day 9  = "Talk your prompts → store them"
Day 10 = "Refine prompts → run workflow"
Day 11 = "Turn outputs into story packaging"
Day 12 = "Final compilation + song"
```

This is a **system**, not just "call an API."

---

**Status:** Preliminary Brief
**Last Updated:** 2026-01-02
