# FR-11: Music Generation

**Status:** Complete
**Added:** 2025-12-31
**Day:** 7 of 12 Days of Claudemas

---

## User Story

As a content creator, I want to generate AI music tracks with vocals or instrumentals so that I can create custom background music and soundtracks for my video content without licensing issues.

## Problem

The "Fox and Lazy Dog" mini-story project requires background music and potentially vocal tracks to accompany the narration and video scenes. Currently there's no way to:

1. Generate original music from text descriptions
2. Create vocal tracks with custom lyrics
3. Compare different music generation providers
4. Save and organize generated tracks for later use

This is Day 7 of the 12 Days of Claudemas, focusing on AI music generation capability.

## Solution

Create a Music Generation tool supporting two providers:
- **FAL.AI SonAuto v2** - Text-to-music with prompt, lyrics, and style tags
- **KIE.AI Suno** - Music generation with model selection and vocal options

### UI Layout

```
+-----------------------------------------------------------------------------+
|  Day 7: Music Generator                                                      |
|  Create AI-generated music with vocals and instrumentals                     |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Provider:  [ FAL.AI SonAuto ][ KIE.AI Suno ]                               |
|                                                                              |
+-----------------------------------------------------------------------------+
|  Music Settings                                                              |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Prompt (describe the music):                                                |
|  +-----------------------------------------------------------------------+  |
|  | An upbeat electronic track with synth melodies and driving drums      |  |
|  +-----------------------------------------------------------------------+  |
|                                                                              |
|  Style / Tags (genres, moods, instruments):                                  |
|  +-----------------------------------------------------------------------+  |
|  | electronic, synth, upbeat                                             |  |
|  +-----------------------------------------------------------------------+  |
|                                                                              |
|  [ ] Include lyrics                                                          |
|  +-----------------------------------------------------------------------+  |
|  | Verse 1:                                                              |  |
|  | Dancing through the night                                             |  |
|  | Stars are shining bright...                                           |  |
|  +-----------------------------------------------------------------------+  |
|                                                                              |
|  [ ] Instrumental     Format: [MP3 v]     BPM: [auto]     Title: [My Track] |
|                                                                              |
|  --- KIE.AI Options (when selected) ---                                      |
|  Suno Model: [V4.5 v]     Vocal Gender: [Female v]                          |
|                                                                              |
|  [              Generate Music (~$0.075)              ]                      |
|                                                                              |
+-----------------------------------------------------------------------------+
|  Generated Tracks (2)                                                        |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +-----------------------------------------------------------------------+  |
|  | Track 1                              [SonAuto] [ready]                |  |
|  | [>] ====|=============================== 0:15 / 0:30                 |  |
|  | 10:30:15 AM . 15.2s . $0.075          "An upbeat electronic..."       |  |
|  | [ Save to Library ]  [ Download ]  [ Delete ]                         |  |
|  +-----------------------------------------------------------------------+  |
|                                                                              |
+-----------------------------------------------------------------------------+
|  Saved Library (0)                                                           |
+-----------------------------------------------------------------------------+
|                                                                              |
|  [ No saved tracks yet. Generate music and save it to your library ]        |
|                                                                              |
+-----------------------------------------------------------------------------+
|  Configuration                                                               |
+-----------------------------------------------------------------------------+
|  API keys should be configured in server/.env:                               |
|                                                                              |
|  # FAL.AI (SonAuto) - https://fal.ai/dashboard/keys                         |
|  FAL_API_KEY=your_fal_api_key_here                                          |
|                                                                              |
|  # KIE.AI (Suno) - https://kie.ai/api-key                                   |
|  KIE_API_KEY=your_kie_api_key_here                                          |
|                                                                              |
|  SonAuto: $0.075/track    Suno: ~$0.06/track                                |
+-----------------------------------------------------------------------------+
```

---

## API Integration

### FAL.AI SonAuto v2

**NPM Package:** `@fal-ai/client` (already installed)

**Endpoint:** `sonauto/v2/text-to-music`

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Description of the track |
| `tags` | string[] | No | Style descriptors (genres, moods) |
| `lyrics_prompt` | string | No | Custom lyrics for vocal tracks |
| `bpm` | int \| "auto" | No | Tempo (beats per minute) |
| `output_format` | enum | No | wav, mp3, flac, ogg, m4a (default: mp3) |
| `num_songs` | int | No | 1-2 songs per generation |
| `prompt_strength` | float | No | 1.4-3.1 (default: varies) |
| `balance_strength` | float | No | 0-1 (default: varies) |

