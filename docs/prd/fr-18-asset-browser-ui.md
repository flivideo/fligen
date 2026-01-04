# FR-18: Asset Browser UI

**Status:** Pending
**Created:** 2026-01-04
**Priority:** Important 🟡 (Can wait until after Day 11)
**Depends On:** FR-16 (Unified Asset Catalog), FR-17 (Asset Persistence)
**Blocks:** None (Day 11 can access catalog via API directly)
**Related:** Data Persistence Audit (`docs/data-persistence-audit.md`)

**Developer Handover:** See `docs/FR-18-DEVELOPER-HANDOVER.md` for implementation guide

---

## User Story

As a user, I want to browse, search, and manage all my generated assets (images, videos, audio, thumbnails) in one place, so that I can find what I need, compare results, and reuse assets in my stories.

---

## Problem

**After FR-16 and FR-17:**
- All assets are saved to catalog with full metadata ✅
- Assets can be queried via API ✅
- But no UI to browse/search/manage assets ❌

**Need:**
- Visual asset browser (grid view)
- Search and filtering
- Preview and details
- Asset management (delete, tag, rename)

---

## Solution

Create a dedicated "Asset Library" tool (Day 13 or standalone page) with:

1. **Grid View**: Thumbnails of all assets
2. **Filters**: Type, provider, date, tags, status
3. **Search**: Full-text search on prompts
4. **Details Panel**: Full metadata when clicking asset
5. **Actions**: Download, delete, tag, copy URL

---

## UI Design

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  ASSET LIBRARY                                     [+] New │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [🔍 Search]  [Type ▼] [Provider ▼] [Date ▼] [Tags ▼]    │
│                                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ IMG  │  │ IMG  │  │ VID  │  │ AUD  │  │ IMG  │       │
│  │ 001  │  │ 002  │  │ 001  │  │ 001  │  │ 003  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘       │
│                                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ IMG  │  │ VID  │  │ AUD  │  │ IMG  │  │ VID  │       │
│  │ 004  │  │ 002  │  │ 002  │  │ 005  │  │ 003  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘       │
│                                                            │
│  [← Prev]  Page 1 of 10  [Next →]                        │
│                                                            │
└──────────────────────────────────────────────────────────┘

Click asset → Detail Panel slides in from right:

┌─────────────────────────────────────┐
│  IMAGE • shot-001.jpg         [×]   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      [Image Preview]        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Prompt:                            │
│  "Retro 1960s children's book..."   │
│                                     │
│  Provider: FAL.AI                   │
│  Model: Flux Pro v1.1               │
│  Dimensions: 1024×1024              │
│  Created: Dec 30, 2025 12:17 PM    │
│  Cost: $0.05                        │
│  Generation Time: 6.4s              │
│                                     │
│  Tags: [illustration] [retro] [+]   │
│                                     │
│  [↓ Download] [🗑 Delete] [📋 Copy URL] │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Structure

### AssetBrowser Component

```tsx
// client/src/components/tools/AssetBrowser.tsx

interface AssetBrowserProps {
  // Optional: Pre-filter by type
  filterType?: 'image' | 'video' | 'audio' | 'thumbnail';
  // Optional: Selection mode for Day 11
  selectionMode?: boolean;
  onSelect?: (assets: Asset[]) => void;
}

export function AssetBrowser({ filterType, selectionMode, onSelect }: AssetBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filters, setFilters] = useState({
    type: filterType || undefined,
    provider: undefined,
    search: '',
    startDate: undefined,
    endDate: undefined,
    tags: [],
  });
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Load assets on mount and filter changes
  useEffect(() => {
    loadAssets();
  }, [filters, page]);

  const loadAssets = async () => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.provider) params.append('provider', filters.provider);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.tags.length) params.append('tags', filters.tags.join(','));

    const response = await fetch(`${SERVER_URL}/api/catalog/filter?${params}`);
    const data = await response.json();

    // Client-side search filter
    let filtered = data.assets;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.prompt.toLowerCase().includes(search) ||
        a.filename.toLowerCase().includes(search) ||
        a.metadata.customName?.toLowerCase().includes(search)
      );
    }

    setAssets(filtered);
  };

  // ... render grid, filters, detail panel
}
```

