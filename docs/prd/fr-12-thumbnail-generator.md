# FR-12: Thumbnail Generator

**Status:** Pending
**Added:** 2026-01-01
**Day:** 8 of 12 Days of Claudemas

---

## User Story

As a content creator, I want to compose YouTube thumbnails using a 4-layer compositor with brand templates, images, text panels, and overlay graphics so that I can quickly create professional, on-brand thumbnails without external design tools.

## Problem

Creating YouTube thumbnails currently requires:
1. External design tools (Photoshop, Canva, Figma)
2. Manual positioning of text, images, and overlays
3. Remembering brand colors and fonts
4. Exporting at the correct resolution (1280x720)

This is Day 8 of the 12 Days of Claudemas. The goal is to create a self-contained thumbnail compositor that:
- Uses AppyDave brand design system (colors, fonts, template)
- Integrates with the shot list from Day 4
- Produces professional 1280x720 PNG thumbnails
- Allows rapid iteration on thumbnail designs

## Solution

Create a 4-layer thumbnail compositor with:

- **Layer 1 (Background):** Fixed diagonal stripe template using brand colors
- **Layer 2 (Main Image):** Primary image in fixed center position
- **Layer 3 (Text Panels):** Up to 3 configurable text panels with 9-position grid
- **Layer 4 (Overlay):** Avatar or concept image with position and scale controls

### Brand Design System

| Element | Value | Usage |
|---------|-------|-------|
| Dark Brown | `#342d2d` | Background, stripes |
| Light Brown | `#ccba9d` | Diagonal stripe |
| Yellow | `#ffde59` | Accent text |
| White | `#ffffff` | Primary text |
| Black | `#000000` | Panel backgrounds |
| Font | Bebas Neue | All text panels |
| Canvas | 1280 x 720 | YouTube standard |

### Background Template (Layer 1)

The background uses a diagonal stripe pattern:

```
+---------------------------+
|                   ///////|
|               ////////   |
|           ////////       |
| Dark    ////////  Light  |
| Brown  ////////   Brown  |
|       ////////           |
|      ////////            |
|     ///////      Dark    |
|    ////////      Brown   |
+---------------------------+
```

