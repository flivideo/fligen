# FR-15: Prompt Refinement UI (Day 10 Enhancement)

**Status:** Complete ✅
**Created:** 2026-01-03
**Completed:** 2026-01-03
**Priority:** High
**Related:** FR-14 (Day 10 N8N Workflow)

---

## User Story

As a video content creator, I want to refine my human prompts into machine-optimized prompts using Claude Agent SDK, so that I can generate higher-quality images and videos from the N8N workflow.

---

## Problem

Currently, Day 10 sends raw human prompts directly to the N8N workflow. However, AI image and video generation systems perform better with **machine-optimized prompts** that:
- Have the right level of visual detail
- Use optimal terminology for the model
- Are neither too sparse nor too overwhelming

The solution is a **prompt refinement pipeline**:
1. **Human Prompts** - Natural language from the user
2. **System Prompts** - Compilation templates that guide refinement
3. **Machine Prompts** - Claude-generated, optimized for AI models

---

## Current Behavior (FR-14)

```
┌─────────────────────────────────────┐
│ INPUT • PROMPT INTAKE               │
├─────────────────────────────────────┤
│ [Dropdown: Select Project]  [Load]  │
│                                     │
│ Seed Image:     [textarea]          │
│ Edit Instr:     [textarea]          │
│ Animation:      [textarea]          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ PROCESS • WORKFLOW EXECUTION        │
├─────────────────────────────────────┤
│ [▶ EXECUTE WORKFLOW]                │
└─────────────────────────────────────┘
```

---

## Proposed Behavior (FR-15)

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT • PROMPT INTAKE                                        │
├──────────────────────────────────────────────────────────────┤
│ [Dropdown: Select Project]  [Load Project]                   │
│                                                              │
│ Seed Image:     [textarea - editable]                        │
│ Edit Instr:     [textarea - editable]                        │
│ Animation:      [textarea - editable]                        │
└──────────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────────┐
│ REFINEMENT • PROMPT COMPILATION                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│        Seed System       Edit System       Animation System  │
│    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│    │ You are a   │   │ You are a   │   │ You are a   │     │
│    │ prompt eng..│   │ prompt eng..│   │ prompt eng..│     │
│    └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                              │
│                  [🤖 Generate Machine Prompts]               │
│                                                              │
│      Seed Machine      Edit Machine      Animation Machine  │
│    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│    │ Cinematic   │   │ Add dynamic │   │ Smooth dolly│     │
│    │ golden hour.│   │ orange fox..│   │ forward...  │     │
│    └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────────┐
│ PROCESS • WORKFLOW EXECUTION                                 │
├──────────────────────────────────────────────────────────────┤
│ [▶ EXECUTE WORKFLOW (Human Prompts)]                         │
│ [▶ EXECUTE WORKFLOW (Machine Prompts)] ← NEW                │
└──────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### 1. System Prompts Display
- [ ] After loading project, display **3 system/compiled prompts**
- [ ] System prompts are displayed in **small, read-only text areas**
- [ ] Layout: 3 columns (Seed, Edit, Animation)
- [ ] Each shows the compilation template for that prompt type

### 2. Machine Prompt Generation
- [ ] Add **"Generate Machine Prompts"** button
- [ ] Button disabled until human prompts are loaded
- [ ] Clicking button calls **Claude Agent SDK** with:
  - Human Prompt A + System Prompt A → Machine Prompt A
  - Human Prompt B + System Prompt B → Machine Prompt B
  - Human Prompt C + System Prompt C → Machine Prompt C
- [ ] Show loading state during generation
- [ ] Display generated machine prompts in 3 text areas below system prompts

### 3. Six-Panel Layout
- [ ] **Top row:** 3 system prompts (read-only, small)
- [ ] **Bottom row:** 3 machine prompts (read-only, small)
- [ ] 3 columns: Seed | Edit | Animation
- [ ] Text areas sized for observation, not editing
- [ ] Clear labels for each panel

