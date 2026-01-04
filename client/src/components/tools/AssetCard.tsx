import type { Asset } from '@fligen/shared';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onClick: () => void;
  onSelect?: (selected: boolean) => void;
}

export function AssetCard({ asset, selected, onClick, onSelect }: AssetCardProps) {
  const getIcon = () => {
    switch (asset.type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'music':
      case 'narration':
        return '🎵';
      case 'thumbnail':
        return '🖼️';
    }
  };

  const getThumbnail = () => {
    if (asset.type === 'image' || asset.type === 'thumbnail') {
      return asset.url;
    } else if (asset.type === 'video') {
      // Use placeholder for videos
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%230f172a" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-family="monospace" font-size="48" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🎬%3C/text%3E%3C/svg%3E';
    } else {
      // Audio placeholder
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%230f172a" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-family="monospace" font-size="48" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🎵%3C/text%3E%3C/svg%3E';
    }
  };

  const getDisplayName = () => {
    return asset.metadata?.customName || asset.filename;
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
          {getDisplayName()}
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
