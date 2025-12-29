# FR-09: 11 Labs Text-to-Speech

**Status:** Complete
**Added:** 2025-12-29
**Day:** 5 of 12 Days of Claudemas

---

## User Story

As a content creator, I want to convert written narration scripts into natural-sounding voice audio so that I can create professional voiceovers for my video content without recording myself.

## Problem

The "Fox and Lazy Dog" mini-story project (see `docs/planning/fox-and-lazy-dog-story.md`) requires narrated audio to accompany the generated images. Currently there's no way to:

1. Generate voice narration from text
2. Preview audio before committing to it
3. Select different voice styles/characters
4. Download the generated audio for use in video editing

This is Day 5 of the 12 Days of Claudemas, focusing on audio generation capability.

## Solution

Create a Text-to-Speech tool using the ElevenLabs API with:
- Voice selection from available voices
- Text input for narration script
- Audio generation and playback
- Download capability for generated audio

### UI Layout

```
+-----------------------------------------------------------------------------+
|  Day 5: Text-to-Speech                                                      |
+-----------------------------------------------------------------------------+
|  [ Voice Selection ]  [ Generate Audio ]                                    |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Voice:  [ Rachel (American Female)        v ]                              |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Enter your narration text here...                                    |  |
|  |                                                                       |  |
|  |  A quick brown fox discovers a lazy hound dozing beneath an old oak   |  |
|  |  tree. With one graceful leap, the fox soars over the sleeping dog    |  |
|  |  and disappears into the golden meadow.                               |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  Character count: 156 / 5000                     [ Generate Audio ]         |
|                                                                             |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Generated Audio                                                            |
|  +-----------------------------------------------------------------------+  |
|  |  [>]  ============================|============  00:08 / 00:10        |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  Voice: Rachel | Duration: 10.2s | Model: eleven_multilingual_v2            |
|                                                                             |
|  [ Download MP3 ]   [ Regenerate ]                                          |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Voice Selection

Display a dropdown of available voices. Initial implementation should include at least:
- 2-3 popular built-in voices
- Voice preview capability (optional for MVP)

Suggested default voices:
| Voice ID | Name | Description |
|----------|------|-------------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | American female, warm, professional |
| `EXAVITQu4vr4xnSDxMaL` | Bella | American female, soft, friendly |
| `ErXwobaYiN019PkySvjV` | Antoni | American male, well-rounded |
| `MF3mGyEYCl7XYWbV9V6O` | Elli | American female, young, expressive |

### Audio Generation Flow

1. User selects voice from dropdown
2. User enters/pastes narration text
3. Click "Generate Audio" button
4. Show loading spinner during API call
5. Display audio player with waveform/progress
6. Show generation stats (duration, model used)
7. Enable download button

## Acceptance Criteria

### Voice Selection
1. [ ] Voice dropdown displays available voices with name and description
2. [ ] At least 4 voice options available
3. [ ] Selected voice persists during session
4. [ ] Voice selection updates before next generation

### Text Input
5. [ ] Multi-line text area for narration input
6. [ ] Character count displayed (ElevenLabs has limits)
7. [ ] Default text pre-populated with Fox story narration
8. [ ] Minimum 5000 character limit support

### Generation
9. [ ] "Generate Audio" button triggers API call
10. [ ] Loading spinner shown during generation
11. [ ] Button disabled while generating (prevent double-submit)
12. [ ] Error messages displayed for failures
13. [ ] Success shows audio player

### Audio Playback
14. [ ] HTML5 audio player with play/pause
15. [ ] Progress bar showing playback position
16. [ ] Duration displayed (total and current)
17. [ ] Audio auto-plays when generation completes (optional)

### Download
18. [ ] "Download MP3" button available after generation
19. [ ] Downloaded file named sensibly (e.g., `narration-[timestamp].mp3`)
20. [ ] Download triggers browser save dialog

### Stats Display
21. [ ] Voice name shown below audio
22. [ ] Duration in seconds
23. [ ] Model name (eleven_multilingual_v2)

## Technical Notes

### NPM Package

Use the official ElevenLabs JavaScript SDK:

```bash
npm install @elevenlabs/elevenlabs-js
```

### Server Implementation

Create new tool module at `server/src/tools/elevenlabs/`:

```
server/src/tools/elevenlabs/
+-- types.ts       - Type definitions
+-- client.ts      - ElevenLabs API client
+-- index.ts       - Module exports
```

### API Client Pattern

Follow the existing image client pattern:

```typescript
// server/src/tools/elevenlabs/client.ts
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

export async function generateSpeech(
  text: string,
  voiceId: string
): Promise<GenerateSpeechResult> {
  const startTime = Date.now();

  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2'
  });

  // Convert to base64 for client transport
  const buffer = await streamToBuffer(audio);
  const base64 = buffer.toString('base64');

  return {
    audioBase64: base64,
    mimeType: 'audio/mpeg',
    durationMs: Date.now() - startTime,
    voiceId,
    model: 'eleven_multilingual_v2'
  };
}
```

### API Endpoints

```typescript
// GET /api/tts/voices - List available voices
interface VoicesResponse {
  voices: {
    voiceId: string;
    name: string;
    description: string;
    previewUrl?: string;
  }[];
}

