# Data Persistence Audit - FliGen Asset Management

**Date:** 2026-01-04
**Purpose:** Analyze what data we're saving, what we're missing, and where we have inconsistencies

---

## Executive Summary

FliGen has **inconsistent data persistence** across tools. We treat it like a **stateless demo** instead of a production asset management system. Critical metadata is missing everywhere, making it impossible to build Day 11 (Story Builder) without historical context.

### The Problem

**Before Day 11 (Story Builder)**, we need to track:
1. Every asset generated (images, audio, videos, thumbnails)
2. All generation parameters (prompts, providers, models, settings)
3. Full history with regeneration tracking
4. Relationships between assets

**Currently:** We have none of this systematically.

---

## Current Folder Structure

```
assets/
├── fox-story/                 # Hard-coded story project (Day 5 demo)
│   ├── audio/
│   │   └── narration.mp3     # ONE audio file, NO metadata
│   ├── images/                # Empty
│   └── video/                 # Empty
│
├── music-library/             # Day 7 (FR-11) ✅ PARTIALLY GOOD
│   ├── index.json             # 8.5MB (base64 audio inline! ❌)
│   ├── music-001.mp3
│   ├── music-002.mp3
│   └── music-003.mp3
│
├── projects/                  # Day 9 (FR-13) ✅ GOOD
│   └── VSS-001/
│       ├── project.json       # Metadata, FliHub reference
│       ├── human_prompts.json # Three prompts
│       └── source_transcripts.json
│
├── shot-list/                 # Day 6 (FR-10) ✅ GOOD
│   ├── index.json             # Complete metadata
│   ├── shot-001.jpg
│   ├── shot-002.jpg
│   └── ...
│
└── video-scenes/              # Day 6 (FR-10) ✅ PARTIAL
    ├── index.json             # Has metadata BUT missing animation prompts
    ├── 001-002.mp4            # Gets overwritten on regeneration!
    ├── 003-002.mp4
    └── ...
```

---

## What We're Saving (Tool by Tool)

### ✅ Day 9 - Prompt Intake (FR-13) - **GOOD**

**Location:** `assets/projects/{projectCode}/`

**Saved:**
- ✅ Project metadata (code, timestamps)
- ✅ FliHub reference (chapter, segment IDs)
- ✅ Human prompts (all three)
- ✅ Source transcripts (optional)

**Missing:**
- ❌ Machine prompts (FR-15 just added these - not saved yet!)

**Verdict:** This is our **best example** of data persistence. Use this pattern.

---

### ✅ Day 6 - Shot List (FR-10) - **GOOD**

**Location:** `assets/shot-list/`

**Saved:**
- ✅ `index.json` with full metadata per shot:
  ```json
  {
    "id": "shot-001",
    "filename": "shot-001.jpg",
    "url": "/assets/shot-list/shot-001.jpg",
    "prompt": "Full prompt text...",
    "provider": "fal",
    "model": "Flux Pro v1.1",
    "width": 1024,
    "height": 1024,
    "createdAt": "2025-12-30T12:17:29.417Z"
  }
  ```

**Missing:**
- ❌ Original generation parameters before adding to shot list
- ❌ History of ALL generated images (only saved when added to shot list)

**Verdict:** Great metadata **when saved**, but only captures images explicitly added to shot list. No generation history.

---

### ⚠️ Day 6 - Video Generation (FR-10) - **PARTIAL**

**Location:** `assets/video-scenes/`

**Saved:**
- ✅ Provider, model, duration
- ✅ Start/end shot references
- ✅ Status tracking (pending/completed/failed)
- ✅ Error messages
- ✅ Timestamps (created, completed)
- ✅ Full regeneration history (all attempts logged)

**Missing:**
- ❌ **Animation prompt** (critical!)
- ❌ Unique filenames per generation (currently overwrites)

**Issues:**
- **Duplicate entries**: Same filename "001-002.mp4" for 11 different generation attempts
- **File overwriting**: Last successful generation overwrites previous file
- **Lost videos**: Earlier successful videos are lost when regenerated

**Example from `index.json`:**
```json
// 11 entries ALL with filename "001-002.mp4"
// But only ONE actual file exists (latest)
{ "id": "video_1767097374616_k04dcm", "filename": "001-002.mp4", "status": "failed" },
{ "id": "video_1767097839589_mg12vl", "filename": "001-002.mp4", "status": "failed" },
...
{ "id": "video_1767098871389_l7u4j4", "filename": "001-002.mp4", "status": "completed" }  // ← Only this one exists
```

