# FR-17: Asset Persistence Implementation

**Status:** Complete
**Created:** 2026-01-04
**Completed:** 2026-01-04
**Priority:** Critical 🔴
**Depends On:** FR-16 (Unified Asset Catalog Infrastructure)
**Blocks:** FR-18 (Asset Browser UI)
**Related:** Data Persistence Audit (`docs/data-persistence-audit.md`)

---

## User Story

As a user, I want every asset I generate (images, audio, videos, thumbnails, N8N results) to be automatically saved with complete metadata AND displayed as a history list in each tool, so that I can review my work history, compare results, reuse prompts, and select assets for stories.

---

## Problem

**Current state:**
- Day 4 (Images): Generated images disappear on page refresh, no history list
- Day 5 (TTS): One hard-coded file, no metadata about voice/text, no history list
- Day 10 (N8N): Workflow results (2 images + 1 video) lost immediately, no history list
- Day 6 (Videos): Filename collisions cause overwriting, partial history exists
- Day 7 (Music): 8.5MB JSON with base64 audio, "Track 1" naming, library exists but broken

**Impact:**
- No historical data for Day 11 Story Builder
- Cannot compare results across generations
- Cannot reuse successful prompts
- Cannot track costs over time
- Users don't trust that their work is being saved

---

## Solution

Implement asset catalog persistence AND tool-specific history UI across all generation tools:

**For each tool:**
1. Auto-save every generated asset to catalog with full metadata
2. Display history list of past generations within the tool UI
3. Enable reusing prompts from history
4. Enable selecting assets for use in other tools (Day 11)

**Tool-specific changes:**
1. **Day 4 (Images)**: Save + show history of all generated images
2. **Day 5 (TTS)**: Save + show history of all generated audio
3. **Day 10 (N8N)**: Save + show history of all workflow results
4. **Day 6 (Videos)**: Fix filename collisions, add animation prompts, enhance existing video list
5. **Day 7 (Music)**: Remove base64, normalize metadata, fix naming, enhance existing library

---

## Scope Clarification

### ✅ INCLUDED in FR-17 (This Ticket)
- **Persistence**: Auto-save all generated assets to catalog
- **Tool-Specific History UI**: Each tool displays its own past work
  - Day 4: Image generation history
  - Day 5: Audio generation history
  - Day 10: Workflow run history
  - Day 6: Enhanced video list (catalog-backed)
  - Day 7: Enhanced music library (catalog-backed)
- **Reuse Functionality**: "Reuse Prompt" buttons in each tool
- **Data Migration**: Move existing data to catalog

### ❌ NOT in FR-17 (See FR-18)
- **Unified Asset Browser**: Separate page showing ALL assets across all tools
- **Cross-tool Search**: Search for assets across different types
- **Advanced Filtering**: Complex filters, tags, date ranges in dedicated UI
- **Asset Management**: Bulk operations, tagging, organizing

**Key Difference:**
- **FR-17 = In-context history** (when generating images, see past images)
- **FR-18 = Cross-tool library** (browse everything in one place)

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

#### Client Side - History UI (MANDATORY)

Add history list component to Day4ImageGen.tsx:

```typescript
// Add state for history
const [imageHistory, setImageHistory] = useState<Asset[]>([]);

// Load history on mount
useEffect(() => {
  async function loadHistory() {
    const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=image`);
    const data = await response.json();
    setImageHistory(data.assets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }
  loadHistory();
}, []);

