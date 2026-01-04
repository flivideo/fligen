# FR-17: Asset Persistence Implementation

**Status:** Pending
**Created:** 2026-01-04
**Priority:** Critical 🔴
**Depends On:** FR-16 (Unified Asset Catalog Infrastructure)
**Blocks:** FR-18 (Asset Browser UI)
**Related:** Data Persistence Audit (`docs/data-persistence-audit.md`)

---

## User Story

As a user, I want every asset I generate (images, audio, videos, thumbnails, N8N results) to be automatically saved with complete metadata, so that I can review my work history, compare results, and reuse assets in stories.

---

## Problem

**Current state:**
- Day 4 (Images): Generated images disappear on page refresh
- Day 5 (TTS): One hard-coded file, no metadata about voice/text
- Day 10 (N8N): Workflow results (2 images + 1 video) lost immediately
- Day 6 (Videos): Filename collisions cause overwriting
- Day 7 (Music): 8.5MB JSON with base64 audio, "Track 1" naming

**Impact:** No historical data for Day 11 Story Builder. Cannot compare results, track costs, or reuse work.

---

## Solution

Implement asset catalog persistence across all generation tools:

1. **Day 4 (Images)**: Save every generated image
2. **Day 5 (TTS)**: Save every generated audio with voice metadata
3. **Day 10 (N8N)**: Save workflow results (images + video + prompts)
4. **Day 6 (Videos)**: Fix filename collisions, add animation prompts
5. **Day 7 (Music)**: Remove base64, normalize metadata, fix naming

---

## Implementation by Tool

### Task 1: Day 4 - Image Generation Persistence

**Files to modify:**
- `client/src/components/tools/Day4ImageGen.tsx`
- `server/src/tools/images/index.ts` (or create if doesn't exist)

**Changes:**

#### Server Side

Create image generation endpoint that saves to catalog:

```typescript
// server/src/tools/images/save-to-catalog.ts
import * as catalog from '../catalog/storage.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

export async function saveImageToCatalog(
  imageUrl: string,
  prompt: string,
  provider: 'fal' | 'kie',
  model: string,
  width: number,
  height: number,
  metadata: Record<string, any> = {}
): Promise<Asset> {
  const startTime = Date.now();

  // Generate unique ID and filename
  const id = catalog.generateAssetId('image');
  const extension = 'jpg'; // or 'png' based on provider
  const filename = catalog.generateFilename('image', provider, model, extension);

  // Download image from provider URL
  const response = await fetch(imageUrl);
  const buffer = await response.buffer();

  // Save to catalog/images/
  const filePath = path.join(process.cwd(), 'assets', 'catalog', 'images', filename);
  await fs.writeFile(filePath, buffer);

  // Create asset record
  const asset: Asset = {
    id,
    type: 'image',
    filename,
    url: `/assets/catalog/images/${filename}`,
    provider,
    model,
    prompt,
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: provider === 'fal' ? 0.05 : 0.03,
    generationTimeMs: Date.now() - startTime,
    metadata: {
      width,
      height,
      ...metadata,
    },
  };

  // Add to catalog
  await catalog.addAsset(asset);

  console.log(`[Images] Saved image to catalog: ${id}`);
  return asset;
}
```

Add endpoint:

```typescript
// server/src/index.ts

app.post('/api/images/save-to-catalog', async (req, res) => {
  try {
    const { imageUrl, prompt, provider, model, width, height, metadata } = req.body;

    const asset = await saveImageToCatalog(
      imageUrl,
      prompt,
      provider,
      model,
      width,
      height,
      metadata
    );

    res.json({ asset });
  } catch (error) {
    console.error('[Images] Failed to save to catalog:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});
```

#### Client Side

Modify Day4ImageGen to automatically save after generation:

```typescript
// client/src/components/tools/Day4ImageGen.tsx

const handleGenerate = async (provider: 'fal' | 'kie') => {
  // ... existing generation code ...

  // After successful generation:
  if (generatedUrl) {
    // Save to catalog
    try {
      await fetch(`${SERVER_URL}/api/images/save-to-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedUrl,
          prompt,
          provider,
          model: selectedModel,
          width: 1024,
          height: 1024,
          metadata: {
            seed: settings.seed,
            guidanceScale: settings.guidanceScale,
          },
        }),
      });
      console.log('[Day4] Image saved to catalog');
    } catch (err) {
      console.error('[Day4] Failed to save to catalog:', err);
      // Don't block UI - just log error
    }
  }
};
```

**Optional UI Enhancement:**
- Add "View History" button to show past generations
- Add "Reuse Prompt" button to load previous prompts

---

### Task 2: Day 5 - TTS Persistence

**Files to modify:**
- `client/src/components/tools/Day5TTS.tsx`
- `server/src/tools/tts/index.ts` (or modify existing)

**Changes:**

#### Server Side

Save TTS audio to catalog instead of hard-coded path:

```typescript
// Modify existing TTS generation to save to catalog

