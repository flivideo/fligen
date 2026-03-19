import type { HistoryEntry } from './useCalculator';

interface Props {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export default function CalculationHistory({ history, onRestore, onClear }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wide mb-2">History</h3>
        <p className="text-slate-500 text-sm">No calculations yet. Use the calculator above.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">History</h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {history.map(entry => (
          <button
            key={entry.id}
            onClick={() => onRestore(entry)}
            className="w-full text-left flex items-center justify-between px-3 py-2 rounded hover:bg-slate-700 transition-colors group"
          >
            <span className="text-slate-300 font-mono text-sm">{entry.width}×{entry.height}</span>
            <span className="text-yellow-400 font-mono text-sm">{entry.ratio}</span>
            <span className="text-slate-500 text-xs group-hover:text-slate-400">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
