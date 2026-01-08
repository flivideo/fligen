import { WidgetConfig } from '@fligen/shared';

interface WidgetHistoryProps {
  widgets: WidgetConfig[];
  onReuse: (config: WidgetConfig) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/**
 * History sidebar showing saved widgets
 */
export function WidgetHistory({ widgets, onReuse, onDelete, onClose }: WidgetHistoryProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-slate-700 bg-slate-800 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-white">Widget History</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Widget List */}
      <div className="flex-1 overflow-y-auto p-4">
        {widgets.length === 0 ? (
          <div className="text-center text-sm text-slate-500">No widgets saved yet</div>
        ) : (
          <div className="space-y-3">
            {widgets
              .slice()
              .reverse()
              .map((widget) => (
                <div
                  key={widget.id}
                  className="rounded border border-slate-700 bg-slate-900 p-3 transition-colors hover:border-slate-600"
                >
                  {/* Preview Text */}
                  <div className="mb-2 text-sm font-medium text-white">{widget.preview}</div>

                  {/* Template Name */}
                  <div className="mb-2 text-xs capitalize text-slate-400">
                    {widget.template.replace(/-/g, ' ')}
                  </div>

                  {/* Date */}
                  <div className="mb-3 text-xs text-slate-500">{formatDate(widget.created)}</div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onReuse(widget)}
                      className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Reuse Configuration
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete widget "${widget.preview}"?`)) {
                          onDelete(widget.id);
                        }
                      }}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
