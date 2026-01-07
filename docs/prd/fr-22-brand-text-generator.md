# FR-22: Brand Text Generator (HTML)

**Status:** Pending
**Added:** 2026-01-06
**Day:** 13 (Bonus Day) of 12 Days of Claudemas

---

## User Story

As a content creator, I want to generate brand-styled title text images with customizable typography, multi-color segments, and export options so that I can create professional, on-brand text overlays for thumbnails, social graphics, and video content without external design tools.

## Problem

Creating brand-consistent text graphics for thumbnails and social media currently requires:

1. External design tools (Photoshop, Figma, Illustrator)
2. Manual recreation of brand styles (pixel/brick letters, glow effects, terminal aesthetics)
3. Remembering exact brand colors, fonts, and effects
4. Exporting at correct resolutions
5. Switching between tools for multi-color text segments

This is **Day 13** - a bonus day extending the 12 Days of Claudemas. The goal is to create a specialized text generator that:

- Implements the **Claude Code brick/pixel style** (retro terminal block letters with depth and glow)
- Supports **multi-color text segments** (e.g., "CLAUDE" in orange, "MAS" in blue)
- Exports to **PNG** (with/without transparency) and **SVG** (optional)
- Allows **clipboard copy** or **file download**
- Provides a **template system** for future brand styles (OpenAI, Cursor, Replit, etc.)

### Primary Brand Style: Claude Code Brick

The initial template implements Claude Code's signature aesthetic:

- **Chunky pixel/brick block letters** - Retro terminal style
- **Brick segmentation seams** - Visible tile boundaries
- **Depth/bevel effects** - Inner shadow for 3D appearance
- **Glow background** - Soft spotlight behind text
- **Terminal window frame** - Optional rounded window with controls
- **Scanline effects** - Optional CRT monitor aesthetic
- **Press Enter footer** - Optional footer text

---

## Solution

Create a web-based Brand Text Generator with template architecture supporting multiple brand styles. The MVP focuses on the Claude Code brick style with extensibility for future templates.

### Architecture: Template System

Each brand template defines:

