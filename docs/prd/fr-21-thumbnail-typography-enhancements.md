# FR-21: Thumbnail Typography Enhancements

**Status:** Pending
**Added:** 2026-01-06
**Related:** FR-12 (Day 8 Thumbnail Generator)

---

## User Story

As a content creator, I want to use brand-consistent typography (BebasNeue, Oswald) and much larger text sizes in my YouTube thumbnails so that my thumbnails have greater visual impact, match AppyDave brand identity, and are more readable on small screens.

## Problem

The current Day 8 Thumbnail Generator has typography limitations:

1. **Font Selection Missing:**
   - Only one font available (browser default or generic sans-serif)
   - No access to AppyDave brand fonts: BebasNeue (display) and Oswald (subheading)
   - Thumbnails don't match brand identity from appydave.com site

2. **Text Size Too Small:**
   - Current font size (~36-48px) produces text that's too small for thumbnail impact
   - YouTube thumbnails need LARGE, bold text visible on mobile screens
   - No ability to use 2x-3x larger font sizes effectively

3. **Brand Consistency:**
   - AppyDave brand guide specifies:
     - **BebasNeue** for h1 headings and buttons (display font)
     - **Oswald** for h2-h6 headings (uppercase transform)
     - **Roboto** for body text
   - Thumbnails should use BebasNeue for maximum impact

## Solution

Enhance the text panel configuration with:

1. **Font Family Dropdown:**
   - BebasNeue (default) - Display font, bold impact
   - Oswald - Subheading font, uppercase style
   - Roboto - Body font (for longer descriptions)

2. **Larger Font Sizes:**
   - Increase font size slider range to support 72px - 200px
   - Default size increased to 72px (2x current)
   - Support for "hero text" at 144px+ (3x current)

3. **Text Scrolling/Overflow Handling:**
   - Text that exceeds panel width wraps to multiple lines
   - Optional "marquee scroll" effect for single-line overflow
   - Text scaling to fit (reduce font size if text too long)

### Font Loading Strategy

Load all three brand fonts via Google Fonts:

```html
<!-- In client/index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
```

Ensure fonts are loaded before export:

```typescript
await Promise.all([
  document.fonts.load('bold 72px "Bebas Neue"'),
  document.fonts.load('bold 72px "Oswald"'),
  document.fonts.load('400 72px "Roboto"'),
]);
```

### UI Changes

**Text Panel Configuration (Layer 3):**

Each of the 3 text panels gets these additional controls:

```
+----------------------------------+
| Panel 1                    [x]   |  (enable checkbox)
+----------------------------------+
| Text: [CLAUDE CODE          ]    |
| Font: [BebasNeue ▼]              |  <-- NEW
| Size: [72px        ] [▲▼]        |  <-- ENHANCED (72-200px range)
|                                  |
| Background: ● ● ● ● ●           |
| Text Color: ● ● ● ● ●           |
| Position: [top-left ▼]          |
|                                  |
| Overflow: [Wrap ▼]              |  <-- NEW (Wrap/Scale/Scroll)
+----------------------------------+
```

**Font Dropdown Options:**
- BebasNeue (bold display font)
- Oswald (uppercase subheading)
- Roboto (body text)

**Size Slider:**
- Range: 72px - 200px
- Step: 4px
- Default: 72px (BebasNeue), 64px (Oswald), 56px (Roboto)

**Overflow Handling Dropdown:**
- **Wrap** (default) - Multi-line text, auto-wraps at panel width
- **Scale to Fit** - Reduce font size to fit text on one line
- **Scroll** - Single-line marquee scroll animation (optional/bonus)

---

## UI Mockup

### Layer 3 Configuration Panel (Enhanced)

```
┌────────────────────────────────────────────────┐
│  LAYER 3: TEXT PANELS                          │
├────────────────────────────────────────────────┤
│                                                │
│  Panel 1                              [x] On   │
│  ┌──────────────────────────────────────────┐ │
│  │ Text:                                    │ │
│  │ ┌────────────────────────────────────┐   │ │
│  │ │ CLAUDE CODE                        │   │ │
│  │ └────────────────────────────────────┘   │ │
│  │                                          │ │
│  │ Font:     [BebasNeue ▼]                 │ │  <-- NEW
│  │ Size:     [72px] ────●──── [Max: 200]   │ │  <-- ENHANCED
│  │                                          │ │
│  │ Overflow: [Wrap ▼]                      │ │  <-- NEW
│  │                                          │ │
│  │ Background: ● ● ● ● ●                   │ │
│  │             (5 brand colors)             │ │
│  │ Text Color: ● ● ● ● ●                   │ │
│  │             (5 brand colors)             │ │
│  │                                          │ │
│  │ Position:   [top-left ▼]                │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Panel 2                              [ ] Off  │
│  Panel 3                              [ ] Off  │
│                                                │
└────────────────────────────────────────────────┘
```

