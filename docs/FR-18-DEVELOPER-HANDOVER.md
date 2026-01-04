# FR-18: Asset Browser UI - Developer Handover

## Quick Summary

Build a unified visual asset browser that allows users to browse, search, filter, and manage all generated assets (images, videos, audio, thumbnails) in one centralized interface. Think of it as a "file manager" for AI-generated content.

---

## What You're Building

A dedicated "Asset Library" page with:
- **Grid view** of all assets with thumbnails
- **Filters** for type, provider, date range, tags, and status
- **Search** across prompts, filenames, and tags
- **Detail panel** that slides in when clicking an asset
- **Asset management** actions (download, delete, add/remove tags)
- **Selection mode** for Day 11 Story Builder integration

This is the **centralized management UI** for the asset catalog infrastructure built in FR-16 and populated by FR-17.

---

## Priority & Dependencies

- **Priority:** Important 🟡 (Can wait until after Day 11, but nice to have)
- **Depends On:**
  - FR-16 (Unified Asset Catalog Infrastructure) - MUST be complete
  - FR-17 (Asset Persistence Implementation) - MUST be complete
- **Blocks:** None (Day 11 can access catalog via API directly without this UI)

---

## Key Implementation Tasks

### Task 1: Create AssetCard Component

**Files to create:**
- `client/src/components/tools/AssetCard.tsx`

**What to implement:**
```tsx
interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onClick: () => void;
  onSelect?: (selected: boolean) => void;
}
```

**Features:**
- Aspect-square thumbnail display
- Type icon (🖼️ for images, 🎬 for videos, 🎵 for audio)
- Filename/custom name display (truncated)
- Provider and creation date
- Status overlays (generating spinner, failed badge)
- Selection checkbox (conditional, for selection mode)
- Hover effect (border color change to amber)

**Thumbnail logic:**
- Images/thumbnails: Use `asset.url` directly
- Videos: Use placeholder or generate video thumbnail
- Audio: Use placeholder icon/waveform

**Testing:**
- Renders images correctly
- Shows placeholders for video/audio
- Checkbox appears only in selection mode
- Status overlays work (generating, failed)
- Click handler fires
- Hover effects work

---

### Task 2: Create AssetDetailPanel Component

**Files to create:**
- `client/src/components/tools/AssetDetailPanel.tsx`

**What to implement:**
```tsx
interface AssetDetailPanelProps {
  asset: Asset;
  onClose: () => void;
  onDelete?: () => void;
  onTagsUpdate?: (tags: string[]) => void;
}
```

**Layout:**
- Fixed position panel sliding in from right (width: 24rem / 384px)
- Sticky header with type, filename, close button
- Preview section (image/video/audio player)
- Metadata sections:
  - Prompt (full text, not truncated)
  - Provider + Model (2 columns)
  - Created date + Cost (2 columns)
  - Generation time
  - Tags (editable with add/remove)
  - Additional metadata (from `asset.metadata` object)
- Sticky footer with action buttons

**Actions:**
- **Download**: Create `<a>` element with `asset.url` and `download` attribute
- **Copy URL**: Use `navigator.clipboard.writeText()` with full URL
- **Delete**: Show confirmation dialog, call `onDelete()`, close panel

**Tag editing:**
- Display existing tags as chips with X button
- Input field to add new tags (Enter key to add)
- Update via API: `PUT /api/catalog/:id/tags`

**Testing:**
- Panel slides in smoothly
- Preview works for all asset types (image, video, audio)
- All metadata displays correctly
- Tags can be added/removed
- Download works
- Copy URL works
- Delete requires confirmation

---

### Task 3: Create AssetBrowser Component

**Files to create:**
- `client/src/components/tools/AssetBrowser.tsx`

**What to implement:**
```tsx
interface AssetBrowserProps {
  filterType?: 'image' | 'video' | 'audio' | 'thumbnail';
  selectionMode?: boolean;
  onSelect?: (assets: Asset[]) => void;
}
```

**State management:**
```tsx
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
```

