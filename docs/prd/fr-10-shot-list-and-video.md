# FR-10: Shot List and Video Generation

**Created:** 2025-12-30
**Status:** Pending
**Day:** 4 (modification) + Day 6 (new)

---

## Overview

Add a persistent shot list feature that allows users to collect generated images across sessions, then use those images to generate transition videos on Day 6. Images clicked in the Day 4 comparison grid are saved to the server and displayed as a horizontal thumbnail strip. Day 6 uses drag-and-drop to select start/end frames for video generation.

---

## User Stories

**As a content creator**, I want to click on images I like and add them to a shot list, so that I can collect the best images across multiple generation sessions.

**As a content creator**, I want my shot list to persist when I navigate between pages or refresh the browser, so that I don't lose my selections.

**As a content creator**, I want to generate a video transition from one image to another by selecting a start frame and end frame, so that I can create animated sequences between story scenes.

---

## Part 1: Shot List Infrastructure

### 1.1 Server-Side Storage

**Directory Structure:**
```
assets/
├── fox-story/
│   ├── audio/
│   │   └── narration.mp3
│   ├── images/           # Scene images (future)
│   └── video/            # Story videos (future)
├── shot-list/            # NEW: Persistent shot storage
│   ├── shot-001.png
│   ├── shot-002.png
│   └── ...
└── video-scenes/         # NEW: Generated transition videos
    ├── 1-2.mp4           # Transition from shot 1 to shot 2
    ├── 2-3.mp4
    └── ...
```

**Shot Metadata:**
Each shot is stored with metadata in a JSON index file:

```
assets/shot-list/index.json
```

```json
{
  "shots": [
    {
      "id": "shot-001",
      "filename": "shot-001.png",
      "prompt": "Retro 1960s children's book illustration...",
      "provider": "fal",
      "model": "flux-pro-v1.1",
      "createdAt": "2025-12-30T10:30:00Z",
      "width": 1024,
      "height": 1024
    }
  ]
}
```

### 1.2 Server API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shots` | GET | List all shots (returns index.json data + URLs) |
| `/api/shots` | POST | Add image to shot list (accepts image URL or base64) |
| `/api/shots/:id` | DELETE | Remove shot from list |
| `/api/shots/clear` | DELETE | Clear all shots |

**POST /api/shots Request:**
```json
{
  "imageUrl": "https://fal.media/files/...",
  "prompt": "Retro 1960s...",
  "provider": "fal",
  "model": "flux-pro-v1.1",
  "width": 1024,
  "height": 1024
}
```

**POST /api/shots Response:**
```json
{
  "id": "shot-003",
  "filename": "shot-003.png",
  "url": "/assets/shot-list/shot-003.png"
}
```

### 1.3 Socket.IO Events

Real-time sync across browser tabs/refreshes:

| Event | Direction | Payload |
|-------|-----------|---------|
| `shots:list` | Server→Client | Full shot list on connect |
| `shots:added` | Server→Client | New shot added |
| `shots:removed` | Server→Client | Shot removed |
| `shots:cleared` | Server→Client | All shots cleared |

---

## Part 2: Day 4 UI Modifications

### 2.1 Clickable Images

Each image in the 2×2 comparison grid becomes clickable:

**Interaction:**
- Hover: Show `+ Add to Shots` overlay
- Click: Image is downloaded to server, added to shot list
- After add: Show `✓ Added` indicator briefly

**Visual States:**
```
┌────────────────────────┐     ┌────────────────────────┐
│                        │     │                        │
│       [Image]          │     │       [Image]          │
│                        │     │     ✓ Added            │
│    + Add to Shots      │     │                        │
│      (on hover)        │     │      (after click)     │
└────────────────────────┘     └────────────────────────┘
```

### 2.2 Shot List Strip

