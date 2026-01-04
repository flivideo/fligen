import { useState, useEffect, useMemo } from 'react';
import type { Asset } from '@fligen/shared';
import { AssetCard } from './AssetCard';
import { AssetDetailPanel } from './AssetDetailPanel';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5401';

interface AssetBrowserProps {
  filterType?: 'image' | 'video' | 'music' | 'narration' | 'thumbnail';
  selectionMode?: boolean;
  onSelect?: (assets: Asset[]) => void;
}

export function AssetBrowser({
  filterType,
  selectionMode,
  onSelect,
}: AssetBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filters, setFilters] = useState({
    type: filterType || ('all' as 'all' | Asset['type']),
    provider: 'all' as 'all' | string,
    search: '',
  });
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  // Load assets on mount and filter changes
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/catalog`);
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search assets client-side
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((a) => a.type === filters.type);
    }

    // Provider filter
    if (filters.provider !== 'all') {
      filtered = filtered.filter((a) => a.provider === filters.provider);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.prompt.toLowerCase().includes(search) ||
          a.filename.toLowerCase().includes(search) ||
          a.metadata?.customName?.toLowerCase().includes(search) ||
          a.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [assets, filters]);

  // Pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedAssets = filteredAssets.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredAssets.length / pageSize);

  // Get unique providers from assets
  const providers = useMemo(() => {
    const uniqueProviders = new Set(assets.map((a) => a.provider));
    return Array.from(uniqueProviders).sort();
  }, [assets]);

  // Handle asset card click
  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  // Handle selection toggle
  const handleSelect = (assetId: string, selected: boolean) => {
    if (selected) {
      setSelectedAssets((prev) => [...prev, assetId]);
    } else {
      setSelectedAssets((prev) => prev.filter((id) => id !== assetId));
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAssets.length === displayedAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(displayedAssets.map((a) => a.id));
    }
  };

  // Handle add selected to story
  const handleAddSelected = () => {
    const selected = assets.filter((a) => selectedAssets.includes(a.id));
    onSelect?.(selected);
  };

  // Handle tag update
  const handleTagsUpdate = async (assetId: string, newTags: string[]) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/catalog/${assetId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });

      const { asset } = await response.json();

      // Update both arrays
      setAssets((prev) => prev.map((a) => (a.id === assetId ? asset : a)));
      setSelectedAsset(asset);
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };

  // Handle delete
  const handleDelete = async (assetId: string) => {
    try {
      await fetch(`${SERVER_URL}/api/catalog/${assetId}`, {
        method: 'DELETE',
      });

      // Remove from local state
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setSelectedAsset(null);
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="relative h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold uppercase text-slate-200">
          Asset Library
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-500">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
          {filters.search || filters.type !== 'all' || filters.provider !== 'all'
            ? ` matching filters`
            : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search prompts, filenames, tags..."
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
        />

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              type: e.target.value as typeof filters.type,
            }))
          }
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-300 focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="music">Music</option>
          <option value="narration">Narration</option>
          <option value="thumbnail">Thumbnails</option>
        </select>

        {/* Provider Filter */}
        <select
          value={filters.provider}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, provider: e.target.value }))
          }
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-300 focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Providers</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>

        {/* Selection Mode Actions */}
        {selectionMode && (
          <>
            <button
              onClick={handleSelectAll}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm font-medium text-slate-300 hover:bg-slate-700"
            >
              {selectedAssets.length === displayedAssets.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
            {selectedAssets.length > 0 && (
              <button
                onClick={handleAddSelected}
                className="rounded border border-amber-600 bg-amber-600 px-3 py-2 font-mono text-sm font-bold text-slate-950 hover:bg-amber-500"
              >
                Add {selectedAssets.length} to Story
              </button>
            )}
          </>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!loading && assets.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg text-slate-400">No assets yet!</p>
          <p className="mt-2 text-sm text-slate-500">
            Generate some images, videos, or audio to get started.
          </p>
        </div>
      )}

      {/* No Matches */}
      {!loading &&
        assets.length > 0 &&
        filteredAssets.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg text-slate-400">No assets match your filters</p>
            <button
              onClick={() =>
                setFilters({ type: 'all', provider: 'all', search: '' })
              }
              className="mt-4 text-amber-500 hover:text-amber-400"
            >
              Clear filters
            </button>
          </div>
        )}

      {/* Grid */}
      {!loading && displayedAssets.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {displayedAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedAssets.includes(asset.id)}
                onClick={() => handleAssetClick(asset)}
                onSelect={
                  selectionMode
                    ? (selected) => handleSelect(asset.id, selected)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="font-mono text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDelete={() => handleDelete(selectedAsset.id)}
          onTagsUpdate={(tags) => handleTagsUpdate(selectedAsset.id, tags)}
        />
      )}
    </div>
  );
}
