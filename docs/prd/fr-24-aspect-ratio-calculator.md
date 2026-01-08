# FR-24: Aspect Ratio Calculator

**Status:** Pending
**Added:** 2026-01-08
**Day:** 15 of 12 Days of Claudemas

---

## User Story

As a video creator working across multiple platforms, I want a fast, visual aspect ratio calculator so that I can quickly determine correct dimensions for any aspect ratio without manual math or trial-and-error.

## Problem

Creating video content for multiple platforms requires calculating dimensions for different aspect ratios:
1. Manual calculation is slow and error-prone
2. Difficult to visualize aspect ratio differences without rendering actual video
3. Platform-specific dimension requirements are scattered across documentation
4. No quick reference for common resolutions and their aspect ratios
5. Trial and error when resizing content for different platforms

This is Day 15 of the 12 Days of Claudemas. The goal is to create an aspect ratio calculator that helps video creators quickly calculate dimensions, understand aspect ratios, and see platform-specific recommendations.

## Solution

Create an aspect ratio calculator with bidirectional calculation, visual previews, and platform recommendations:

- **Bidirectional Calculation:** Input width/height + aspect ratio → calculate missing dimension, OR input width + height → calculate aspect ratio
- **Presets:** Quick access to common aspect ratios (16:9, 9:16, 1:1, etc.) and resolutions (1080p, 4K, etc.)
- **Platform Recommendations:** Show recommended dimensions for YouTube, Instagram, TikTok, etc.
- **Visual Preview:** Side-by-side colored rectangles showing aspect ratio comparisons
- **Calculation History:** Last 20 calculations stored in localStorage

### Core Features (MVP)

**1. Bidirectional Calculator**

**Mode A: Aspect Ratio → Dimensions**
- User inputs: width OR height + aspect ratio
- Calculator outputs: missing dimension
- Example: 1920px width + 16:9 ratio = 1080px height

**Mode B: Dimensions → Aspect Ratio**
- User inputs: width AND height
- Calculator outputs: aspect ratio (simplified and decimal)
- Example: 1920px × 1080px = 16:9 (1.778)

**2. Common Presets**

**Aspect Ratio Presets:**
- 16:9 (widescreen)
- 9:16 (vertical/portrait)
- 1:1 (square)
- 4:3 (classic)
- 21:9 (ultrawide)
- 2.39:1 (cinematic)
- 4:5 (Instagram portrait)

**Resolution Presets:**
- 1080p (1920×1080, 16:9)
- 4K (3840×2160, 16:9)
- 720p (1280×720, 16:9)
- 1440p (2560×1440, 16:9)
- 480p (640×480, 4:3)

**3. Platform Recommendations**

Display recommended dimensions for popular platforms:

| Platform | Recommended Dimensions | Aspect Ratio | Use Case |
|----------|----------------------|--------------|----------|
| **YouTube** | 1920×1080 | 16:9 | Standard video |
| **YouTube Shorts** | 1080×1920 | 9:16 | Vertical video |
| **Instagram Feed** | 1080×1080 | 1:1 | Square posts |
| **Instagram Story** | 1080×1920 | 9:16 | Stories/Reels |
| **Instagram Portrait** | 1080×1350 | 4:5 | Portrait posts |
| **TikTok** | 1080×1920 | 9:16 | Vertical video |
| **Facebook** | 1920×1080 | 16:9 | Standard video |
| **Twitter/X** | 1920×1080 | 16:9 | Standard video |
| **LinkedIn** | 1920×1080 | 16:9 | Standard video |

**4. Visual Preview**

