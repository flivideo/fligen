# FR-19: Thumbnail Persistence & History

**Status:** Pending
**Created:** 2026-01-04
**Priority:** Important 🟡
**Depends On:** FR-16 (Unified Asset Catalog Infrastructure)
**Related:** FR-17 (Asset Persistence Implementation), FR-12 (Thumbnail Generator)

**Developer Handover:** See `docs/FR-19-DEVELOPER-HANDOVER.md` for implementation guide

---

## User Story

As a content creator, I want every thumbnail I generate to be automatically saved with its configuration (template, text, colors, layers) AND displayed in a history list, so that I can review past designs, reuse successful configurations, and build my thumbnail library for stories.

---

## Problem

**Current state:**
- Day 8 (Thumbnail Generator) creates thumbnails via client-side canvas rendering
- Thumbnails are exported as PNG files downloaded to user's computer
- No server persistence - thumbnails lost when user closes browser
- No configuration storage - cannot recreate or modify past designs
- No history UI - cannot review or compare past thumbnails
- Cannot select thumbnails for Day 11 Story Builder

**Impact:**
- Users must manually organize downloaded PNG files
- Cannot track which configuration produced which thumbnail
- Cannot A/B test different text/color combinations
- No historical record for analysis or reuse
- Missing critical data for Day 11 Story Builder integration
- User frustration: "I made a great thumbnail yesterday but can't recreate it"

**Technical challenge:**
- Client-side canvas rendering means server doesn't have access to image data
- PNG files can be large (1-3MB for 1920×1080)
- Configuration JSON must be saved alongside image for "Reuse Configuration" feature
- Need efficient base64 encoding/decoding for network transfer

---

## Solution

Implement dual-mode saving and catalog persistence for thumbnails:

**Save Options:**
1. **"Export PNG"** (existing) - Download to user's computer only
2. **"Save to Library"** (new) - Save to server catalog + download

**What gets saved:**
- PNG image file (base64 encoded for transfer, decoded to file on server)
- Complete configuration JSON (template, text, colors, positions, layers)
- Metadata (dimensions, file size, creation time)

**History UI:**
- Grid of thumbnail previews (2-3 columns)
- Show template name, primary text, creation date
- "Reuse Configuration" button to restore all settings
- "Export Again" button to re-download PNG

**Technical flow:**
```
User designs thumbnail in canvas
  ↓
User clicks "Save to Library"
  ↓
Client:
  - canvas.toDataURL('image/png') → base64
  - Collect configuration from state
  - POST to /api/thumbnails/save
  ↓
Server:
  - Decode base64 to Buffer
  - Save PNG to assets/catalog/thumbnails/
  - Create Asset record with configuration in metadata
  - Add to catalog index
  ↓
Client:
  - Refresh history list
  - Show success message
  - Trigger download (same as "Export PNG")
```

---

## Acceptance Criteria

### Persistence
- [ ] User can click "Save to Library" button in Day 8 UI
- [ ] Thumbnail PNG saved to `assets/catalog/thumbnails/` with unique filename
- [ ] Configuration JSON saved in asset metadata
- [ ] Asset record added to catalog with type `'thumbnail'`
- [ ] File naming: `thumb-{timestamp}-{template}.png` (e.g., `thumb-1735998123456-bold-statement.png`)
- [ ] No filename collisions (use timestamp)

### Configuration Storage
- [ ] Metadata captures:
  - Template ID (e.g., "bold-statement", "gradient-minimal")
  - Text overlay (headline, subtitle, call-to-action)
  - Colors (background, text, accent)
  - Positions (text alignment, layer positions)
  - Dimensions (width, height)
  - Font settings (family, size, weight)
  - Any other customization options
- [ ] Configuration JSON is complete enough to recreate exact thumbnail

### History UI (MANDATORY)
- [ ] Day 8 displays "Thumbnail History" section below generation form
- [ ] Grid layout (2-3 columns on desktop, 1 column on mobile)
- [ ] Each history item shows:
  - Thumbnail preview image
  - Template name
  - Primary text (headline or title)
  - Creation date and time
- [ ] "Reuse Configuration" button on each thumbnail
- [ ] History loads on page mount
- [ ] History auto-refreshes after saving new thumbnail
- [ ] Reverse chronological order (newest first)
- [ ] Empty state: "No thumbnails saved yet"

### Reuse Functionality
- [ ] "Reuse Configuration" button loads all settings from saved thumbnail:
  - Restores template selection
  - Restores text fields (headline, subtitle, etc.)
  - Restores color pickers (background, text, accent)
  - Restores layout positions
  - Restores font settings
  - User can then modify and save as new thumbnail
