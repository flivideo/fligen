# FR-19: Thumbnail Persistence & History - Developer Handover

## Quick Summary

**Completes the FR-17 asset persistence series** by adding auto-save and mandatory history UI to Day 8 (Thumbnail Generator). This is the final missing piece - Days 4, 5, 6, 7, and 10 are already complete (83% done). FR-19 brings Day 8 to 100%, completing persistent storage for all generation tools across the "12 Days of Claudemas" project.

---

## What You're Building

Day 8 (Thumbnail Generator) currently creates thumbnails via **client-side canvas rendering** with download-only functionality. You're adding:

1. **"Save to Library" button** - Saves PNG + full configuration to catalog
2. **Mandatory history UI** - Grid view of all saved thumbnails
3. **"Reuse Configuration"** - Restore all design settings from history
4. **Catalog integration** - Thumbnails become queryable assets for Day 11

**Unique challenge:** Server doesn't have access to canvas data. Solution: Client encodes canvas as base64, sends to server, server decodes and saves PNG file.

**Pattern:** Same as FR-17 (Days 4, 5, 6, 7, 10) - auto-save on action + in-tool history UI with reuse functionality.

---

## Priority & Dependencies

- **Priority:** Important 🟡 (Needed to complete FR-17 series, required for Day 11)
- **Depends On:**
  - FR-16 (Unified Asset Catalog Infrastructure) - MUST be complete
  - FR-12 (Thumbnail Generator) - Day 8 UI must exist
- **Related:**
  - FR-17 (Asset Persistence Implementation) - Same pattern, same requirements
  - FR-18 (Asset Browser UI) - Thumbnails will appear in unified browser
- **Completes:** Asset persistence for all 6 generation tools (100%)

---

## Key Implementation Tasks

### Task 1: Create TypeScript Types

**Files to create:**
- `server/src/tools/thumbnails/types.ts`

**Files to modify:**
- `shared/src/index.ts`

**What to implement:**

Define the `ThumbnailConfiguration` interface that captures ALL design settings:

```typescript
// shared/src/index.ts

export interface ThumbnailConfiguration {
  // Template
  template: string;           // "bold-statement", "gradient-minimal", etc.

  // Text content
  headline?: string;          // Primary text
  subtitle?: string;          // Secondary text
  callToAction?: string;      // CTA text

  // Colors (hex strings)
  backgroundColor: string;    // e.g., "#1e293b"
  textColor: string;          // e.g., "#ffffff"
  accentColor?: string;       // e.g., "#3b82f6"

  // Typography
  fontSize: {
    headline: number;         // e.g., 64
    subtitle: number;         // e.g., 32
    cta: number;              // e.g., 24
  };
  fontFamily: string;         // e.g., "Inter", "Roboto"
  textAlign: 'left' | 'center' | 'right';

  // Layout
  layers: {
    id: string;
    type: 'text' | 'shape' | 'image';
    position: { x: number; y: number };
    size: { width: number; height: number };
    content?: string;
    style?: Record<string, any>;
  }[];

  // Dimensions
  dimensions: {
    width: number;            // 1920
    height: number;           // 1080
  };
}

export interface SaveThumbnailRequest {
  imageData: string;                    // base64 PNG (with or without data URI prefix)
  configuration: ThumbnailConfiguration;
}

export interface SaveThumbnailResponse {
  success: boolean;
  asset: Asset;
}
```

**Also create:**
```typescript
// server/src/tools/thumbnails/types.ts

export * from '../../../shared/src/index.js';
```

**Testing:**
- TypeScript compilation succeeds
- No type errors in client or server
- Configuration interface covers all Day 8 settings

---

### Task 2: Server-Side Thumbnail Save Function

**Files to create:**
- `server/src/tools/thumbnails/save-to-catalog.ts`
- `server/src/tools/thumbnails/index.ts`

**What to implement:**

Create the core function that:
1. Accepts base64 image data + configuration JSON
2. Decodes base64 to PNG buffer
3. Saves PNG file to `assets/catalog/thumbnails/`
4. Creates Asset record with configuration in metadata
5. Adds to catalog index