**Response:**
```json
{
  "seed": 12345,
  "tags": ["electronic", "synth"],
  "lyrics": "Generated or provided lyrics...",
  "audio": [
    {
      "url": "https://fal.media/files/.../output.mp3",
      "file_name": "output.mp3",
      "content_type": "audio/mpeg"
    }
  ]
}
```

**Cost:** $0.075 per generation

**Implementation:**
```typescript
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('sonauto/v2/text-to-music', {
  input: {
    prompt: 'An upbeat electronic track...',
    tags: ['electronic', 'synth', 'upbeat'],
    lyrics_prompt: 'Dancing through the night...',
    bpm: 'auto',
    output_format: 'mp3'
  }
});
```

### KIE.AI Suno

**Endpoint:** `POST https://api.kie.ai/api/v1/generate`

Uses async polling pattern (same as KIE.AI video generation).

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | enum | Yes | V3.5, V4, V4.5, V5 |
| `title` | string | Yes | Track title |
| `prompt` | string | Conditional | Music description (required if no lyrics) |
| `lyrics` | string | Conditional | Custom lyrics (required if no prompt) |
| `style` | string | No | Style description (max 1000 chars) |
| `instrumental` | boolean | No | Generate without vocals |
| `vocalGender` | enum | No | male, female |

**Response (async):**
```json
{
  "taskId": "task_abc123",
  "status": "processing"
}
```

**Poll for completion:**
```json
{
  "taskId": "task_abc123",
  "status": "completed",
  "result": {
    "audioUrl": "https://cdn.kie.ai/.../output.mp3",
    "duration": 30,
    "title": "My Track"
  }
}
```

**Cost:** ~$0.06 per generation (12 credits)

---

## Server Implementation

### Directory Structure

```
server/src/tools/music/
+-- types.ts           # Type definitions
+-- storage.ts         # Library file storage
+-- fal-client.ts      # FAL.AI SonAuto integration
+-- kie-client.ts      # KIE.AI Suno integration
+-- index.ts           # API handlers and exports
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/music/health` | GET | Check FAL.AI and KIE.AI music API status |
| `/api/music/generate` | POST | Generate music track |
| `/api/music/library` | GET | List saved tracks |
| `/api/music/save` | POST | Save track to library |
| `/api/music/library/:id` | DELETE | Delete saved track |

### POST /api/music/generate

**Request:**
```json
{
  "provider": "fal",
  "prompt": "An upbeat electronic track with synth melodies",
  "lyrics": "Dancing through the night...",
  "style": "electronic, synth, upbeat",
  "tags": ["electronic", "synth"],
  "instrumental": false,
  "outputFormat": "mp3",
  "bpm": "auto",
  "title": "My Track",
  "model": "V4.5",
  "vocalGender": "female"
}
```

**Response:**
```json
{
  "success": true,
  "track": {
    "id": "track-1704067200000",
    "name": "My Track",
    "audioUrl": "https://fal.media/files/.../output.mp3",
    "audioBase64": "base64_encoded_audio...",
    "provider": "fal",
    "model": "sonauto-v2",
    "prompt": "An upbeat electronic track...",
    "lyrics": "Dancing through the night...",
    "style": "electronic, synth, upbeat",
    "duration": 30,
    "generatedAt": "2025-12-31T10:00:00Z",
    "estimatedCost": 0.075,
    "generationTimeMs": 15000
  }
}
```

### POST /api/music/save

**Request:**
```json
{
  "name": "My Awesome Track",
  "audioBase64": "base64_encoded_audio...",
  "provider": "fal",
  "model": "sonauto-v2",
  "prompt": "An upbeat electronic track...",
  "lyrics": "Dancing through the night...",
  "style": "electronic, synth"
}
```

**Response:**
```json
{
  "id": "music-001",
  "filename": "music-001.mp3",
  "url": "/assets/music-library/music-001.mp3",
  "name": "My Awesome Track",
  "savedAt": "2025-12-31T10:05:00Z"
}
```

### Storage Structure

```
assets/
+-- music-library/
    +-- index.json           # Track metadata index
    +-- music-001.mp3
    +-- music-002.mp3
    +-- ...
```