**API integration:**
```typescript
const loadAssets = async () => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.provider) params.append('provider', filters.provider);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.tags.length) params.append('tags', filters.tags.join(','));

  const response = await fetch(`${SERVER_URL}/api/catalog/filter?${params}`);
  const data = await response.json();

  // Client-side search (not supported by API)
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
```

**Layout structure:**
```
Header (title + filters)
  ↓
Grid (responsive columns)
  ↓
Pagination (prev/next + page number)
  ↓
Detail Panel (conditional, slides over)
```

**Filter UI:**
- Search input (debounced 300ms)
- Type dropdown (All, Images, Videos, Audio, Thumbnails)
- Provider dropdown (All, FAL.AI, KIE.AI, ElevenLabs, N8N)
- Date range (Last 24h, Last 7d, Last 30d, Custom)
- Tag multi-select

**Grid responsive breakpoints:**
- Mobile: 1 column
- Tablet: 2-3 columns
- Desktop: 4-6 columns

**Selection mode:**
- If `selectionMode={true}`, show checkboxes on cards
- "Select All" button in header
- "Add Selected to Story" button (calls `onSelect()` with array)

**Testing:**
- Assets load on mount
- Filters update results
- Search filters locally
- Pagination works
- Grid responsive at all breakpoints
- Detail panel opens/closes
- Selection mode works (if enabled)

---

### Task 4: Add Tag Update API Endpoint

**Files to modify:**
- `server/src/index.ts`

**What to implement:**
```typescript
app.put('/api/catalog/:id/tags', async (req, res) => {
  const { tags } = req.body;

  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'tags must be an array' });
  }

  const asset = await catalog.updateAsset(req.params.id, { tags });

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  res.json({ asset });
});
```

**Testing:**
- PUT request updates tags
- Returns updated asset
- Returns 404 if asset not found
- Returns 400 if tags not array
- Tags persist to catalog index

---

### Task 5: Integrate into App Navigation

**Files to modify:**
- `client/src/App.tsx`

**What to implement:**

Add route:
```tsx
<Route path="/library" element={<AssetBrowser />} />
```

Add navigation button to sidebar/header:
```tsx
<NavButton to="/library" icon="📚" label="Asset Library" />
```

**Testing:**
- Route accessible at `/library`
- Navigation button visible
- Clicking button navigates to library
- Browser back/forward works

---

## Technical Approach

### Component Architecture

```
AssetBrowser (parent)
├── FilterBar (search, type, provider, date, tags)
├── Grid Container
│   └── AssetCard[] (map over assets)
└── AssetDetailPanel (conditional render)
```

**Data flow:**
1. AssetBrowser fetches assets from catalog API
2. AssetBrowser applies filters and search
3. AssetCard receives asset prop, renders thumbnail
4. Click on AssetCard → setSelectedAsset → AssetDetailPanel opens
5. AssetDetailPanel actions (delete, tag update) → reload assets

### State Management Approach

**Local state only** - No global state/context needed:
- `useState` for assets, filters, selection, pagination
- `useEffect` for loading assets when filters change
- Parent-child prop drilling for callbacks

**No external libraries** needed - vanilla React state management sufficient.

### API Integration

**Existing endpoints (from FR-16):**
- `GET /api/catalog/filter?type=X&provider=Y&startDate=Z&endDate=W&tags=A,B`
- `DELETE /api/catalog/:id`

**New endpoint (Task 4):**
- `PUT /api/catalog/:id/tags` - Update tags

**Client-side search:**
- API doesn't support full-text search on prompt/filename
- Filter locally after fetching results

### UI/UX Patterns

**Grid layout:**
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
gap: 1rem;
```

**Detail panel slide-in:**
```css
position: fixed;
right: 0;
top: 0;
height: 100vh;
width: 24rem;
transform: translateX(0);
transition: transform 0.3s ease;
```

**Debounced search:**
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, 300),
  []
);
```