Positioned between "Generate All" button and the FAL.AI/KIE.AI headings:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Prompt: ___________________________________________________________    │
│  |Retro 1960s children's book illustration...                       |   │
│                                                                         │
│  [              Generate All              ]                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Shot List (3)                                         [Clear All]│    │
│  │ ┌────┐  ┌────┐  ┌────┐                                          │    │
│  │ │ 🦊 │  │ 🦊 │  │ 🦊 │   ← Thumbnails (64×64px)                 │    │
│  │ │  × │  │  × │  │  × │   ← × removes individual shot            │    │
│  │ └────┘  └────┘  └────┘                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│              FAL.AI                              KIE.AI                 │
│  ┌──────────────────────────┐      ┌──────────────────────────────┐     │
│  │ [Image 1]  + Add         │      │ [Image 2]  + Add             │     │
│  │ Flux Pro v1.1            │      │ Flux Kontext Max             │     │
│  └──────────────────────────┘      └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Shot List                                                        │
│ Click images below to add them to your shot list                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Shot List Component

Reusable `<ShotListStrip />` component that can be used on any page:

```tsx
interface ShotListStripProps {
  onShotClick?: (shot: Shot) => void;  // Optional click handler
  draggable?: boolean;                  // Enable drag-and-drop
}
```

---

## Part 3: Day 6 Video Generation

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Day 6 - Video Generator                                                │
│  Generate video transitions between images                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Shot List (3)                                         [Clear All]│    │
│  │ ┌────┐  ┌────┐  ┌────┐                                          │    │
│  │ │ 1  │  │ 2  │  │ 3  │   ← Drag from here                       │    │
│  │ └────┘  └────┘  └────┘                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │   START FRAME                         END FRAME                  │    │
│  │   ┌─────────────┐                    ┌─────────────┐             │    │
│  │   │             │                    │             │             │    │
│  │   │  Drop here  │      ────────▶     │  Drop here  │             │    │
│  │   │             │                    │             │             │    │
│  │   │             │                    │             │             │    │
│  │   └─────────────┘                    └─────────────┘             │    │
│  │   [Clear]                            [Clear]                     │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Provider: [KIE.AI (Veo 3.1) ▼]    Duration: [5 seconds ▼]              │
│                                                                         │
│  Prompt (optional): ________________________________________________    │
│  |Smooth cinematic transition with natural motion...                |   │
│                                                                         │
│  [              Generate Transition              ]                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │              [Generated Video Player]                            │    │
│  │                     ▶ Play                                       │    │
│  │                                                                  │    │
│  │              0:00 ━━━━━━━━━━━━━━━━━━ 0:05                        │    │
│  │                                                                  │    │
│  │              [Download]  [Add to Story]                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Drag and Drop Interaction

1. User drags shot thumbnail from Shot List strip
2. Drop zones highlight when dragging over
3. Drop onto START FRAME or END FRAME slot
4. Slot displays the dropped image
5. [Clear] button removes image from slot

**Drop Zone States:**
```
Default:          Drag Over:        Filled:
┌───────────┐    ┌───────────┐    ┌───────────┐
│           │    │  ╔═════╗  │    │  [Image]  │
│ Drop here │    │  ║ ▼▼▼ ║  │    │           │
│           │    │  ╚═════╝  │    │  Shot 1   │
└───────────┘    └───────────┘    └───────────┘
                  (highlight)       [Clear]
```

### 3.3 Video API Integration

#### KIE.AI - Veo 3.1

**Endpoint:** `POST https://api.kie.ai/api/v1/veo/generate`

**Request:**
```json
{
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "imageUrls": [
    "https://our-server/assets/shot-list/shot-001.png",
    "https://our-server/assets/shot-list/shot-002.png"
  ],
  "prompt": "Smooth cinematic transition with natural motion",
  "model": "veo3",
  "aspectRatio": "16:9"
}
```

**Response:** Returns taskId, then poll for completion.

#### FAL.AI - Kling O1

**Endpoint:** `fal-ai/kling-video/o1/image-to-video`

**Request:**
```typescript
const result = await fal.subscribe("fal-ai/kling-video/o1/image-to-video", {
  input: {
    prompt: "Smooth transition...",
    first_frame_image_url: "...",
    last_frame_image_url: "...",
    duration: "5"  // or "10"
  }
});
```