### Live Preview with Large Text

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  CLAUDE CODE    (72px BebasNeue, yellow)        │
│  12 DAYS        (72px BebasNeue, white)         │
│                                                  │
│                                                  │
│         [Main image centered]                    │
│                                                  │
│                                                  │
│                                                  │
│                      [Avatar overlay bottom-R]   │
└──────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Font Configuration

Add font metadata to constants:

```typescript
// Font system
const FONTS = {
  BebasNeue: {
    family: '"Bebas Neue", sans-serif',
    defaultSize: 72,
    weight: 700,
    style: 'normal',
    transform: 'uppercase', // Auto-uppercase text
  },
  Oswald: {
    family: '"Oswald", sans-serif',
    defaultSize: 64,
    weight: 700,
    style: 'normal',
    transform: 'uppercase',
  },
  Roboto: {
    family: '"Roboto", sans-serif',
    defaultSize: 56,
    weight: 400,
    style: 'normal',
    transform: 'none',
  },
} as const;

type FontFamily = keyof typeof FONTS;
```

### Updated TextPanel Interface

```typescript
interface TextPanel {
  id: string;
  enabled: boolean;
  text: string;
  bgColor: BrandColor;
  textColor: BrandColor;
  position: PresetPosition;
  customX: number;
  customY: number;
  // Enhanced typography
  fontFamily: FontFamily;      // NEW: BebasNeue | Oswald | Roboto
  fontSize: number;             // ENHANCED: 72-200px range
  paddingX: number;
  paddingY: number;
  overflow: 'wrap' | 'scale' | 'scroll';  // NEW
}
```

### Canvas Rendering with Fonts

```typescript
const renderTextPanel = (
  ctx: CanvasRenderingContext2D,
  panel: TextPanel,
  canvasWidth: number,
  canvasHeight: number
) => {
  if (!panel.enabled) return;

  const font = FONTS[panel.fontFamily];

  // Set font (critical for export)
  ctx.font = `${font.weight} ${panel.fontSize}px ${font.family}`;
  ctx.fillStyle = BRAND[panel.textColor];
  ctx.textBaseline = 'top';

  // Apply text transform
  const displayText = font.transform === 'uppercase'
    ? panel.text.toUpperCase()
    : panel.text;

  // Calculate position
  const { x, y } = calculatePosition(panel, canvasWidth, canvasHeight);

  // Measure text
  const metrics = ctx.measureText(displayText);
  const textWidth = metrics.width;

  // Background panel
  const bgPadding = { x: panel.paddingX, y: panel.paddingY };
  const bgWidth = textWidth + (bgPadding.x * 2);
  const bgHeight = panel.fontSize + (bgPadding.y * 2);

  ctx.fillStyle = BRAND[panel.bgColor];
  ctx.fillRect(x, y, bgWidth, bgHeight);

  // Handle overflow
  switch (panel.overflow) {
    case 'wrap':
      renderWrappedText(ctx, displayText, x + bgPadding.x, y + bgPadding.y, panel);
      break;
    case 'scale':
      renderScaledText(ctx, displayText, x + bgPadding.x, y + bgPadding.y, panel, bgWidth);
      break;
    case 'scroll':
      // For preview only - export uses static text
      renderScrollingText(ctx, displayText, x + bgPadding.x, y + bgPadding.y, panel);
      break;
  }
};
```

### Text Wrapping Implementation

```typescript
const renderWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  panel: TextPanel
) => {
  const maxWidth = 1280 - x - panel.paddingX; // Canvas width minus position and padding
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  const lineHeight = panel.fontSize * 1.2; // 120% line height

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== '') {
      // Draw current line
      ctx.fillStyle = BRAND[panel.textColor];
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  // Draw last line
  if (line) {
    ctx.fillStyle = BRAND[panel.textColor];
    ctx.fillText(line, x, lineY);
  }
};
```

### Font Preloading Before Export

```typescript
const exportToPng = async (config: ThumbnailConfig): Promise<Blob> => {
  // Preload all fonts used in text panels
  const fontsToLoad = config.textPanels
    .filter(p => p.enabled)
    .map(p => {
      const font = FONTS[p.fontFamily];
      return document.fonts.load(`${font.weight} ${p.fontSize}px ${font.family}`);
    });

  await Promise.all(fontsToLoad);

  // Now render to canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // ... render layers

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
};
```

---

## Acceptance Criteria

### Font Selection
- [ ] Font dropdown shows BebasNeue, Oswald, Roboto options
- [ ] Font family changes reflected in live preview
- [ ] Font family renders correctly in PNG export
- [ ] BebasNeue auto-converts text to uppercase
- [ ] Oswald auto-converts text to uppercase
- [ ] Roboto preserves text case as entered

