# FR-13: Prompt Intake and FliHub Interop

**Status:** Pending
**Added:** 2026-01-02

---

## User Story

As a video creator, I want to record my prompts verbally in FliHub and import them into FliGen so that I can build a structured project folder without typing, proving real interoperability between the FliVideo tools.

## Problem

Currently, users must manually type prompts for image generation, editing, and animation. This is inefficient for several reasons:
- Typing long, detailed prompts is time-consuming
- No connection between FliHub (recording tool) and FliGen (generation tool)
- No canonical project structure for multi-stage prompt workflows
- Day 10 (Prompt Refinery) needs a consistent input format

We need a workflow where users can:
1. Talk their prompts in FliHub recordings
2. Import transcripts via API into FliGen
3. Save as a structured project folder
4. Feed this output directly into Day 10's refinement pipeline

This proves true interoperability beyond simple copy buttons - it creates a reusable, permanent workflow tool.

## Solution

Create Day 9 "Prompt Intake" tab in FliGen that:
- Connects to FliHub REST API (port 5101)
- Allows users to specify project code + FliHub chapter/segment IDs
- Provides three import buttons to fetch transcripts for:
  - **Prompt A**: Seed image generation (text-to-image)
  - **Prompt B**: Edit instruction (image-to-image)
  - **Prompt C**: Animation instruction (image-to-video)
- Saves project folder at `/assets/projects/<projectCode>/` with:
  - `project.json` - Metadata and FliHub references
  - `human_prompts.json` - The three imported prompts
  - `source_transcripts.json` - Raw transcripts (optional)

This creates a canonical project structure that Day 10 can consume directly.

## Acceptance Criteria

### UI Components
- [ ] Day 9 tab labeled "Prompt Intake" appears in navigation
- [ ] Project Setup section with text inputs for:
  - Project Code (e.g., "VSS-001")
  - Chapter ID (FliHub chapter name/ID)
- [ ] Segments section with three number inputs:
  - Segment A (for seed image prompt)
  - Segment B (for edit instruction prompt)
  - Segment C (for animation prompt)
- [ ] Three text areas with labels and import buttons:
  - "Human Prompt A (Seed Image)" with [Import A] button
  - "Human Prompt B (Edit Instruction)" with [Import B] button
  - "Human Prompt C (Animation)" with [Import C] button
- [ ] Action buttons:
  - [Load Project] - Opens existing project
  - [Save Project] - Writes JSON files and creates folder

### FliHub Integration
- [ ] Server module at `server/src/tools/flihub/` with REST client
- [ ] API endpoint to fetch transcript by chapter + segment ID
- [ ] Error handling for FliHub connection failures
- [ ] Graceful fallback if FliHub is not running

### Import Functionality
- [ ] Import A button fetches segment A transcript from FliHub
- [ ] Import B button fetches segment B transcript from FliHub
- [ ] Import C button fetches segment C transcript from FliHub
- [ ] Transcripts populate respective text areas
- [ ] Loading state displayed during API calls
- [ ] Error messages shown if import fails

### Project Storage
- [ ] Save Project creates folder at `/assets/projects/<projectCode>/`
- [ ] `project.json` written with metadata and FliHub references
- [ ] `human_prompts.json` written with the three prompts
- [ ] `source_transcripts.json` written with raw transcripts (optional)
- [ ] Project code validation (no spaces, valid filename characters)
- [ ] Success message after save
- [ ] Error message if folder already exists (with overwrite option)

### Load Functionality
- [ ] Load Project button opens file picker or dropdown of existing projects
- [ ] Selecting a project populates all fields from saved JSON
- [ ] Text areas display saved prompts
- [ ] FliHub references restored to segment inputs

### Data Validation
- [ ] Project code is required before save
- [ ] At least one prompt must be entered before save
- [ ] Segment IDs must be valid numbers
- [ ] Chapter ID is required if importing from FliHub

## Technical Notes

### FliHub REST API
- **Base URL**: `http://localhost:5101`
- **Endpoint** (to be confirmed with David): `GET /api/recordings/:id/transcript` or similar
- **Alternative pattern**: `GET /api/chapters/:chapterId/segments/:segmentId/transcript`
- API must return transcript text for a given chapter/segment combination

### Project Folder Structure
```
/assets/projects/<projectCode>/
├── project.json              # Metadata
├── human_prompts.json        # The 3 prompts
└── source_transcripts.json   # Raw transcripts (optional)
```