import * as catalog from '../catalog/storage.js';

// In the TTS generation function:
const asset: Asset = {
  id: catalog.generateAssetId('audio'),
  type: 'audio',
  filename: catalog.generateFilename('audio', 'elevenlabs', voice, 'mp3'),
  url: `/assets/catalog/audio/${filename}`,
  provider: 'elevenlabs',
  model: 'eleven_multilingual_v2',
  prompt: narrationText, // The text being spoken
  status: 'ready',
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  estimatedCost: 0.003,
  generationTimeMs: elapsedTime,
  metadata: {
    voice: voiceName,
    voiceId,
    narrationText,
    durationSeconds: audioDuration,
    format: 'mp3',
  },
};

// Save file to catalog/audio/
const filePath = path.join(process.cwd(), 'assets', 'catalog', 'audio', filename);
await fs.writeFile(filePath, audioBuffer);

// Add to catalog
await catalog.addAsset(asset);
```

**Remove hard-coded path:**
- Delete `assets/fox-story/audio/narration.mp3` usage
- All audio now goes to `assets/catalog/audio/`

---

### Task 3: Day 10 - N8N Workflow Persistence

**Files to modify:**
- `client/src/components/tools/Day10N8N.tsx`
- `server/src/index.ts` (N8N endpoint)

**Changes:**

#### Server Side

After N8N returns results, download and save all assets:

```typescript
// server/src/index.ts - Modify /api/n8n/workflow endpoint

app.post('/api/n8n/workflow', async (req, res) => {
  // ... existing N8N call code ...

  // After getting response from N8N:
  const { image1, image2, video } = n8nResponseData;

  // Save all three assets to catalog
  const savedAssets = await Promise.all([
    // Image 1
    saveImageToCatalog(image1, humanPrompts.seed, 'n8n', 'flux-pro', 1024, 1024, {
      workflowId: 'n8n-seed-image',
      humanPrompt: humanPrompts.seed,
      machinePrompt: machinePrompts?.seed,
      step: 'seed',
    }),

    // Image 2
    saveImageToCatalog(image2, humanPrompts.edit, 'n8n', 'flux-edit', 1024, 1024, {
      workflowId: 'n8n-edit-image',
      humanPrompt: humanPrompts.edit,
      machinePrompt: machinePrompts?.edit,
      step: 'edit',
      parentImageUrl: image1,
    }),

    // Video
    saveVideoToCatalog(video, humanPrompts.animation, 'n8n', 'veo-3', 5, {
      workflowId: 'n8n-animation',
      humanPrompt: humanPrompts.animation,
      machinePrompt: machinePrompts?.animation,
      sourceImages: [image1, image2],
    }),
  ]);

  // Return N8N response + saved asset IDs
  res.json({
    success: true,
    data: { image1, image2, video },
    savedAssets: savedAssets.map(a => ({ id: a.id, url: a.url })),
  });
});
```

Create `saveVideoToCatalog` helper:

```typescript
// server/src/tools/videos/save-to-catalog.ts
export async function saveVideoToCatalog(
  videoUrl: string,
  prompt: string,
  provider: string,
  model: string,
  duration: number,
  metadata: Record<string, any> = {}
): Promise<Asset> {
  const startTime = Date.now();

  const id = catalog.generateAssetId('video');
  const filename = catalog.generateFilename('video', provider, model, 'mp4');

  // Download video
  const response = await fetch(videoUrl);
  const buffer = await response.buffer();

  // Save to catalog/videos/
  const filePath = path.join(process.cwd(), 'assets', 'catalog', 'videos', filename);
  await fs.writeFile(filePath, buffer);

  const asset: Asset = {
    id,
    type: 'video',
    filename,
    url: `/assets/catalog/videos/${filename}`,
    provider,
    model,
    prompt,
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0.15,
    generationTimeMs: Date.now() - startTime,
    metadata: {
      duration,
      fps: 24,
      resolution: '1024x1024',
      animationPrompt: prompt,
      ...metadata,
    },
  };

  await catalog.addAsset(asset);
  console.log(`[Videos] Saved video to catalog: ${id}`);
  return asset;
}
```

---

### Task 4: Video Filename Collision Fix

**Files to modify:**
- `server/src/tools/video/index.ts`
- `assets/video-scenes/index.json` (data migration)

**Changes:**

#### Fix Filename Generation

**Old (collisions):**
```typescript
filename: `${startShotId.replace('shot-', '')}-${endShotId.replace('shot-', '')}.mp4`
// Result: "001-002.mp4" (overwrites on regeneration)
```

**New (unique):**
```typescript
filename: `vid-${Date.now()}-${provider}-${model.toLowerCase()}.mp4`
// Result: "vid-1767098871389-fal-kling-o1.mp4" (unique every time)
```

#### Add Animation Prompt to Metadata

Modify video generation to capture animation prompt:

```typescript
// When creating video task:
const videoTask = {
  // ... existing fields ...
  metadata: {
    duration,
    animationPrompt,  // ← ADD THIS
    startShotId,
    endShotId,
  },
};
```

#### Data Migration

Create migration script to update existing video entries:

```typescript
// server/src/tools/video/migrate-to-catalog.ts

