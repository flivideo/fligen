# The Fox and the Lazy Dog

A mini-story project to demonstrate the FliGen tool pipeline: narration, imagery, and video.

## Overview

**Based on:** "The quick brown fox jumps over the lazy dog"

**Purpose:** Create a complete mini-story with:
- Two-beat narrative
- Voice narration (11 Labs)
- Three sequential images (beginning, middle, end)
- Visual continuity for image-to-video generation

---

## Part 1: Story

### Two-Beat Narrative

| Beat | Text |
|------|------|
| 1 | A quick brown fox discovers a lazy hound dozing beneath an old oak tree. |
| 2 | With one graceful leap, the fox soars over the sleeping dog and bounds away down the trail. |

### Full Narration Script

> "A quick brown fox discovers a lazy hound dozing beneath an old oak tree. With one graceful leap, the fox soars over the sleeping dog and bounds away down the trail."

**Duration estimate:** ~8-10 seconds

### Future Requirement

- **FR-09: 11 Labs Text-to-Speech** - Generate narration audio from script

---

## Part 2: Visual Style

### Style Definition

**Name:** Retro Children's Book Illustration

**Influences:**
- 1960s Golden Books illustration
- Adventure Time simplicity
- Classic storybook warmth

**Characteristics:**
- Bold black outlines, confident strokes
- Flat gouache-style color fills (no gradients)
- Simple, stylized shapes
- Friendly, rounded character designs
- Expressive eyes on characters

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Amber | #F59E0B | Fox fur, sunset glow |
| Burnt Orange | #EA580C | Fox accents, warm highlights |
| Cream | #FEF3C7 | Fox chest, light areas |
| Warm Brown | #92400E | Dog fur, tree trunk |
| Soft Green | #84CC16 | Grass, tree foliage |
| Gold | #FBBF24 | Meadow, afternoon light |
| Sky Blue | #7DD3FC | Background sky accents |

### Style Prompt Fragment

Use this as a prefix for all image generation prompts:

```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm sunset palette with amber and soft green, simple stylized shapes, friendly character design
```

### Character Designs

**The Fox:**
- Russet-orange fur with white chest
- Pointed alert ears
- Bright curious eyes
- Bushy tail with white tip
- Lean, agile build

**The Hound:**
- Tan/beige fur
- Floppy ears
- Peaceful, sleepy expression
- Larger, rounder build
- Curled sleeping pose

**The Oak Tree:**
- Gnarled, characterful trunk
- Green-gold foliage
- Single tree, prominent in scene
- Provides shade for sleeping dog

---

## Part 3: Visual Concepts

### Three-Image Sequence

Visual continuity is critical for image-to-video generation. All images must:
- Use identical character designs
- Maintain same setting (dirt country trail, oak tree)
- Show same time of day (late afternoon, golden light)
- Progress along the trail (depth perspective)

| # | Scene | Moment | Composition |
|---|-------|--------|-------------|
| 1 | Beginning | Discovery | Trail perspective. Fox in foreground, sleeping dog ~15m ahead under oak tree. |
| 2 | Middle | The Leap | Dynamic diagonal. Fox mid-air at apex of jump over sleeping dog on the path. |
| 3 | End | Escape | Fox running down the trail away from camera. Dog still asleep behind. |

### Timing with Narration

| Image | Shows During | Narration Text |
|-------|--------------|----------------|
| 1 | 0:00 - 0:04 | "A quick brown fox discovers a lazy hound dozing beneath an old oak tree." |
| 2 | 0:04 - 0:07 | "With one graceful leap, the fox soars over the sleeping dog..." |
| 3 | 0:07 - 0:10 | "...and bounds away down the trail." |

---

## Part 4: Image Prompts

Two variations per scene for selection. Each prompt includes the style fragment.

### Scene 1: Beginning (Discovery)

**Prompt 1A:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm sunset palette. A rustic dirt trail through a countryside setting. In the foreground, a clever russet-orange fox with white chest stands alert, ears forward. About 15 meters ahead on the trail, a lazy tan hound dog sleeps peacefully beneath a gnarled oak tree that overhangs the path. Late afternoon light, depth perspective down the trail.
```

**Prompt 1B:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm amber and soft green palette. A winding country path. A quick brown fox with pointed ears stands in the foreground, spotting something ahead. In the middle distance along the trail, a sleepy beige hound lies curled up under an old oak tree beside the path. Golden hour lighting, sense of depth along the trail.
```

### Scene 2: Middle (The Leap)

**Prompt 2A:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm sunset palette. On a dirt country trail, a russet-orange fox with white chest leaps gracefully in a high arc over a sleeping tan hound dog. The fox is mid-jump, legs extended, dynamic diagonal composition. Oak tree overhanging the path, trail continues into the background, action pose.
```

**Prompt 2B:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm amber tones. A quick brown fox soars through the air above a lazy beige hound who remains peacefully asleep on a country path. Fox at the apex of jump, tail streaming behind, joyful expression. Gnarled oak tree beside the trail, path visible ahead and behind, late afternoon light.
```

### Scene 3: End (Escape)

**Prompt 3A:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm sunset palette. A dirt country trail stretching into the distance. A russet-orange fox with white chest runs down the path away from the viewer, tail flowing behind. In the background near the oak tree, a tan hound dog still sleeps peacefully. Trail disappears into golden light ahead, sense of motion and freedom.
```

**Prompt 3B:**
```
Retro 1960s children's book illustration, bold black outlines, flat gouache colors, warm amber and green palette. A winding country path viewed from behind a running fox. A quick brown fox bounds down the trail into the distance, moving away from camera. Far behind, a lazy beige hound remains curled up sleeping under the old oak tree beside the path. Triumphant escape down the trail.
```

---

## Part 5: Future Requirements

This story plan will spawn the following requirements:

| FR | Capability | Description | Day |
|----|------------|-------------|-----|
| FR-09 | 11 Labs TTS | Generate narration audio from script | 5 |
| FR-10 | Story Image Generation | Generate scene images using prompts above | TBD |
| FR-11 | Story Assembly | Combine images + audio into preview | TBD |
| FR-12 | Image-to-Video | Generate video transitions between scenes | 6+ |

### FR-09 Scope (Day 5 Focus)

Today's implementation:
- 11 Labs API client
- Voice selection UI
- Text-to-speech generation
- Audio playback in browser
- Save/download audio file

**Input:** Narration script text
**Output:** MP3 audio file

---

## Part 6: Assets Checklist

### To Generate

- [ ] Narration audio (11 Labs) - FR-09
- [ ] Scene 1 images (2 variations) - Future FR
- [ ] Scene 2 images (2 variations) - Future FR
- [ ] Scene 3 images (2 variations) - Future FR
- [ ] Final 3-image sequence (best picks) - Future FR
- [ ] Video transitions (if doing image-to-video) - Future FR

### To Store

```
assets/fox-story/
├── audio/
│   └── narration.mp3
├── images/
│   ├── scene-1a.png
│   ├── scene-1b.png
│   ├── scene-2a.png
│   ├── scene-2b.png
│   ├── scene-3a.png
│   └── scene-3b.png
└── video/
    └── (future)
```

---

**Created:** 2025-12-29
**Status:** Planning Complete
**Next:** Create FR-09 for 11 Labs TTS integration