Side-by-side comparison showing:
- Two colored rectangles scaled proportionally
- Current aspect ratio displayed prominently
- Comparison aspect ratio for reference
- Labels showing dimensions
- Responsive scaling to fit viewport

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Day 15: Aspect Ratio Calculator                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ CALCULATOR                                                       │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │                                                                  │ │
│  │  Width:  [1920_______] px        Aspect Ratio: [16:9_____]      │ │
│  │  Height: [1080_______] px        Decimal:      [1.778____]      │ │
│  │                                                                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐                          │ │
│  │  │Calculate │ │  Reset   │ │ Swap   │                          │ │
│  │  └──────────┘ └──────────┘ └────────┘                          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ASPECT RATIO PRESETS                                             │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  [16:9]  [9:16]  [1:1]  [4:3]  [21:9]  [2.39:1]  [4:5]          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ RESOLUTION PRESETS                                               │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  [1080p]  [4K]  [720p]  [1440p]  [480p]                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌───────────────────────────┬─────────────────────────────────────┐ │
│  │ VISUAL PREVIEW            │ PLATFORM RECOMMENDATIONS            │ │
│  ├───────────────────────────┼─────────────────────────────────────┤ │
│  │                           │                                     │ │
│  │  ┌────────────────┐       │ YouTube:          1920×1080 (16:9) │ │
│  │  │                │       │ YouTube Shorts:   1080×1920 (9:16) │ │
│  │  │    16:9        │       │ Instagram Feed:   1080×1080 (1:1)  │ │
│  │  │  1920×1080     │       │ Instagram Story:  1080×1920 (9:16) │ │
│  │  │                │       │ Instagram Portrait: 1080×1350 (4:5)│ │
│  │  └────────────────┘       │ TikTok:           1080×1920 (9:16) │ │
│  │                           │ Facebook:         1920×1080 (16:9) │ │
│  │     ┌────────────┐        │ Twitter/X:        1920×1080 (16:9) │ │
│  │     │            │        │ LinkedIn:         1920×1080 (16:9) │ │
│  │     │    9:16    │        │                                     │ │
│  │     │ 1080×1920  │        │ [Copy Dimensions]                  │ │
│  │     │            │        │                                     │ │
│  │     └────────────┘        │                                     │ │
│  │                           │                                     │ │
│  └───────────────────────────┴─────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ CALCULATION HISTORY                                              │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  1920×1080 → 16:9 (1.778)                                       │ │
│  │  1080×1920 → 9:16 (0.562)                                       │ │
│  │  1280×720  → 16:9 (1.778)                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Architecture

Follows FliGen's standard client/server pattern:
```
Client (React/Vite - port 5200)
    ↕ Socket.io (optional for history sync)
Server (Express/Node - port 5201)
```

### Components

**Client:**
- `client/src/components/tools/Day15AspectRatio.tsx` - Main calculator UI
- `client/src/components/tools/aspect-ratio/Calculator.tsx` - Calculator form
- `client/src/components/tools/aspect-ratio/PresetButtons.tsx` - Preset buttons
- `client/src/components/tools/aspect-ratio/VisualPreview.tsx` - Visual comparison
- `client/src/components/tools/aspect-ratio/PlatformRecommendations.tsx` - Platform table
- `client/src/components/tools/aspect-ratio/CalculationHistory.tsx` - History list
- `client/src/components/tools/aspect-ratio/useCalculator.ts` - Calculation logic hook

**Server (Optional):**
- `/api/aspect-ratio/presets` - GET endpoint for preset configurations (optional, can be client-side)
- `/api/aspect-ratio/platforms` - GET endpoint for platform recommendations (optional)

### Calculation Logic (Client-side)

```typescript
interface Calculation {
  width: number | null;
  height: number | null;
  aspectRatio: string | null; // e.g., "16:9"
  decimal: number | null;
}

// Calculate missing dimension from aspect ratio
function calculateDimension(
  known: number,
  aspectRatio: string,
  dimension: 'width' | 'height'
): number {
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratio = w / h;

  if (dimension === 'height') {
    return Math.round(known / ratio);
  } else {
    return Math.round(known * ratio);
  }
}

// Calculate aspect ratio from dimensions using GCD
function calculateAspectRatio(
  width: number,
  height: number
): { ratio: string; decimal: number } {
  const gcd = (a: number, b: number): number =>
    b === 0 ? a : gcd(b, a % b);

  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  return {
    ratio: `${w}:${h}`,
    decimal: parseFloat((width / height).toFixed(3))
  };
}
```

