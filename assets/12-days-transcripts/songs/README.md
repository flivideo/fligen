# 12 Days of Claudemas - Song Data

This directory contains the song data for the "12 Days of Claudemas" musical narrative, broken into three thematic songs.

## Song Structure

The 12 days are split into three songs, each covering 4 days and representing a phase of the journey:

### 1. The Foundation (Days 1-4)
**File:** `song-1-foundation.json`
**Style:** Electronic Pop, upbeat and inspiring, 120 BPM
**Theme:** Building the technical infrastructure
**Days Covered:**
- Day 1: FliGen Harness
- Day 2: Primary Brain (Claude SDK)
- Day 3: Second Brain (Kybernesis)
- Day 4: Image Generator

### 2. The Creation (Days 5-8)
**File:** `song-2-creation.json`
**Style:** Indie Rock with Electronic elements, 125 BPM
**Theme:** Creative tools come alive
**Days Covered:**
- Day 5: Text-to-Speech (ElevenLabs)
- Day 6: Video Animation
- Day 7: Music Generator
- Day 8: Thumbnail Generator

### 3. The Integration (Days 9-12)
**File:** `song-3-integration.json`
**Style:** Epic Cinematic Rock, triumphant, 130 BPM
**Theme:** Bringing it all together
**Days Covered:**
- Day 9: Interop (FliHub)
- Day 10: N8N/ComfyUI Workflows
- Day 11: Story Builder
- Day 12: Finale/Completion

## File Format

Each JSON file contains:
```json
{
  "provider": "kie",           // KIE.AI (Suno) or FAL.AI
  "model": "V4.5",              // Suno model version
  "title": "Song Title",        // Track title
  "style": "Genre, BPM, mood",  // Style description
  "instrumental": false,        // Whether to include vocals
  "vocalGender": "male",        // Vocal gender
  "outputFormat": "mp3",        // Audio format
  "lyrics": "[Verse]...",       // Full lyrics with metatags
  "prompt": "Description",      // Summary of what days are covered
  "days": [1, 2, 3, 4],        // Array of day numbers
  "theme": "Theme Name",        // Thematic section
  "description": "Overview"     // Detailed description
}
```

## Using These Files

### In FliGen Music Generator (Day 7)

1. Navigate to Day 7 - Music Generator
2. Select **KIE.AI** as the provider
3. Copy the contents of a song JSON file
4. Paste the relevant fields into the UI:
   - Title → `title`
   - Style → `style`
   - Lyrics → `lyrics`
   - Vocal Gender → `vocalGender`
5. Click "Generate Music"

### Programmatic Usage

Load and use in your code:

```typescript
import song1 from './song-1-foundation.json';

const result = await generateMusic({
  provider: song1.provider,
  model: song1.model,
  title: song1.title,
  style: song1.style,
  lyrics: song1.lyrics,
  instrumental: song1.instrumental,
  vocalGender: song1.vocalGender,
  outputFormat: song1.outputFormat
});
```

### Via API

```bash
curl -X POST http://localhost:5401/api/music/generate \
  -H "Content-Type: application/json" \
  -d @song-1-foundation.json
```

## Musical Progression

The three songs are designed to build in intensity:

1. **Foundation (120 BPM)** - Upbeat, establishing the journey
2. **Creation (125 BPM)** - More energetic, creative tools activated
3. **Integration (130 BPM)** - Epic finale, everything comes together

This creates a natural narrative arc perfect for a YouTube video.

## Metatags Used

The lyrics use standard Suno metatags:
- `[Intro]` - Introduction section
- `[Verse 1]`, `[Verse 2]` - Verse sections
- `[Chorus]` - Chorus/hook
- `[Bridge]` - Bridge section (Song 3 only)
- `[Outro]` - Ending section
- `[Final Chorus]` - Climactic final chorus (Song 3 only)

## Estimated Costs

**KIE.AI (Suno) Pricing:** ~$0.06 per track (12 credits)

Total cost for all 3 songs: **~$0.18**

## Notes

- Each song is designed to be 60-90 seconds long
- Lyrics avoid repetition (unlike traditional "12 Days of Christmas")
- Progressive BPM increase creates energy build
- Metatags guide structure but Suno may interpret creatively
- Vocal gender set to "male" but can be changed to "female" if desired

## Alternative Approaches

See `alternatives/` folder for:
- 12 individual songs (one per day, different genres)
- Single unified song (all 12 days in one track)
- FAL.AI versions (using tags instead of style descriptions)

---

**Created:** 2026-01-05
**For:** 12 Days of Claudemas YouTube Video