**Verdict:** Excellent metadata tracking, but **missing animation prompt** and **filename collision** makes it unusable for history.

---

### ⚠️ Day 7 - Music Library (FR-11) - **PARTIAL**

**Location:** `assets/music-library/`

**Saved:**
- ✅ Provider (fal/kie)
- ✅ Prompt
- ✅ Lyrics (if provided)
- ✅ Audio files (music-001.mp3, music-002.mp3, music-003.mp3)

**Missing:**
- ❌ Style tags
- ❌ Model version
- ❌ Output format
- ❌ BPM settings
- ❌ Instrumental flag
- ❌ Generation timestamp
- ❌ **Meaningful track names** (all say "Track 1")

**Critical Issue:**
- **8.5MB JSON file** - Storing base64-encoded audio INSIDE index.json instead of just referencing files
- This is a **serious architectural problem**

**Example:**
```json
{
  "name": "Track 1",  // ← User complaint: all tracks named this
  "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF...",  // ← 2MB+ base64 string!
  "provider": "kie",
  "prompt": "ช้าง ช้าง ช้าง..."
}
```

**Verdict:** Saves files + basic metadata, but **terrible naming** and **base64 bloat**. Missing half the generation parameters.

---

### ❌ Day 4 - Image Generation (FR-07, FR-08) - **NOTHING SAVED**

**Location:** None

**Saved:**
- ❌ Nothing (only in-memory during session)

**Missing:**
- ❌ Generated images
- ❌ Prompts
- ❌ Provider selection
- ❌ Model used
- ❌ Image dimensions
- ❌ Generation timestamps
- ❌ ANY history whatsoever

**How it works:**
1. User generates image → displays in UI
2. User can add to shot list → THEN it gets saved (see Day 6 above)
3. User doesn't add → **lost forever when page refreshes**

**Verdict:** **Completely ephemeral**. No persistence layer at all.

---

### ❌ Day 5 - Text-to-Speech (FR-09) - **MINIMAL**

**Location:** `assets/fox-story/audio/` (hard-coded demo path)

**Saved:**
- ⚠️ One audio file: `narration.mp3`
- ❌ NO metadata file

**Missing:**
- ❌ Voice selection (which ElevenLabs voice was used?)
- ❌ Narration text
- ❌ Generation timestamp
- ❌ Provider confirmation
- ❌ History of all generated audio
- ❌ Any way to regenerate or edit

**Verdict:** **Hard-coded demo path**. No metadata, no history, no production persistence.

---

### ❌ Day 8 - Thumbnail Generator (FR-12) - **UNKNOWN**

**Location:** Not yet audited (probably nothing)

**Expected Missing:**
- ❌ Generated thumbnails
- ❌ Composition settings
- ❌ Text overlays used
- ❌ Template selection
- ❌ Generation history

**Verdict:** Likely same as Day 4 - nothing saved.

---

### ❌ Day 10 - N8N Workflow (FR-14, FR-15) - **NOTHING SAVED**

**Location:** None

**Saved:**
- ❌ Nothing

**Missing:**
- ❌ The two generated images from N8N
- ❌ The generated video from N8N
- ❌ Input prompts (seed, edit, animation)
- ❌ Refined prompts (FR-15 machine prompts)
- ❌ N8N workflow ID
- ❌ Generation timestamps
- ❌ Success/failure status
- ❌ ANY record of what was generated

**Verdict:** **Completely ephemeral**. User can download files manually, but no history or metadata tracking.

---

## Architectural Problems

### 1. **No Unified Asset Management**

Each tool has **different persistence patterns**:
- Projects: Separate JSON files per project ✅
- Shot list: Single index.json with file refs ✅
- Music: Index.json with base64 audio (bad!) ⚠️
- Images: Nothing ❌
- TTS: Hard-coded path ❌
- N8N: Nothing ❌

**Solution needed:** Unified asset management system.

---

### 2. **Filename Collisions**

**Problem:** Video filenames based on shot pairs: `{start}-{end}.mp4`

Example: `shot-001` → `shot-002` = `001-002.mp4`

**But:** Regenerating overwrites the file!
- First generation: `001-002.mp4` (provider: kie, model: veo3)
- Second generation: `001-002.mp4` (provider: fal, model: kling-o1) ← **overwrites first**