**index.json format:**
```json
{
  "tracks": [
    {
      "id": "music-001",
      "filename": "music-001.mp3",
      "name": "My Awesome Track",
      "provider": "fal",
      "model": "sonauto-v2",
      "prompt": "An upbeat electronic track...",
      "lyrics": "Dancing through the night...",
      "style": "electronic, synth",
      "duration": 30,
      "savedAt": "2025-12-31T10:05:00Z"
    }
  ]
}
```

---

## Shared Types

Add to `shared/src/index.ts`:

```typescript
// Music generation types
export type MusicProvider = 'fal' | 'kie';
export type MusicOutputFormat = 'wav' | 'mp3' | 'flac';
export type MusicTrackStatus = 'generating' | 'ready' | 'saved' | 'error';

export interface MusicGenerationRequest {
  provider: MusicProvider;
  prompt: string;
  lyrics?: string;
  style?: string;
  tags?: string[];
  instrumental: boolean;
  outputFormat: MusicOutputFormat;
  bpm?: number | 'auto';
  // KIE-specific
  title?: string;
  model?: string; // V3.5, V4, V4.5, V5
  vocalGender?: 'male' | 'female';
}

export interface GeneratedTrack {
  id: string;
  name: string;
  audioUrl: string;
  audioBase64?: string;
  provider: MusicProvider;
  model: string;
  prompt: string;
  lyrics?: string;
  style?: string;
  duration: number;
  generatedAt: string;
  status: MusicTrackStatus;
  estimatedCost: number;
  generationTimeMs: number;
}

export interface SavedTrack extends GeneratedTrack {
  savedAt: string;
  filename: string;
}
```

---

## Client Implementation

### Files to Create/Modify

**Create:**
- `client/src/components/tools/Day7MusicGen.tsx` - Main component (mock already exists)

**Modify:**
- `client/src/App.tsx` - Add Day 7 routing
- `server/src/index.ts` - Register music endpoints

### Component Features

The mock UI component (`Day7MusicGen.tsx`) already implements:

1. **Provider Toggle** - Switch between FAL.AI SonAuto and KIE.AI Suno
2. **Prompt Input** - Describe the desired music
3. **Style/Tags Input** - Genre, mood, instruments
4. **Lyrics Input** - Optional custom lyrics with toggle
5. **Options Row** - Instrumental checkbox, format, BPM, title
6. **KIE-specific Options** - Model selection (V3.5-V5), vocal gender
7. **Generate Button** - With cost estimate and loading state
8. **Generated Tracks List** - Audio player, editable names, save/download/delete
9. **Saved Library Section** - Persisted tracks from server
10. **Configuration Panel** - API key setup instructions

### Audio Player Requirements

- Play/pause button
- Progress bar with seek capability
- Current time / duration display
- Support for base64 audio data and URLs

---

## Acceptance Criteria

### Provider Selection
- [ ] Provider toggle switches between FAL.AI and KIE.AI
- [ ] Provider-specific options show/hide appropriately
- [ ] Selected provider persists during session

### Music Settings
- [ ] Prompt text area accepts music description
- [ ] Style/tags input for genre and mood descriptors
- [ ] Lyrics toggle shows/hides lyrics input
- [ ] Lyrics text area accepts multi-line custom lyrics
- [ ] Instrumental checkbox disables vocal options when checked
- [ ] Format dropdown (MP3, WAV, FLAC)
- [ ] BPM input accepts number or "auto"
- [ ] Title input for track naming

### KIE-specific Options
- [ ] Model dropdown (V3.5, V4, V4.5, V5)
- [ ] Vocal gender dropdown (Male, Female)
- [ ] Options only visible when KIE provider selected

### Generation
- [ ] "Generate Music" button triggers API call
- [ ] Button shows estimated cost (~$0.075 FAL, ~$0.06 KIE)
- [ ] Loading spinner during generation
- [ ] Button disabled while generating
- [ ] Error messages displayed for failures
- [ ] Success adds track to Generated Tracks list

### Audio Playback
- [ ] Play/pause button for each track
- [ ] Progress bar with seek functionality
- [ ] Current time and duration display
- [ ] Audio auto-plays on completion (optional)

### Track Management
- [ ] Editable track name with inline edit
- [ ] "Save to Library" button persists track to server
- [ ] "Download" button triggers browser save dialog
- [ ] "Delete" button removes track from list
- [ ] Saved tracks show checkmark indicator

### Library
- [ ] Library section shows saved tracks
- [ ] Tracks load from server on page mount
- [ ] Play button for each saved track
- [ ] Download button for saved tracks
- [ ] Delete button removes from library

