# FR-16: Unified Asset Catalog Infrastructure

**Status:** Complete
**Created:** 2026-01-04
**Completed:** 2026-01-04
**Priority:** Critical 🔴
**Depends On:** None
**Blocks:** FR-17 (Asset Persistence Implementation)
**Related:** Data Persistence Audit (`docs/data-persistence-audit.md`)

---

## User Story

As a developer, I need a unified asset management system that tracks all generated assets (images, videos, audio, thumbnails) with complete metadata, so that users can access historical data and build stories in Day 11.

---

## Problem

**Current state:** FliGen has inconsistent data persistence patterns:
- Day 4 (Images): Nothing saved
- Day 5 (TTS): Hard-coded path, no metadata
- Day 6 (Videos): Filename collisions, missing animation prompts
- Day 7 (Music): Base64 bloat, incomplete metadata
- Day 10 (N8N): Nothing saved

**Impact:** Cannot build Day 11 (Story Builder) without historical asset data.

**Root cause:** No unified asset management system.

---

## Solution

Create a **centralized asset catalog** with:
1. Unified data model for all asset types
2. Storage functions (save, load, update, delete)
3. Server API endpoints
4. Shared TypeScript types

---

## Architecture

### Folder Structure

```
assets/
├── catalog/
│   ├── index.json              # Master asset index
│   ├── images/
│   │   ├── img-{id}-{provider}-{model}.jpg
│   │   └── ...
│   ├── videos/
│   │   ├── vid-{id}-{provider}-{model}.mp4
│   │   └── ...
│   ├── audio/
│   │   ├── aud-{id}-{provider}-{voice}.mp3
│   │   └── ...
│   └── thumbnails/
│       ├── thumb-{id}-{template}.jpg
│       └── ...
│
├── projects/          # Keep existing (references catalog assets)
├── shot-list/         # Migrate to catalog
├── video-scenes/      # Migrate to catalog
├── music-library/     # Migrate to catalog
└── fox-story/         # Deprecated (migrate to catalog)
```

### Data Model

```typescript
// Unified Asset Type
interface Asset {
  // Core identity
  id: string;                    // Unique: "asset_{type}_{timestamp}_{random}"
  type: 'image' | 'video' | 'audio' | 'thumbnail';
  filename: string;              // Unique filename with extension
  url: string;                   // Server URL path

  // Generation metadata
  provider: string;              // 'fal' | 'kie' | 'elevenlabs' | 'n8n'
  model: string;                 // Model/version used
  prompt: string;                // Generation prompt

  // Status tracking
  status: 'generating' | 'ready' | 'failed' | 'archived';
  error?: string;                // Error message if failed

  // Timestamps
  createdAt: string;             // ISO 8601
  completedAt?: string;          // ISO 8601

  // Relationships
  parentId?: string;             // Asset this was regenerated from
  sourceAssetIds?: string[];     // Assets used to create this (e.g., video uses images)
  tags?: string[];               // User-defined tags

  // Business metrics
  estimatedCost: number;         // USD
  generationTimeMs: number;      // Milliseconds

  // Tool-specific metadata (flexible)
  metadata: {
    // Images
    width?: number;
    height?: number;
    seed?: number;
    guidanceScale?: number;

    // Videos
    duration?: number;
    fps?: number;
    animationPrompt?: string;
    startShotId?: string;
    endShotId?: string;

    // Audio
    voice?: string;
    voiceId?: string;
    durationSeconds?: number;
    format?: string;
    narrationText?: string;

    // Music
    lyrics?: string;
    style?: string;
    bpm?: number;
    instrumental?: boolean;
    outputFormat?: string;

    // Thumbnails
    template?: string;
    textOverlay?: string;
    composition?: string;

    // N8N Workflow
    workflowId?: string;
    humanPrompts?: {
      seed: string;
      edit: string;
      animation: string;
    };
    machinePrompts?: {
      seed: string;
      edit: string;
      animation: string;
    };

    // Extensible for future tools
    [key: string]: any;
  };
}

// Catalog Index
interface AssetCatalog {
  version: string;               // Catalog schema version
  lastUpdated: string;           // ISO 8601
  assets: Asset[];               // All assets
}
```

---

## Implementation

### Phase 1: Core Infrastructure

#### 1.1 Create Storage Module