- [ ] Loading configuration does NOT overwrite current unsaved work without confirmation

### Download Behavior
- [ ] "Save to Library" triggers both server save AND browser download
- [ ] "Export PNG" (existing) still works as before (download only, no server save)
- [ ] Downloaded filename matches server filename for consistency

### API
- [ ] `POST /api/thumbnails/save` - Save thumbnail with configuration
  - Request: `{ imageData: string (base64), configuration: object }`
  - Response: `{ asset: Asset }`
- [ ] `GET /api/catalog/filter?type=thumbnail` - List all thumbnails (uses existing catalog API)
- [ ] Handle large payloads (1-3MB base64 strings)

---

## Technical Notes

### File Structure

**New files to create:**
```
server/src/tools/thumbnails/
├── types.ts           # ThumbnailConfiguration interface
├── save-to-catalog.ts # Save thumbnail + config to catalog
└── index.ts           # Module exports
```

**Files to modify:**
```
client/src/components/tools/Day8Thumbnail.tsx  # Add "Save to Library", history UI
server/src/index.ts                            # Add /api/thumbnails/save endpoint
shared/src/index.ts                            # Add ThumbnailConfiguration type
```

### Type Definitions

```typescript
// shared/src/index.ts

export interface ThumbnailConfiguration {
  template: string;           // "bold-statement", "gradient-minimal", etc.
  headline?: string;          // Primary text
  subtitle?: string;          // Secondary text
  callToAction?: string;      // CTA text
  backgroundColor: string;    // Hex color
  textColor: string;          // Hex color
  accentColor?: string;       // Hex color
  fontSize: {
    headline: number;
    subtitle: number;
    cta: number;
  };
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  layers: {
    id: string;
    type: 'text' | 'shape' | 'image';
    position: { x: number; y: number };
    size: { width: number; height: number };
    content?: string;
    style?: Record<string, any>;
  }[];
  dimensions: {
    width: number;           // 1920
    height: number;          // 1080
  };
}

export interface SaveThumbnailRequest {
  imageData: string;                    // base64 PNG
  configuration: ThumbnailConfiguration;
}

export interface SaveThumbnailResponse {
  asset: Asset;
}
```

### Server Implementation

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
  // Remove "data:image/png;base64," prefix if present
  const base64Data = imageDataBase64.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Save to catalog/thumbnails/
  const filePath = path.join(
    process.cwd(),
    'assets',
    'catalog',
    'thumbnails',
    filename
  );
  await fs.writeFile(filePath, buffer);

  // Create asset record
  const asset: Asset = {
    id,
    type: 'thumbnail',
    filename,
    url: `/assets/catalog/thumbnails/${filename}`,
    provider: 'client',        // Client-side canvas rendering
    model: 'canvas',           // HTML5 Canvas
    prompt: configuration.headline || configuration.subtitle || '(no text)',
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0,          // Free - client-side rendering
    generationTimeMs: Date.now() - startTime,
    metadata: {
      configuration,           // Full config for recreation
      template: configuration.template,
      headline: configuration.headline,
      subtitle: configuration.subtitle,
      dimensions: configuration.dimensions,
      fileSizeBytes: buffer.length,
    },
  };

  // Add to catalog
  await catalog.addAsset(asset);

  console.log(`[Thumbnails] Saved thumbnail to catalog: ${id} (${template})`);
  return asset;
}
```

```typescript
// server/src/index.ts

import { saveThumbnailToCatalog } from './tools/thumbnails/save-to-catalog.js';

app.post('/api/thumbnails/save', async (req, res) => {
  try {
    const { imageData, configuration } = req.body;

    if (!imageData || !configuration) {
      return res.status(400).json({ error: 'Missing imageData or configuration' });
    }

    const asset = await saveThumbnailToCatalog(imageData, configuration);

    res.json({ asset });
  } catch (error) {
    console.error('[Thumbnails] Failed to save to catalog:', error);
    res.status(500).json({ error: 'Failed to save thumbnail' });
  }
});
```

### Client Implementation

```typescript
// client/src/components/tools/Day8Thumbnail.tsx

import { useState, useEffect } from 'react';
import type { Asset, ThumbnailConfiguration } from '../../../shared/src/index.js';

