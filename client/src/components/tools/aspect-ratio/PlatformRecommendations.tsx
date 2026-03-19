import { useState } from 'react';

interface Platform {
  name: string;
  width: number;
  height: number;
  ratio: string;
  useCase: string;
}

const PLATFORMS: Platform[] = [
  { name: 'YouTube',            width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'YouTube Shorts',     width: 1080, height: 1920, ratio: '9:16', useCase: 'Vertical video' },
  { name: 'Instagram Feed',     width: 1080, height: 1080, ratio: '1:1',  useCase: 'Square posts' },
  { name: 'Instagram Story',    width: 1080, height: 1920, ratio: '9:16', useCase: 'Stories/Reels' },
  { name: 'Instagram Portrait', width: 1080, height: 1350, ratio: '4:5',  useCase: 'Portrait posts' },
  { name: 'TikTok',             width: 1080, height: 1920, ratio: '9:16', useCase: 'Vertical video' },
  { name: 'Facebook',           width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'Twitter/X',          width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'LinkedIn',           width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
];

interface Props {
  onSelect: (width: number, height: number) => void;
}

export default function PlatformRecommendations({ onSelect }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (p: Platform) => {
    navigator.clipboard.writeText(`${p.width}x${p.height}`);
    setCopied(p.name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wide mb-3">Platform Recommendations</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs border-b border-slate-700">
              <th className="text-left pb-2">Platform</th>
              <th className="text-left pb-2">Dimensions</th>
              <th className="text-left pb-2">Ratio</th>
              <th className="text-left pb-2">Use Case</th>
              <th className="text-left pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {PLATFORMS.map(p => (
              <tr
                key={p.name}
                onClick={() => onSelect(p.width, p.height)}
                className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                <td className="py-2 text-white font-medium">{p.name}</td>
                <td className="py-2 text-slate-300">{p.width}×{p.height}</td>
                <td className="py-2 text-yellow-400 font-mono">{p.ratio}</td>
                <td className="py-2 text-slate-400">{p.useCase}</td>
                <td className="py-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleCopy(p); }}
                    className="text-xs bg-slate-600 hover:bg-slate-500 rounded px-2 py-0.5 text-slate-200 transition-colors"
                  >
                    {copied === p.name ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