### Data Storage

**Calculation History:**
- Store last 20 calculations in browser localStorage
- Optional: persist to server for cross-device sync via Socket.io
- Display in reverse chronological order

**Format:**
```typescript
interface HistoryEntry {
  id: string;
  timestamp: number;
  width: number;
  height: number;
  aspectRatio: string;
  decimal: number;
}
```

### Styling

**AppyDave Brand Colors (Dark Theme):**
- Background: `#342d2d` (dark brown)
- Text: `#ffffff` (white)
- Accent: `#ffde59` (yellow)
- Border: `#ccba9d` (light brown)
- Preview rectangles: `#ffde59` (primary), `#59b7ff` (comparison)

**AppyDave Fonts:**
- Headings: Bebas Neue (display)
- Body: Roboto (regular)
- Numbers/Dimensions: Oswald (monospace-like)

**Responsive Design:**
- Desktop: side-by-side layout (calculator left, preview/recommendations right)
- Tablet: stacked layout with full-width sections
- Mobile: single column, compact presets

### Visual Preview Implementation

The visual preview should:
1. Use CSS `aspect-ratio` property for accurate scaling
2. Contain rectangles within a fixed viewport (e.g., 400px × 400px)
3. Scale down larger rectangles proportionally to fit
4. Label each rectangle with its dimensions and ratio
5. Use distinct colors for primary vs comparison rectangle
6. Show rectangles side-by-side on desktop, stacked on mobile

---

## User Workflows

### Workflow 1: Calculate Height from Width + Aspect Ratio

1. User opens Aspect Ratio Calculator (Day 15)
2. Enters width: 1920
3. Selects aspect ratio preset: 16:9 (or types it)
4. Clicks "Calculate"
5. Height field auto-fills: 1080
6. Visual preview shows 16:9 rectangle
7. Calculation added to history

### Workflow 2: Calculate Aspect Ratio from Dimensions

1. User enters width: 1920
2. User enters height: 1080
3. Clicks "Calculate"
4. Aspect ratio field auto-fills: 16:9
5. Decimal field shows: 1.778
6. Visual preview shows rectangle
7. Calculation added to history

### Workflow 3: Use Platform Preset

1. User clicks "Instagram Story" in platform recommendations
2. All fields auto-populate: 1080×1920, 9:16
3. Visual preview shows 9:16 vertical rectangle
4. User clicks "Copy Dimensions" to clipboard
5. Paste into video editor settings

### Workflow 4: Compare Two Aspect Ratios

1. User calculates first ratio (16:9)
2. Visual preview shows first rectangle
3. User selects second preset (9:16)
4. Visual preview shows both rectangles side-by-side
5. User sees scale difference clearly

---

## Acceptance Criteria

### Core Calculator
- [ ] User can input width and aspect ratio to calculate height
- [ ] User can input height and aspect ratio to calculate width
- [ ] User can input width and height to calculate aspect ratio
- [ ] Aspect ratio displayed in both ratio format (16:9) and decimal (1.778)
- [ ] Calculator validates inputs (positive numbers only)
- [ ] Calculator handles decimal inputs and rounds appropriately
- [ ] "Swap" button swaps width and height values
- [ ] "Reset" button clears all fields
- [ ] Calculate button triggers calculation and updates all fields

### Presets
- [ ] Aspect ratio preset buttons: 16:9, 9:16, 1:1, 4:3, 21:9, 2.39:1, 4:5
- [ ] Resolution preset buttons: 1080p, 4K, 720p, 1440p, 480p
- [ ] Clicking aspect ratio preset populates aspect ratio field
- [ ] Clicking resolution preset populates width, height, and aspect ratio
- [ ] Preset buttons highlighted when active
- [ ] Preset buttons work without requiring separate "Calculate" click