### AssetCard Component

```tsx
// client/src/components/tools/AssetCard.tsx

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onClick: () => void;
  onSelect?: (selected: boolean) => void;
}

export function AssetCard({ asset, selected, onClick, onSelect }: AssetCardProps) {
  const getIcon = () => {
    switch (asset.type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'thumbnail': return '🖼️';
    }
  };

  const getThumbnail = () => {
    if (asset.type === 'image' || asset.type === 'thumbnail') {
      return asset.url;
    } else if (asset.type === 'video') {
      // Generate video thumbnail or use placeholder
      return '/placeholder-video-thumb.jpg';
    } else {
      // Audio waveform or icon
      return '/placeholder-audio.jpg';
    }
  };

  return (
    <div
      className={`relative cursor-pointer rounded-lg border ${
        selected ? 'border-amber-500 ring-2 ring-amber-500' : 'border-slate-700'
      } bg-slate-800 p-2 transition-all hover:border-amber-500`}
      onClick={onClick}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
          className="absolute left-2 top-2 z-10 h-4 w-4 accent-amber-500"
        />
      )}

      <div className="aspect-square overflow-hidden rounded bg-slate-900">
        <img
          src={getThumbnail()}
          alt={asset.filename}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-lg">{getIcon()}</span>
        <span className="flex-1 truncate font-mono text-xs text-slate-400">
          {asset.metadata.customName || asset.filename}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{asset.provider}</span>
        <span className="font-mono text-xs text-slate-500">
          {new Date(asset.createdAt).toLocaleDateString()}
        </span>
      </div>

      {asset.status === 'generating' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {asset.status === 'failed' && (
        <div className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 font-mono text-xs text-white">
          Failed
        </div>
      )}
    </div>
  );
}
```

### AssetDetailPanel Component