```typescript
// server/src/tools/thumbnails/save-to-catalog.ts

import * as catalog from '../catalog/storage.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset, ThumbnailConfiguration } from '../../../shared/src/index.js';

export async function saveThumbnailToCatalog(
  imageDataBase64: string,
  configuration: ThumbnailConfiguration
): Promise<Asset> {
  const startTime = Date.now();

  // Generate unique ID and filename
  const id = catalog.generateAssetId('thumbnail');
  const template = configuration.template.toLowerCase().replace(/\s+/g, '-');
  const filename = `thumb-${Date.now()}-${template}.png`;

  // Decode base64 to buffer
  // Handle both "data:image/png;base64,XXX" and raw base64
  const base64Data = imageDataBase64.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Ensure thumbnails directory exists
  const catalogDir = path.join(process.cwd(), 'assets', 'catalog', 'thumbnails');
  await fs.mkdir(catalogDir, { recursive: true });

  // Save PNG file
  const filePath = path.join(catalogDir, filename);
  await fs.writeFile(filePath, buffer);

  // Create asset record
  const asset: Asset = {
    id,
    type: 'thumbnail',
    filename,
    url: `/assets/catalog/thumbnails/${filename}`,
    provider: 'client',        // Client-side canvas rendering
    model: 'canvas',           // HTML5 Canvas API
    prompt: configuration.headline || configuration.subtitle || '(no text)',
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0,          // Free - client-side rendering
    generationTimeMs: Date.now() - startTime,
    metadata: {
      configuration,           // FULL config for exact recreation
      template: configuration.template,
      headline: configuration.headline,
      subtitle: configuration.subtitle,
      dimensions: configuration.dimensions,
      fileSizeBytes: buffer.length,
    },
  };

  // Add to catalog
  await catalog.addAsset(asset);

  console.log(`[Thumbnails] Saved to catalog: ${id} (${template}, ${(buffer.length / 1024).toFixed(0)}KB)`);
  return asset;
}
```

```typescript
// server/src/tools/thumbnails/index.ts

export { saveThumbnailToCatalog } from './save-to-catalog.js';
export * from './types.js';
```

**Testing:**
- Function accepts base64 string with/without data URI prefix
- PNG file created in correct directory
- File is valid (can be opened in image viewer)
- Asset added to catalog index
- Metadata includes full configuration
- Large thumbnails (1920x1080, ~1-3MB) handled correctly

---

### Task 3: Server API Endpoint

**Files to modify:**
- `server/src/index.ts`

**What to implement:**

Add `POST /api/thumbnails/save` endpoint that validates input and calls the save function:

```typescript
// server/src/index.ts

import { saveThumbnailToCatalog } from './tools/thumbnails/index.js';

// ... existing code ...

app.post('/api/thumbnails/save', async (req, res) => {
  try {
    const { imageData, configuration } = req.body;

    // Validate request
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid imageData (must be base64 string)'
      });
    }

    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid configuration object'
      });
    }

    // Basic configuration validation
    if (!configuration.template) {
      return res.status(400).json({
        success: false,
        error: 'Configuration missing required field: template'
      });
    }

    // Save thumbnail
    const asset = await saveThumbnailToCatalog(imageData, configuration);

    res.json({
      success: true,
      asset
    });

  } catch (error) {
    console.error('[Thumbnails] Save failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

**Payload size note:**
Express already configured for 50MB limit (from FR-11), so no changes needed:
```typescript
// Already exists in server/src/index.ts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

**Testing:**
- POST with valid data → 200 response with asset
- POST without imageData → 400 error
- POST without configuration → 400 error
- POST with invalid template → 400 error
- POST with 1MB+ base64 → Success (no 413 Payload Too Large)
- POST with malformed base64 → 500 error with message

---

### Task 4: Client-Side Save Integration

**Files to modify:**
- `client/src/components/tools/Day8Thumbnail.tsx`

**What to implement:**

Add "Save to Library" button alongside existing "Export PNG" button:

```typescript
// Add state for save operation
const [isSaving, setIsSaving] = useState(false);

// New save function
const handleSaveToLibrary = async () => {
  const canvas = canvasRef.current;
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }

  setIsSaving(true);

  try {
    // Capture canvas as base64 PNG
    const imageData = canvas.toDataURL('image/png');

    // Collect ALL configuration from current state
    const configuration: ThumbnailConfiguration = {
      template: selectedTemplate,
      headline: headlineText,
      subtitle: subtitleText,
      callToAction: ctaText,
      backgroundColor: bgColor,
      textColor: textColor,
      accentColor: accentColor || '#000000',
      fontSize: {
        headline: headlineFontSize || 64,
        subtitle: subtitleFontSize || 32,
        cta: ctaFontSize || 24,
      },
      fontFamily: fontFamily || 'Inter',
      textAlign: textAlign || 'center',
      layers: canvasLayers || [],
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
    };

    // Send to server
    const response = await fetch(`${SERVER_URL}/api/thumbnails/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, configuration }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save thumbnail');
    }

    console.log('[Day8] Thumbnail saved:', data.asset.id);

    // Refresh history (see Task 5)
    await loadThumbnailHistory();

    // Also trigger download (same as Export PNG)
    const link = document.createElement('a');
    link.download = data.asset.filename;
    link.href = imageData;
    link.click();

    // Success feedback
    alert('✓ Thumbnail saved to library!');

  } catch (error) {
    console.error('[Day8] Save failed:', error);
    alert(`Failed to save thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsSaving(false);
  }
};
```

**Button UI:**
```tsx
{/* Action Buttons */}
<div className="flex gap-3">
  {/* Existing button - unchanged */}
  <button
    onClick={handleExportPNG}
    className="px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 font-medium"
  >
    Export PNG
  </button>

  {/* New button */}
  <button
    onClick={handleSaveToLibrary}
    disabled={isSaving}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isSaving ? 'Saving...' : 'Save to Library'}
  </button>
</div>
```

**Testing:**
- Button appears next to "Export PNG"
- Button disabled while saving
- Clicking button saves to server
- Download triggered after save
- Success message shown
- Error message shown on failure
- Both buttons work independently

---

### Task 5: History UI (MANDATORY)

**Files to modify:**
- `client/src/components/tools/Day8Thumbnail.tsx`

**What to implement:**

Add history section below the generation form that displays all saved thumbnails:

```typescript
// Add state for history
const [thumbnailHistory, setThumbnailHistory] = useState<Asset[]>([]);

// Load history function
const loadThumbnailHistory = async () => {
  try {
    const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=thumbnail`);
    const data = await response.json();

    // Sort by creation date (newest first)
    const sorted = data.assets.sort((a: Asset, b: Asset) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setThumbnailHistory(sorted);
  } catch (error) {
    console.error('[Day8] Failed to load thumbnail history:', error);
  }
};

