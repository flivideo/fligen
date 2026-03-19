import { calcHeight, calcWidth } from './useCalculator';

interface Props {
  width: number;
  height: number;
  ratioW: number;
  ratioH: number;
  computedRatio: { ratio: string; decimal: number };
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onRatioWChange: (v: number) => void;
  onRatioHChange: (v: number) => void;
  onCalculate: () => void;
  onSwap: () => void;
}

export default function Calculator({
  width, height, ratioW, ratioH, computedRatio,
  onWidthChange, onHeightChange, onRatioWChange, onRatioHChange,
  onCalculate, onSwap,
}: Props) {
  const inputClass = "bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-blue-500";

  const handleWidthBlur = () => {
    if (ratioW && ratioH) onHeightChange(calcHeight(width, ratioW, ratioH));
  };
  const handleHeightBlur = () => {
    if (ratioW && ratioH) onWidthChange(calcWidth(height, ratioW, ratioH));
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">Calculator</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Width (px)</label>
          <input
            type="number"
            value={width}
            onChange={e => onWidthChange(Number(e.target.value))}
            onBlur={handleWidthBlur}
            className={inputClass}
            min={1}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Height (px)</label>
          <input
            type="number"
            value={height}
            onChange={e => onHeightChange(Number(e.target.value))}
            onBlur={handleHeightBlur}
            className={inputClass}
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Aspect Ratio</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={ratioW}
            onChange={e => onRatioWChange(Number(e.target.value))}
            className={`${inputClass} w-20`}
            min={1}
          />
          <span className="text-slate-400 text-lg font-bold">:</span>
          <input
            type="number"
            value={ratioH}
            onChange={e => onRatioHChange(Number(e.target.value))}
            className={`${inputClass} w-20`}
            min={1}
          />
          <span className="text-slate-300 text-sm ml-2">= {computedRatio.ratio} ({computedRatio.decimal})</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCalculate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          Save to History
        </button>
        <button
          onClick={onSwap}
          className="bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          ↕ Swap
        </button>
      </div>
    </div>
  );
}
