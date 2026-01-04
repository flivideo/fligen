import { useState } from 'react';
import type { Asset } from '@fligen/shared';

interface AssetDetailPanelProps {
  asset: Asset;
  onClose: () => void;
  onDelete?: () => void;
  onTagsUpdate?: (tags: string[]) => void;
}

export function AssetDetailPanel({
  asset,
  onClose,
  onDelete,
  onTagsUpdate,
}: AssetDetailPanelProps) {
  const [tags, setTags] = useState(asset.tags || []);
  const [newTag, setNewTag] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = asset.filename;
    a.click();
  };

  const handleCopyUrl = () => {
    const fullUrl = asset.url.startsWith('http')
      ? asset.url
      : `${window.location.origin}${asset.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const updatedTags = [...tags, trimmedTag];
      setTags(updatedTags);
      setNewTag('');
      onTagsUpdate?.(updatedTags);
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updatedTags = tags.filter((t) => t !== tag);
    setTags(updatedTags);
    onTagsUpdate?.(updatedTags);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        'Delete this asset permanently? This cannot be undone.'
      )
    ) {
      onDelete?.();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto border-l border-slate-800 bg-slate-900 shadow-2xl md:w-96">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 p-4">
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
          <div className="overflow-hidden rounded bg-slate-950">
            {asset.type === 'image' || asset.type === 'thumbnail' ? (
              <img
                src={asset.url}
                alt={asset.filename}
                className="w-full object-contain"
              />
            ) : asset.type === 'video' ? (
              <video src={asset.url} controls className="w-full" />
            ) : (
              <div className="p-4">
                <audio src={asset.url} controls className="w-full" />
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4 p-4">
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">
              Prompt
            </label>
            <p className="mt-1 font-sans text-sm text-slate-300">
              {asset.prompt}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase text-slate-500">
                Provider
              </label>
              <p className="mt-1 font-mono text-sm text-slate-300">
                {asset.provider}
              </p>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-slate-500">
                Model
              </label>
              <p className="mt-1 font-mono text-sm text-slate-300">
                {asset.model}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase text-slate-500">
                Created
              </label>
              <p className="mt-1 font-mono text-sm text-slate-300">
                {new Date(asset.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase text-slate-500">
                Cost
              </label>
              <p className="mt-1 font-mono text-sm text-slate-300">
                ${asset.estimatedCost.toFixed(3)}
              </p>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">
              Generation Time
            </label>
            <p className="mt-1 font-mono text-sm text-slate-300">
              {(asset.generationTimeMs / 1000).toFixed(1)}s
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-mono text-xs uppercase text-slate-500">
              Tags
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
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

          {/* Additional Metadata */}
          {Object.keys(asset.metadata).length > 0 && (
            <div>
              <label className="block font-mono text-xs uppercase text-slate-500">
                Details
              </label>
              <div className="mt-2 space-y-1">
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      {key}:
                    </span>
                    <span className="flex-1 truncate text-right font-mono text-xs text-slate-300">
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
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
              {copyFeedback ? '✓ Copied!' : '📋 Copy URL'}
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-full rounded border border-red-600 bg-red-600 px-4 py-2 font-mono text-sm font-bold uppercase text-white hover:bg-red-500"
              >
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