export async function migrateVideoScenesToCatalog() {
  const oldIndexPath = path.join(process.cwd(), 'assets', 'video-scenes', 'index.json');
  const oldIndex = JSON.parse(await fs.readFile(oldIndexPath, 'utf-8'));

  for (const video of oldIndex.videos) {
    if (video.status !== 'completed' || !video.url) continue;

    // Copy video file to catalog
    const oldFilePath = path.join(process.cwd(), 'assets', video.url.replace('/assets/', ''));
    const exists = await fs.access(oldFilePath).then(() => true).catch(() => false);
    if (!exists) continue;

    const newFilename = `vid-${Date.parse(video.createdAt)}-${video.provider}-${video.model}.mp4`;
    const newFilePath = path.join(process.cwd(), 'assets', 'catalog', 'videos', newFilename);
    await fs.copyFile(oldFilePath, newFilePath);

    // Create catalog asset
    const asset: Asset = {
      id: `asset_video_migrated_${video.id}`,
      type: 'video',
      filename: newFilename,
      url: `/assets/catalog/videos/${newFilename}`,
      provider: video.provider,
      model: video.model,
      prompt: '(migrated - prompt unknown)',
      status: 'ready',
      createdAt: video.createdAt,
      completedAt: video.completedAt || video.createdAt,
      estimatedCost: 0.15,
      generationTimeMs: 0,
      metadata: {
        duration: video.duration,
        startShotId: video.startShot,
        endShotId: video.endShot,
        migrated: true,
      },
    };

    await catalog.addAsset(asset);
    console.log(`[Migration] Migrated video: ${video.id} → ${asset.id}`);
  }

  console.log('[Migration] Video scenes migration complete');
}
```

---

### Task 5: Music Library Cleanup

**Files to modify:**
- `server/src/tools/music/storage.ts`
- `assets/music-library/index.json`

**Changes:**

#### Remove Base64 Audio

**Old (8.5MB):**
```json
{
  "name": "Track 1",
  "audioBase64": "SUQzBAAAAAAAI1RTU0...",  // ← DELETE THIS
  "audioUrl": "...",
  "provider": "kie",
  "prompt": "..."
}
```

**New (50KB):**
```json
{
  "id": "asset_audio_1735...",
  "name": "User's Custom Name",  // ← Editable
  "filename": "music-001.mp3",
  "url": "/assets/catalog/audio/music-001.mp3",
  "provider": "kie",
  "model": "suno-v5",
  "prompt": "...",
  // ... full Asset structure
}
```

#### Fix "Track 1" Naming

Allow user to rename tracks:

```typescript
// Add PUT endpoint to update track name:
app.put('/api/catalog/:id/name', async (req, res) => {
  const { name } = req.body;
  const asset = await catalog.updateAsset(req.params.id, {
    metadata: { ...asset.metadata, customName: name },
  });
  res.json({ asset });
});
```

In UI, show editable name field:

```tsx
<input
  value={trackName}
  onChange={(e) => setTrackName(e.target.value)}
  onBlur={async () => {
    await fetch(`${SERVER_URL}/api/catalog/${assetId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trackName }),
    });
  }}
/>
```

#### Add Complete Metadata

Save all music generation parameters:

```typescript
metadata: {
  lyrics: request.lyrics,
  style: request.style,
  tags: request.tags,
  instrumental: request.instrumental,
  outputFormat: request.outputFormat,
  bpm: request.bpm,
  model: request.model,
  vocalGender: request.vocalGender,
  customName: 'User-provided name',
}
```

#### Data Migration

```typescript
// server/src/tools/music/migrate-to-catalog.ts

export async function migrateMusicLibraryToCatalog() {
  const oldIndexPath = path.join(process.cwd(), 'assets', 'music-library', 'index.json');
  const oldIndex = JSON.parse(await fs.readFile(oldIndexPath, 'utf-8'));

  for (const track of oldIndex.tracks) {
    const newFilename = track.name.toLowerCase().replace(/\s+/g, '-') + '.mp3';

    // Create catalog asset (WITHOUT base64!)
    const asset: Asset = {
      id: `asset_audio_migrated_${Date.now()}`,
      type: 'audio',
      filename: newFilename,
      url: `/assets/catalog/audio/${newFilename}`,
      provider: track.provider || 'unknown',
      model: track.model || 'unknown',
      prompt: track.prompt || '',
      status: 'ready',
      createdAt: track.generatedAt || new Date().toISOString(),
      completedAt: track.generatedAt || new Date().toISOString(),
      estimatedCost: track.estimatedCost || 0,
      generationTimeMs: track.generationTimeMs || 0,
      metadata: {
        lyrics: track.lyrics,
        style: track.style,
        duration: track.duration,
        customName: track.name,
        migrated: true,
      },
    };

    await catalog.addAsset(asset);
    console.log(`[Migration] Migrated music track: ${track.name} → ${asset.id}`);
  }

  // Create backup of old file
  await fs.copyFile(oldIndexPath, oldIndexPath + '.backup');

  // Write new index (much smaller!)
  const newIndex = { tracks: [] }; // Empty - all data now in catalog
  await fs.writeFile(oldIndexPath, JSON.stringify(newIndex, null, 2));

  console.log('[Migration] Music library migration complete');
}
```

---

## Testing Checklist

### Day 4 - Images
- [ ] Generate image with FAL.AI → saved to catalog automatically
- [ ] Generate image with KIE.AI → saved to catalog automatically
- [ ] Catalog contains full metadata (prompt, provider, model, dimensions)
- [ ] Image file exists in `assets/catalog/images/`
- [ ] Can view generation history (optional UI)

### Day 5 - TTS
- [ ] Generate audio → saved to catalog automatically
- [ ] Catalog contains voice selection
- [ ] Catalog contains narration text
- [ ] Audio file exists in `assets/catalog/audio/`
- [ ] Old hard-coded path no longer used

### Day 10 - N8N
- [ ] Run workflow → 3 assets saved (2 images + 1 video)
- [ ] Both human and machine prompts saved in metadata
- [ ] All files exist in catalog directories
- [ ] Can retrieve results later from catalog

### Day 6 - Videos
- [ ] Regenerate same shot pair → unique filenames (no overwrite)
- [ ] Animation prompt saved in metadata
- [ ] Old videos migrated to catalog
- [ ] No data loss

### Day 7 - Music
- [ ] Base64 removed from index.json (file size < 100KB)
- [ ] Can rename tracks
- [ ] All generation parameters saved
- [ ] Old tracks migrated successfully

---

## Success Metrics

- [ ] 100% of generated assets saved to catalog
- [ ] Zero data loss on page refresh
- [ ] All generation metadata captured
- [ ] No filename collisions
- [ ] Music library index.json < 100KB
- [ ] Ready for Day 11 Story Builder
- [ ] Migration scripts run successfully

---

## Files to Create

```
server/src/tools/images/save-to-catalog.ts
server/src/tools/videos/save-to-catalog.ts
server/src/tools/videos/migrate-to-catalog.ts
server/src/tools/music/migrate-to-catalog.ts
```

---

## Files to Modify

```
client/src/components/tools/Day4ImageGen.tsx
client/src/components/tools/Day5TTS.tsx
client/src/components/tools/Day10N8N.tsx
server/src/tools/video/index.ts
server/src/tools/music/storage.ts
server/src/index.ts (add save-to-catalog endpoints)
```

---

## Migration Strategy

1. **Run migrations ONCE on first deploy:**
   - Videos: `migrateVideoScenesToCatalog()`
   - Music: `migrateMusicLibraryToCatalog()`

2. **Backup old data:**
   - `assets/video-scenes/index.json` → `index.json.backup`
   - `assets/music-library/index.json` → `index.json.backup`

3. **Verify migrations:**
   - Check catalog contains all old data
   - Spot-check files exist and are playable
   - Verify metadata accuracy

4. **Cleanup (optional):**
   - Archive old folders after 30 days
   - Keep backups for 90 days

---

## Dependencies

**Requires:**
- FR-16 (Unified Asset Catalog Infrastructure) - MUST be complete first

**Blocks:**
- FR-18 (Asset Browser UI)

---

**Last Updated:** 2026-01-04