### Font Size
- [ ] Font size slider range is 72px - 200px
- [ ] Size changes reflected in live preview in real-time
- [ ] Default size varies by font (72px BebasNeue, 64px Oswald, 56px Roboto)
- [ ] Large text (144px+) renders correctly without clipping
- [ ] Export PNG preserves exact font size

### Overflow Handling
- [ ] "Wrap" mode breaks text into multiple lines
- [ ] "Scale to Fit" reduces font size to fit text on one line
- [ ] "Scroll" mode (bonus) shows marquee animation in preview
- [ ] Overflow mode affects live preview
- [ ] Export always uses "Wrap" or "Scale" (scroll not animated in PNG)

### Font Loading
- [ ] All 3 fonts load on page load
- [ ] Export waits for fonts to load before rendering
- [ ] No fallback fonts appear in export (verify with font stack)
- [ ] Font loading error shows graceful fallback message

### Integration
- [ ] Font dropdown added to all 3 text panel editors
- [ ] Size slider range updated to 72-200px
- [ ] Overflow dropdown added to all 3 text panel editors
- [ ] Reset button restores font defaults
- [ ] Changes persist when switching between layers

### Visual Quality
- [ ] Large text (100px+) is crisp in preview
- [ ] Large text renders cleanly in PNG export (no pixelation)
- [ ] BebasNeue displays with bold weight
- [ ] Oswald displays with appropriate weight
- [ ] Text is readable at all sizes

---

## Default State Updates

Updated initial configuration with brand fonts:

```typescript
const initialConfig: ThumbnailConfig = {
  mainImageUrl: null,
  textPanels: [
    {
      id: 'panel-1',
      enabled: true,
      text: 'CLAUDE CODE',
      fontFamily: 'BebasNeue',   // <-- NEW
      fontSize: 72,               // <-- INCREASED from 36
      bgColor: 'black',
      textColor: 'yellow',
      position: 'top-left',
      customX: 2.5,
      customY: 4.2,
      paddingX: 16,
      paddingY: 8,
      overflow: 'wrap',           // <-- NEW
    },
    {
      id: 'panel-2',
      enabled: true,
      text: '12 DAYS',
      fontFamily: 'BebasNeue',   // <-- NEW
      fontSize: 72,               // <-- INCREASED from 36
      bgColor: 'black',
      textColor: 'white',
      position: 'top-left',
      customX: 2.5,
      customY: 11,
      paddingX: 16,
      paddingY: 8,
      overflow: 'wrap',           // <-- NEW
    },
    {
      id: 'panel-3',
      enabled: false,
      text: 'PANEL 3',
      fontFamily: 'Oswald',      // <-- NEW (different font)
      fontSize: 64,               // <-- NEW
      bgColor: 'black',
      textColor: 'yellow',
      position: 'bottom-left',
      customX: 2.5,
      customY: 83,
      paddingX: 16,
      paddingY: 8,
      overflow: 'wrap',           // <-- NEW
    },
  ],
  overlay: {
    enabled: false,
    imageUrl: null,
    position: 'bottom-right',
    scale: 1.0,
  },
};
```

---

## Test Scenarios

### Scenario 1: Brand Font Selection
1. Navigate to Day 8
2. Select Panel 1
3. Change font from BebasNeue → Oswald
4. Verify live preview shows Oswald font
5. Export PNG
6. Open exported PNG and verify Oswald font rendered (not fallback)

### Scenario 2: Large Text Impact
1. Enable Panel 1 with text "WATCH NOW"
2. Select BebasNeue font
3. Set font size to 144px (3x original)
4. Position at middle-center
5. Verify text is large and readable
6. Export and verify crisp rendering at large size

### Scenario 3: Text Wrapping
1. Enable Panel 1 with long text: "BUILDING 12 TOOLS IN 12 DAYS"
2. Set font size to 96px
3. Set overflow to "Wrap"
4. Position at top-left
5. Verify text wraps to multiple lines
6. Export and verify wrapped text in PNG

### Scenario 4: Multi-Font Composition
1. Panel 1: "CLAUDE CODE" - BebasNeue 72px - yellow text
2. Panel 2: "Day 8 Tutorial" - Oswald 64px - white text
3. Panel 3: "Step-by-step guide" - Roboto 48px - lightBrown text
4. Verify all 3 fonts render correctly in preview
5. Export and verify all fonts in PNG

### Scenario 5: Scale to Fit
1. Panel 1: "EXTREMELY LONG TITLE TEXT THAT GOES ON"
2. Font: BebasNeue, Size: 100px
3. Overflow: "Scale to Fit"
4. Verify font size reduces to fit panel width
5. Export and verify scaled text