### project.json Schema
```json
{
  "projectCode": "VSS-001",
  "createdAt": "2026-01-02T10:00:00Z",
  "updatedAt": "2026-01-02T10:05:00Z",
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

### human_prompts.json Schema
```json
{
  "projectCode": "VSS-001",
  "prompt_a": "A serene meadow at golden hour with a small cottage in the distance, wildflowers swaying gently in the breeze...",
  "prompt_b": "Add a quick brown fox running through the grass, creating dynamic motion and energy in the peaceful scene...",
  "prompt_c": "Slow camera push-in toward the cottage, gentle parallax on the grass and flowers, golden light shimmering..."
}
```

### source_transcripts.json Schema (Optional)
```json
{
  "projectCode": "VSS-001",
  "transcripts": {
    "prompt_a": {
      "segmentId": 1,
      "text": "A serene meadow at golden hour...",
      "fetchedAt": "2026-01-02T10:00:00Z"
    },
    "prompt_b": {
      "segmentId": 2,
      "text": "Add a quick brown fox...",
      "fetchedAt": "2026-01-02T10:01:00Z"
    },
    "prompt_c": {
      "segmentId": 3,
      "text": "Slow camera push-in...",
      "fetchedAt": "2026-01-02T10:02:00Z"
    }
  }
}
```

### Why 3 Prompts?

| Prompt | Purpose | Maps To | Day 10 Usage |
|--------|---------|---------|--------------|
| Prompt A | Scene/Location | Seed image | Text-to-image generation |
| Prompt B | Edit instruction | Image variation | Image-to-image editing |
| Prompt C | Animation | Video motion | Image-to-video animation |

This structure supports the full generative workflow from initial concept through final video.

### Server Implementation Strategy

1. Create FliHub client module (`server/src/tools/flihub/`)
2. Add API endpoint: `GET /api/flihub/transcript?chapterId=X&segmentId=Y`
3. Create projects module (`server/src/tools/projects/`)
4. Add API endpoints:
   - `POST /api/projects/save` - Save project with JSON files
   - `GET /api/projects/list` - List existing projects
   - `GET /api/projects/:projectCode` - Load specific project
5. Static file serving for `/assets/projects/` (if needed for later download)

### Client Implementation Strategy

1. Create `Day9PromptIntake.tsx` component
2. Create hooks:
   - `useFlihubImport` - Fetch transcripts from FliHub
   - `useProjectStorage` - Save/load project files
3. Add to App.tsx routing
4. Update `shared/src/config.json` - Mark Day 9 as "next"

### Error Handling

- FliHub not running: Show clear message "FliHub not available (is it running on port 5101?)"
- Invalid chapter/segment: Display API error message
- File system errors: Show save failure reason
- Network timeouts: 10-second timeout with retry option

### UI Mock

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

### Dependencies

- No new npm packages required (use built-in fetch/fs)
- FliHub must be available on port 5101 (coordinate with David)
- File system write permissions for `/assets/projects/` directory

### Reference Projects

- **Day 2-3**: Claude Agent SDK integration pattern
- **Day 4**: API connectivity pattern (FliHub similar to FAL/KIE)
- **Day 6**: Project folder creation (shot list storage pattern)

## Success Metrics

- User can import transcripts from FliHub without typing
- Project folder is created with valid JSON files
- Day 10 can read the project folder directly (validates canonical structure)
- No errors when FliHub is offline (graceful degradation)
- Round-trip works: Save project → Load project → All data restored

## Why This Matters

1. **Proves Interop**: Not just a copy button - real system-to-system integration
2. **Creates canonical structure**: Day 10 knows exactly what format to expect
3. **Reusable forever**: This becomes a permanent workflow tool, not a demo
4. **No typing required**: Talk your prompts, import them, done
5. **Foundation for automation**: This pattern extends to other FliVideo tools

---

## Completion Notes

**What was done:**
- Implemented full Day 9 Prompt Intake feature with FliHub REST API integration
- Created server-side modules for FliHub client and project storage
- Built frontend UI with three prompt text areas and import buttons
- Added project save/load functionality with JSON file persistence
- Integrated FliHub health check and connection status display

**Files created:**
```
server/src/tools/flihub/types.ts         - FliHub API type definitions
server/src/tools/flihub/client.ts        - REST client with health check and transcript fetch
server/src/tools/flihub/index.ts         - Module exports

server/src/tools/projects/types.ts       - Project storage types
server/src/tools/projects/storage.ts     - File system operations for project CRUD
server/src/tools/projects/index.ts       - Module exports

client/src/components/tools/Day9PromptIntake.tsx - Main UI component
```

**Files modified:**
```
shared/src/index.ts                      - Added Project types, FliHub types, ProjectListItem
server/src/index.ts                      - Added FliHub and Projects API endpoints
client/src/App.tsx                       - Added Day 9 routing
shared/src/config.json                   - Updated Day 7/8 to complete, Day 9 to next
```

**API Endpoints Added:**
- `GET /api/flihub/health` - Check FliHub connection status
- `GET /api/flihub/transcript?chapterId=X&segmentId=Y` - Fetch transcript from FliHub
- `GET /api/projects` - List all saved projects
- `GET /api/projects/:projectCode` - Load specific project
- `POST /api/projects/save` - Save project with JSON files

**Testing notes:**
- Build successful with no TypeScript errors
- UI displays FliHub online/offline status
- Import buttons gracefully handle FliHub being unavailable
- Project validation prevents invalid project codes (spaces, special chars)
- Save creates folder structure at `/assets/projects/<projectCode>/` with:
  - `project.json` - Metadata and FliHub references
  - `human_prompts.json` - The three prompts
  - `source_transcripts.json` - Raw transcripts (if imported from FliHub)
- Load functionality populates all fields from saved projects
- Manual entry works even when FliHub is offline

**Known issues/limitations:**
- FliHub API endpoint structure is placeholder and needs confirmation from David
  - Current implementation uses: `GET /api/transcript?chapter=X&segment=Y`
  - May need adjustment based on actual FliHub API
- FliHub must be running on port 5101 for import functionality to work
- No project deletion UI (can be added in future iteration)
- No project rename/duplicate functionality yet

**Status:** Complete - Ready for testing with FliHub when available

---

**Related Documents:**
- [Backlog](../backlog.md)
- [Day 9 Planning Brief](../planning/day-09-interop-brief.md)
- [FR-10: Shot List and Video](fr-10-shot-list-and-video.md) - Project folder pattern reference