### API Integration
- [ ] FAL.AI SonAuto v2 integration working
- [ ] KIE.AI Suno integration working
- [ ] Proper error handling for both providers
- [ ] Generation time and cost tracking

---

## Environment Variables

Add to `server/.env`:
```
# FAL.AI (SonAuto) - Already configured from Day 4
FAL_API_KEY=your_fal_api_key_here

# KIE.AI (Suno) - Already configured from Day 4
KIE_API_KEY=your_kie_api_key_here
```

No new API keys needed - reuses existing credentials from image/video generation.

---

## Cost Comparison

| Provider | Model | Cost | Duration | Quality |
|----------|-------|------|----------|---------|
| FAL.AI | SonAuto v2 | $0.075/track | ~30s | High |
| KIE.AI | Suno V3.5 | ~$0.06/track | ~30s | Good |
| KIE.AI | Suno V4 | ~$0.06/track | ~30s | Better |
| KIE.AI | Suno V4.5 | ~$0.06/track | ~30s | Better |
| KIE.AI | Suno V5 | ~$0.06/track | ~30s | Best |

**Recommendation:** Start with FAL.AI SonAuto for simpler integration (uses existing fal-ai/client), add KIE.AI Suno for comparison.

---

## Out of Scope

- Music editing/trimming
- Multi-track mixing
- Stem separation
- Real-time streaming during generation
- Integration with story pipeline (future FR)
- Voice cloning for vocals
- Commercial licensing verification

---

## Test Data

Use these prompts for testing:

**Instrumental:**
```
An upbeat electronic track with synth melodies and driving drums, perfect for a montage scene
```

**With Lyrics:**
```
Prompt: A cheerful acoustic folk song about adventure and discovery

Lyrics:
Verse 1:
Walking down the winding road
Carrying a light load
Sun is shining, sky is blue
Adventure calling, something new

Chorus:
We're on our way, on our way
To find what waits for us today
```

**Fox Story Theme:**
```
A whimsical orchestral piece with playful woodwinds and gentle strings, evoking a children's storybook about a clever fox in a meadow
```

---

## References

### API Documentation
- [FAL.AI Models](https://fal.ai/models) - Search for "sonauto"
- [KIE.AI Documentation](https://docs.kie.ai/)

### Related Requirements
- [FR-09: 11 Labs Text-to-Speech](fr-09-elevenlabs-tts.md) - Audio generation pattern
- [FR-10: Shot List and Video Generation](fr-10-shot-list-and-video.md) - KIE.AI integration pattern

### Planning Documents
- [Fox and Lazy Dog Story](../planning/fox-and-lazy-dog-story.md) - Story context for test music

---

## Completion Notes

**What was done:**
- Created music module at `server/src/tools/music/` with types, storage, FAL client, KIE client, and index
- Implemented FAL.AI SonAuto v2 text-to-music integration with `fal.subscribe()`
- Implemented KIE.AI Suno integration with async polling pattern
- Added music library storage with index.json and file persistence
- Created API endpoints: health, generate, library, save, delete
- Updated existing Day7MusicGen.tsx mock to use real API calls
- Added music types to shared/src/index.ts
- Updated config.json to mark Day 6 complete and Day 7 as next
- Added Day 7 routing in App.tsx

**Files created:**
```
server/src/tools/music/types.ts     - Type definitions
server/src/tools/music/storage.ts   - Library file storage
server/src/tools/music/fal-client.ts - FAL.AI SonAuto client
server/src/tools/music/kie-client.ts - KIE.AI Suno client
server/src/tools/music/index.ts     - Module exports
```

**Files modified:**
```
shared/src/index.ts      - Added music types
shared/src/config.json   - Updated day statuses
server/src/index.ts      - Added music API endpoints
client/src/App.tsx       - Added Day 7 routing
client/src/components/tools/Day7MusicGen.tsx - Wired to real APIs
```

**Testing notes:**
1. Start dev server: `npm run dev`
2. Navigate to Day 7 in sidebar
3. Enter a music prompt (default provided)
4. Select provider (FAL.AI SonAuto or KIE.AI Suno)
5. Configure options (style, lyrics, instrumental, etc.)
6. Click "Generate Music" - track appears in Generated Tracks
7. Play audio, save to library, or download
8. Saved tracks persist in assets/music-library/

**API keys required:**
- `FAL_API_KEY` - For SonAuto music generation
- `KIE_API_KEY` - For Suno music generation

**Status:** Complete

---

**Last updated:** 2025-12-31