**Result:** Lost videos, lost work, lost money.

**Solution:**
```
001-002-{timestamp}.mp4
// OR
001-002-{unique-id}.mp4
// OR
video-scenes/{video-id}.mp4  (index.json maps id to metadata)
```

---

### 3. **Base64 Audio in JSON**

**Music library `index.json` is 8.5MB** because audio is stored as base64 strings:

```json
{
  "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYw..."  // 2MB+ string!
}
```

**Problems:**
- JSON file is huge and slow to parse
- Duplicates audio data (file exists separately)
- Memory bloat when loading
- Git diffs are useless

**Solution:**
```json
{
  "audioUrl": "/assets/music-library/music-001.mp3",
  "filename": "music-001.mp3"
  // NO base64!
}
```

---

### 4. **Missing Generation History**

**Day 4 (Images):**
- Generate 10 images → only see last one
- No way to go back
- No record of prompts used
- Can't compare results

**Day 5 (TTS):**
- Generate 5 narrations with different voices → only latest one exists
- No record of which voice was best
- Can't A/B test

**Day 10 (N8N):**
- Generate workflow results → gone when page refreshes
- No way to compare human vs machine prompt results
- No history of what worked

---

### 5. **No Relationships Between Assets**

**Problem:** Assets exist in isolation.

Example:
- Shot-001.jpg exists in shot-list
- Video 001-002.mp4 uses shot-001 and shot-002
- But video doesn't link back to actual shot metadata
- If shot-001 is regenerated, video is orphaned

**Need:**
- Asset graph/relationships
- Dependency tracking
- Cascade updates

---

## What Day 11 (Story Builder) Needs

To build stories from assets, we need:

### 1. **Complete Asset Catalog**
- All images ever generated (not just shot list)
- All videos with full metadata
- All audio tracks
- All thumbnails
- Timestamps, costs, providers, models

### 2. **Searchable History**
- Filter by prompt keywords
- Filter by provider/model
- Filter by date range
- Filter by success/failure
- Filter by asset type

### 3. **Asset Relationships**
- Which shots were used in which videos?
- Which prompts generated which images?
- Which machine prompts came from which human prompts?
- Which N8N workflow generated which assets?

### 4. **Versioning**
- Track regenerations
- Compare versions
- Revert to previous versions
- Cost tracking per version

### 5. **Export/Import**
- Export story timeline with all assets
- Share projects with full history
- Archive completed work

---

## Recommended Data Model

### Unified Asset Structure

```typescript
interface Asset {
  id: string;                    // Unique asset ID
  type: 'image' | 'video' | 'audio' | 'thumbnail';
  filename: string;              // Unique filename
  url: string;                   // Server URL

  // Generation metadata
  provider: 'fal' | 'kie' | 'elevenlabs' | 'n8n';
  model: string;
  prompt: string;

  // Status
  status: 'generating' | 'ready' | 'failed' | 'archived';
  error?: string;

  // Timestamps
  createdAt: string;
  completedAt?: string;

  // Relationships
  parentId?: string;             // If regenerated from another asset
  sourceAssetIds?: string[];     // Assets used to create this (e.g., video uses two images)

  // Tool-specific metadata
  metadata: Record<string, any>; // Provider-specific fields

  // Business
  estimatedCost: number;
  generationTimeMs: number;
}
```

### Example: Image Asset

```json
{
  "id": "asset_img_1735567049417",
  "type": "image",
  "filename": "img-1735567049417-fal-flux-pro.jpg",
  "url": "/assets/images/img-1735567049417-fal-flux-pro.jpg",

  "provider": "fal",
  "model": "Flux Pro v1.1",
  "prompt": "Retro 1960s children's book illustration...",

  "status": "ready",

  "createdAt": "2025-12-30T12:17:29.417Z",
  "completedAt": "2025-12-30T12:17:35.891Z",

  "metadata": {
    "width": 1024,
    "height": 1024,
    "seed": 42,
    "guidanceScale": 7.5
  },

  "estimatedCost": 0.05,
  "generationTimeMs": 6474
}
```

### Example: Video Asset