#### FAL.AI - Wan 2.1 FLF2V (Alternative)

**Endpoint:** `fal-ai/wan-flf2v`

First-Last-Frame to Video generation.

### 3.4 Server API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video/health` | GET | Check KIE.AI and FAL.AI video API status |
| `/api/video/generate` | POST | Generate transition video |
| `/api/video/status/:taskId` | GET | Poll for generation status |
| `/api/video/list` | GET | List generated videos |

**POST /api/video/generate Request:**
```json
{
  "provider": "kie",
  "startShotId": "shot-001",
  "endShotId": "shot-002",
  "prompt": "Smooth cinematic transition...",
  "duration": 5,
  "model": "veo3"
}
```

**Response:**
```json
{
  "taskId": "video_task_123",
  "status": "processing",
  "estimatedTime": 60
}
```

### 3.5 Video Storage

Generated videos saved to `assets/video-scenes/`:

**Naming Convention:** `{startShotNumber}-{endShotNumber}.mp4`

Examples:
- `1-2.mp4` - Transition from shot 1 to shot 2
- `2-3.mp4` - Transition from shot 2 to shot 3

**Index File:** `assets/video-scenes/index.json`

```json
{
  "videos": [
    {
      "id": "video-001",
      "filename": "1-2.mp4",
      "startShot": "shot-001",
      "endShot": "shot-002",
      "provider": "kie",
      "model": "veo3",
      "duration": 5,
      "createdAt": "2025-12-30T11:00:00Z"
    }
  ]
}
```

---

## Part 4: Technical Implementation

### 4.1 New Files to Create

**Server:**
```
server/src/
├── tools/
│   ├── shots/
│   │   ├── types.ts        # Shot types
│   │   ├── storage.ts      # File system operations
│   │   └── index.ts        # API handlers
│   └── video/
│       ├── types.ts        # Video types
│       ├── kie-client.ts   # KIE.AI Veo integration
│       ├── fal-client.ts   # FAL.AI Kling/Wan integration
│       └── index.ts        # API handlers
```

**Client:**
```
client/src/
├── components/
│   ├── ui/
│   │   └── ShotListStrip.tsx    # Reusable shot list component
│   └── tools/
│       ├── Day4ImageGen.tsx     # Modify existing
│       └── Day6Video.tsx        # New Day 6 component
├── hooks/
│   └── useShots.ts              # Shot list state management
└── contexts/
    └── ShotsContext.tsx         # Global shot state (optional)
```

### 4.2 Shared Types

```typescript
// shared/src/index.ts additions

export interface Shot {
  id: string;
  filename: string;
  url: string;
  prompt: string;
  provider: 'fal' | 'kie';
  model: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface VideoTask {
  id: string;
  filename?: string;
  url?: string;
  startShot: string;
  endShot: string;
  provider: 'fal' | 'kie';
  model: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdAt: string;
}

// Socket events
export interface ShotEvents {
  'shots:list': (shots: Shot[]) => void;
  'shots:added': (shot: Shot) => void;
  'shots:removed': (id: string) => void;
  'shots:cleared': () => void;
}

export interface VideoEvents {
  'video:progress': (data: { taskId: string; progress: number }) => void;
  'video:completed': (video: VideoTask) => void;
  'video:failed': (data: { taskId: string; error: string }) => void;
}
```

### 4.3 API Keys Required

| Provider | Environment Variable | Purpose |
|----------|---------------------|---------|
| FAL.AI | `FAL_KEY` | Already configured (Day 4) |
| KIE.AI | `KIE_API_KEY` | Already configured (Day 4) |

No new API keys needed - reuse existing credentials.

---

## Part 5: Video Provider Comparison

| Feature | KIE.AI Veo 3.1 | FAL.AI Kling O1 | FAL.AI Wan 2.1 |
|---------|----------------|-----------------|----------------|
| First+Last Frame | ✅ | ✅ | ✅ |
| Duration | Up to 8s | 5s or 10s | ~3s |
| Resolution | 720p-1080p | 720p | 480p |
| Cost | ~25% of Google | $0.56 (5s), $1.12 (10s) | ~$0.15 |
| Speed | ~60s | ~45s | ~30s |