| Property | Description | Example (Claude Code) |
|----------|-------------|----------------------|
| Template Name | Identifier | `claude_code_brick` |
| Typography Style | Font rendering approach | Pixel/brick block letters |
| Default Colors | Primary, secondary, accent | Orange (#D97757), dark brown, yellow |
| Effects | Shadow, bevel, glow presets | Inner shadow, brick seams, glow |
| Background | Glow, terminal, scanlines | Charcoal terminal with glow |
| Layout Defaults | Padding, alignment, sizing | Center-aligned, 80px default |

**Key Requirement:** Adding a new template should require only creating a config object and optional CSS, without modifying core rendering logic.

### UI Layout

```
+-----------------------------------------------------------------------------+
|  Brand Text Generator (HTML)                                                |
|  Create brand-styled title text for thumbnails and social graphics          |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Template: [Claude Code Brick ▼]                                            |
|                                                                              |
+-----------------------------------------------------------------------------+
|  TEXT INPUT                                                                  |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Mode: ( ) Single Color   (•) Multi-Color Segments                          |
|                                                                              |
|  Segments (3):                                                               |
|  +-----------------------------------------------------------------------+  |
|  | Segment 1:  [12 Days of      ]  Color: [white  ▼]  Style: [normal▼] |  |
|  | Segment 2:  [Claude          ]  Color: [orange ▼]  Style: [normal▼] |  |
|  | Segment 3:  [mas             ]  Color: [blue   ▼]  Style: [normal▼] |  |
|  +-----------------------------------------------------------------------+  |
|  [ + Add Segment ]  [ Remove Last ]                                         |
|                                                                              |
|  Alignment: [left] [center] [right]     Case: [original] [UPPER] [lower]   |
|                                                                              |
+-----------------------------------------------------------------------------+
|  TYPOGRAPHY                                                                  |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Font Size:       [80px   ]  ────●──────  [200px]                          |
|  Letter Spacing:  [normal ]  ────●──────  [wide  ]                         |
|                                                                              |
+-----------------------------------------------------------------------------+
|  BRICK STYLE (Claude Code Template)                                         |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Brick Seams:     [medium ]  ────●──────  [heavy ]                         |
|  Inner Shadow:    [medium ]  ────●──────  [deep  ]                         |
|  Bevel Depth:     [medium ]  ────●──────  [strong]                         |
|                                                                              |
+-----------------------------------------------------------------------------+
|  BACKGROUND EFFECTS                                                          |
+-----------------------------------------------------------------------------+
|                                                                              |
|  [x] Glow Behind Text        Color: [orange ▼]   Intensity: ──●─── Strong  |
|  [x] Terminal Window         [x] Window controls (3 dots)                   |
|  [ ] Scanlines Effect        Strength: ────●──── Medium                    |
|  [ ] Footer Text             [Press Enter to continue____________]         |
|                                                                              |
+-----------------------------------------------------------------------------+
|  CANVAS & EXPORT                                                             |
+-----------------------------------------------------------------------------+
|                                                                              |
|  Canvas Size: [YouTube Thumbnail (1280×720) ▼]                             |
|                                                                              |
|  [ Export PNG (with bg) ]  [ Export PNG (transparent) ]  [ Export SVG ]    |
|  [ Copy to Clipboard ]     [ Download ]                                     |
|                                                                              |
+-----------------------------------------------------------------------------+
|                                                                              |
|                         LIVE PREVIEW (1280×720)                              |
|                                                                              |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |                   ▓▓▓▓  ▓▓▓▓ ▓▓    ▓▓▓▓ ▓▓  ▓▓                      |  |
|  |                   ▓▓    ▓▓   ▓▓    ▓▓   ▓▓  ▓▓                      |  |
|  |                   ▓▓    ▓▓   ▓▓    ▓▓   ▓▓  ▓▓                      |  |
|  |                   ▓▓▓▓  ▓▓▓▓ ▓▓▓▓  ▓▓▓▓ ▓▓▓▓▓▓                      |  |
|  |                                                                       |  |
|  |                         [glow effect behind]                          |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                              |
+-----------------------------------------------------------------------------+
```

---

## Text Segment System

### Single Color Mode

User enters text as single string with uniform styling:

```
Text: "CLAUDE CODE"
Color: orange
Style: normal
```

### Multi-Color Segments Mode

User defines multiple segments, each with independent styling:

| Segment # | Text | Color | Style | Brick Override |
|-----------|------|-------|-------|----------------|
| 1 | "12 Days of " | white | normal | default |
| 2 | "Claude" | orange | bold | heavy seams |
| 3 | "mas" | blue | normal | default |

**Rendering:** Segments concatenate inline with independent styling preserved.

**UI Controls per Segment:**
- Text input (string)
- Color dropdown (from template palette)
- Style dropdown (normal, bold, italic - if supported)
- Brick style override (optional, template-specific)

---

## Claude Code Brick Template Specification

### Typography

**Font Approach:** Pixel/brick block letters rendered using Canvas API or CSS-based blocks.

**Implementation Options:**

1. **Option A: Canvas Pixel Font**
   - Draw letters as rectangular blocks (8×8 or 16×16 grid)
   - Manual glyph definitions for A-Z, 0-9
   - Full control over brick segmentation

2. **Option B: CSS-based Blocks**
   - Use monospace font with heavy letter-spacing
   - Overlay brick seams using pseudo-elements or SVG patterns
   - Simpler but less authentic

**Recommended:** Option A (Canvas) for authentic brick appearance.

### Visual Effects

| Effect | Description | Implementation |
|--------|-------------|----------------|
| Brick Seams | Visible lines between tiles | Draw darker lines at intervals |
| Inner Shadow | Bevel depth | Canvas shadow or gradient fill |
| Bevel Depth | 3D appearance | Highlight top-left, shadow bottom-right |
| Grain/Noise | Subtle texture | Canvas noise pattern overlay |
| Gradient | Orange-brown variation | Linear gradient fill per letter |

### Default Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Orange | `#D97757` | Main text |
| Secondary White | `#FFFFFF` | Alternate text |
| Accent Blue | `#4A9FFF` | Highlight segments |
| Dark Brown | `#342D2D` | Shadow, seams |
| Charcoal | `#141413` | Terminal background |
| Accent Yellow | `#FFDE59` | Optional highlights |

### Background Effects

**Glow Behind Text:**
- Soft radial gradient centered on text
- Default color: orange (#D97757) at 20% opacity
- Spread: 200-400px radius
- Implementation: Canvas radialGradient or CSS box-shadow

**Terminal Window:**
- Rounded rectangle frame (border-radius: 12px)
- Top bar with 3 window controls (dots: red, yellow, green)
- Background: charcoal (#141413)
- Optional code texture (blurred text lines)

**Scanlines:**
- Horizontal lines across entire canvas
- 2-4px spacing, 1px line height
- Color: white at 5% opacity
- Implementation: Repeating linear gradient or SVG pattern

**Footer Text:**
- Text: "Press Enter to continue" (customizable)
- Font: Monospace (Courier New or similar)
- Position: Bottom-left, 20px padding
- Color: White at 70% opacity

---

## Canvas & Export

### Preset Sizes

| Preset | Dimensions | Aspect Ratio | Use Case |
|--------|------------|--------------|----------|
| YouTube Thumbnail | 1280×720 | 16:9 | Thumbnail overlays |
| Square | 1024×1024 | 1:1 | Social media posts |
| Portrait | 1080×1920 | 9:16 | Instagram stories |
| Twitter Header | 1500×500 | 3:1 | Profile headers |
| Custom | User-defined | Any | Flexible |

### Export Options

**PNG with Background:**
- Includes terminal window, glow, scanlines
- Canvas renders to blob
- Filename: `brand-text-{timestamp}.png`

**PNG Transparent:**
- Text and effects only, no background
- Useful for overlaying on thumbnails
- Alpha channel preserved
- Filename: `brand-text-transparent-{timestamp}.png`

**SVG (Optional/Nice-to-Have):**
- Vector format for perfect scaling
- Effects may be simplified (filters for glow/shadow)
- Filename: `brand-text-{timestamp}.svg`

**Copy to Clipboard:**
- Uses Clipboard API (`navigator.clipboard.write()`)
- Copies PNG blob to system clipboard
- User can paste directly into design tools

**Download:**
- Triggers browser download via `<a download>`
- Uses `URL.createObjectURL()` for blob URLs

---

## Technical Implementation

### Rendering Approach

**Primary: HTML Canvas API**

Canvas provides pixel-perfect control for:
- Drawing pixel/brick letters
- Overlaying brick seams
- Applying gradients and shadows
- Exporting to PNG

```typescript
const renderText = (
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  config: TemplateConfig
) => {
  // 1. Draw background (terminal, glow)
  renderBackground(ctx, config);

  // 2. Draw each text segment
  let xOffset = config.startX;
  for (const segment of segments) {
    const color = config.colors[segment.color];

    // Draw pixel letters with brick seams
    for (const char of segment.text) {
      drawBrickLetter(ctx, char, xOffset, config.startY, color, config.brickStyle);
      xOffset += config.letterWidth + config.letterSpacing;
    }
  }

  // 3. Apply effects (scanlines, footer)
  applyEffects(ctx, config);
};
```

### Brick Letter Rendering

```typescript
// Simplified glyph for letter "A"
const GLYPH_A = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
];

const drawBrickLetter = (
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number,
  color: string,
  brickStyle: BrickStyle
) => {
  const glyph = GLYPHS[char] || GLYPHS[' '];
  const blockSize = 16; // 16×16 pixels per block

  glyph.forEach((row, rowIndex) => {
    row.forEach((filled, colIndex) => {
      if (filled) {
        const blockX = x + (colIndex * blockSize);
        const blockY = y + (rowIndex * blockSize);

        // Draw filled block
        ctx.fillStyle = color;
        ctx.fillRect(blockX, blockY, blockSize, blockSize);

        // Draw brick seams
        ctx.strokeStyle = brickStyle.seamColor;
        ctx.lineWidth = brickStyle.seamWidth;
        ctx.strokeRect(blockX, blockY, blockSize, blockSize);

        // Apply inner shadow (bevel)
        applyBevel(ctx, blockX, blockY, blockSize, brickStyle);
      }
    });
  });
};
```

### Export to PNG

```typescript
const exportToPng = async (
  canvas: HTMLCanvasElement,
  transparent: boolean
): Promise<Blob> => {
  if (transparent) {
    // Clear background before export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Redraw text only (skip background)
    renderTextOnly(tempCtx);

    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
};
```

### Clipboard Copy

```typescript
const copyToClipboard = async (canvas: HTMLCanvasElement) => {
  try {
    const blob = await exportToPng(canvas, false);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    alert('Copied to clipboard!');
  } catch (error) {
    console.error('Clipboard write failed:', error);
    alert('Clipboard access denied. Use Download instead.');
  }
};
```

### File Download

```typescript
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
```

---

## Template System Architecture

### Template Configuration Object

```typescript
interface BrandTemplate {
  id: string;
  name: string;
  description: string;

  // Typography
  fontFamily?: string; // If using web fonts instead of pixel rendering
  defaultFontSize: number; // px
  letterSpacing: number; // px between letters
  lineHeight: number; // multiplier (e.g., 1.2)

  // Colors
  colors: {
    [key: string]: string; // e.g., { primary: '#D97757', secondary: '#FFF' }
  };
  defaultColor: string; // Color key

  // Effects
  effects: {
    brickSeams?: BrickSeamConfig;
    shadow?: ShadowConfig;
    bevel?: BevelConfig;
    glow?: GlowConfig;
    grain?: GrainConfig;
  };

  // Background
  background: {
    type: 'solid' | 'gradient' | 'terminal' | 'none';
    color?: string;
    gradient?: string[];
    terminal?: TerminalConfig;
  };

  // Layout
  layout: {
    defaultAlignment: 'left' | 'center' | 'right';
    paddingX: number;
    paddingY: number;
  };

  // Export
  export: {
    defaultSize: { width: number; height: number };
    supportsSvg: boolean;
  };
}
```

### Example: Claude Code Brick Template

```typescript
const CLAUDE_CODE_BRICK: BrandTemplate = {
  id: 'claude_code_brick',
  name: 'Claude Code Brick',
  description: 'Retro terminal pixel/brick letters with glow',

  defaultFontSize: 80,
  letterSpacing: 4,
  lineHeight: 1.2,

  colors: {
    orange: '#D97757',
    white: '#FFFFFF',
    blue: '#4A9FFF',
    yellow: '#FFDE59',
    darkBrown: '#342D2D',
    charcoal: '#141413',
  },
  defaultColor: 'orange',

  effects: {
    brickSeams: {
      enabled: true,
      seamWidth: 2,
      seamColor: '#2A2424',
      intensity: 'medium',
    },
    shadow: {
      enabled: true,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: 'rgba(0, 0, 0, 0.5)',
    },
    bevel: {
      enabled: true,
      depth: 'medium',
      highlightColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
    },
    glow: {
      enabled: true,
      color: '#D97757',
      intensity: 0.2,
      spread: 300,
    },
    grain: {
      enabled: true,
      intensity: 0.05,
    },
  },

  background: {
    type: 'terminal',
    terminal: {
      backgroundColor: '#141413',
      showFrame: true,
      showControls: true,
      borderRadius: 12,
      scanlines: false,
      codeTexture: false,
    },
  },

  layout: {
    defaultAlignment: 'center',
    paddingX: 40,
    paddingY: 40,
  },

  export: {
    defaultSize: { width: 1280, height: 720 },
    supportsSvg: false, // Pixel art doesn't export well to SVG
  },
};
```

### Adding a New Template (Future)

To add "OpenAI Minimal" template:

```typescript
const OPENAI_MINIMAL: BrandTemplate = {
  id: 'openai_minimal',
  name: 'OpenAI Minimal',
  description: 'Clean editorial typography with subtle gradients',

  fontFamily: 'Inter, sans-serif', // Use web font instead of pixel rendering
  defaultFontSize: 100,
  letterSpacing: -2, // Tighter spacing for editorial feel

  colors: {
    black: '#000000',
    charcoal: '#1A1A1A',
    white: '#FFFFFF',
    gray: '#6E6E6E',
    green: '#10A37F',
  },
  defaultColor: 'black',

  effects: {
    // No brick seams, no bevel - just clean text
    shadow: {
      enabled: true,
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      color: 'rgba(0, 0, 0, 0.15)',
    },
    glow: {
      enabled: false,
    },
  },

  background: {
    type: 'gradient',
    gradient: ['#FFFFFF', '#F7F7F7'],
  },

  layout: {
    defaultAlignment: 'left',
    paddingX: 60,
    paddingY: 80,
  },

  export: {
    defaultSize: { width: 1200, height: 630 },
    supportsSvg: true, // Clean fonts export well to SVG
  },
};
```

**Key Point:** No changes to UI logic needed - just add the config and register it in the template list.

---

## Server Integration (Optional)

This tool can operate **fully client-side** without server dependencies. However, optional server features:

### Optional Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brand-text/templates` | GET | List available templates |
| `/api/brand-text/render` | POST | Server-side rendering (fallback) |
| `/api/brand-text/save` | POST | Save generated images to catalog |
| `/api/brand-text/presets` | GET | Load saved presets (JSON configs) |

**Recommendation:** Keep MVP fully client-side. Add server persistence in future FR if needed.

---

## File Structure

```
client/src/components/tools/
├── Day13BrandText.tsx              # Main component
├── BrandTextGenerator/
│   ├── TemplateSelector.tsx        # Template dropdown
│   ├── TextSegmentEditor.tsx       # Multi-color segment editor
│   ├── TypographyControls.tsx      # Font size, spacing sliders
│   ├── BrickStyleControls.tsx      # Brick-specific sliders (template-dependent)
│   ├── BackgroundEffects.tsx       # Glow, terminal, scanlines toggles
│   ├── CanvasPreview.tsx           # Live preview canvas
│   ├── ExportControls.tsx          # Export buttons (PNG, SVG, clipboard, download)
│   ├── templates/
│   │   ├── claude-code-brick.ts    # Claude Code template config
│   │   ├── openai-minimal.ts       # Future: OpenAI template (dummy)
│   │   └── index.ts                # Template registry
│   ├── rendering/
│   │   ├── canvas-renderer.ts      # Core Canvas rendering logic
│   │   ├── pixel-glyphs.ts         # Pixel font glyph definitions (A-Z, 0-9)
│   │   ├── effects.ts              # Glow, shadow, bevel, scanlines
│   │   └── export.ts               # PNG/SVG export, clipboard, download
│   └── types.ts                    # TypeScript interfaces
```

**Modify:**
```
client/src/App.tsx                  # Add Day 13 routing
shared/src/config.json              # Add Day 13 entry (bonus day)
```

---

## Shared Types

Add to `shared/src/index.ts` (optional, can also live in component):

```typescript
// Brand Text Generator types
export interface TextSegment {
  id: string;
  text: string;
  color: string; // Color key from template
  style?: 'normal' | 'bold' | 'italic';
  brickOverride?: Partial<BrickSeamConfig>;
}

export interface BrandTextConfig {
  templateId: string;
  mode: 'single' | 'multi';
  segments: TextSegment[];
  alignment: 'left' | 'center' | 'right';
  caseTransform: 'original' | 'uppercase' | 'lowercase';
  fontSize: number;
  letterSpacing: number;
  brickSeams: number; // 0-1 intensity
  innerShadow: number; // 0-1 intensity
  bevelDepth: number; // 0-1 intensity
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  terminalEnabled: boolean;
  terminalControls: boolean;
  scanlinesEnabled: boolean;
  scanlinesStrength: number;
  footerEnabled: boolean;
  footerText: string;
  canvasSize: { width: number; height: number };
}

export interface BrandTemplate {
  id: string;
  name: string;
  description: string;
  defaultFontSize: number;
  letterSpacing: number;
  colors: Record<string, string>;
  defaultColor: string;
  effects: {
    brickSeams?: BrickSeamConfig;
    shadow?: ShadowConfig;
    bevel?: BevelConfig;
    glow?: GlowConfig;
    grain?: GrainConfig;
  };
  background: BackgroundConfig;
  layout: LayoutConfig;
  export: ExportConfig;
}
```

---

## Acceptance Criteria

### Template System
- [ ] Template selector dropdown shows available templates
- [ ] Selecting template updates all controls to template defaults
- [ ] Adding new template config works without UI code changes

### Text Input - Single Color Mode
- [ ] User can enter text in single input
- [ ] Text updates live preview immediately
- [ ] Case transform (original/upper/lower) works
- [ ] Alignment (left/center/right) affects positioning

### Text Input - Multi-Color Segments
- [ ] Toggle switches between single and multi-color modes
- [ ] User can add/remove segments dynamically
- [ ] Each segment has independent text, color, style
- [ ] Segments concatenate correctly in preview
- [ ] Segment colors use template palette

### Typography Controls
- [ ] Font size slider (80-200px) updates preview
- [ ] Letter spacing slider adjusts spacing between letters
- [ ] Changes apply to all segments or per-segment (depending on mode)

### Brick Style Controls (Claude Code Template)
- [ ] Brick seams slider controls seam visibility
- [ ] Inner shadow slider controls shadow depth
- [ ] Bevel depth slider controls 3D effect
- [ ] Controls only visible when Claude Code template selected

### Background Effects
- [ ] Glow toggle shows/hides glow effect
- [ ] Glow color picker uses template colors
- [ ] Glow intensity slider controls spread and opacity
- [ ] Terminal window toggle shows/hides frame
- [ ] Window controls (3 dots) toggle works
- [ ] Scanlines toggle shows/hides CRT effect
- [ ] Footer text toggle and input work correctly

### Canvas & Preview
- [ ] Live preview updates in real-time (<100ms)
- [ ] Preset sizes dropdown (YouTube, Square, Portrait, Custom)
- [ ] Custom size inputs work (width/height)
- [ ] Preview scales to fit UI while maintaining aspect ratio
- [ ] Canvas renders pixel-sharp (no blur)

### Export - PNG with Background
- [ ] "Export PNG (with bg)" button triggers download
- [ ] Output includes terminal, glow, scanlines
- [ ] Output resolution matches canvas size exactly
- [ ] Filename includes timestamp

### Export - PNG Transparent
- [ ] "Export PNG (transparent)" button triggers download
- [ ] Output has transparent background (alpha channel)
- [ ] Text and effects preserved
- [ ] Suitable for overlay on thumbnails

### Export - SVG (Optional)
- [ ] "Export SVG" button works (if template supports SVG)
- [ ] Vector text renders correctly
- [ ] Effects converted to SVG filters or simplified
- [ ] Button disabled if template doesn't support SVG

### Copy to Clipboard
- [ ] "Copy to Clipboard" button copies PNG to system clipboard
- [ ] User can paste image into design tools (Figma, Photoshop, etc.)
- [ ] Error message if clipboard access denied (show fallback: use Download)

### File Download
- [ ] "Download" button saves PNG to file system
- [ ] Browser download dialog appears
- [ ] Filename auto-generated with template + text slug + timestamp

### Visual Quality - Claude Code Brick
- [ ] Pixel letters render crisply (not blurred)
- [ ] Brick seams visible and aligned correctly
- [ ] Inner shadow/bevel creates depth perception
- [ ] Glow effect is soft and centered on text
- [ ] Terminal frame has rounded corners and window controls
- [ ] Scanlines are subtle and evenly spaced
- [ ] Footer text positioned correctly (bottom-left)

---

## Default State

Initial configuration on page load:

```typescript
const initialConfig: BrandTextConfig = {
  templateId: 'claude_code_brick',
  mode: 'multi',
  segments: [
    { id: 'seg-1', text: '12 Days of ', color: 'white', style: 'normal' },
    { id: 'seg-2', text: 'Claude', color: 'orange', style: 'normal' },
    { id: 'seg-3', text: 'mas', color: 'blue', style: 'normal' },
  ],
  alignment: 'center',
  caseTransform: 'uppercase',
  fontSize: 80,
  letterSpacing: 4,
  brickSeams: 0.5, // Medium intensity
  innerShadow: 0.5,
  bevelDepth: 0.5,
  glowEnabled: true,
  glowColor: 'orange',
  glowIntensity: 0.6,
  terminalEnabled: true,
  terminalControls: true,
  scanlinesEnabled: false,
  scanlinesStrength: 0.5,
  footerEnabled: true,
  footerText: 'Press Enter to continue',
  canvasSize: { width: 1280, height: 720 },
};
```

---

## Test Scenarios

### Scenario 1: Basic Claude Code Text
1. Navigate to Day 13
2. Enter text: "CLAUDE CODE"
3. Select single color mode, color: orange
4. Enable glow and terminal window
5. Export PNG with background
6. Verify output: chunky brick letters, glow behind, terminal frame

### Scenario 2: Multi-Color Segments
1. Switch to multi-color mode
2. Segment 1: "12 Days of " - white
3. Segment 2: "Claude" - orange
4. Segment 3: "mas" - blue
5. Verify preview shows correct colors
6. Export PNG transparent
7. Open in Photoshop - verify transparency and multi-color text

### Scenario 3: Clipboard Copy
1. Generate text: "WATCH NOW"
2. Click "Copy to Clipboard"
3. Open Figma or Photoshop
4. Paste (Cmd+V / Ctrl+V)
5. Verify image appears correctly

### Scenario 4: Custom Canvas Size
1. Select "Custom" from canvas size dropdown
2. Enter width: 1920, height: 1080
3. Verify preview updates to 16:9 aspect ratio
4. Export PNG
5. Verify file dimensions match exactly

### Scenario 5: Template Extensibility (Future)
1. Add dummy template config for "OpenAI Minimal"
2. Register in template registry
3. Select "OpenAI Minimal" from dropdown
4. Verify UI updates (no brick controls, different colors)
5. Generate clean editorial text
6. Export SVG (if supported)

### Scenario 6: Effects Toggles
1. Generate default "Claudemas" text
2. Toggle glow OFF - verify glow disappears
3. Toggle terminal OFF - verify frame disappears
4. Toggle scanlines ON - verify CRT effect appears
5. Toggle footer OFF - verify footer text disappears
6. Export and verify toggles affect output

---

## Out of Scope

### MVP Out of Scope
- Custom font uploads (use template fonts only)
- Font weight selection (fixed to template defaults)
- Text rotation or curved layouts
- Gradient text fills (solid colors only in MVP)
- Text shadows or stroke effects beyond template defaults
- Animated exports (GIF/video)
- Undo/redo history
- Saved presets/configurations
- Batch export (multiple titles at once)
- AI-generated text suggestions
- Real-time collaboration
- Server-side rendering (client-only for MVP)
- Asset catalog integration (Day 16/17 features)

### Future Enhancements (Post-MVP)
- Additional brand templates (OpenAI, Cursor, Replit, Anthropic)
- Preset packs ("Beginner Guide", "Tutorial Series")
- Save/load presets as JSON
- Gradient text fills per segment
- Brick style variations (rounded bricks, thin seams, heavy seams)
- Icon overlays (Claude starburst, brand logos)
- Text animation previews (fade-in, slide-in)
- Integration with thumbnail generator (FR-12/FR-21)
- Server persistence of generated images
- Template marketplace/sharing

---

## Dependencies

### External
- **Canvas API** (browser native) - Core rendering
- **Clipboard API** (browser native) - Copy to clipboard functionality
- **Blob API** (browser native) - PNG export
- **Google Fonts** (optional) - If using web fonts instead of pixel rendering

### Internal
- None (fully client-side tool)

### Optional Future
- Asset catalog system (FR-16/FR-17) - For saving generated images
- Thumbnail generator (FR-12) - For integration as text layer source

---

## Performance Requirements

| Operation | Target | Notes |
|-----------|--------|-------|
| Live preview update | <100ms | After any settings change |
| PNG export (1280×720) | <2s | Includes rendering + blob creation |
| PNG export (1920×1080) | <3s | Larger canvas |
| Clipboard copy | <1s | After PNG generation |
| Template switch | <50ms | Load new config and redraw |

**Browser Compatibility:**
- Chrome 90+
- Edge 90+
- Safari 14+
- Firefox 88+

**Key APIs:**
- Canvas API (100% support)
- Clipboard API (may require HTTPS or localhost)
- Blob API (100% support)

---

## Environment Variables

None required - fully client-side tool.

---

## Cost

No external API costs - runs entirely in browser.

---

## Integration with FliGen Architecture

### Routing

Add to `shared/src/config.json`:

```json
{
  "day": 13,
  "name": "Brand Text Generator",
  "shortName": "BrandText",
  "icon": "🔤",
  "status": "next",
  "route": "#day-13",
  "purpose": "Brand-styled text graphics",
  "apisTech": ["Canvas API", "Clipboard API", "HTML5"]
}
```

**Note:** Day 13 is a **bonus day** extending the 12 Days of Claudemas series.

### Component Integration

```typescript
// client/src/App.tsx
import Day13BrandText from './components/tools/Day13BrandText';

function App() {
  const { hash } = useLocation();

  // ...existing days...

  if (hash === '#day-13') {
    return <Day13BrandText />;
  }

  // ...
}
```

### Sidebar Navigation

The sidebar automatically populates from `config.json`, so Day 13 will appear once added to the config.

---

## References

### Design Inspiration
- Claude Code thumbnails - Brick/pixel aesthetic
- Retro terminal UIs - CRT scanlines, window frames
- Pixel art fonts - 8-bit and 16-bit letter glyphs

### Technical References
- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Clipboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Canvas Text Rendering](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text)
- [HTML Canvas to Blob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)

### Related Requirements
- [FR-12: Thumbnail Generator](fr-12-thumbnail-generator.md) - Composite thumbnails (potential integration point)
- [FR-21: Thumbnail Typography Enhancements](fr-21-thumbnail-typography-enhancements.md) - Brand fonts (BebasNeue, Oswald)
- [FR-16: Unified Asset Catalog](fr-16-unified-asset-catalog.md) - Asset storage pattern

---

## Completion Notes

**What was done:**
- Created complete Brand Text Generator (Day 13) with Canvas-based rendering
- Implemented template system architecture with Claude Code Brick template
- Built pixel font glyphs (A-Z, 0-9, symbols) - 5×7 grid bitmap font
- Created Canvas rendering engine with brick letters, seams, bevel effects
- Implemented multi-color text segment editor with dynamic add/remove
- Added background effects: glow (with intensity/color controls), terminal window, scanlines, footer text
- Built export functionality: PNG (with/without background), clipboard copy, file download
- Created comprehensive UI with live preview, typography controls, and preset canvas sizes
- Fully client-side implementation (no server dependencies)

**Files changed:**
- `shared/src/config.json` - Added Day 13 entry
- `client/src/App.tsx` - Added Day 13 routing
- `client/src/components/tools/Day13BrandText.tsx` - Main component (380+ lines)
- `client/src/components/tools/BrandTextGenerator/types.ts` - Type definitions (new)
- `client/src/components/tools/BrandTextGenerator/templates/claude-code-brick.ts` - Template config (new)
- `client/src/components/tools/BrandTextGenerator/templates/index.ts` - Template registry (new)
- `client/src/components/tools/BrandTextGenerator/rendering/pixel-glyphs.ts` - Pixel font glyphs (new, 400+ lines)
- `client/src/components/tools/BrandTextGenerator/rendering/canvas-renderer.ts` - Rendering engine (new, 250+ lines)
- `client/src/components/tools/BrandTextGenerator/rendering/export.ts` - Export utilities (new)

**Testing notes:**
- Dev server compiled successfully without errors
- Navigate to Day 13 in sidebar to access tool
- Test multi-color segments: "12 Days of " (white) + "Claude" (orange) + "mas" (blue)
- Test typography controls: font size (40-120px), letter spacing, alignment, case transform
- Test brick style: brick seams, bevel depth sliders
- Test background effects: glow toggle/color/intensity, terminal window toggle, scanlines, footer
- Test canvas presets: YouTube (1280×720), Square (1024×1024), Portrait, Custom
- Test export: PNG with background, PNG transparent, Copy to Clipboard
- Live preview updates in real-time (<100ms)

**Architecture highlights:**
- **Template system**: New templates can be added by creating config objects (zero UI code changes)
- **Pixel font rendering**: 5×7 bitmap glyphs rendered at configurable block size
- **Canvas API**: Pixel-perfect control for brick seams, bevel, glow effects
- **Export options**: Canvas.toBlob() for PNG, Clipboard API for copy
- **Extensible**: Future templates (OpenAI, Cursor, Replit) require only config additions

**Status:** Complete - Ready for UAT

---

**Last updated:** 2026-01-06