**Pagination:**
```typescript
const startIndex = (page - 1) * pageSize;
const endIndex = startIndex + pageSize;
const displayedAssets = assets.slice(startIndex, endIndex);
const totalPages = Math.ceil(assets.length / pageSize);
```

---

## Files to Create/Modify

### Files to Create

```
client/src/components/tools/AssetBrowser.tsx       (300-400 lines)
client/src/components/tools/AssetCard.tsx          (100-150 lines)
client/src/components/tools/AssetDetailPanel.tsx   (250-300 lines)
```

### Files to Modify

```
client/src/App.tsx                  (add route + nav button, ~10 lines)
server/src/index.ts                 (add PUT endpoint, ~15 lines)
```

### Optional Helper Files

```
client/src/hooks/useDebounce.ts     (if not already exists)
client/src/utils/formatters.ts      (date formatting helpers)
```

---

## Testing Checklist

### UI Rendering
- [ ] Grid displays assets correctly (images, videos, audio, thumbnails)
- [ ] Grid responsive (1 col mobile, 2-3 tablet, 4-6 desktop)
- [ ] Empty state shows when no assets ("No assets found")
- [ ] Loading state shows while fetching
- [ ] Asset cards show correct icons per type
- [ ] Asset cards show filename/custom name
- [ ] Asset cards show provider and date

### Filters
- [ ] Type filter works (All, Images, Videos, Audio, Thumbnails)
- [ ] Provider filter works (All, FAL.AI, KIE.AI, ElevenLabs, N8N)
- [ ] Date range filter works (Last 24h, Last 7d, Last 30d, Custom)
- [ ] Tag filter works (multi-select)
- [ ] Search filters by prompt, filename, custom name
- [ ] Search debounced (300ms delay)
- [ ] Clear search button works
- [ ] Multiple filters combine correctly (AND logic)

### Pagination
- [ ] Shows 20 assets per page by default
- [ ] Page navigation works (Prev/Next buttons)
- [ ] Current page indicator correct
- [ ] Total pages calculated correctly
- [ ] Can't go before page 1 or after last page
- [ ] Pagination resets when filters change

### Detail Panel
- [ ] Clicking asset opens detail panel
- [ ] Panel slides in smoothly from right
- [ ] Close button closes panel
- [ ] Clicking outside panel closes it (optional)
- [ ] Preview shows correctly (image/video/audio)
- [ ] All metadata displays (prompt, provider, model, date, cost, time)
- [ ] Additional metadata from `asset.metadata` displays
- [ ] Panel scrolls if content too tall

### Actions
- [ ] Download button downloads file
- [ ] Downloaded filename matches asset filename
- [ ] Copy URL button copies full URL to clipboard
- [ ] Copy URL shows success feedback (toast/message)
- [ ] Delete button shows confirmation dialog
- [ ] Delete button removes asset and closes panel
- [ ] Delete updates grid (asset disappears)

### Tags
- [ ] Existing tags display as chips
- [ ] Can remove tags (X button)
- [ ] Can add new tags (input field)
- [ ] Enter key adds tag
- [ ] Duplicate tags prevented
- [ ] Tag updates persist (API call + local state update)
- [ ] Empty tags input doesn't create empty tag

### Selection Mode
- [ ] Checkboxes appear when `selectionMode={true}`
- [ ] Clicking checkbox toggles selection
- [ ] Clicking card (not checkbox) still opens detail panel
- [ ] "Select All" button selects all visible assets
- [ ] "Deselect All" clears selection
- [ ] Selected count displayed
- [ ] "Add Selected to Story" button calls `onSelect()` with array
- [ ] Selection preserved when pagination changes (optional)

### Edge Cases
- [ ] Empty catalog (no assets) - shows empty state
- [ ] Single asset - grid renders correctly
- [ ] 1000+ assets - performance acceptable (< 2s load)
- [ ] Very long prompts - truncated with ellipsis in card, full in panel
- [ ] Missing thumbnails - placeholders shown
- [ ] Failed assets - error badge shown
- [ ] Generating assets - spinner overlay shown
- [ ] Network errors - error message displayed
- [ ] Invalid asset IDs - 404 handled gracefully

