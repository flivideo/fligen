interface Props {
  width: number;
  height: number;
  computedRatio: { ratio: string; decimal: number };
}

export default function VisualPreview({ width, height, computedRatio }: Props) {
  const aspectRatio = `${width} / ${height}`;
  const isPortrait = height > width;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
      <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">Visual Preview</h3>
      <div className="flex items-center justify-center gap-8 min-h-32">
        <div className="flex flex-col items-center gap-2">
          <div
            className="border-2 border-yellow-400 bg-yellow-400/10"
            style={{
              aspectRatio,
              width: isPortrait ? '60px' : '120px',
              maxHeight: '96px',
            }}
          />
          <span className="text-xs text-slate-400">{width}×{height}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            className="border-2 border-blue-400 bg-blue-400/10"
            style={{
              aspectRatio: '16 / 9',
              width: '120px',
              maxHeight: '96px',
            }}
          />
          <span className="text-xs text-slate-400">16:9 reference</span>
        </div>
      </div>
      <p className="text-center text-sm text-slate-300">
        Ratio: <span className="text-yellow-400 font-semibold">{computedRatio.ratio}</span>
        {' '}· Decimal: <span className="text-yellow-400 font-semibold">{computedRatio.decimal}</span>
      </p>
    </div>
  );
}
