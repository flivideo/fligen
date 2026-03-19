import type { Asset } from '@fligen/shared';

// ============================================
// ThumbnailHistory Component (FR-19)
// ============================================

export interface ThumbnailHistoryProps {
  assets: Asset[];
  onSelect?: (asset: Asset) => void;
}

export function ThumbnailHistory({ assets, onSelect }: ThumbnailHistoryProps) {
  if (assets.length === 0) {
    return (
      <div className="text-slate-400 text-sm text-center py-4">
        No saved thumbnails yet. Use "Save to Catalog" to save your work.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="relative group cursor-pointer rounded border border-slate-700 hover:border-blue-400 overflow-hidden"
          onClick={() => onSelect?.(asset)}
          title={asset.prompt}
        >
          <img src={asset.url} alt={asset.prompt} className="w-full h-auto" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-slate-300 px-1 py-0.5 opacity-0 group-hover:opacity-100 truncate">
            {new Date(asset.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
