interface Preset {
  label: string;
  ratioW: number;
  ratioH: number;
}

interface Resolution {
  label: string;
  width: number;
  height: number;
}

const RATIO_PRESETS: Preset[] = [
  { label: '16:9', ratioW: 16, ratioH: 9 },
  { label: '9:16', ratioW: 9, ratioH: 16 },
  { label: '4:3', ratioW: 4, ratioH: 3 },
  { label: '1:1', ratioW: 1, ratioH: 1 },
  { label: '4:5', ratioW: 4, ratioH: 5 },
  { label: '21:9', ratioW: 21, ratioH: 9 },
  { label: '3:2', ratioW: 3, ratioH: 2 },
];

const RESOLUTION_PRESETS: Resolution[] = [
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: 'Story (1080×1920)', width: 1080, height: 1920 },
  { label: 'Square (1080×1080)', width: 1080, height: 1080 },
];

interface Props {
  activePreset: string | null;
  onPreset: (ratioW: number, ratioH: number, label: string) => void;
  onResolution: (width: number, height: number) => void;
}

export default function PresetButtons({ activePreset, onPreset, onResolution }: Props) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Ratio Presets</p>
        <div className="flex flex-wrap gap-2">
          {RATIO_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onPreset(p.ratioW, p.ratioH, p.label)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activePreset === p.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Resolution Presets</p>
        <div className="flex flex-wrap gap-2">
          {RESOLUTION_PRESETS.map(r => (
            <button
              key={r.label}
              onClick={() => onResolution(r.width, r.height)}
              className="px-3 py-1.5 rounded text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