### Responsive
- [ ] Mobile (320px width) - 1 column grid
- [ ] Mobile - detail panel full-screen overlay
- [ ] Tablet (768px) - 2-3 column grid
- [ ] Tablet - detail panel slides over
- [ ] Desktop (1024px+) - 4-6 column grid
- [ ] Desktop - detail panel 384px width
- [ ] Touch interactions work on mobile/tablet

---

## Success Criteria

**Performance:**
- [ ] Grid loads in < 2 seconds (100 assets)
- [ ] Filters apply in < 500ms
- [ ] Search responds in < 300ms (debounced)
- [ ] Detail panel opens smoothly (no jank)
- [ ] Pagination instant (< 100ms)

**Usability:**
- [ ] User can find any asset in < 10 seconds
- [ ] All actions work (download, delete, tag, copy URL)
- [ ] Mobile experience acceptable
- [ ] No layout shifts or broken UI
- [ ] Clear visual feedback for all interactions

**Integration:**
- [ ] Ready for Day 11 Story Builder (selection mode works)
- [ ] Can be used standalone as `/library` page
- [ ] Can be embedded in other components with filters

**Code Quality:**
- [ ] TypeScript types complete and accurate
- [ ] No console errors or warnings
- [ ] Components reusable and well-structured
- [ ] API error handling robust

---

## Notes & Gotchas

### Video Thumbnails

**Problem:** Videos don't have automatic thumbnails.

**Solutions:**
1. **Quick:** Use placeholder image (e.g., `/placeholder-video-thumb.jpg`)
2. **Better:** Generate thumbnail on server when video saved (extract first frame)
3. **Best:** Use video's `poster` attribute with base64 thumbnail in metadata

**Recommended for FR-18:** Use placeholder for now, enhance later.

---

### Audio Visualization

**Problem:** Audio files have no visual representation.

**Solutions:**
1. **Quick:** Use static icon placeholder
2. **Better:** Show waveform image (generate on server)
3. **Best:** Interactive waveform player (library like WaveSurfer.js)

**Recommended for FR-18:** Static icon placeholder.

---

### Search Performance

**Problem:** Client-side search on 1000+ assets may be slow.

**Solution:**
- Use `useMemo` to cache filtered results
- Only re-filter when assets or search term changes
- Consider adding server-side search in future (FR-16 enhancement)

```typescript
const filteredAssets = useMemo(() => {
  if (!filters.search) return assets;

  const search = filters.search.toLowerCase();
  return assets.filter(a =>
    a.prompt.toLowerCase().includes(search) ||
    a.filename.toLowerCase().includes(search) ||
    a.metadata.customName?.toLowerCase().includes(search)
  );
}, [assets, filters.search]);
```

---

### Tag Persistence

**Tags update flow:**
1. User adds/removes tag in AssetDetailPanel
2. Component calls `onTagsUpdate(newTags)`
3. Parent (AssetBrowser) calls API: `PUT /api/catalog/:id/tags`
4. API updates catalog index and returns updated asset
5. Parent updates local state with new asset
6. Detail panel re-renders with new tags

**Don't forget:** Update both the `assets` array AND `selectedAsset` when tags change.