export function Day8Thumbnail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Existing state
  const [template, setTemplate] = useState('bold-statement');
  const [headline, setHeadline] = useState('Your Headline Here');
  const [subtitle, setSubtitle] = useState('Supporting text goes here');
  // ... other design state ...

  // History state (NEW)
  const [thumbnailHistory, setThumbnailHistory] = useState<Asset[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=thumbnail`);
        const data = await response.json();
        setThumbnailHistory(
          data.assets.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (error) {
        console.error('[Day8] Failed to load thumbnail history:', error);
      }
    }
    loadHistory();
  }, []);

  // Existing export function (unchanged)
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `thumbnail-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // New save-to-library function
  const handleSaveToLibrary = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);

    try {
      // Get image data
      const imageData = canvas.toDataURL('image/png');

      // Collect configuration
      const configuration: ThumbnailConfiguration = {
        template,
        headline,
        subtitle,
        backgroundColor: bgColor,
        textColor: textColor,
        accentColor: accentColor,
        fontSize: {
          headline: headlineFontSize,
          subtitle: subtitleFontSize,
          cta: ctaFontSize,
        },
        fontFamily: fontFamily,
        textAlign: textAlign,
        layers: canvasLayers,
        dimensions: {
          width: 1920,
          height: 1080,
        },
      };

      // Save to server
      const response = await fetch(`${SERVER_URL}/api/thumbnails/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, configuration }),
      });

      if (!response.ok) {
        throw new Error('Failed to save thumbnail');
      }

      const { asset } = await response.json();
      console.log('[Day8] Thumbnail saved:', asset.id);

      // Refresh history
      const historyResponse = await fetch(`${SERVER_URL}/api/catalog/filter?type=thumbnail`);
      const historyData = await historyResponse.json();
      setThumbnailHistory(
        historyData.assets.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );

      // Also trigger download (same as Export PNG)
      const link = document.createElement('a');
      link.download = asset.filename;
      link.href = imageData;
      link.click();

      alert('Thumbnail saved to library!');
    } catch (error) {
      console.error('[Day8] Failed to save thumbnail:', error);
      alert('Failed to save thumbnail. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reuse configuration from history
  const handleReuseConfiguration = (asset: Asset) => {
    const config = asset.metadata.configuration as ThumbnailConfiguration;

    // Confirm before overwriting
    const hasUnsavedChanges = /* check if current state differs from defaults */;
    if (hasUnsavedChanges) {
      if (!confirm('This will replace your current design. Continue?')) {
        return;
      }
    }

    // Restore all settings
    setTemplate(config.template);
    setHeadline(config.headline || '');
    setSubtitle(config.subtitle || '');
    setBgColor(config.backgroundColor);
    setTextColor(config.textColor);
    setAccentColor(config.accentColor || '#000000');
    setHeadlineFontSize(config.fontSize.headline);
    setSubtitleFontSize(config.fontSize.subtitle);
    setCtaFontSize(config.fontSize.cta);
    setFontFamily(config.fontFamily);
    setTextAlign(config.textAlign);
    setCanvasLayers(config.layers);

    // Scroll to top so user can see restored settings
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Design Form (existing) */}
      <div>
        <h2>Design Your Thumbnail</h2>
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="bold-statement">Bold Statement</option>
          <option value="gradient-minimal">Gradient Minimal</option>
          {/* ... more templates ... */}
        </select>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} />
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        {/* ... more design controls ... */}
      </div>

      {/* Canvas Preview (existing) */}
      <canvas ref={canvasRef} width={1920} height={1080} className="border rounded" />

      {/* Action Buttons (modified) */}
      <div className="flex gap-3">
        <button
          onClick={handleExportPNG}
          className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"
        >
          Export PNG
        </button>
        <button
          onClick={handleSaveToLibrary}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save to Library'}
        </button>
      </div>

      {/* History Section (NEW) */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Thumbnail History</h3>

        {thumbnailHistory.length === 0 ? (
          <p className="text-slate-400">No thumbnails saved yet. Click "Save to Library" to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thumbnailHistory.map((asset) => (
              <div key={asset.id} className="border rounded-lg p-4 hover:border-blue-500">
                {/* Thumbnail Preview */}
                <img
                  src={asset.url}
                  alt={asset.metadata.headline || 'Thumbnail'}
                  className="w-full aspect-video rounded mb-3"
                />

                {/* Metadata */}
                <p className="text-sm font-medium truncate">
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
    </div>
  );
}
```

### Payload Size Handling

**Concern:** Base64-encoded 1920×1080 PNG can be 1-3MB

**Solution:** Express already configured for large payloads in FR-11:
```typescript
// server/src/index.ts (already exists from FR-11)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

**No additional configuration needed.**

### Edge Cases

1. **User clicks "Reuse Configuration" with unsaved work:**
   - Show confirmation dialog: "This will replace your current design. Continue?"
   - If user confirms, restore settings
   - If user cancels, do nothing

2. **Network failure during save:**
   - Show error message: "Failed to save thumbnail. Please try again."
   - User can retry "Save to Library"
   - Thumbnail not lost - still in browser canvas

3. **Very large PNG (>10MB):**
   - Current limit (50MB) should handle all practical cases
   - If needed, can compress PNG quality or resize before encoding

4. **Empty/default thumbnail:**
   - Allow saving even with default template and no text
   - Good for testing and baseline comparisons

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Day 8: Thumbnail Generator                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Template: [Bold Statement ▼]                               │
│  Headline: [Your Headline Here____________]                 │
│  Subtitle: [Supporting text_______________]                 │
│  Background: [#1a1a1a] Text: [#ffffff]                      │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │                                    │                     │
│  │     Canvas Preview (1920x1080)    │                     │
│  │                                    │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  [Export PNG]  [Save to Library]                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Thumbnail History                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Thumb 1  │ │ Thumb 2  │ │ Thumb 3  │                    │
│  │ [Image]  │ │ [Image]  │ │ [Image]  │                    │
│  │ "Bold    │ │ "Minimal │ │ "Bright  │                    │
│  │  Title"  │ │  Design" │ │  CTA"    │                    │
│  │ 2h ago   │ │ 1d ago   │ │ 3d ago   │                    │
│  │[Reuse]   │ │[Reuse]   │ │[Reuse]   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Persistence
- [ ] Create thumbnail → Click "Save to Library" → File saved to `assets/catalog/thumbnails/`
- [ ] Asset record added to catalog with type `'thumbnail'`
- [ ] Configuration JSON saved in `metadata.configuration`
- [ ] Filename unique (no collisions on multiple saves)
- [ ] File naming follows pattern: `thumb-{timestamp}-{template}.png`

### Configuration Storage
- [ ] All template settings captured (template ID, text, colors)
- [ ] All layout settings captured (positions, dimensions, layers)
- [ ] All font settings captured (family, size, weight)
- [ ] Configuration complete enough to recreate exact thumbnail

### History UI
- [ ] History section displays below generation form
- [ ] Grid layout responsive (3 cols desktop, 2 cols tablet, 1 col mobile)
- [ ] Each thumbnail shows: preview, headline/subtitle, template, date
- [ ] Empty state shows when no thumbnails saved
- [ ] Reverse chronological order (newest first)
- [ ] History loads on page mount
- [ ] History auto-refreshes after saving new thumbnail

### Reuse Functionality
- [ ] Click "Reuse Configuration" → All settings restored
- [ ] Template selector updates
- [ ] Text fields populate with saved values
- [ ] Color pickers restore saved colors
- [ ] Layout positions restore correctly
- [ ] Canvas re-renders with saved configuration
- [ ] Confirmation dialog shown if user has unsaved changes

### Download Behavior
- [ ] "Save to Library" saves to server AND downloads to browser
- [ ] "Export PNG" downloads only (no server save)
- [ ] Downloaded filename matches server filename
- [ ] PNG file valid and opens in image viewers

### API
- [ ] POST /api/thumbnails/save accepts base64 + config
- [ ] POST returns asset object on success
- [ ] POST returns 400 if missing imageData or configuration
- [ ] POST returns 500 on server errors
- [ ] GET /api/catalog/filter?type=thumbnail returns all thumbnails
- [ ] Large payloads (1-3MB) handled without errors

---

## Success Metrics

- [ ] 100% of thumbnails created via "Save to Library" persisted to catalog
- [ ] Zero data loss on page refresh
- [ ] All configuration parameters captured and restorable
- [ ] Users can recreate any past thumbnail exactly
- [ ] History UI shows all saved thumbnails
- [ ] "Reuse Configuration" saves time (no manual re-entry of settings)
- [ ] Ready for Day 11 Story Builder to query thumbnail catalog

---

## Dependencies

**Requires:**
- FR-16 (Unified Asset Catalog Infrastructure) - MUST be complete first
- FR-12 (Thumbnail Generator) - Day 8 UI must exist

**Blocks:**
- None (Day 11 Story Builder will query catalog but doesn't block)

**Related:**
- FR-17 (Asset Persistence Implementation) - Same pattern applied to thumbnails
- FR-18 (Asset Browser UI) - Thumbnails will appear in unified browser

---

## Migration Notes

**No migration needed** - Day 8 currently has no persistence, so this is net-new functionality.

All thumbnails saved after FR-19 implementation will be catalog-native.

---

## Completion Notes

_To be filled by developer upon completion._

---

**Last Updated:** 2026-01-04