```tsx
// client/src/components/tools/AssetDetailPanel.tsx

interface AssetDetailPanelProps {
  asset: Asset;
  onClose: () => void;
  onDelete?: () => void;
  onTagsUpdate?: (tags: string[]) => void;
}

export function AssetDetailPanel({ asset, onClose, onDelete, onTagsUpdate }: AssetDetailPanelProps) {
  const [tags, setTags] = useState(asset.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = asset.filename;
    a.click();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}${asset.url}`);
    // Show toast: "URL copied!"
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      setNewTag('');
      onTagsUpdate?.(updatedTags);
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updatedTags = tags.filter(t => t !== tag);
    setTags(updatedTags);
    onTagsUpdate?.(updatedTags);
  };

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-96 overflow-y-auto border-l border-slate-800 bg-slate-900 shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-lg font-semibold uppercase text-slate-200">
            {asset.type}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-slate-500">
          {asset.filename}
        </p>
      </div>

      {/* Preview */}
      <div className="p-4">
        <div className="aspect-square overflow-hidden rounded bg-slate-950">
          {asset.type === 'image' || asset.type === 'thumbnail' ? (
            <img src={asset.url} alt={asset.filename} className="h-full w-full object-contain" />
          ) : asset.type === 'video' ? (
            <video src={asset.url} controls className="h-full w-full" />
          ) : (
            <audio src={asset.url} controls className="w-full" />
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-4 p-4">
        <div>
          <label className="block font-mono text-xs uppercase text-slate-500">Prompt</label>
          <p className="mt-1 font-sans text-sm text-slate-300">{asset.prompt}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">Provider</label>
            <p className="mt-1 font-mono text-sm text-slate-300">{asset.provider}</p>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">Model</label>
            <p className="mt-1 font-mono text-sm text-slate-300">{asset.model}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">Created</label>
            <p className="mt-1 font-mono text-sm text-slate-300">
              {new Date(asset.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">Cost</label>
            <p className="mt-1 font-mono text-sm text-slate-300">
              ${asset.estimatedCost.toFixed(3)}
            </p>
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-slate-500">Generation Time</label>
          <p className="mt-1 font-mono text-sm text-slate-300">
            {(asset.generationTimeMs / 1000).toFixed(1)}s
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block font-mono text-xs uppercase text-slate-500">Tags</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="+ Add tag"
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Additional Metadata (tool-specific) */}
        {Object.keys(asset.metadata).length > 0 && (
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">Details</label>
            <div className="mt-2 space-y-1">
              {Object.entries(asset.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-mono text-xs text-slate-500">{key}:</span>
                  <span className="font-mono text-xs text-slate-300">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 border-t border-slate-800 bg-slate-900 p-4">
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            className="w-full rounded border border-emerald-600 bg-emerald-600 px-4 py-2 font-mono text-sm font-bold uppercase text-slate-950 hover:bg-emerald-500"
          >
            ↓ Download
          </button>
          <button
            onClick={handleCopyUrl}
            className="w-full rounded border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm font-medium uppercase text-slate-300 hover:bg-slate-700"
          >
            📋 Copy URL
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Delete this asset permanently?')) {
                  onDelete();
                  onClose();
                }
              }}
              className="w-full rounded border border-red-600 bg-red-600 px-4 py-2 font-mono text-sm font-bold uppercase text-white hover:bg-red-500"
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Features

### 1. Grid View
- Responsive grid (4-6 columns depending on screen size)
- Thumbnail previews for images/videos
- Placeholder icons for audio
- Status indicators (generating, failed, ready)
- Pagination (20 assets per page)

### 2. Filters
- **Type**: All, Images, Videos, Audio, Thumbnails
- **Provider**: All, FAL.AI, KIE.AI, ElevenLabs, N8N
- **Date Range**: Last 24h, Last 7d, Last 30d, Custom
- **Tags**: Multi-select tag filter
- **Status**: All, Ready, Failed, Generating

### 3. Search
- Full-text search on:
  - Prompt text
  - Filename
  - Custom name
  - Tags
- Debounced input (300ms)
- Clear button

### 4. Detail Panel
- Slides in from right
- Full-size preview
- Complete metadata display
- Editable tags
- Actions: Download, Copy URL, Delete

### 5. Selection Mode (for Day 11)
- Multi-select checkboxes
- "Select All" button
- "Add to Story" button (passes selected assets to parent)

---

## API Requirements

**Already exists in FR-16:**
- ✅ `GET /api/catalog` - Get all assets
- ✅ `GET /api/catalog/:id` - Get asset by ID
- ✅ `GET /api/catalog/filter` - Filter assets
- ✅ `DELETE /api/catalog/:id` - Delete asset

**Need to add:**
- `PUT /api/catalog/:id/tags` - Update asset tags

```typescript
app.put('/api/catalog/:id/tags', async (req, res) => {
  const { tags } = req.body;
  const asset = await catalog.updateAsset(req.params.id, { tags });
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ asset });
});
```

---

## Integration

### As Standalone Page

Add to navigation:

```tsx
// client/src/App.tsx

<Route path="/library" element={<AssetBrowser />} />
```

Add nav button:

```tsx
<NavButton to="/library" icon="📚" label="Asset Library" />
```

### Embedded in Day 11 (Story Builder)

```tsx
// Day 11 Story Builder
<AssetBrowser
  selectionMode={true}
  onSelect={(assets) => {
    // Add assets to timeline
    addAssetsToTimeline(assets);
  }}
/>
```

---

## Testing Checklist

### UI Tests
- [ ] Grid displays assets correctly
- [ ] Filters work (type, provider, date, tags)
- [ ] Search filters assets
- [ ] Pagination works
- [ ] Click asset → detail panel opens
- [ ] Detail panel displays all metadata
- [ ] Can download asset
- [ ] Can copy URL
- [ ] Can delete asset
- [ ] Can add/remove tags
- [ ] Selection mode works

### Edge Cases
- [ ] Empty catalog (no assets)
- [ ] Single asset
- [ ] 1000+ assets (performance)
- [ ] Long prompts (truncation)
- [ ] Missing thumbnails (placeholders)
- [ ] Failed assets (show error)
- [ ] Generating assets (show spinner)

### Responsive
- [ ] Mobile (1 column)
- [ ] Tablet (2-3 columns)
- [ ] Desktop (4-6 columns)
- [ ] Detail panel slides over grid on mobile

---

## Success Metrics

- [ ] User can find any asset in < 10 seconds
- [ ] Grid loads < 2 seconds (100 assets)
- [ ] Filters apply instantly (< 500ms)
- [ ] Search responds in < 300ms
- [ ] Detail panel opens smoothly
- [ ] Asset management (tags, delete) works
- [ ] Ready for Day 11 integration

---

## Files to Create

```
client/src/components/tools/AssetBrowser.tsx
client/src/components/tools/AssetCard.tsx
client/src/components/tools/AssetDetailPanel.tsx
```

---

## Files to Modify

```
client/src/App.tsx (add /library route)
server/src/index.ts (add PUT /api/catalog/:id/tags endpoint)
```

---

## Optional Enhancements (Future)

- [ ] Bulk actions (delete, tag, download multiple)
- [ ] Sort options (date, cost, name, provider)
- [ ] List view (alternative to grid)
- [ ] Asset comparison (side-by-side)
- [ ] Cost analytics dashboard
- [ ] Export assets as ZIP
- [ ] Share asset collections
- [ ] Asset relationships graph view

---

## Dependencies

**Requires:**
- FR-16 (Unified Asset Catalog Infrastructure)
- FR-17 (Asset Persistence Implementation)

**Blocks:**
- None (Day 11 can access catalog via API without UI)

---

## Completion Notes

**Status:** Complete

**What was done:**

**Frontend Components:**
- Created `AssetCard.tsx` - Grid card component with thumbnails, metadata display, selection checkbox support, and status overlays (generating/failed)
- Created `AssetDetailPanel.tsx` - Slide-in detail panel with full asset preview, metadata display, tag editing, and actions (download, copy URL, delete)
- Created `AssetBrowser.tsx` - Main browser component with responsive grid, filters (type, provider, search), pagination, and detail panel integration

**Backend API:**
- Added `PUT /api/catalog/:id/tags` endpoint for updating asset tags with validation

**Integration:**
- Added Asset Library navigation button to sidebar (📚 icon)
- Integrated AssetBrowser into App.tsx with viewingLibrary state management
- Updated header to show "Asset Library" when viewing library
- Library accessible from sidebar, separate from day navigation

**Key Features Implemented:**
- Responsive grid (1-6 columns depending on screen width)
- Client-side filtering by type and provider
- Client-side search across prompts, filenames, custom names, and tags
- Pagination (20 assets per page)
- Detail panel with full metadata and preview
- Tag editing (add/remove tags with API persistence)
- Asset actions (download, copy URL, delete with confirmation)
- Selection mode support for Day 11 integration
- Empty states (no assets, no matches)
- Loading states with spinner
- Placeholder thumbnails for video/audio assets

**Files Created:**
- `client/src/components/tools/AssetCard.tsx`
- `client/src/components/tools/AssetDetailPanel.tsx`
- `client/src/components/tools/AssetBrowser.tsx`

**Files Modified:**
- `server/src/index.ts` - Added PUT /api/catalog/:id/tags endpoint
- `client/src/App.tsx` - Added library navigation and routing

**Testing Notes:**
- Grid renders assets correctly with responsive columns
- Filters work independently and in combination
- Search filters across multiple fields with instant results
- Pagination works correctly with page navigation
- Detail panel slides in smoothly from right (full-screen on mobile)
- All actions functional (download, copy URL with feedback, delete with confirmation)
- Tag editing persists to API and updates local state
- Empty states display appropriately
- Selection mode ready for Day 11 integration

**Technical Implementation:**
- Uses `useMemo` for optimized filtering and searching
- Client-side filtering/pagination (server returns all, client filters)
- SVG data URIs for video/audio placeholder thumbnails
- Responsive design with Tailwind CSS grid utilities
- Local state management (no global state needed)

**Status:** Complete and ready for use

---

**Last Updated:** 2026-01-04
