import { useShots } from '../../hooks/useShots';
import type { Shot } from '@fligen/shared';

const SERVER_URL = 'http://localhost:5401';

interface ShotListStripProps {
  onShotClick?: (shot: Shot) => void;
  draggable?: boolean;
}

export function ShotListStrip({ onShotClick, draggable = false }: ShotListStripProps) {
  const { shots, isLoading, removeShot, clearShots } = useShots();

  console.log('[ShotListStrip] Render - isLoading:', isLoading, 'shots:', shots.length);

  const handleDragStart = (e: React.DragEvent, shot: Shot) => {
    if (!draggable) return;
    console.log('[ShotListStrip] Drag start:', shot.id, shot.filename);
    e.dataTransfer.setData('application/json', JSON.stringify(shot));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    console.log('[ShotListStrip] Removing shot:', id);
    await removeShot(id);
  };

  const handleClearAll = async () => {
    if (shots.length === 0) return;
    if (!confirm('Clear all shots?')) return;
    console.log('[ShotListStrip] Clearing all shots');
    await clearShots();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="text-slate-500 text-sm">Loading shots...</div>
      </div>
    );
  }

  // Empty state
  if (shots.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Shot List</span>
        </div>
        <div className="text-slate-500 text-sm">
          Click images below to add them to your shot list
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">
          Shot List ({shots.length})
        </span>
        <button
          onClick={handleClearAll}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {shots.map((shot, index) => (
          <div
            key={shot.id}
            draggable={draggable}
            onDragStart={(e) => handleDragStart(e, shot)}
            onClick={() => onShotClick?.(shot)}
            className={`relative flex-shrink-0 w-16 h-16 group ${
              draggable ? 'cursor-grab active:cursor-grabbing' : ''
            } ${onShotClick ? 'cursor-pointer' : ''}`}
          >
            <img
              src={`${SERVER_URL}${shot.url}`}
              alt={`Shot ${index + 1}`}
              className="w-full h-full object-cover rounded border border-slate-600 group-hover:border-blue-500 transition-colors"
            />
            {/* Shot number badge */}
            <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-1 rounded-tr">
              {index + 1}
            </div>
            {/* Remove button */}
            <button
              onClick={(e) => handleRemove(e, shot.id)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