The pattern consists of:
1. Dark brown (#342d2d) base fill
2. Light brown (#ccba9d) diagonal stripe from upper-right to lower-left
3. Dark brown (#342d2d) corner triangle in bottom-right

This template is fixed and cannot be modified by the user.

### Main Image Position (Layer 2)

The main image is placed in a fixed center position:
- Horizontally and vertically centered
- Scales to fit while maintaining aspect ratio
- Maximum 90% of canvas width/height
- Selected from shot list or uploaded directly

### Text Panels (Layer 3)

Up to 3 text panels with these properties:

| Property | Options |
|----------|---------|
| Enabled | Checkbox toggle |
| Text | Uppercase input (auto-converts) |
| Background Color | darkBrown, lightBrown, yellow, white, black |
| Text Color | darkBrown, lightBrown, yellow, white, black |
| Position | 9-position grid (see below) |

**9-Position Grid:**

```
+-----------------------------------+
|  top-left   top-center   top-right |
|                                     |
| mid-left   mid-center   mid-right  |
|                                     |
| bottom-left bottom-center bottom-right |
+-----------------------------------+
```

Multiple panels at the same position stack vertically with 50px offset.

### Overlay Image (Layer 4)

An optional overlay (avatar, logo, concept image) with:

| Property | Options |
|----------|---------|
| Enabled | Checkbox toggle |
| Image | From shot list or upload |
| Position | bottom-right, bottom-left, center-right |
| Scale | 0.5x to 1.5x (slider) |

The overlay appears as a circular crop with a subtle border.

---

## UI Layout

```
+-----------------------------------------------------------------------------+
|  Thumbnail Generator                                                         |
|  Compose YouTube thumbnails with the AppyDave brand template                 |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +---------------------------------------------+  +------------------------+ |
|  |                                             |  |  LAYERS                | |
|  |                                             |  +------------------------+ |
|  |                                             |  | [o] 4. Overlay Image   | |
|  |            LIVE PREVIEW                     |  | [o] 3. Text Panels     | |
|  |            (1280 x 720)                     |  | [o] 2. Main Image      | |
|  |                                             |  | [o] 1. Background      | |
|  |                                             |  +------------------------+ |
|  |                                             |  |                        | |
|  +---------------------------------------------+  |  LAYER 2: MAIN IMAGE   | |
|  |  [ Reset ]              [ Export PNG ]      |  +------------------------+ |
|  +---------------------------------------------+  |                        | |
|                                                   |  [Drop zone or shots]  | |
|                                                   |                        | |
|                                                   |  "The main image fills | |
|                                                   |   the center..."       | |
|                                                   |                        | |
|                                                   +------------------------+ |
+-----------------------------------------------------------------------------+
```

### Layer Panel

- Displays 4 layers in stack order (top to bottom: 4, 3, 2, 1)
- Click layer to select and show configuration
- Toggle visibility (eye icon) per layer
- Green dot = has content, gray = empty
- Selected layer highlighted with amber accent

### Configuration Panel

Shows context-sensitive controls based on selected layer:

**Layer 1 (Background):**
- Read-only explanation
- Shows brand color swatches
- "This layer is fixed and cannot be modified"

**Layer 2 (Main Image):**
- Image drop zone (drag-and-drop or click)
- "Select from shots" expandable picker
- Clear button when image is set

**Layer 3 (Text Panels):**
- 3 panel editors, each with:
  - Enable checkbox
  - Text input (uppercase)
  - Background color picker (5 swatches)
  - Text color picker (5 swatches)
  - Position dropdown (9 options)

**Layer 4 (Overlay):**
- Enable checkbox
- Image drop zone
- Position dropdown (3 options)
- Scale slider (0.5x - 1.5x)

### Action Bar

- **Reset** - Restore all defaults
- **Export PNG** - Render and download 1280x720 PNG

---

## Technical Implementation

### Export to PNG

The export functionality uses HTML Canvas API:

```typescript
const exportToPng = async (config: ThumbnailConfig): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Layer 1: Background
  // Draw dark brown base
  ctx.fillStyle = '#342d2d';
  ctx.fillRect(0, 0, 1280, 720);

  // Draw light brown diagonal
  ctx.fillStyle = '#ccba9d';
  ctx.beginPath();
  ctx.moveTo(700, 0);
  ctx.lineTo(1280, 0);
  ctx.lineTo(1280, 720);
  ctx.lineTo(900, 720);
  ctx.closePath();
  ctx.fill();

  // Draw dark brown corner
  ctx.fillStyle = '#342d2d';
  ctx.beginPath();
  ctx.moveTo(1100, 720);
  ctx.lineTo(1280, 400);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();

  // Layer 2: Main image
  if (config.mainImageUrl) {
    const img = await loadImage(config.mainImageUrl);
    // Draw centered, scaled to fit
  }

  // Layer 3: Text panels
  ctx.font = 'bold 48px "Bebas Neue", sans-serif';
  for (const panel of config.textPanels.filter(p => p.enabled)) {
    // Draw background rect
    // Draw text
  }

  // Layer 4: Overlay
  if (config.overlay.enabled && config.overlay.imageUrl) {
    // Draw circular clipped image
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
};
```

### Font Loading

Bebas Neue must be loaded before export:

```typescript
// In index.html or CSS
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

// Before export
await document.fonts.load('bold 48px "Bebas Neue"');
```

### Server Integration (Optional)

For server-side rendering (if client-side canvas has issues):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/thumbnail/render` | POST | Server-side PNG render |
| `/api/thumbnail/save` | POST | Save to thumbnails folder |
| `/api/thumbnail/list` | GET | List saved thumbnails |

**Server-side rendering options:**
- `node-canvas` - Server-side Canvas API
- `sharp` - Image compositing library
- Puppeteer - Headless browser screenshot

For Day 8, client-side rendering is preferred (simpler, no dependencies).

---

## File Structure

The mock UI already exists. Files to update:

**Existing:**
```
client/src/components/tools/Day8Thumbnail.tsx  - Mock UI (needs export wiring)
```

**To Create:**
```
assets/thumbnails/           - Saved thumbnail output folder
├── thumbnail-001.png
├── thumbnail-002.png
└── index.json               - Thumbnail metadata (optional)
```

**To Modify:**
```
client/src/App.tsx           - Add Day 8 routing (if not done)
shared/src/config.json       - Update day status
```

---

## Acceptance Criteria

### Layer System
- [ ] Layer panel shows 4 layers in correct order (4 top, 1 bottom)
- [ ] Clicking layer selects it and shows configuration
- [ ] Layer visibility toggles work independently
- [ ] Green dot shows when layer has content
- [ ] Selected layer has amber highlight

### Background (Layer 1)
- [ ] Diagonal stripe pattern renders correctly
- [ ] Uses exact brand colors (#342d2d, #ccba9d)
- [ ] Config panel shows "fixed layer" message

### Main Image (Layer 2)
- [ ] Drop zone accepts drag-and-drop images
- [ ] Drop zone accepts click-to-upload
- [ ] "Select from shots" shows Day 4 shot list
- [ ] Image centers and scales to fit
- [ ] Clear button removes image

### Text Panels (Layer 3)
- [ ] 3 independent panel editors
- [ ] Enable checkbox shows/hides panel
- [ ] Text input converts to uppercase
- [ ] Background color picker (5 brand colors)
- [ ] Text color picker (5 brand colors)
- [ ] Position dropdown (9 positions)
- [ ] Multiple panels at same position stack
- [ ] Bebas Neue font renders correctly

### Overlay (Layer 4)
- [ ] Enable checkbox toggles overlay
- [ ] Image drop zone (same as Layer 2)
- [ ] Position dropdown (3 options)
- [ ] Scale slider (0.5x - 1.5x)
- [ ] Circular crop with border renders

### Live Preview
- [ ] Updates in real-time as settings change
- [ ] Correct aspect ratio (16:9)
- [ ] All 4 layers composite correctly
- [ ] Layer visibility toggles affect preview

### Export
- [ ] "Export PNG" button triggers download
- [ ] Output is exactly 1280x720 pixels
- [ ] All layers render correctly in export
- [ ] Font renders correctly (not fallback)
- [ ] Downloaded file named appropriately

### Integration
- [ ] Shot list from Day 4 accessible
- [ ] Routing works from sidebar navigation
- [ ] Reset button restores defaults

---

## Default State

Initial configuration on load:

```typescript
const initialConfig: ThumbnailConfig = {
  mainImageUrl: null,
  textPanels: [
    { id: 'panel-1', enabled: true, text: 'CLAUDE CODE', bgColor: 'black', textColor: 'yellow', position: 'top-left' },
    { id: 'panel-2', enabled: true, text: '12 DAYS', bgColor: 'black', textColor: 'white', position: 'top-left' },
    { id: 'panel-3', enabled: false, text: 'PANEL 3', bgColor: 'black', textColor: 'yellow', position: 'bottom-left' },
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

### Scenario 1: Basic Thumbnail
1. Navigate to Day 8
2. Add main image from shots
3. Enable 2 text panels: "CLAUDE CODE" (yellow) and "12 DAYS" (white)
4. Export PNG
5. Verify 1280x720 output with correct layers

### Scenario 2: Full Composition
1. Add main image
2. Enable all 3 text panels at different positions
3. Enable overlay with avatar at bottom-right, scale 0.8x
4. Toggle layers on/off to verify visibility
5. Export and verify all elements

### Scenario 3: Layer Isolation
1. Toggle background OFF - should show transparent
2. Toggle main image OFF - other layers still visible
3. Toggle text panels OFF - background and main image visible
4. Toggle overlay OFF - verify it disappears

---

## Out of Scope

- Custom background templates (fixed to AppyDave brand)
- Font selection (fixed to Bebas Neue)
- Image cropping/editing
- Undo/redo history
- Template presets/saved configurations
- Animated thumbnails
- A/B testing integration
- AI-generated text suggestions

---

## Dependencies

- Bebas Neue font (Google Fonts)
- Shot list from Day 4 (`useShots` hook)
- Canvas API (browser native)

---

## References

### Design Assets
- AppyDave brand guide (internal)
- YouTube thumbnail best practices (1280x720, high contrast)

### Related Requirements
- [FR-08: Image Generation Comparison](fr-08-image-comparison.md) - Shot list source
- [FR-10: Shot List and Video Generation](fr-10-shot-list-and-video.md) - Shot list integration

### Technical References
- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Bebas Neue - Google Fonts](https://fonts.google.com/specimen/Bebas+Neue)

---

## Completion Notes

*To be filled after implementation*

---

**Last updated:** 2026-01-01
