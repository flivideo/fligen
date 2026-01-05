# FR-20: Story Builder - Video Assembly

**Day 11 of 12 Days of Claudemas**

## Overview

Story Builder brings together the creative tools from previous days (narration, music, video) into a single cohesive 15-second story. This tool allows users to select existing assets and combine them into a final assembled video.

## Background

Day 11 represents the culmination of the creative journey:
- **Days 1-3:** Foundation (Harness, Brains)
- **Days 4-8:** Creative tools (Image, Voice, Video, Music, Thumbnails)
- **Days 9-10:** Integration (Interop, N8N Workflows)
- **Day 11:** Story Assembly - putting it all together

From the video transcript, the concept is a 15-second story made up of three 5-second "beats":
1. **Beat 1 (0-5s):** Iceberg - vibe prompts on surface, code underneath
2. **Beat 2 (5-10s):** Narration, music, images combining into video (Venn diagram)
3. **Beat 3 (10-15s):** 12 gifts of Claudemas - Foundation, Brain, Creative, Integration, Finale

## User Story

**As a** video creator
**I want to** select narration, music, and video files and combine them into one final video
**So that** I can create complete 15-second stories with layered audio

## Requirements

### Asset Selection
- Select **narration file** (optional) - from Day 5 TTS outputs or catalog
- Select **music file** (required) - from Day 7 music library or catalog
- Select **up to 3 video files** - from Day 6 videos, Day 10 N8N outputs, or catalog
- All selections from existing assets (no generation in this tool)

### Video Assembly
- Concatenate selected videos sequentially (video 1 + video 2 + video 3)
- Target duration: ~15 seconds total (3 videos × ~5 seconds each)
- Maintain original video resolution and framerate

### Audio Layering
- **Music track:**
  - Apply to entire video duration (or specified portion)
  - Reduce volume (e.g., 35% of original)
  - User-adjustable volume slider (0-100%)
  - **Start time:** Specify where to start in the music track (default: 0:00)
  - **End time:** Specify where to end in the music track (default: auto - matches video duration)
  - Example: If video is 15s and music is 2:30, user can select seconds 30-45 of the music
- **Narration track (optional):**
  - Apply to entire video duration
  - Keep at full volume (or user-adjustable)
  - Can be omitted if music already has lyrics

### Output
- Combined video file saved to `assets/video-scenes/` or `assets/catalog/videos/`
- Naming pattern: `story-{timestamp}.mp4` or user-provided name
- Save metadata to catalog (videos used, music, narration, assembly date)

## UI Specification

### Layout

```
┌─────────────────────────────────────────────┐
│ Story Builder - Day 11                      │
├─────────────────────────────────────────────┤
│                                             │
│ SELECT ASSETS                               │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🎬 Video 1: [Dropdown or Browse]    │    │
│ │ 🎬 Video 2: [Dropdown or Browse]    │    │
│ │ 🎬 Video 3: [Dropdown or Browse]    │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🎵 Music: [Dropdown or Browse]      │    │
│ │    Volume: [────●────] 35%          │    │
│ │    Start: [0:00] End: [auto]        │    │
│ │    (Duration: 2:15)                 │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🎤 Narration: [Dropdown or Browse]  │    │
│ │    ☐ Include narration              │    │
│ │    Volume: [────●────] 100%         │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [Assemble Video]                            │
│                                             │
│ PREVIEW                                     │
│ ┌─────────────────────────────────────┐    │
│ │                                     │    │
│ │     [Video Preview Player]          │    │
│ │                                     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [Download]  [Save to Catalog]               │
│                                             │
└─────────────────────────────────────────────┘
```

### Asset Browsers
- **Videos:** Load from:
  - Day 6 video generation outputs
  - Day 10 N8N workflow outputs
  - Catalog (type: video)
- **Music:** Load from:
  - Day 7 music library
  - Catalog (type: audio, subtype: music)
- **Narration:** Load from:
  - Day 5 TTS outputs
  - Catalog (type: audio, subtype: narration)

### Assembly Process
1. User selects 1-3 videos
2. User selects music track, adjusts volume, and optionally sets start/end times
3. User optionally selects narration and adjusts volume
4. Click "Assemble Video"
5. Backend processes via FFmpeg (trimming music if start/end specified)
6. Preview displays assembled video
7. User can download or save to catalog

## Technical Implementation

### Backend API Endpoints

#### `POST /api/story/assemble`
Combines videos and audio tracks into final video.

**Request:**
```json
{
  "videos": [
    "assets/video-scenes/001-002-abc123.mp4",
    "assets/video-scenes/002-003-def456.mp4",
    "assets/video-scenes/003-004-ghi789.mp4"
  ],
  "music": {
    "file": "assets/music-library/track-001.mp3",
    "volume": 0.35,
    "startTime": 30.0,
    "endTime": 45.0
  },
  "narration": {
    "file": "assets/narration/narration-001.mp3",
    "volume": 1.0,
    "enabled": false
  },
  "outputName": "story-iceberg-beats"
}
```