// Refresh history after generation
const handleGenerate = async () => {
  // ... existing generation code ...

  // After successful generation, reload history
  const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=image`);
  const data = await response.json();
  setImageHistory(data.assets.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
};
```

**UI Layout:**

```tsx
<div className="space-y-6">
  {/* Generation Form (existing) */}
  <div>
    <input value={prompt} onChange={...} />
    <button onClick={handleGenerate}>Generate</button>
  </div>

  {/* History Section (NEW) */}
  <div className="border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">Generation History</h3>

    {imageHistory.length === 0 ? (
      <p className="text-slate-400">No images generated yet</p>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {imageHistory.map(asset => (
          <div key={asset.id} className="border rounded-lg p-4">
            <img src={asset.url} alt={asset.prompt} className="w-full rounded" />
            <p className="text-sm mt-2 truncate">{asset.prompt}</p>
            <p className="text-xs text-slate-400">
              {new Date(asset.createdAt).toLocaleString()}
            </p>
            <button
              onClick={() => setPrompt(asset.prompt)}
              className="text-xs text-blue-400 mt-2"
            >
              Reuse Prompt
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

**Required Features:**
- ✅ Display all past images in reverse chronological order
- ✅ Show thumbnail, prompt, and timestamp for each
- ✅ "Reuse Prompt" button copies prompt to input field
- ✅ Auto-refresh history after new generation
- ✅ Grid layout (2 columns on desktop)

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

#### Client Side - History UI (MANDATORY)

Add audio history list to Day5TTS.tsx:

```typescript
const [audioHistory, setAudioHistory] = useState<Asset[]>([]);

// Load history on mount
useEffect(() => {
  async function loadHistory() {
    const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=audio`);
    const data = await response.json();
    setAudioHistory(data.assets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }
  loadHistory();
}, []);
```

**UI Layout:**

```tsx
<div className="space-y-6">
  {/* TTS Form (existing) */}
  <div>
    <select value={selectedVoice}>...</select>
    <textarea value={text}>...</textarea>
    <button onClick={handleGenerate}>Generate Speech</button>
  </div>

  {/* History Section (NEW) */}
  <div className="border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">Audio History</h3>

    {audioHistory.length === 0 ? (
      <p className="text-slate-400">No audio generated yet</p>
    ) : (
      <div className="space-y-3">
        {audioHistory.map(asset => (
          <div key={asset.id} className="border rounded-lg p-4 flex items-center gap-4">
            <audio controls src={asset.url} className="flex-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">{asset.metadata.voice}</p>
              <p className="text-xs text-slate-400 truncate">{asset.prompt}</p>
              <p className="text-xs text-slate-500">{new Date(asset.createdAt).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setText(asset.prompt)}
              className="text-xs text-blue-400"
            >
              Reuse Text
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

**Required Features:**
- ✅ Display all past audio files in reverse chronological order
- ✅ Show audio player, voice name, narration text, and timestamp
- ✅ "Reuse Text" button copies text to textarea
- ✅ Auto-refresh history after new generation
- ✅ List layout (not grid, due to audio player width)

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

#### Client Side - History UI (MANDATORY)

Add N8N workflow history to Day10N8N.tsx:

```typescript
const [workflowHistory, setWorkflowHistory] = useState<{
  images: Asset[];
  videos: Asset[];
}>({ images: [], videos: [] });

// Load history on mount
useEffect(() => {
  async function loadHistory() {
    // Get N8N images (seed + edit)
    const imageResponse = await fetch(
      `${SERVER_URL}/api/catalog/filter?type=image&provider=n8n`
    );
    const imageData = await imageResponse.json();

    // Get N8N videos
    const videoResponse = await fetch(
      `${SERVER_URL}/api/catalog/filter?type=video&provider=n8n`
    );
    const videoData = await videoResponse.json();

    setWorkflowHistory({
      images: imageData.assets.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      videos: videoData.assets.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  }
  loadHistory();
}, []);
```

**UI Layout:**

```tsx
<div className="space-y-6">
  {/* Workflow Form (existing) */}
  <div>
    <textarea value={seedPrompt}>...</textarea>
    <textarea value={editPrompt}>...</textarea>
    <textarea value={animationPrompt}>...</textarea>
    <button onClick={handleRunWorkflow}>Run Workflow</button>
  </div>

  {/* History Section (NEW) */}
  <div className="border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">Workflow History</h3>

    {workflowHistory.images.length === 0 && workflowHistory.videos.length === 0 ? (
      <p className="text-slate-400">No workflows run yet</p>
    ) : (
      <div className="space-y-6">
        {/* Group by workflow run (using createdAt proximity) */}
        {/* For each workflow execution, show: */}
        <div className="border rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-3">
            {new Date(asset.createdAt).toLocaleString()}
          </p>

          {/* Images */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-medium mb-1">Seed Image</p>
              <img src={seedImage.url} className="w-full rounded" />
              <p className="text-xs text-slate-400 truncate">{seedImage.prompt}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Edited Image</p>
              <img src={editImage.url} className="w-full rounded" />
              <p className="text-xs text-slate-400 truncate">{editImage.prompt}</p>
            </div>
          </div>

          {/* Video */}
          <div>
            <p className="text-xs font-medium mb-1">Animation</p>
            <video controls src={video.url} className="w-full rounded" />
            <p className="text-xs text-slate-400 truncate">{video.prompt}</p>
          </div>

          {/* Reuse Prompts Button */}
          <button
            onClick={() => {
              setSeedPrompt(seedImage.metadata.humanPrompt);
              setEditPrompt(editImage.metadata.humanPrompt);
              setAnimationPrompt(video.metadata.humanPrompt);
            }}
            className="mt-3 text-xs text-blue-400"
          >
            Reuse Prompts
          </button>
        </div>
      </div>
    )}
  </div>
</div>
```

**Required Features:**
- ✅ Display past workflow runs grouped together (2 images + 1 video per run)
- ✅ Show all three assets from each workflow execution
- ✅ Display prompts and timestamps
- ✅ "Reuse Prompts" button loads all three prompts from a past run
- ✅ Auto-refresh history after new workflow execution
- ✅ Reverse chronological order (newest first)

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

#### Client Side - UI Enhancement Note

**Day 6 (Video) already has a video list UI** that displays generated videos. No major UI changes needed, but ensure:

- ✅ Video list loads from `/api/catalog/filter?type=video` (not from old video-scenes folder)
- ✅ Display animation prompt in video metadata
- ✅ Show all video metadata (provider, model, duration)
- ✅ "Regenerate" button to create new video with same shots

**Existing UI should continue to work** with catalog backend, just need to update data source.

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

#### Client Side - UI Enhancement Note

**Day 7 (Music) already has a music library UI** that displays generated tracks. Need to enhance:

- ✅ Music library loads from `/api/catalog/filter?type=audio&provider=fal,kie` (not from old music-library/index.json)
- ✅ Display complete metadata (style, tags, lyrics, BPM, model)
- ✅ Editable track names (not "Track 1", "Track 2")
- ✅ Show all music generation parameters used
- ✅ "Regenerate with same settings" button

**Existing library UI should continue to work** with catalog backend, just need to:
1. Update data source to use catalog API
2. Add name editing functionality
3. Remove base64 audio dependency

---

## Testing Checklist

### Day 4 - Images
- [ ] Generate image with FAL.AI → saved to catalog automatically
- [ ] Generate image with KIE.AI → saved to catalog automatically
- [ ] Catalog contains full metadata (prompt, provider, model, dimensions)
- [ ] Image file exists in `assets/catalog/images/`
- [ ] **History UI displays all past images**
- [ ] **"Reuse Prompt" button works**
- [ ] **History auto-refreshes after generation**

### Day 5 - TTS
- [ ] Generate audio → saved to catalog automatically
- [ ] Catalog contains voice selection
- [ ] Catalog contains narration text
- [ ] Audio file exists in `assets/catalog/audio/`
- [ ] Old hard-coded path no longer used
- [ ] **History UI displays all past audio files**
- [ ] **Audio player works in history**
- [ ] **"Reuse Text" button works**

### Day 10 - N8N
- [ ] Run workflow → 3 assets saved (2 images + 1 video)
- [ ] Both human and machine prompts saved in metadata
- [ ] All files exist in catalog directories
- [ ] Can retrieve results later from catalog
- [ ] **History UI displays past workflow runs**
- [ ] **Workflow runs grouped correctly (2 images + 1 video)**
- [ ] **"Reuse Prompts" button loads all three prompts**

### Day 6 - Videos
- [ ] Regenerate same shot pair → unique filenames (no overwrite)
- [ ] Animation prompt saved in metadata
- [ ] Old videos migrated to catalog
- [ ] No data loss
- [ ] **Video list loads from catalog API**
- [ ] **Animation prompt displayed in UI**
- [ ] **All metadata visible (provider, model, duration)**

### Day 7 - Music
- [ ] Base64 removed from index.json (file size < 100KB)
- [ ] Can rename tracks
- [ ] All generation parameters saved
- [ ] Old tracks migrated successfully
- [ ] **Music library loads from catalog API**
- [ ] **Track names editable (not "Track 1")**
- [ ] **Complete metadata displayed (style, tags, lyrics, BPM)**

---

## Success Metrics

**Persistence:**
- [ ] 100% of generated assets saved to catalog
- [ ] Zero data loss on page refresh
- [ ] All generation metadata captured
- [ ] No filename collisions
- [ ] Music library index.json < 100KB

**UI:**
- [ ] Every tool displays its own generation history
- [ ] Users can reuse prompts/settings from history
- [ ] History auto-refreshes after each generation
- [ ] User confidence: "My work is being saved"

**Integration:**
- [ ] Ready for Day 11 Story Builder to query catalog
- [ ] Migration scripts run successfully
- [ ] No breaking changes to existing workflows

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

**Client (UI + History):**
```
client/src/components/tools/Day4ImageGen.tsx       # Add history list, reuse prompts
client/src/components/tools/Day5TTS.tsx            # Add audio history, reuse text
client/src/components/tools/Day10N8N.tsx           # Add workflow history, reuse prompts
client/src/components/tools/Day6Video.tsx          # Update to use catalog API
client/src/components/tools/Day7MusicGen.tsx       # Update to use catalog API, add name editing
```

**Server (Persistence):**
```
server/src/tools/video/index.ts                    # Fix filename collisions, add animation prompt
server/src/tools/music/storage.ts                  # Remove base64, normalize metadata
server/src/index.ts                                # Update endpoints to use catalog
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
