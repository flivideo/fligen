# FR-14: Day 10 N8N Workflow Integration (Phase 1)

**Status:** Pending
**Added:** 2026-01-03
**Implemented:** -

---

## User Story

As a video content creator, I want to load my Day 9 prompts (seed image, edit instruction, animation) and trigger Steve's N8N workflow to generate 2 images and 1 video, so that I can create complete video content from my prompts in a single automated workflow.

## Problem

The "12 Days of Claudemas" series needs Day 10 to demonstrate orchestration - taking the intake data from Day 9 and running it through a multi-step N8N workflow that generates production assets. Currently, users would have to manually copy prompts between tools and run each generation step separately.

## Solution

Create a Day 10 page that:
1. Loads the first three prompts from Day 9 intake data (seed image, edit instruction, animation)
2. Displays these prompts in an editable form
3. Provides a "Generate" button that triggers Steve's N8N workflow
4. Waits for the workflow to complete (2-3 minutes)
5. Displays the returned assets (2 images + 1 video) in a simple visualization
6. Allows download/save of generated assets

**Phase 1 Scope:** This FR focuses on the minimal viable integration - load prompts, trigger workflow, display results. Advanced features (prompt refinement with Claude, system prompts, etc.) are deferred to Phase 2.

## Acceptance Criteria

### Loading Intake Data
- [ ] Day 10 page has a project selector (dropdown or input)
- [ ] Can load project from `/assets/projects/<projectCode>/`
- [ ] Reads `human_prompts.json` and populates 3 text areas:
  - Prompt A (seed image)
  - Prompt B (edit instruction)
  - Prompt C (animation)
- [ ] Text areas are editable (in case user wants to tweak before generation)

### N8N Workflow Trigger
- [ ] "Generate" button sends prompts to N8N webhook
- [ ] Request payload includes:
  ```json
  {
    "project_code": "VSS-001",
    "prompt_a": "<seed image prompt>",
    "prompt_b": "<edit instruction>",
    "prompt_c": "<animation prompt>"
  }
  ```
- [ ] Shows loading state while waiting for response
- [ ] Handles long request timeouts (2-3 minutes minimum)

### Results Display
- [ ] Simple visualization showing:
  - 2 generated images (side by side or in grid)
  - 1 generated video (with playback controls)
- [ ] Each asset has a download button
- [ ] Display shows generation metadata (runtime, models used, cost if available)

### Error Handling
- [ ] Shows error message if workflow fails
- [ ] Shows error if project not found
- [ ] Shows error if N8N endpoint unreachable
- [ ] Timeout handling with clear message

### Server Configuration
- [ ] Express server configured with long request timeout (3+ minutes)
- [ ] Body parser limit increased if needed for large responses
- [ ] N8N webhook URL configurable via environment variable

## Technical Notes

### Reference Documentation
- **Day 10 Planning Brief:** `/docs/planning/day-10-orchestration-brief.md`
- **Day 9 Planning Brief:** `/docs/planning/day-09-interop-brief.md`
- **N8N Workflow Details:** To be provided by Steve

### Project Structure
```
/assets/projects/<projectCode>/
├── project.json              # Created in Day 9 (FR-13)
├── human_prompts.json        # Created in Day 9 (FR-13)
└── outputs/                  # Created in Day 10 (this FR)
    ├── image_1.png
    ├── image_2.png
    ├── video_1.mp4
    └── results.json
```

### N8N Integration

**Webhook Endpoint:**
```
POST https://n8n.dreamingcomputers.com/webhook-test/...
```
(Exact URL to be provided by Steve)

**Request Payload:**
```json
{
  "project_code": "VSS-001",
  "prompt_a": "<machine prompt A>",
  "prompt_b": "<machine prompt B>",
  "prompt_c": "<machine prompt C>"
}
```

**Expected Response:**
```json
{
  "project_code": "VSS-001",
  "runId": "run-123",
  "status": "complete",
  "assets": {
    "image_1": "https://.../image1.png",
    "image_2": "https://.../image2.png",
    "video_1": "https://.../video1.mp4"
  },
  "meta": {
    "runtime_sec": 180,
    "models": ["flux-kontext-pro", "kling-o1"],
    "cost": 0.35
  }
}
```

**Note:** Response may be immediate or may require polling. Implementation should handle both synchronous and asynchronous patterns (see Day 6 video generation for polling reference).

### Files to Create/Modify

**New Files:**
```
client/src/components/tools/Day10N8N.tsx     - Day 10 UI component
server/src/tools/n8n/types.ts                - N8N request/response types
server/src/tools/n8n/client.ts               - N8N HTTP client
server/src/tools/n8n/index.ts                - Module exports
```

**Modified Files:**
```
client/src/App.tsx                           - Add Day 10 routing
server/src/index.ts                          - Add N8N API endpoints, timeout config
shared/src/index.ts                          - Add N8N types to shared
shared/src/config.json                       - Update day status
server/.env.example                          - Add N8N_WEBHOOK_URL
```

### Server Timeout Configuration

Express default timeout is 2 minutes (120000ms). Need to extend:

```typescript
// In server/src/index.ts
server.timeout = 240000; // 4 minutes
```

Also extend Socket.io timeout if using real-time updates:
```typescript
io.engine.pingTimeout = 240000;
io.engine.pingInterval = 25000;
```

### API Endpoints

```
GET  /api/n8n/health          - Check N8N endpoint availability
POST /api/n8n/generate        - Trigger workflow, wait for results
GET  /api/n8n/status/:runId   - Poll workflow status (if async)
POST /api/n8n/save-results    - Save results to project folder
```

### Dependencies
- Day 9 (FR-13) must be complete - project structure must exist
- Steve's N8N workflow must be deployed and accessible
- Polling patterns from Day 6 (FR-10) can be reused if needed

### UI Layout (Minimal)

```
┌─────────────────────────────────────────────────────────────┐
│  DAY 10: N8N WORKFLOW INTEGRATION                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROJECT: [VSS-001 ▼]                    [ Load Project ]  │
│                                                             │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  PROMPT A (Seed Image)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ A serene meadow at golden hour...                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PROMPT B (Edit Instruction)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Add a quick brown fox running through...            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PROMPT C (Animation)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Slow camera push-in, gentle parallax...             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Generate ]                                               │
│                                                             │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  RESULTS                              Status: Complete ✓    │
│  ┌──────────────┐ ┌──────────────┐  ┌──────────────────┐   │
│  │   Image 1    │ │   Image 2    │  │     Video 1      │   │
│  │     🖼️       │ │     🖼️       │  │       ▶️         │   │
│  │  [Download]  │ │  [Download]  │  │   [Download]     │   │
│  └──────────────┘ └──────────────┘  └──────────────────┘   │
│                                                             │
│  Runtime: 180s | Models: flux-kontext-pro, kling-o1        │
│  Cost: $0.35                                                │
│                                                             │
│  [ Save All to Project ]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Future Enhancements (Phase 2 - out of scope for this FR)
- Claude-powered prompt refinement (Human → System → Machine)
- Editable system prompt templates
- "Refine A/B/C" buttons for individual prompt enhancement
- Extended metadata (seed, style, ratio parameters)
- Results history across multiple runs

## Completion Notes

_To be filled by developer upon completion._