**Response:**
```json
{
  "success": true,
  "outputPath": "assets/video-scenes/story-iceberg-beats.mp4",
  "duration": 15.2,
  "catalogId": "sto-20260104-abc123"
}
```

#### FFmpeg Command Pattern

**With narration and music trimming:**
```bash
ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 \
  -ss 30.0 -to 45.0 -i music.mp3 \
  -i narration.mp3 \
  -filter_complex "\
    [0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a0];\
    [3:a]volume=0.35[music];\
    [4:a]volume=1.0[narr];\
    [a0][music][narr]amix=inputs=3:duration=longest[a]" \
  -map "[v]" -map "[a]" output.mp4
```

**Without narration (music trimmed):**
```bash
ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 \
  -ss 30.0 -to 45.0 -i music.mp3 \
  -filter_complex "\
    [0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a0];\
    [3:a]volume=0.35[music];\
    [a0][music]amix=inputs=2:duration=longest[a]" \
  -map "[v]" -map "[a]" output.mp4
```

**Notes:**
- `-ss 30.0` - Start reading music file at 30 seconds
- `-to 45.0` - Stop reading music file at 45 seconds
- If `startTime`/`endTime` not specified, omit these flags (use full music track)
- Position of `-ss` and `-to` before `-i` enables faster seeking

### Server Module Structure

```
server/src/tools/story/
├── types.ts           - AssemblyRequest, AssemblyResult types
├── assembler.ts       - FFmpeg video assembly logic
├── storage.ts         - Save assembled video to catalog
└── index.ts           - Module exports
```

### Frontend Component

```
client/src/components/tools/Day11StoryBuilder.tsx
```

## Dependencies

- **FFmpeg** - Must be installed on server
- Day 5 TTS outputs (optional)
- Day 7 Music library
- Day 6/10 Video outputs
- Unified Asset Catalog (FR-16)

## Acceptance Criteria

- [ ] Can select 1-3 video files from existing assets
- [ ] Can select music file with volume control (0-100%)
- [ ] Can set start/end times for music track (optional)
- [ ] Music duration display shows total track length
- [ ] Can optionally select narration file with volume control
- [ ] Videos concatenate in correct order
- [ ] Music applies to full duration with reduced volume
- [ ] Music trimming works correctly when start/end times specified
- [ ] Narration applies to full duration (when enabled)
- [ ] Assembled video plays in preview player
- [ ] Can download assembled video
- [ ] Can save to asset catalog with metadata
- [ ] Handles missing files gracefully with error messages
- [ ] Shows progress during assembly process

## Out of Scope

- Generating new narration/music (use Days 5 and 7 for that)
- Advanced video editing (cuts, transitions, effects)
- Timeline editing with precise timing
- Multiple audio tracks beyond music + narration
- Video effects or filters

## Success Metrics

- User can create 15-second story in under 2 minutes
- Assembly completes in under 10 seconds
- Audio mixing sounds balanced and clear
- Output video quality matches input quality

## Notes

- This is the simplest viable version - just asset selection + concatenation + audio layering
- Focus on getting the FFmpeg assembly working correctly
- Music volume default: 35% (adjustable)
- Narration volume default: 100% (adjustable)
- Narration is optional because some music tracks may already have lyrics

---

## Completion Notes

**What was done:**
- Created backend story assembly module with FFmpeg integration
- Implemented video concatenation with support for 1-3 videos
- Added music track layering with volume control and start/end time trimming
- Added optional narration track with volume control
- Created catalog storage for assembled videos
- Built Day 11 frontend component with asset selection UI
- Integrated volume sliders for music and narration
- Added music start/end time input fields
- Wired up routing and updated config

**Files created:**
- `server/src/tools/story/types.ts` (new)
- `server/src/tools/story/assembler.ts` (new)
- `server/src/tools/story/storage.ts` (new)
- `server/src/tools/story/index.ts` (new)
- `client/src/components/tools/Day11StoryBuilder.tsx` (new)

**Files modified:**
- `server/src/index.ts` - Added story assembly API endpoint
- `shared/src/index.ts` - Added story assembly types
- `client/src/App.tsx` - Added Day 11 routing
- `shared/src/config.json` - Updated Day 10 to complete, Day 11 to next

**Testing notes:**
- Requires FFmpeg installed on server (`ffmpeg` and `ffprobe` commands)
- Select 1-3 videos from catalog
- Select music track with optional start/end time trimming
- Optionally enable narration track
- Assemble video and preview in player
- Assembled videos saved to `assets/video-scenes/` and catalog

**Dependencies:**
- FFmpeg must be installed (`brew install ffmpeg` or equivalent)
- Assets must exist in catalog (videos, music, narration)

---

**Status:** Complete
**Created:** 2026-01-04
**Last Updated:** 2026-01-04
**Completed:** 2026-01-04