### 4. Workflow Execution Options
- [ ] Keep existing **"Execute Workflow (Human Prompts)"** button
- [ ] Add new **"Execute Workflow (Machine Prompts)"** button
- [ ] Machine prompts button disabled until prompts are generated
- [ ] Each button sends respective prompts to N8N webhook
- [ ] Results display works with both prompt types

---

## Technical Implementation

### System Prompts (Hard-coded Templates)

**Seed Image System Prompt:**
```
You are a prompt engineer for Flux image generation.
Convert the user's description into an optimized image prompt.
Include: style keywords, lighting, composition, quality boosters.
Output only the refined prompt, no explanation.
```

**Edit Instruction System Prompt:**
```
You are a prompt engineer for image-to-image editing.
Convert the user's edit instruction into precise modification language.
Be specific about what to add, change, or enhance.
Output only the refined prompt, no explanation.
```

**Animation System Prompt:**
```
You are a prompt engineer for image-to-video generation.
Convert the user's animation description into camera and motion terms.
Include: camera movement, subject motion, timing, transitions.
Output only the refined prompt, no explanation.
```

### Claude Agent SDK Integration

**Function:** `generateMachinePrompts(humanPrompts, systemPrompts)`

**Process:**
1. For each prompt (A, B, C):
   ```
   const messages = [
     { role: 'system', content: systemPrompts[i] },
     { role: 'user', content: humanPrompts[i] }
   ];

   const machinePrompt = await claudeAgentSDK.generate(messages);
   ```

2. Return array of 3 machine prompts

**API Endpoint:** `POST /api/prompts/refine`

**Request:**
```json
{
  "humanPrompts": {
    "seed": "...",
    "edit": "...",
    "animation": "..."
  }
}
```

**Response:**
```json
{
  "machinePrompts": {
    "seed": "...",
    "edit": "...",
    "animation": "..."
  }
}
```

### UI Component Structure

**New Section:** `<PromptRefinementPanel>`

```tsx
interface PromptRefinementPanelProps {
  humanPrompts: {
    seed: string;
    edit: string;
    animation: string;
  };
  onMachinePromptsGenerated: (prompts: MachinePrompts) => void;
}
```

**State:**
- `systemPrompts` - hard-coded templates
- `machinePrompts` - generated by Claude
- `generating` - loading state

---

## UI Mockup