// Load history on component mount
useEffect(() => {
  loadThumbnailHistory();
}, []);
```

**History UI JSX:**
```tsx
{/* History Section - Add after action buttons */}
<div className="border-t border-slate-700 pt-6 mt-6">
  <h3 className="text-lg font-semibold text-slate-200 mb-4">
    Thumbnail History
  </h3>

  {thumbnailHistory.length === 0 ? (
    <div className="text-center py-8">
      <p className="text-slate-400">
        No thumbnails saved yet. Click "Save to Library" to get started!
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {thumbnailHistory.map((asset) => (
        <div
          key={asset.id}
          className="border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
        >
          {/* Thumbnail Preview */}
          <img
            src={asset.url}
            alt={asset.metadata.headline || 'Thumbnail'}
            className="w-full aspect-video object-cover rounded mb-3 bg-slate-900"
          />

          {/* Metadata */}
          <p className="text-sm font-medium text-slate-200 truncate">
            {asset.metadata.headline || asset.metadata.subtitle || '(Untitled)'}
          </p>
          <p className="text-xs text-slate-400 mb-1">
            Template: {asset.metadata.template}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(asset.createdAt).toLocaleString()}
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleReuseConfiguration(asset)}
              className="flex-1 text-xs text-blue-400 border border-blue-400 rounded px-2 py-1 hover:bg-blue-400/10 transition-colors"
            >
              Reuse Configuration
            </button>
            <a
              href={asset.url}
              download={asset.filename}
              className="text-xs text-slate-400 border border-slate-600 rounded px-2 py-1 hover:bg-slate-700 transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Testing:**
- History section displays below generation form
- Grid responsive (1 col mobile, 2 tablet, 3 desktop)
- Empty state shows when no thumbnails
- Thumbnails display in reverse chronological order
- Each card shows: preview, headline/subtitle, template, date
- Preview images load correctly
- Aspect ratio maintained (16:9)
- History loads on page mount
- History refreshes after saving new thumbnail

---

### Task 6: Configuration Reuse Logic

**Files to modify:**
- `client/src/components/tools/Day8Thumbnail.tsx`

**What to implement:**

"Reuse Configuration" button that restores ALL design settings from a saved thumbnail:

```typescript
const handleReuseConfiguration = (asset: Asset) => {
  const config = asset.metadata.configuration as ThumbnailConfiguration;

  if (!config) {
    alert('Configuration data not found for this thumbnail');
    return;
  }

  // Check if user has unsaved work
  const hasUnsavedChanges = checkForUnsavedChanges(); // Implement this helper

  if (hasUnsavedChanges) {
    const confirmed = window.confirm(
      'This will replace your current design. Any unsaved changes will be lost. Continue?'
    );
    if (!confirmed) return;
  }

  // Restore ALL settings
  setSelectedTemplate(config.template);
  setHeadlineText(config.headline || '');
  setSubtitleText(config.subtitle || '');
  setCtaText(config.callToAction || '');
  setBgColor(config.backgroundColor);
  setTextColor(config.textColor);
  setAccentColor(config.accentColor || '#000000');
  setHeadlineFontSize(config.fontSize.headline);
  setSubtitleFontSize(config.fontSize.subtitle);
  setCtaFontSize(config.fontSize.cta);
  setFontFamily(config.fontFamily);
  setTextAlign(config.textAlign);
  setCanvasLayers(config.layers || []);

  // Scroll to top so user sees updated form
  window.scrollTo({ top: 0, behavior: 'smooth' });

  console.log('[Day8] Configuration loaded from:', asset.id);
};

// Helper: Check if current state differs from defaults
const checkForUnsavedChanges = (): boolean => {
  // Compare current state to default values
  // Return true if any field has been modified
  if (headlineText !== 'Your Headline Here') return true;
  if (subtitleText !== 'Supporting text goes here') return true;
  if (bgColor !== '#1e293b') return true;
  // ... check other fields ...

  return false;
};
```

**Testing:**
- Click "Reuse Configuration" → All settings restored
- Template selector updates
- Text fields populate with saved values
- Color pickers show saved colors
- Font settings restore correctly
- Layout/layers restore (if applicable)
- Canvas re-renders with new configuration
- Confirmation dialog shown if current work modified
- Confirmation dialog NOT shown if using defaults
- User can cancel without losing current work
- Page scrolls to top after loading

---

## Technical Approach

### Base64 Transfer Pattern

**Why base64?**
- Canvas API provides `toDataURL()` method (returns base64)
- Standard pattern for client-side image export
- Works with `fetch()` JSON body (no multipart/form-data needed)
- Easy to decode on server (`Buffer.from(base64, 'base64')`)

**Flow:**
```
Client Canvas → canvas.toDataURL('image/png')
  ↓
"data:image/png;base64,iVBORw0KGgo..." (1-3MB string)
  ↓
Send via POST /api/thumbnails/save
  ↓
Server removes "data:image/png;base64," prefix
  ↓
Buffer.from(cleanBase64, 'base64') → PNG binary
  ↓
fs.writeFile(path, buffer) → Disk
```

### Configuration Storage Strategy

**Store EVERYTHING needed to recreate thumbnail:**
- Template ID (which design template was used)
- All text content (headline, subtitle, CTA)
- All colors (background, text, accent)
- All font settings (family, sizes, alignment)
- All layer data (positions, sizes, styles)
- Canvas dimensions (width, height)

**Why?** "Reuse Configuration" must restore EXACT state, not approximate.

### State Management

**No global state needed** - component-local state is fine:
- `useState` for all design settings (already exists in Day8Thumbnail)
- `useState` for history list (new)
- `useState` for saving state (new)
- `useEffect` to load history on mount (new)

### API Integration

**Catalog API (already exists):**
- `GET /api/catalog/filter?type=thumbnail` - List thumbnails
- `DELETE /api/catalog/:id` - Delete thumbnail (optional)

**New endpoint:**
- `POST /api/thumbnails/save` - Save thumbnail + configuration

**No additional endpoints needed.**

---

## Files to Create/Modify

### Files to Create

```
server/src/tools/thumbnails/
├── types.ts                    (10 lines - re-export shared types)
├── save-to-catalog.ts          (80 lines - base64 decode + save logic)
└── index.ts                    (5 lines - module exports)
```

**Total:** ~95 lines of new server code

### Files to Modify

```
shared/src/index.ts                             (+60 lines - ThumbnailConfiguration type)
server/src/index.ts                             (+35 lines - POST /api/thumbnails/save)
client/src/components/tools/Day8Thumbnail.tsx   (+200 lines - save button + history UI)
```

**Total:** ~295 lines modified

**Grand total:** ~390 lines of code

---

## Testing Checklist

### Persistence
- [ ] Create thumbnail design in Day 8
- [ ] Click "Save to Library" button
- [ ] PNG file created in `assets/catalog/thumbnails/`
- [ ] Filename follows pattern: `thumb-{timestamp}-{template}.png`
- [ ] No filename collisions (multiple saves create unique files)
- [ ] Asset record added to catalog index
- [ ] Asset type is `'thumbnail'`
- [ ] Asset provider is `'client'`
- [ ] Asset model is `'canvas'`

### Configuration Storage
- [ ] Template ID saved in metadata
- [ ] Headline text saved (if entered)
- [ ] Subtitle text saved (if entered)
- [ ] CTA text saved (if entered)
- [ ] Background color saved
- [ ] Text color saved
- [ ] Accent color saved
- [ ] Font sizes saved (headline, subtitle, CTA)
- [ ] Font family saved
- [ ] Text alignment saved
- [ ] Layer data saved (positions, sizes, content)
- [ ] Dimensions saved (width, height)
- [ ] File size saved in metadata
- [ ] Configuration complete enough to recreate exact thumbnail

### History UI
- [ ] History section displays below generation form
- [ ] Empty state shown when no thumbnails saved
- [ ] History loads on page mount
- [ ] History displays in reverse chronological order (newest first)
- [ ] Grid responsive:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns
- [ ] Each thumbnail card shows:
  - Preview image (aspect-video, object-cover)
  - Headline or subtitle text (truncated if long)
  - Template name
  - Creation date and time
- [ ] "Reuse Configuration" button on each card
- [ ] "Download" link on each card
- [ ] History auto-refreshes after saving new thumbnail
- [ ] Preview images load correctly (no broken images)
- [ ] Hover effect on cards (border color change)

### Reuse Functionality
- [ ] Click "Reuse Configuration" button
- [ ] If current work modified → Confirmation dialog appears
- [ ] Confirmation message clear: "This will replace your current design..."
- [ ] User can cancel → No changes applied
- [ ] User confirms → ALL settings restored:
  - Template selector updates
  - Headline text field populates
  - Subtitle text field populates
  - CTA text field populates
  - Background color picker updates
  - Text color picker updates
  - Accent color picker updates
  - Font size inputs update (all three)
  - Font family selector updates
  - Text alignment selector updates
  - Layer positions restore (if applicable)
- [ ] Canvas re-renders with loaded configuration
- [ ] Page scrolls to top after loading
- [ ] Console logs asset ID being loaded
- [ ] User can modify loaded config and save as new thumbnail

### Download Behavior
- [ ] "Export PNG" button still works (download only, no save)
- [ ] "Save to Library" button saves to server AND downloads
- [ ] Downloaded filename matches server filename
- [ ] Both download methods produce identical files
- [ ] PNG file valid (can be opened in Preview, Photoshop, etc.)
- [ ] PNG transparency preserved (if applicable)

### API
- [ ] POST /api/thumbnails/save with valid data → 200 + asset
- [ ] Response includes `success: true`
- [ ] Response includes full `asset` object
- [ ] POST without imageData → 400 error
- [ ] POST without configuration → 400 error
- [ ] POST with invalid configuration.template → 400 error
- [ ] POST with malformed base64 → 500 error with message
- [ ] GET /api/catalog/filter?type=thumbnail returns all thumbnails
- [ ] Large payloads (1-3MB base64) handled without errors
- [ ] No 413 Payload Too Large errors
- [ ] Server logs show saved thumbnail details

### Edge Cases
- [ ] Save empty/default thumbnail (no custom text) → Works
- [ ] Save thumbnail with very long headline (200+ chars) → Truncates in UI
- [ ] Save thumbnail with 10+ layers → All layers saved
- [ ] Save multiple thumbnails rapidly → No collisions, all save
- [ ] Save 1920x1080 thumbnail (~3MB) → Success
- [ ] Network failure during save → Error message shown
- [ ] Retry save after failure → Works
- [ ] Load configuration with missing template → Falls back gracefully
- [ ] Load configuration with missing optional fields → Defaults used
- [ ] Reuse config with unsaved work → Confirmation required
- [ ] Reuse config with default state → No confirmation needed

### Browser Compatibility
- [ ] Chrome/Edge - Save works
- [ ] Firefox - Save works
- [ ] Safari - Save works
- [ ] Mobile Safari - Save works
- [ ] Canvas.toDataURL() supported
- [ ] Download trigger works across browsers

---

## Success Criteria

**Feature Complete:**
- [ ] Day 8 (Thumbnails) has same persistence + history UI as Days 4, 5, 6, 7, 10
- [ ] FR-17 asset persistence series 100% complete (all 6 generation tools)
- [ ] Users can save thumbnails to library with one click
- [ ] Users can reuse past configurations exactly
- [ ] All thumbnail data persistent across sessions

**Data Quality:**
- [ ] 100% of thumbnails saved via "Save to Library" persisted to catalog
- [ ] Zero data loss on page refresh or browser close
- [ ] All configuration parameters captured completely
- [ ] Users can recreate any past thumbnail exactly
- [ ] Configuration JSON valid and complete

**User Experience:**
- [ ] "Save to Library" and "Export PNG" both work intuitively
- [ ] History UI feels consistent with other tools (Days 4, 5, 6, 7, 10)
- [ ] "Reuse Configuration" saves time (no manual re-entry)
- [ ] Clear feedback on save success/failure
- [ ] No confusion about download vs save
- [ ] Responsive design works on all devices

**Integration:**
- [ ] Thumbnails queryable via catalog API
- [ ] Ready for Day 11 Story Builder to select thumbnails
- [ ] Ready for FR-18 Asset Browser to display thumbnails
- [ ] Follows same patterns as other tools (maintainability)

---

## Code Snippets

### Complete Server Endpoint

```typescript
// server/src/index.ts

import { saveThumbnailToCatalog } from './tools/thumbnails/index.js';

app.post('/api/thumbnails/save', async (req, res) => {
  try {
    const { imageData, configuration } = req.body;

    // Validate imageData
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid imageData (must be base64 string)'
      });
    }

    // Validate configuration
    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid configuration object'
      });
    }

    if (!configuration.template) {
      return res.status(400).json({
        success: false,
        error: 'Configuration missing required field: template'
      });
    }

    // Save thumbnail
    const asset = await saveThumbnailToCatalog(imageData, configuration);

    res.json({
      success: true,
      asset
    });

  } catch (error) {
    console.error('[Thumbnails] Save failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Complete Client Save Function

```typescript
// client/src/components/tools/Day8Thumbnail.tsx

const handleSaveToLibrary = async () => {
  const canvas = canvasRef.current;
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }

  setIsSaving(true);

  try {
    // Capture canvas as base64
    const imageData = canvas.toDataURL('image/png');

    // Collect configuration
    const configuration: ThumbnailConfiguration = {
      template: selectedTemplate,
      headline: headlineText,
      subtitle: subtitleText,
      callToAction: ctaText,
      backgroundColor: bgColor,
      textColor: textColor,
      accentColor: accentColor || '#000000',
      fontSize: {
        headline: headlineFontSize || 64,
        subtitle: subtitleFontSize || 32,
        cta: ctaFontSize || 24,
      },
      fontFamily: fontFamily || 'Inter',
      textAlign: textAlign || 'center',
      layers: canvasLayers || [],
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
    };

    // Save to server
    const response = await fetch(`${SERVER_URL}/api/thumbnails/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, configuration }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save');
    }

    console.log('[Day8] Saved:', data.asset.id);

    // Refresh history
    await loadThumbnailHistory();

    // Trigger download
    const link = document.createElement('a');
    link.download = data.asset.filename;
    link.href = imageData;
    link.click();

    alert('✓ Thumbnail saved to library!');

  } catch (error) {
    console.error('[Day8] Save failed:', error);
    alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsSaving(false);
  }
};
```

### Complete History UI Component

```tsx
{/* History Section */}
<div className="border-t border-slate-700 pt-6 mt-6">
  <h3 className="text-lg font-semibold text-slate-200 mb-4">
    Thumbnail History
  </h3>

  {thumbnailHistory.length === 0 ? (
    <div className="text-center py-8">
      <p className="text-slate-400">
        No thumbnails saved yet. Click "Save to Library" to get started!
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {thumbnailHistory.map((asset) => (
        <div
          key={asset.id}
          className="border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
        >
          <img
            src={asset.url}
            alt={asset.metadata.headline || 'Thumbnail'}
            className="w-full aspect-video object-cover rounded mb-3 bg-slate-900"
          />

          <p className="text-sm font-medium text-slate-200 truncate">
            {asset.metadata.headline || asset.metadata.subtitle || '(Untitled)'}
          </p>
          <p className="text-xs text-slate-400 mb-1">
            Template: {asset.metadata.template}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(asset.createdAt).toLocaleString()}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleReuseConfiguration(asset)}
              className="flex-1 text-xs text-blue-400 border border-blue-400 rounded px-2 py-1 hover:bg-blue-400/10"
            >
              Reuse Configuration
            </button>
            <a
              href={asset.url}
              download={asset.filename}
              className="text-xs text-slate-400 border border-slate-600 rounded px-2 py-1 hover:bg-slate-700"
            >
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## Notes & Gotchas

### 1. Base64 Size Limits

**Already handled** - Express configured for 50MB in FR-11:
```typescript
app.use(express.json({ limit: '50mb' }));
```

Typical thumbnail sizes:
- 1280x720: ~500KB-1MB base64
- 1920x1080: ~1-3MB base64

No configuration changes needed.

---

### 2. Canvas State Capture

**Must capture ALL configuration**, not just visible canvas pixels:

The PNG image alone isn't enough - you need the configuration JSON to enable editing. When user clicks "Reuse Configuration", they should be able to:
- Change the headline text
- Swap the background color
- Adjust font sizes
- Modify layer positions

This requires storing the **input state**, not just the **output image**.

---

### 3. Unsaved Work Warning

**When to show confirmation dialog:**
- User clicks "Reuse Configuration"
- AND current state differs from defaults
- THEN show: "This will replace your current design. Continue?"

**When NOT to show:**
- Current state is default/empty
- User just loaded the page
- Configuration being loaded matches current state

**Implementation tip:**
```typescript
const hasUnsavedChanges = (): boolean => {
  // Compare to defaults
  if (headlineText !== DEFAULT_HEADLINE) return true;
  if (bgColor !== DEFAULT_BG_COLOR) return true;
  // ... check other fields
  return false;
};
```

---

### 4. Download vs Save Behavior

**"Export PNG"** - Quick download, no server interaction:
- Use case: User wants PNG file right now
- Doesn't persist to catalog
- Faster (no network request)

**"Save to Library"** - Persistent storage + download:
- Use case: User wants to save for later reuse
- Persists to catalog
- Also downloads (convenience)

**Keep both buttons** - different use cases.

---

### 5. Configuration Validation

**Server should validate configuration structure:**

```typescript
if (!configuration.template) {
  return res.status(400).json({ error: 'Missing template' });
}

if (!configuration.dimensions || !configuration.dimensions.width) {
  return res.status(400).json({ error: 'Missing dimensions' });
}
```

Don't trust client to send valid data.

---

### 6. Layer Serialization

**Layers may contain complex objects:**

```typescript
layers: [
  {
    id: 'layer-1',
    type: 'text',
    position: { x: 100, y: 200 },
    content: 'Hello',
    style: {
      fontFamily: 'Inter',
      fontSize: 32,
      color: '#ffffff',
      // ... more properties
    }
  }
]
```

Ensure:
- Circular references don't exist (JSON.stringify will fail)
- All layer properties are serializable
- Style objects are plain objects, not class instances

**Test with:**
```typescript
JSON.parse(JSON.stringify(configuration)); // Should not throw
```

---

### 7. Template Dependency

**Configuration references template by ID:**
```typescript
configuration.template = 'bold-statement'
```

**What if template doesn't exist when loading?**
- Template was deleted
- Template renamed
- Different version of Day 8

**Solution:**
```typescript
const handleReuseConfiguration = (asset: Asset) => {
  const config = asset.metadata.configuration;

  // Check if template exists
  const templateExists = AVAILABLE_TEMPLATES.includes(config.template);

  if (!templateExists) {
    alert(`Template "${config.template}" not found. Using default template.`);
    setSelectedTemplate('bold-statement'); // Fall back to default
  } else {
    setSelectedTemplate(config.template);
  }

  // ... restore other settings
};
```

---

### 8. Color Format Consistency

**Always store colors as hex strings:**
- `#1e293b` ✓ Correct
- `rgb(30, 41, 59)` ✗ Avoid
- `hsl(217, 33%, 17%)` ✗ Avoid

**Why?** Consistency across tools, easier to validate, works with all color pickers.

**Normalization:**
```typescript
const normalizeColor = (color: string): string => {
  // Convert rgb() or hsl() to hex if needed
  // Or just require hex format and validate
  if (!color.match(/^#[0-9A-Fa-f]{6}$/)) {
    throw new Error('Color must be hex format (#RRGGBB)');
  }
  return color.toLowerCase();
};
```

---

### 9. Font Availability

**Don't save font files**, just font names:
```typescript
fontFamily: 'Inter' // ✓ Font name only
```

**Assumption:** System fonts or web fonts loaded via CDN.

**If font not available when loading:**
- Browser will fall back to system default
- User can change font after loading config

**Not a blocker** - configuration reuse still works.

---

### 10. Responsive Preview

**History thumbnails should maintain aspect ratio:**

```css
.aspect-video {
  aspect-ratio: 16 / 9;
}

.object-cover {
  object-fit: cover;
}
```

This ensures:
- All preview cards same height (grid alignment)
- No distorted images
- Consistent visual appearance

Even if thumbnail is 1:1 or 4:3, `object-cover` will crop nicely.

---

## Quick Start Guide

### Recommended Implementation Order

1. **Create TypeScript types** (15 min)
   - `shared/src/index.ts` - ThumbnailConfiguration interface
   - `server/src/tools/thumbnails/types.ts` - Re-exports

2. **Build server save function** (30 min)
   - `server/src/tools/thumbnails/save-to-catalog.ts`
   - Base64 decode logic
   - File save logic
   - Asset creation

3. **Add API endpoint** (20 min)
   - `server/src/index.ts` - POST /api/thumbnails/save
   - Validation
   - Error handling

4. **Test endpoint** (20 min)
   - Use Postman or curl
   - Send sample base64 + config
   - Verify PNG created
   - Verify catalog updated

5. **Add "Save to Library" button** (30 min)
   - `client/src/components/tools/Day8Thumbnail.tsx`
   - handleSaveToLibrary function
   - Button UI
   - Loading state

6. **Test save functionality** (15 min)
   - Create thumbnail in UI
   - Click "Save to Library"
   - Verify server save
   - Verify download triggered

7. **Build history UI** (45 min)
   - History state
   - loadThumbnailHistory function
   - useEffect on mount
   - Grid layout JSX

8. **Implement "Reuse Configuration"** (30 min)
   - handleReuseConfiguration function
   - checkForUnsavedChanges helper
   - Confirmation dialog
   - State restoration

9. **Add confirmation dialogs** (15 min)
   - Unsaved work warning
   - Error messages
   - Success feedback

10. **Test full workflow** (30 min)
    - Save thumbnail
    - See it in history
    - Reuse configuration
    - Modify and save as new
    - Verify persistence across page refresh

11. **Polish UI/UX** (30 min)
    - Loading states
    - Error messages
    - Empty states
    - Responsive tweaks
    - Accessibility

**Total estimated time:** 4-6 hours

---

## FAQ

**Q: Should we save the canvas as PNG or JPEG?**

A: **PNG** - maintains transparency, better quality for graphics/text, lossless compression. JPEGs are for photos with many colors.

---

**Q: What if the configuration references a template that's been deleted?**

A: Fall back to default template + show warning to user:
```typescript
if (!templateExists) {
  alert(`Template "${config.template}" not found. Using default.`);
  setSelectedTemplate('bold-statement');
}
```

---

**Q: Should "Export PNG" also save to library?**

A: **No** - keep them separate. Users might want:
- Quick export without saving (testing, one-off)
- Save without immediate download (building library)

Two buttons = maximum flexibility.

---

**Q: How to handle 4K thumbnails (3840x2160)?**

A: Current approach supports up to 50MB payload, so 4K works. But recommend:
- Validate dimensions on server
- Warn if > 1920x1080
- Optionally resize to max dimensions
- Most YouTube thumbnails are 1920x1080 anyway

For FR-19: **Support 1920x1080**, larger sizes optional enhancement.

---

**Q: Base64 vs direct file upload (multipart/form-data)?**

A: **Base64 is fine** because:
- Canvas API returns base64 natively (`toDataURL()`)
- Simpler client code (JSON body, not FormData)
- Already working pattern in codebase
- 50MB limit handles thumbnail sizes

Multipart upload would be ~30% more efficient (no base64 overhead), but not worth the complexity for this use case.

---

**Q: Should we compress the PNG before saving?**

A: **Optional enhancement** - start with uncompressed:
- Simplest implementation
- User gets exact canvas output
- File sizes acceptable (<3MB)

If needed later, can add server-side compression using `sharp` library. Not required for FR-19.

---

**Q: What if user has 100+ saved thumbnails? Will history UI be slow?**

A: Current approach loads all thumbnails on mount. If performance becomes an issue:
- Add pagination (20 thumbnails per page)
- Add infinite scroll
- Add lazy loading for images

For FR-19: **Load all thumbnails** (simpler), paginate in future if needed.

---

**Q: Should we support thumbnail editing (load and modify existing thumbnail)?**

A: **Already supported** via "Reuse Configuration":
1. Click "Reuse Configuration"
2. Modify settings
3. Click "Save to Library" again
4. New thumbnail created (original unchanged)

No "Edit" feature needed - reuse + save-as-new is the pattern.

---

**Q: Do we need a "Delete" button in history?**

A: **Not required for FR-19** - nice-to-have. Users can:
- Use FR-18 Asset Browser to delete (when implemented)
- Manually delete files from `assets/catalog/thumbnails/`

Add delete in FR-18 or later enhancement.

---

**Last Updated:** 2026-01-04