```json
{
  "id": "asset_vid_1767098871389",
  "type": "video",
  "filename": "vid-1767098871389-fal-wan-flf2v.mp4",
  "url": "/assets/videos/vid-1767098871389-fal-wan-flf2v.mp4",

  "provider": "fal",
  "model": "wan-flf2v",
  "prompt": "Smooth dolly forward push, slow zoom...",

  "status": "ready",

  "createdAt": "2025-12-30T12:47:51.389Z",
  "completedAt": "2025-12-30T12:48:35.756Z",

  "parentId": "asset_vid_1767098720775",  // Previous attempt that failed
  "sourceAssetIds": [
    "asset_img_shot_001",  // Start frame
    "asset_img_shot_002"   // End frame
  ],

  "metadata": {
    "duration": 10,
    "fps": 24,
    "resolution": "1024x1024"
  },

  "estimatedCost": 0.12,
  "generationTimeMs": 44367
}
```

### Example: Audio Asset (TTS)

```json
{
  "id": "asset_aud_1735480728123",
  "type": "audio",
  "filename": "aud-1735480728123-elevenlabs-rachel.mp3",
  "url": "/assets/audio/aud-1735480728123-elevenlabs-rachel.mp3",

  "provider": "elevenlabs",
  "model": "eleven_multilingual_v2",
  "prompt": "The quick brown fox jumps over the lazy dog...",

  "status": "ready",

  "createdAt": "2025-12-29T17:48:48.123Z",
  "completedAt": "2025-12-29T17:48:52.456Z",

  "metadata": {
    "voice": "Rachel",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "durationSeconds": 4.2,
    "format": "mp3"
  },

  "estimatedCost": 0.003,
  "generationTimeMs": 4333
}
```

---

## Migration Plan

### Phase 1: Add Asset Tracking (Critical for Day 11)

1. **Create unified assets system**
   - New folder: `assets/catalog/`
   - Single index: `assets/catalog/index.json`
   - Asset files by type: `assets/catalog/{type}/{filename}`

2. **Implement for each tool:**
   - Day 4 (Images): Save every generation
   - Day 5 (TTS): Save every generation
   - Day 8 (Thumbnails): Save every generation
   - Day 10 (N8N): Save workflow results

3. **Migrate existing data:**
   - Shot list → unified catalog (preserve metadata)
   - Video scenes → unified catalog (preserve metadata, add animation prompts)
   - Music library → unified catalog (remove base64, normalize metadata)
   - Projects → keep as-is (reference catalog assets)

### Phase 2: Add History UI

1. **Asset browser component:**
   - Searchable grid view
   - Filter by type, provider, date, status
   - Preview thumbnails
   - Click to view full details

2. **Asset detail view:**
   - Full metadata display
   - Regeneration history
   - Related assets graph
   - Export/download options

3. **Integration:**
   - Day 11 Story Builder can browse all assets
   - Drag & drop assets into timeline
   - Compare versions side-by-side

### Phase 3: Cleanup

1. **Fix filename collisions:**
   - Videos: Use unique IDs instead of shot-pair names
   - All assets: Include timestamp or UUID in filename

2. **Remove base64 audio:**
   - Music library: Store only file references
   - Reduce index.json from 8.5MB to ~50KB

3. **Add missing metadata:**
   - Video scenes: Add animation prompt
   - Music: Add all generation parameters
   - Images: Add all FAL/KIE parameters

---

## Priority Actions (Before Day 11)

### 🔴 **Critical (Must Fix Now)**

1. **Day 10 (N8N) Results:** Save images + video + prompts to catalog
2. **Day 4 (Images):** Save all generations to catalog
3. **Video filenames:** Stop overwriting - use unique names
4. **Create unified asset catalog structure**

### 🟡 **Important (Fix Soon)**

1. **Day 5 (TTS):** Proper metadata tracking
2. **Day 7 (Music):** Remove base64, normalize metadata, fix "Track 1" naming
3. **Add animation prompts to video metadata**
4. **Asset browser UI component**

### 🟢 **Nice to Have (Later)**

1. **Relationship graph visualization**
2. **Cost tracking dashboard**
3. **Automatic archival of old assets**
4. **Export/import system**

---

## Conclusion

**Current state:** FliGen is a **stateless demo app** with ephemeral data.

**What we need:** **Production asset management system** with:
- Complete history
- Searchable catalog
- Proper versioning
- Relationship tracking
- Unified data model

**Impact on Day 11:** Without fixing this, Story Builder **cannot function**. We have no historical data to work with.

**Recommendation:** Implement Phase 1 (Asset Tracking) **immediately** before starting Day 11 work.

---

**Last Updated:** 2026-01-04