**File:** `server/src/tools/catalog/storage.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

const CATALOG_DIR = path.join(process.cwd(), 'assets', 'catalog');
const INDEX_FILE = path.join(CATALOG_DIR, 'index.json');

// Initialize catalog
export async function initCatalog(): Promise<void> {
  await fs.mkdir(path.join(CATALOG_DIR, 'images'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'videos'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'audio'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'thumbnails'), { recursive: true });

  const exists = await fs.access(INDEX_FILE).then(() => true).catch(() => false);
  if (!exists) {
    const initialCatalog: AssetCatalog = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      assets: [],
    };
    await fs.writeFile(INDEX_FILE, JSON.stringify(initialCatalog, null, 2));
  }
}

// Load catalog
export async function loadCatalog(): Promise<AssetCatalog> {
  const data = await fs.readFile(INDEX_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save catalog
async function saveCatalog(catalog: AssetCatalog): Promise<void> {
  catalog.lastUpdated = new Date().toISOString();
  await fs.writeFile(INDEX_FILE, JSON.stringify(catalog, null, 2));
}

// Add asset
export async function addAsset(asset: Asset): Promise<Asset> {
  const catalog = await loadCatalog();
  catalog.assets.push(asset);
  await saveCatalog(catalog);
  return asset;
}

// Update asset
export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | null> {
  const catalog = await loadCatalog();
  const index = catalog.assets.findIndex(a => a.id === id);
  if (index === -1) return null;

  catalog.assets[index] = { ...catalog.assets[index], ...updates };
  await saveCatalog(catalog);
  return catalog.assets[index];
}

// Get asset by ID
export async function getAsset(id: string): Promise<Asset | null> {
  const catalog = await loadCatalog();
  return catalog.assets.find(a => a.id === id) || null;
}

// Get all assets
export async function getAllAssets(): Promise<Asset[]> {
  const catalog = await loadCatalog();
  return catalog.assets;
}

// Filter assets
export async function filterAssets(filter: {
  type?: Asset['type'];
  provider?: string;
  status?: Asset['status'];
  tags?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<Asset[]> {
  const catalog = await loadCatalog();
  return catalog.assets.filter(asset => {
    if (filter.type && asset.type !== filter.type) return false;
    if (filter.provider && asset.provider !== filter.provider) return false;
    if (filter.status && asset.status !== filter.status) return false;
    if (filter.tags && !filter.tags.every(t => asset.tags?.includes(t))) return false;
    if (filter.startDate && asset.createdAt < filter.startDate) return false;
    if (filter.endDate && asset.createdAt > filter.endDate) return false;
    return true;
  });
}

// Delete asset
export async function deleteAsset(id: string): Promise<boolean> {
  const catalog = await loadCatalog();
  const index = catalog.assets.findIndex(a => a.id === id);
  if (index === -1) return false;

  const asset = catalog.assets[index];

  // Delete file
  const filePath = path.join(process.cwd(), 'assets', 'catalog', asset.type + 's', asset.filename);
  await fs.unlink(filePath).catch(() => {}); // Ignore errors

  // Remove from catalog
  catalog.assets.splice(index, 1);
  await saveCatalog(catalog);
  return true;
}

// Generate unique asset ID
export function generateAssetId(type: Asset['type']): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `asset_${type}_${timestamp}_${random}`;
}

// Generate filename
export function generateFilename(type: Asset['type'], provider: string, model: string, extension: string): string {
  const id = Date.now();
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  return `${type}-${id}-${provider}-${modelSlug}.${extension}`;
}
```

#### 1.2 Create API Endpoints

**File:** `server/src/index.ts` (add to existing file)

```typescript
import * as catalog from './tools/catalog/storage.js';

// Initialize catalog on startup
await catalog.initCatalog();
console.log('[Catalog] Asset catalog initialized');

// GET /api/catalog - Get all assets
app.get('/api/catalog', async (_req, res) => {
  try {
    const assets = await catalog.getAllAssets();
    res.json({ assets });
  } catch (error) {
    console.error('[Catalog] Failed to get assets:', error);
    res.status(500).json({ error: 'Failed to retrieve assets' });
  }
});

// GET /api/catalog/:id - Get asset by ID
app.get('/api/catalog/:id', async (req, res) => {
  try {
    const asset = await catalog.getAsset(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ asset });
  } catch (error) {
    console.error('[Catalog] Failed to get asset:', error);
    res.status(500).json({ error: 'Failed to retrieve asset' });
  }
});

// GET /api/catalog/filter - Filter assets
app.get('/api/catalog/filter', async (req, res) => {
  try {
    const filter = {
      type: req.query.type as Asset['type'] | undefined,
      provider: req.query.provider as string | undefined,
      status: req.query.status as Asset['status'] | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };
    const assets = await catalog.filterAssets(filter);
    res.json({ assets });
  } catch (error) {
    console.error('[Catalog] Failed to filter assets:', error);
    res.status(500).json({ error: 'Failed to filter assets' });
  }
});

// DELETE /api/catalog/:id - Delete asset
app.delete('/api/catalog/:id', async (req, res) => {
  try {
    const deleted = await catalog.deleteAsset(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Catalog] Failed to delete asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});
```

#### 1.3 Add Shared Types

**File:** `shared/src/index.ts` (add to existing file)

```typescript
// Asset Catalog Types
export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'thumbnail';
  filename: string;
  url: string;
  provider: string;
  model: string;
  prompt: string;
  status: 'generating' | 'ready' | 'failed' | 'archived';
  error?: string;
  createdAt: string;
  completedAt?: string;
  parentId?: string;
  sourceAssetIds?: string[];
  tags?: string[];
  estimatedCost: number;
  generationTimeMs: number;
  metadata: Record<string, any>;
}

export interface AssetCatalog {
  version: string;
  lastUpdated: string;
  assets: Asset[];
}
```