```typescript
const handleTagsUpdate = async (assetId: string, newTags: string[]) => {
  const response = await fetch(`${SERVER_URL}/api/catalog/${assetId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: newTags }),
  });

  const { asset } = await response.json();

  // Update both arrays
  setAssets(prev => prev.map(a => a.id === assetId ? asset : a));
  setSelectedAsset(asset);
};
```

---

### Detail Panel Overlay vs Slide-in

**Desktop:** Detail panel slides in from right, grid remains visible (side-by-side).

**Mobile:** Detail panel should be full-screen overlay (grid hidden).

**Implementation:**
```css
/* Desktop */
@media (min-width: 768px) {
  .detail-panel {
    width: 24rem;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .detail-panel {
    width: 100vw;
  }
}
```

---

### Filter State Persistence

**Optional enhancement:** Save filter state to localStorage or URL query params.

**Benefits:**
- User returns to same filtered view after page refresh
- Shareable URLs with filters (e.g., `/library?type=image&provider=fal`)

**Not required for FR-18,** but nice to have.

---

### Selection Mode Integration with Day 11

**Day 11 Story Builder usage:**
```tsx
function StoryBuilder() {
  const [timelineAssets, setTimelineAssets] = useState<Asset[]>([]);

  return (
    <div>
      <h2>Story Timeline</h2>
      {/* Timeline UI */}

      <AssetBrowser
        selectionMode={true}
        onSelect={(assets) => {
          setTimelineAssets(prev => [...prev, ...assets]);
        }}
      />
    </div>
  );
}
```

Ensure `onSelect` callback receives **array of selected assets** with full `Asset` objects.

---

### Empty States

**No assets at all:**
```tsx
if (assets.length === 0 && !filters.search && !filters.type) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-400 text-lg">No assets yet!</p>
      <p className="text-slate-500 text-sm mt-2">
        Generate some images, videos, or audio to get started.
      </p>
    </div>
  );
}
```

**No matches for filters:**
```tsx
if (assets.length === 0 && (filters.search || filters.type || filters.provider)) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-400 text-lg">No assets match your filters</p>
      <button onClick={clearFilters} className="mt-4 text-amber-500">
        Clear filters
      </button>
    </div>
  );
}
```

---

### Delete Confirmation

**Don't just use `window.confirm()`** - it's ugly and not customizable.

**Better approach:** Create a reusable `ConfirmDialog` component.

**Quick approach for FR-18:** Use `window.confirm()` but style the button to make intent clear:

```tsx
<button
  onClick={() => {
    if (window.confirm('Delete this asset permanently? This cannot be undone.')) {
      handleDelete(asset.id);
    }
  }}
  className="bg-red-600 hover:bg-red-500 text-white font-bold"
>
  🗑 Delete
</button>
```

---

### Asset Preview Loading States

**Images may take time to load.** Show loading state:

```tsx
const [imageLoading, setImageLoading] = useState(true);

<div className="relative">
  {imageLoading && (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
      <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
    </div>
  )}
  <img
    src={asset.url}
    alt={asset.filename}
    onLoad={() => setImageLoading(false)}
    className={imageLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}
  />
</div>
```

---

### TailwindCSS Grid Auto-Fill

**Use `grid-auto-fill` for responsive grid without media queries:**

```css
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
```

This automatically adjusts column count based on container width.

**Min card width:** 200px
**Max columns:** As many as fit

---

## Quick Start Guide

1. **Start with AssetCard** - simplest component, no dependencies
2. **Build AssetDetailPanel** - uses AssetCard's data structure
3. **Create AssetBrowser** - orchestrates Card + Panel
4. **Add tag API endpoint** - backend support for tag editing
5. **Integrate into App.tsx** - make it accessible
6. **Test thoroughly** - use checklist above
7. **Polish UI/UX** - loading states, animations, responsive

**Estimated time:** 6-8 hours for full implementation + testing.

---

## Questions? Check These First

**Q: Do I need to implement server-side search?**
A: No, client-side search is fine for FR-18. Server-side is a future enhancement.

**Q: Should I paginate on client or server?**
A: Client-side pagination is acceptable. API returns all filtered assets, client slices by page.

**Q: What if video thumbnails don't exist?**
A: Use placeholder image. Video thumbnail generation is out of scope.

**Q: Should I use a UI library for filters?**
A: No, build with native `<select>` and `<input>` elements. Keep it simple.

**Q: How do I test with 1000+ assets?**
A: Create a seed script that generates fake assets in the catalog. Or test manually by generating many assets.

**Q: Selection mode - single or multi-select?**
A: Multi-select with checkboxes (like Google Photos, Dropbox).

**Q: Should deleted assets go to trash or delete permanently?**
A: Permanent delete for FR-18. Trash/undo is a future enhancement.

---

**Last Updated:** 2026-01-04
