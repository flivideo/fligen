# Day 11 - Story Builder: Narration + Music + Assembly

**Preliminary Brief** - To be refined when we start Day 11

## Overview

Day 11 takes the visual assets from Day 10 and adds the "story layer" - narration, music, and an assembly plan. This uses our existing Day 5 (ElevenLabs TTS) and Day 7 (Suno Music) tools.

## The Day 11 "Gift"

> "Build Story Pack: one click generates narration + music prompt, and prepares the final assembly."

This is where story becomes the driver.

## Core Concept

```
Day 9 (Job Brief) + Day 10 (Images/Videos)
                    │
                    ▼
            ┌───────────────┐
            │ Story Builder │
            └───────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Narration     Music      Assembly
   (11Labs)     (Suno)       Plan
        │           │           │
        └───────────┴───────────┘
                    │
                    ▼
        /assets/jobs/<jobId>/story_pack/
```

## Minimum Viable Scope

### Inputs
- `jobId` (from Day 9/10)
- `beats.json`
- Existing images/videos from Day 10

### Outputs
Create folder: `/assets/jobs/<jobId>/story_pack/`

Files:
- `narration.txt` - Script text
- `narration.mp3` - ElevenLabs generated audio
- `music_prompt.txt` - Suno prompt
- `music.mp3` - Generated music track
- `shotlist.md` - Human-readable shot list
- `assembly.json` - Timeline for final assembly

## Assembly Plan Schema

### assembly.json
```json
{
  "jobId": "fox-meadow-001",
  "timeline": [
    { "type": "video", "file": "vid12.mp4", "start": 0, "duration": 3 },
    { "type": "video", "file": "vid23.mp4", "start": 3, "duration": 3 },
    { "type": "audio", "file": "narration.mp3", "start": 0 },
    { "type": "audio", "file": "music.mp3", "start": 0, "volume": 0.35 }
  ]
}
```

## UI Spec

### Story Builder Tab
- "Load Job" dropdown
- Buttons:
  - Generate Narration Script
  - Generate Voice (11Labs)
  - Generate Music Prompt
  - Generate Music (Suno)
  - Create Story Pack
  - **Assemble Video** (failsafe option)

### Preview Panels
- Narration text preview + audio player
- Music player
- Shot list preview
- Link to output folder

## Two Paths for Assembly

### Path 1: Steve's N8N (Primary)
- N8N handles FFmpeg stitching
- FliGen just sends `assembly.json`
- Returns final assembled video

### Path 2: FFmpeg Failsafe
- If Steve's N8N assembly isn't ready
- FliGen server calls FFmpeg directly
- Produces basic assembled clip locally

```bash
# Example FFmpeg command for assembly
ffmpeg -i vid12.mp4 -i vid23.mp4 -i narration.mp3 -i music.mp3 \
  -filter_complex "[0][1]concat=n=2:v=1:a=0[v];[3]volume=0.35[m];[2][m]amix=inputs=2[a]" \
  -map "[v]" -map "[a]" output.mp4
```

## Technical Notes

- Day 11 is about **orchestrating existing tools**, not building new ones
- TTS already works (Day 5)
- Music already works (Day 7)
- The "new" part is the workflow integration

## Dependencies

- Day 10 assets must exist (images/videos)
- ElevenLabs API (Day 5)
- Suno/Music API (Day 7)
- FFmpeg installed (for failsafe path)

## Acceptance Criteria

- [ ] Can load job with Day 10 outputs
- [ ] Generates narration script from beats
- [ ] Generates voice MP3 using ElevenLabs
- [ ] Generates music prompt
- [ ] Generates music track using Suno
- [ ] Creates story_pack folder with all files
- [ ] Assembly.json is valid and usable
- [ ] (Failsafe) Can assemble basic video via FFmpeg

## End State

By end of Day 11, we can produce a "mini movie pack":
- 3 images
- 2 transition videos
- Narration audio
- Music track
- Thumbnail (from Day 8)
- Assembly plan ready for final stitch

---

**Status:** Preliminary Brief
**Last Updated:** 2026-01-01