---

## Out of Scope

- Custom font uploads (only Google Fonts)
- Font weight selection (fixed to brand weights)
- Letter spacing / kerning adjustments
- Text shadows or stroke effects
- Gradient text fills
- Curved/arc text layouts
- Animated text in exports (GIF/video)

---

## Dependencies

### External
- Google Fonts API (BebasNeue, Oswald, Roboto)
- Canvas API font rendering

### Internal
- FR-12 (Day 8 Thumbnail Generator) - base feature
- AppyDave brand guide - font specifications

---

## Files to Modify

```
client/src/components/tools/Day8Thumbnail.tsx
├── Add FONTS constant
├── Update TextPanel interface
├── Add font dropdown to text panel editor
├── Update font size slider (72-200px range)
├── Add overflow dropdown
├── Implement renderWrappedText()
├── Implement renderScaledText()
├── Update exportToPng() with font preloading
└── Update initialConfig with brand fonts

client/index.html
└── Add Google Fonts <link> tags

shared/src/index.ts (optional)
└── Add FontFamily and OverflowMode types if shared
```

---

## Brand Consistency Notes

From AppyDave Brand Guide:

**Typography Hierarchy:**
- **h1**: BebasNeue, large display text for hero sections
- **h2-h6**: Oswald, uppercase, progressive size scaling
- **Body text**: Roboto, regular weight
- **Buttons**: BebasNeue, bold styling

**Thumbnail Usage:**
- Primary impact text (titles, CTAs): **BebasNeue** 72px-144px
- Secondary text (subtitles, labels): **Oswald** 56px-96px
- Descriptive text (rare): **Roboto** 48px-72px

**Text Transform:**
- BebasNeue and Oswald should always display in UPPERCASE
- Roboto preserves original case (title case or sentence case)

---

## References

### Design Assets
- [AppyDave Brand Guide](/Users/davidcruwys/dev/ad/appydave-brand/design-system/brand-guide.md)
- [Google Fonts - Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue)
- [Google Fonts - Oswald](https://fonts.google.com/specimen/Oswald)
- [Google Fonts - Roboto](https://fonts.google.com/specimen/Roboto)

### Related Requirements
- [FR-12: Thumbnail Generator](fr-12-thumbnail-generator.md) - Base Day 8 feature

### Technical References
- [Canvas API - fillText()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText)
- [FontFace API - document.fonts.load()](https://developer.mozilla.org/en-US/docs/Web/API/FontFace/load)
- [Canvas Text Wrapping Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text)

---

## Completion Notes

**What was done:**
- Added AppyDave brand fonts (BebasNeue, Oswald, Roboto) to project via Google Fonts
- Implemented FONTS constant with font family, weight, size defaults, and text transform rules
- Updated TextPanel interface to include fontFamily and overflow properties
- Added font family dropdown selector to text panel editor (3 options with descriptions)
- Updated font size slider range from 20-80px to 72-200px (step: 4px)
- Added overflow mode dropdown (Wrap, Scale to Fit, Scroll)
- Implemented renderWrappedText() function for multi-line text with 120% line height
- Implemented renderScaledText() function to auto-reduce font size when text exceeds width
- Updated preview canvas to apply font family, weight, and text transform (uppercase for BebasNeue/Oswald)
- Updated canvas export rendering to use font system with proper preloading
- Added font preloading before export using document.fonts.load() for all active panels
- Updated default text panels with brand fonts and larger sizes (72px BebasNeue default)
- Adjusted padding ranges: H: 8-80px, V: 4-60px (increased from 4-48px, 2-32px)

**Files changed:**
- `client/index.html` (modified) - Added Google Fonts link for BebasNeue, Oswald, Roboto
- `client/src/components/tools/Day8Thumbnail.tsx` (modified) - Full typography system implementation

**Technical details:**
- Font transform applied automatically: BebasNeue and Oswald convert to uppercase, Roboto preserves case
- Text overflow modes: "wrap" uses word-wrapping algorithm, "scale" reduces font size proportionally, "scroll" treated as scale in PNG export
- Font preloading ensures correct rendering in exported PNGs (no fallback fonts)
- Preview uses 0.5x scale factor for display but exports at full 1280x720 resolution
- Default padding increased to 24px horizontal, 12px vertical for better proportion with larger text

**Testing notes:**
- Test all 3 font families by selecting from dropdown
- Test font sizes from 72px to 200px to verify large text renders correctly
- Test text wrapping with long text (e.g., "Building 12 Tools in 12 Days")
- Test scale-to-fit with very long text to verify auto-reduction
- Export PNG and verify fonts render correctly (not fallback fonts)
- Verify uppercase transform for BebasNeue and Oswald

**Status:** Complete

---

**Last updated:** 2026-01-06