### Platform Recommendations
- [ ] Platform table displays 9+ platforms with dimensions and ratios
- [ ] Platforms include: YouTube, YouTube Shorts, Instagram (Feed/Story/Portrait), TikTok, Facebook, Twitter, LinkedIn
- [ ] Clicking platform row populates calculator fields
- [ ] "Copy Dimensions" button copies current dimensions to clipboard
- [ ] Platform recommendations update when aspect ratio changes

### Visual Preview
- [ ] Side-by-side display of two aspect ratio rectangles
- [ ] Rectangles scaled proportionally to actual aspect ratio
- [ ] Primary rectangle shows current calculation
- [ ] Comparison rectangle shows selected preset or previous calculation
- [ ] Rectangles labeled with dimensions and ratio
- [ ] Preview updates in real-time as inputs change
- [ ] Rectangles use AppyDave brand colors
- [ ] Preview responsive to viewport size

### Calculation History
- [ ] Last 20 calculations displayed in reverse chronological order
- [ ] Each entry shows: width×height → ratio (decimal)
- [ ] Clicking history entry repopulates calculator
- [ ] History persists in localStorage across sessions
- [ ] "Clear History" button removes all entries
- [ ] History survives page refresh

### UI/UX
- [ ] Dark theme with AppyDave brand colors
- [ ] Responsive layout works on desktop, tablet, mobile
- [ ] Input fields accept keyboard input with proper validation
- [ ] Number inputs prevent non-numeric characters
- [ ] Preset buttons visually distinct and easy to click
- [ ] Loading states for async operations (if any)
- [ ] Error messages for invalid inputs

### Architecture
- [ ] Follows FliGen Day 1 pattern (client/server structure)
- [ ] Client runs on port 5200 (React/Vite)
- [ ] Server runs on port 5201 (Express/Node)
- [ ] Calculation logic primarily client-side for performance
- [ ] Optional Socket.io for history sync
- [ ] Accessible from FliGen navigation

---

## Out of Scope (Future Enhancements)

### Phase 2 - Advanced Features
- **Crop Calculator** - Calculate crop dimensions from source to target ratio
- **Scale Calculator** - Calculate scaled dimensions maintaining aspect ratio
- **DPI Calculator** - Convert between pixels and physical dimensions
- **Multi-format Export** - Export calculations to JSON, CSV, PDF
- **Custom Presets** - Save user-defined aspect ratios and resolutions

### Phase 3 - Collaboration
- **Share Calculations** - Generate shareable links to calculation results
- **Team Presets** - Organization-wide preset libraries
- **Project Templates** - Save entire dimension sets for projects

### Phase 4 - Integration
- **Import from Image** - Upload image to auto-detect dimensions
- **API Access** - REST API for programmatic calculations
- **Video Editor Plugins** - Export directly to Premiere/Resolve/DaVinci
- **FliDeck Integration** - Embed calculator as presentation widget

---

## Edge Cases

Handle edge cases gracefully:
- **Division by zero**: Prevent aspect ratio like "16:0"
- **Very large numbers**: Warn if dimensions exceed 8K (7680×4320)
- **Very small numbers**: Warn if dimensions below 320px
- **Unusual ratios**: Display as-is even if not in preset list
- **Decimal aspect ratios**: Convert "2.39" to "2.39:1" automatically

---

## Copy to Clipboard

"Copy Dimensions" should copy in multiple formats:
```
1920×1080 (16:9)
Width: 1920px
Height: 1080px
Aspect Ratio: 16:9 (1.778)
```

---

## Dependencies

- React 19 + TypeScript
- TailwindCSS v4
- Google Fonts (Bebas Neue, Oswald, Roboto)
- Optional: Socket.io (for history sync)

---

## Related

- FR-12: Thumbnail Generator (Day 13) - Similar parameter-driven tool
- FR-23: Widget Generator (Day 14) - Template pattern reference
- Day 1: FliGen Harness - Base architecture pattern

---

## Priority

**Medium-High** - Useful utility for video creators, demonstrates calculation UI patterns

---

**Last updated:** 2026-01-08