// POST /api/tts/generate - Generate speech
interface GenerateRequest {
  text: string;
  voiceId: string;
}

interface GenerateResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  durationMs?: number;
  voiceId?: string;
  model?: string;
  error?: string;
}
```

### Audio Delivery Options

Two approaches for delivering audio to the client:

**Option A: Base64 in JSON (simpler, chosen for MVP)**
- Return audio as base64-encoded string in JSON response
- Client decodes and creates Blob URL
- Simpler implementation, works well for short audio

**Option B: Streaming (future enhancement)**
- Return audio as stream via dedicated endpoint
- Better for long audio, but more complex
- Consider for future if performance issues arise

### Client Audio Playback

```typescript
// Decode base64 and create audio element
const audioBlob = new Blob(
  [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
  { type: 'audio/mpeg' }
);
const audioUrl = URL.createObjectURL(audioBlob);

// Use in audio element
<audio src={audioUrl} controls />
```

### Download Implementation

```typescript
function downloadAudio(audioBlob: Blob, filename: string) {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Environment Variables

Add to `server/.env`:

```
ELEVENLABS_API_KEY=your_api_key_here
```

Update `server/.env.example`:

```
ELEVENLABS_API_KEY=
```

### ElevenLabs API Limits

- Free tier: ~10,000 characters/month
- Character limit per request: 5,000 characters
- Rate limiting: Handled by SDK with automatic retries

### Models

| Model ID | Name | Best For |
|----------|------|----------|
| `eleven_multilingual_v2` | Multilingual v2 | Recommended default, supports 32 languages |
| `eleven_monolingual_v1` | English v1 | Legacy English-only |
| `eleven_turbo_v2_5` | Turbo v2.5 | Faster generation, slightly lower quality |

Start with `eleven_multilingual_v2` as default.

## Out of Scope

- Voice cloning (requires ElevenLabs subscription)
- Custom voice creation
- Real-time streaming during generation
- Audio editing/trimming
- Multiple audio generation in sequence
- Integration with story pipeline (future FR)
- Voice preview before selection

## Test Data

Use the Fox and Lazy Dog narration script:

```
A quick brown fox discovers a lazy hound dozing beneath an old oak tree. With one graceful leap, the fox soars over the sleeping dog and disappears into the golden meadow.
```

Expected output: ~8-10 seconds of narrated audio.

## References

### ElevenLabs Documentation
- [Official JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js)
- [Text-to-Speech API](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [NPM Package](https://www.npmjs.com/package/elevenlabs-js)

### Related Requirements
- [FR-07: Image API Connectivity](fr-07-api-connectivity.md) - Similar API integration pattern
- [FR-08: Image Generation Comparison](fr-08-image-comparison.md) - UI pattern reference

### Planning Documents
- [Fox and Lazy Dog Story](../planning/fox-and-lazy-dog-story.md) - Story context and narration script

---

## Completion Notes

**What was done:**
- Created ElevenLabs TTS module at `server/src/tools/elevenlabs/` with types, client, and exports
- Implemented `generateSpeech()` function using `@elevenlabs/elevenlabs-js` SDK
- Added voice selection (4 default voices: Rachel, Bella, Antoni, Elli)
- Added API endpoints: `GET /api/tts/voices` and `POST /api/tts/generate`
- Created Day5TTS.tsx React component with:
  - Voice dropdown selection
  - Text input area with character count (5000 max)
  - Audio player with play/pause, seek, and time display
  - Download MP3 button
  - Generation stats display
- Integrated Day 5 routing in App.tsx
- Added ElevenLabs status to server startup message
- Updated .env.example with ELEVENLABS_API_KEY placeholder
- Updated shared/config.json with Day 3-4 as complete, Day 5 as next

**Files created:**
- `server/src/tools/elevenlabs/types.ts` (new)
- `server/src/tools/elevenlabs/client.ts` (new)
- `server/src/tools/elevenlabs/index.ts` (new)
- `client/src/components/tools/Day5TTS.tsx` (new)

**Files modified:**
- `server/src/index.ts` - Added TTS endpoints and startup status
- `server/.env.example` - Added ELEVENLABS_API_KEY
- `client/src/App.tsx` - Added Day5TTS routing
- `shared/src/config.json` - Updated day statuses

**Testing notes:**
1. Add `ELEVENLABS_API_KEY` to `server/.env`
2. Run `npm run dev`
3. Navigate to Day 5 in sidebar
4. Select voice, enter text, click "Generate Audio"
5. Audio player should appear with playback controls
6. Download button saves MP3 file

**Status:** Complete

---

**Last updated:** 2025-12-29