#### 1.4 Export Module

**File:** `server/src/tools/catalog/index.ts`

```typescript
export * from './storage.js';
```

---

## Testing Checklist

### Server Tests

- [ ] Catalog initializes on server start
- [ ] Can add asset to catalog
- [ ] Can retrieve asset by ID
- [ ] Can filter assets by type
- [ ] Can filter assets by provider
- [ ] Can filter assets by date range
- [ ] Can update asset status
- [ ] Can delete asset (removes file + catalog entry)
- [ ] Catalog index.json updates correctly
- [ ] Asset files stored in correct subdirectories

### API Tests

- [ ] `GET /api/catalog` returns all assets
- [ ] `GET /api/catalog/:id` returns specific asset
- [ ] `GET /api/catalog/:id` returns 404 for non-existent asset
- [ ] `GET /api/catalog/filter?type=image` filters correctly
- [ ] `GET /api/catalog/filter?provider=fal` filters correctly
- [ ] `DELETE /api/catalog/:id` removes asset
- [ ] `DELETE /api/catalog/:id` returns 404 for non-existent asset

### Edge Cases

- [ ] Empty catalog (first run)
- [ ] Corrupted index.json (should recreate)
- [ ] Missing asset file (deletion handles gracefully)
- [ ] Duplicate asset IDs (should never happen - timestamp + random)
- [ ] Large catalog (10,000+ assets - performance test)

---

## Success Metrics

- [ ] Catalog initializes successfully on server start
- [ ] All API endpoints respond correctly
- [ ] TypeScript types compile without errors
- [ ] No breaking changes to existing code
- [ ] Documentation complete
- [ ] Ready for FR-17 implementation

---

## Files to Create

```
server/src/tools/catalog/
├── storage.ts      # Core storage functions
└── index.ts        # Module exports

assets/catalog/
├── index.json      # Master catalog (created on init)
├── images/         # Image assets
├── videos/         # Video assets
├── audio/          # Audio assets
└── thumbnails/     # Thumbnail assets
```

---

## Files to Modify

```
server/src/index.ts           # Add catalog initialization + API endpoints
shared/src/index.ts           # Add Asset + AssetCatalog types
```

---

## Migration Notes

**NOT included in this FR:**
- Migrating existing data (shot-list, video-scenes, music-library)
- Implementing asset saving in Day 4, 5, 10
- Building asset browser UI

**These are covered in FR-17 and FR-18.**

This FR focuses ONLY on building the infrastructure that everything else will use.

---

## Dependencies

**Required:**
- Node.js fs/promises API
- Existing server structure (Express, TypeScript)

**Blocks:**
- FR-17: Asset Persistence Implementation
- FR-18: Asset Browser UI

---

## Completion Notes

**Status:** Complete

**What was done:**
- Created catalog storage module with all CRUD operations (add, get, filter, update, delete)
- Implemented catalog initialization that creates folder structure and index.json
- Added Asset and AssetCatalog TypeScript types to shared workspace
- Added 4 REST API endpoints: GET /api/catalog, GET /api/catalog/filter, GET /api/catalog/:id, DELETE /api/catalog/:id
- Integrated catalog initialization into server startup sequence
- Fixed path resolution to use correct assets directory (one level up from server workspace)
- Fixed route ordering to prevent /api/catalog/filter from being caught by /:id route

**Files created:**
- `server/src/tools/catalog/storage.ts` (119 lines) - Core storage operations
- `server/src/tools/catalog/index.ts` (1 line) - Module exports

**Files modified:**
- `shared/src/index.ts` - Added Asset and AssetCatalog interfaces (30 lines)
- `server/src/index.ts` - Added catalog import, initialization, and 4 API endpoints (65 lines)

**Testing completed:**
- ✅ Server initializes catalog on startup
- ✅ Folder structure created: `assets/catalog/{images,videos,audio,thumbnails}/`
- ✅ Initial index.json created with version 1.0.0 and empty assets array
- ✅ GET /api/catalog returns empty assets array
- ✅ GET /api/catalog/filter?type=image returns filtered results
- ✅ GET /api/catalog/:id returns 404 for non-existent asset
- ✅ DELETE /api/catalog/:id returns 404 for non-existent asset
- ✅ TypeScript compilation successful (npm run build)

**Key implementation details:**
- Assets directory resolved as `path.resolve(process.cwd(), '..', 'assets')` to match existing pattern
- Route ordering: /api/catalog/filter must come before /api/catalog/:id to prevent mismatches
- Asset ID format: `asset_{type}_{timestamp}_{random}`
- Filename format: `{type}-{timestamp}-{provider}-{model}.{ext}`
- Catalog version: 1.0.0

**Ready for FR-17:**
- Other developers can now import `catalog.addAsset()`, `catalog.updateAsset()`, etc.
- Foundation in place for Day 4, 5, 10 to save assets
- API endpoints available for future Asset Browser UI (FR-18)

---

**Last Updated:** 2026-01-04
