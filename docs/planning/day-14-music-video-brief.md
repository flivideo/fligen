# Day 14 - Music Video: Standalone 12 Days Song

**Preliminary Brief** - To be refined when we start Day 14

## Overview

Day 14 is an optional "bonus" day that creates a professional, standalone music video for the "12 Days of Claude-mas" song. This could be released as a YouTube Short or standalone video, separate from the main Day 12 episode.

## The Day 14 "Gift"

> "A polished music video that stands alone as content."

## Core Concept

Take the song generated in Day 12 and create a visual companion piece:
- Each verse/day gets its own visual
- Professional feel, not dev-log style
- Could be a YouTube Short (60s) or full video (2-3min)

## Two Approaches

### Approach A: Generated Visuals
Use our existing tools (Day 4 image gen, Day 6 video gen) to create:
- 12 images representing each day's "gift"
- Transition animations between days
- Text overlays with the lyrics

### Approach B: Screen Capture + Motion Graphics
- Clean screenshots of each day's UI
- Motion graphics/animations added in post
- More "professional software demo" feel

### Hybrid Approach
- Mix of generated art + screen captures
- Use generated visuals for abstract concepts
- Use screen captures for concrete tool demos

## Output Formats

### YouTube Short Version (60s)
- Condensed highlights
- Fast cuts (5s per day)
- Hook in first 3 seconds
- Vertical format (9:16)

### Full Music Video (2-3min)
- Full song duration
- Each day gets proper screen time
- Horizontal format (16:9)
- More atmospheric/cinematic

## Visual Style Options

### Style 1: Retro Gaming
- Pixel art representations
- 8-bit aesthetic
- Matches FliGen's quest progress UI

### Style 2: Clean Modern
- Minimal, Apple-style presentations
- White/dark backgrounds
- Focus on the tools

### Style 3: Festive/Christmas
- Holiday color palette
- Snowflakes, decorations
- Warm, celebratory feel

### Style 4: Comic/Illustrated
- AppyDave brand colors
- Bold outlines
- Cartoon representations of concepts

## Pipeline

```
Day 12 Song
    │
    ├── Generate/collect 12 visuals (one per day)
    ├── Add text overlays (lyrics)
    ├── Add transitions
    ├── Sync to music
    │
    ▼
/assets/music-video/
    ├── visuals/
    │   ├── day-01.png (or .mp4)
    │   ├── day-02.png
    │   └── ...
    ├── project-file.json (timeline)
    └── exports/
        ├── short-version.mp4
        └── full-version.mp4
```

## Technical Options

### Option 1: FFmpeg Assembly
- Use FliGen's FFmpeg failsafe
- Script the entire assembly
- Automated but limited effects

### Option 2: N8N + FFmpeg
- Steve's pipeline handles assembly
- More sophisticated transitions
- Better timing sync

### Option 3: Manual Post-Production
- Export assets from FliGen
- Edit in DaVinci Resolve / Premiere
- Most control, most effort

### Option 4: AI Video Tools
- Use Day 6 video generation
- Generate animated segments
- Stitch together programmatically

## Deliverables

- [ ] 12 visuals (images or short clips)
- [ ] Text overlay design
- [ ] Timeline/project file
- [ ] YouTube Short export (60s, 9:16)
- [ ] Full video export (2-3min, 16:9)
- [ ] Thumbnail for the video

## Integration with FliGen

Could add a "Music Video Builder" tool that:
- Loads the Day 12 song
- Lets you assign visuals to each verse
- Generates timeline
- Exports to FFmpeg or N8N

Or keep it simpler:
- Just generate/collect the assets in FliGen
- Do final assembly in post

## Acceptance Criteria

- [ ] Song and visuals are synced properly
- [ ] Each day is clearly represented
- [ ] Professional enough to stand alone
- [ ] At least one export format complete
- [ ] Ready for YouTube upload

## Notes

This is a "bonus" day - it only happens if:
1. Day 12 song is good
2. There's time and energy
3. The visuals are compelling

The goal is to have a piece of content that:
- Can be shared independently
- Shows off what FliGen can do
- Feels like a celebration, not a demo

---

**Status:** Preliminary Brief (Optional Day)
**Last Updated:** 2026-01-01
