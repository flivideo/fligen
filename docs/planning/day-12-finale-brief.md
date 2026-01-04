# Day 12 - Finale: The 12 Days Song

**Preliminary Brief** - To be refined when we start Day 12

## Overview

Day 12 is about creating the finale content - primarily the "12 Days of Claude-mas" song that covers all 12 days of the journey. This is a content/production day, not a heavy development day.

## The Day 12 "Gift"

> "The song that ties all 12 days together."

## Core Plan

### Build Phase (In FliGen)
1. **Prompt engineer lyrics** - Write lyrics covering all 12 days/gifts
2. **Prompt engineer song style** - Define the musical style for Suno
3. **Generate song** - Use Day 7 music generation tools
4. **Walk through screens** - Show each day's UI on camera while recording

### Post-Production Phase (Separate)
1. Add song to video as soundtrack
2. Add screenshots or generated visuals for each concept
3. Optional: Create isolated song video (YouTube short)

## Song Requirements

### Lyrics Structure
Each day gets a "gift" line in the carol format:
```
On the [X] day of Claude-mas, my Claude muse gave to me...

Day 1: A harness in a UI tree
Day 2: A brain that chats with me
Day 3: A memory so I can see
Day 4: Four images generating
Day 5: Five voices speaking
Day 6: Six videos playing
Day 7: Seven songs a-singing
Day 8: Eight thumbnails framing
Day 9: Nine jobs importing
Day 10: Ten workflows running
Day 11: Eleven stories building
Day 12: Twelve days of glory
```

(Exact lyrics to be refined during Day 12)

### Style Prompt for Suno
- Upbeat, celebratory tone
- Christmas carol feel but modern
- Clear vocals for the cumulative verses
- Duration: 2-3 minutes

## Video Structure Options

Three options identified (decide closer to Day 12):

### Option 1: Montage + Final Output (Safest)
- 0:00-0:10 - Cold open hook
- 0:10-0:40 - Fast montage of Days 1-11 (2-3s per day)
- 0:40-1:50 - Integrated pipeline run
- 1:50-end - Song as outro with final output

### Option 2: Mini Movie First (Reverse Reveal)
- Start with the final output clip
- "Wait, you made THAT?"
- Then show how each day contributed
- Song as emotional capstone

### Option 3: Carol as UI Modules (Cumulative Reveal)
- Empty dashboard fills with module cards
- Each verse adds a new day's module
- End with "Run Pipeline" button
- Most faithful to carol structure

### Decision Criteria (For Later)
- Do I have a strong final mini clip? → Yes = Option 2
- Do I want carol as central visual? → Yes = Option 3
- How much editing time? → Low = Option 1

## Deliverables

### Required
- [ ] Song lyrics (all 12 days)
- [ ] Song style prompt
- [ ] Generated song (via Suno)
- [ ] Screen walkthrough footage

### Optional
- [ ] Generated visuals for each day concept
- [ ] Isolated song video (YouTube short)
- [ ] "Finale Pack" folder with all assets

## Output Folder

```
/assets/finale/
  ├── lyrics.md
  ├── style_prompt.md
  ├── song.mp3
  ├── visuals/
  │   ├── day-01.png
  │   ├── day-02.png
  │   └── ...
  └── notes.md
```

## Technical Notes

- Use existing Day 7 Suno integration for song generation
- May need longer song duration than previous generations
- Lyrics should be in the prompt, not just tags
- Consider generating multiple versions for selection

## Dependencies

- Day 7 music generation working
- All previous days functional (for walkthrough)
- Days 9-11 pipeline working (for final output demo)

## Acceptance Criteria

- [ ] Lyrics written covering all 12 days
- [ ] Style prompt defined
- [ ] Song generated successfully
- [ ] Song sounds good and matches the vibe
- [ ] Ready for video integration in post-production

---

**Status:** Preliminary Brief
**Last Updated:** 2026-01-01