```
┌────────────────────────────────────────────────────────────────────┐
│ 02 • REFINEMENT • PROMPT COMPILATION                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SYSTEM PROMPTS (Templates)                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Seed System      │  │ Edit System      │  │ Animation System │ │
│  │                  │  │                  │  │                  │ │
│  │ You are a prompt │  │ You are a prompt │  │ You are a prompt │ │
│  │ engineer for...  │  │ engineer for...  │  │ engineer for...  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                    │
│                  [🤖 Generate Machine Prompts]                     │
│                                                                    │
│  MACHINE PROMPTS (Claude-Generated)                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Seed Machine     │  │ Edit Machine     │  │ Animation Machine│ │
│  │                  │  │                  │  │                  │ │
│  │ Cinematic wide   │  │ Add dynamic      │  │ Smooth dolly     │ │
│  │ shot golden hour │  │ orange fox leap..│  │ forward push...  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files
- `server/src/tools/prompts/system-prompts.ts` - Hard-coded templates
- `server/src/tools/prompts/refine.ts` - Claude Agent SDK refinement
- `server/src/tools/prompts/index.ts` - Module exports
- `client/src/components/tools/PromptRefinementPanel.tsx` - New UI panel

### Modified Files
- `server/src/index.ts` - Add `POST /api/prompts/refine` endpoint
- `client/src/components/tools/Day10N8N.tsx` - Integrate refinement panel
- `shared/src/index.ts` - Add MachinePrompts type

---

## Dependencies

- FR-14 (Day 10 N8N Workflow) must be complete
- Claude Agent SDK (from FR-03) already integrated
- System prompts need to be defined and tested

---

## Success Metrics

- [ ] User can generate machine prompts with one click
- [ ] Machine prompts are visibly different from human prompts
- [ ] Both human and machine prompts can be sent to N8N
- [ ] Results quality improves with machine prompts (subjective)

---

## Future Enhancements (Out of Scope)

- Make system prompts editable and saveable
- A/B comparison of results from human vs machine prompts
- Save machine prompts to project files
- "Refine All" button for batch generation

---

## Notes

- System prompts are **static templates** (not generated)
- Machine prompts are **generated per-session** (not persisted)
- This implements the Human → System → Machine pipeline from Day 10 planning doc
- Builds on existing Day 10 foundation, adding refinement layer

---

## Completion Notes (2026-01-03)

### Implementation Summary

✅ **Backend Infrastructure**
- Created `server/src/tools/prompts/system-prompts.ts` with three hard-coded templates
- Created `server/src/tools/prompts/refine.ts` using Claude Agent SDK `query()` API
- Created `server/src/tools/prompts/index.ts` for module exports
- Added `GET /api/prompts/system` endpoint to serve templates
- Added `POST /api/prompts/refine` endpoint for Claude refinement
- Added `MachinePrompts`, `RefinePromptsRequest`, `RefinePromptsResponse` types to `shared/src/index.ts`

✅ **Frontend Implementation**
- Created `PromptRefinementPanel.tsx` with 6-panel layout (3 system + 3 machine prompts)
- Integrated panel into `Day10N8N.tsx` between INPUT and PROCESS sections
- Modified `handleGenerate()` to accept `mode: 'human' | 'machine'` parameter
- Added two workflow execution buttons: Human Prompts (blue) and Machine Prompts (amber)
- Machine prompts button disabled until prompts are generated

✅ **Claude Agent SDK Integration**
- Uses `query()` function with `Options` interface (not `Agent` class)
- Runs three refinements in parallel using `Promise.all()`
- Each refinement uses `maxTurns: 1` for simple prompt-to-prompt transformation
- Accumulates streaming text from `assistant` messages and `stream_event` deltas

### Technical Details

**System Prompts Structure:**
- Seed: Optimizes for Flux image generation (style, lighting, composition)
- Edit: Optimizes for image-to-image editing (precise modifications)
- Animation: Optimizes for image-to-video (camera movement, subject motion)

**API Flow:**
1. Client loads project → Human prompts populate
2. User clicks "Generate Machine Prompts"
3. Client POSTs to `/api/prompts/refine` with `{ humanPrompts: {...} }`
4. Server calls `refinePrompts()` → 3 parallel Claude Agent SDK queries
5. Server responds with `{ machinePrompts: {...} }`
6. Client displays machine prompts in bottom row of panel
7. User can execute workflow with either human or machine prompts

### Files Created/Modified

**Created:**
- `server/src/tools/prompts/system-prompts.ts` (48 lines)
- `server/src/tools/prompts/refine.ts` (92 lines)
- `server/src/tools/prompts/index.ts` (3 lines)
- `client/src/components/tools/PromptRefinementPanel.tsx` (195 lines)

**Modified:**
- `server/src/index.ts` - Added prompts endpoints (2 routes)
- `client/src/components/tools/Day10N8N.tsx` - Integrated refinement panel, dual workflow buttons
- `shared/src/index.ts` - Added 3 prompt refinement types

### Testing

Server started successfully with all integrations:
- ✓ Claude Agent SDK (FR-15)
- ✓ N8N webhook configured (FR-14)
- ✓ Kybernesis, FAL.AI, KIE.AI, ElevenLabs, Music APIs
- Client: http://localhost:5400/
- Server: http://localhost:5401/

---

**Last Updated:** 2026-01-03