**Recommendation:** Start with KIE.AI Veo 3.1 (already integrated for images) and FAL.AI Kling O1 for comparison.

---

## Acceptance Criteria

### Day 4 Modifications

- [ ] Images in comparison grid show "Add to Shots" on hover
- [ ] Clicking an image downloads it to server and adds to shot list
- [ ] Shot list strip displays between Generate button and provider headings
- [ ] Shot list shows thumbnails with × remove buttons
- [ ] "Clear All" button removes all shots
- [ ] Shot list persists on page refresh (loads from server)
- [ ] Shot list syncs across browser tabs via Socket.IO

### Day 6 Video Generation

- [ ] Shot list strip displays at top of Day 6 page
- [ ] Two drop zones for START and END frames
- [ ] Drag shot from list and drop onto frame slot
- [ ] Provider dropdown (KIE.AI Veo 3.1, FAL.AI Kling O1)
- [ ] Duration dropdown (5s, 10s)
- [ ] Optional prompt text input
- [ ] Generate button disabled until both frames selected
- [ ] Progress indicator during generation
- [ ] Video player displays completed video
- [ ] Download button saves video locally
- [ ] Videos saved to server with `1-2.mp4` naming

### API Integration

- [ ] `/api/shots` endpoints working
- [ ] `/api/video/generate` supports both KIE.AI and FAL.AI
- [ ] Async polling for video completion
- [ ] Error handling with user-friendly messages

---

## Out of Scope (Future)

- Audio overlay on videos (Day 5 narration)
- Combining multiple videos into final story
- Video timeline editor
- Re-ordering shots in the shot list
- Shot list folders/categories

---

## References

- [KIE.AI Veo 3.1 API](https://docs.kie.ai/veo3-api/generate-veo-3-video)
- [FAL.AI Kling O1](https://fal.ai/models/fal-ai/kling-video/o1/image-to-video)
- [FAL.AI Wan 2.1 FLF2V](https://fal.ai/models/fal-ai/wan-flf2v)
- [Fox and Lazy Dog Story Plan](../planning/fox-and-lazy-dog-story.md)

---

## Completion Notes

### Implementation Date: 2025-12-30

### Files Created
```
server/src/tools/shots/types.ts
server/src/tools/shots/storage.ts
server/src/tools/shots/index.ts

server/src/tools/video/types.ts
server/src/tools/video/storage.ts
server/src/tools/video/kie-client.ts
server/src/tools/video/fal-client.ts
server/src/tools/video/index.ts

client/src/hooks/useShots.ts
client/src/components/ui/ShotListStrip.tsx
client/src/components/tools/Day6Video.tsx
```

### Files Modified
```
server/src/index.ts
shared/src/index.ts
shared/src/config.json
client/src/App.tsx
client/src/components/tools/Day4ImageGen.tsx
```

### Bug Fixes Applied
| Issue | Root Cause | Fix |
|-------|------------|-----|
| "Image fetch failed" from KIE.AI | External APIs can't access localhost URLs | Convert images to base64 data URLs |
| "FAL_KEY not configured" | Wrong env var name | Changed FAL_KEY → FAL_API_KEY |
| "No video URL in response" | FAL wraps response | Added fallback: result.data?.video?.url |
| Wan FLF2V "Not Found" | Wrong endpoint path | Fixed to fal-ai/wan-flf2v |
| Wan FLF2V "Unprocessable Entity" | Wrong parameter names | start_image_url, end_image_url |

### Video Model Status (Final)
| Model | Provider | Status |
|-------|----------|--------|
| Veo 3.1 | KIE.AI | Working |
| Kling O1 | FAL.AI | Working |
| Wan 2.1 FLF2V | FAL.AI | Working |

### Key Learning
External video APIs (KIE.AI, FAL.AI) cannot fetch images from localhost. Solution: read local shot files and convert to base64 data URLs before sending to external APIs.
