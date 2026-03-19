# AGENTS.md — aspect-ratio campaign

**Project**: FliGen — "12 Days of Claudemas"
**Campaign**: aspect-ratio — FR-24 Aspect Ratio Calculator (Day 16)
**Stack**: React 19 + Vite 6 + TailwindCSS v4 | TypeScript 5.6+
**Ports**: Client 5400 | Server 5401

---

## Build & Run Commands

```bash
npm run build                            # shared → server → client
npm run build -w shared                  # must run before client after config.json changes
npm run build -w client
npm test                                 # 42 tests must still pass
```

**Baseline**: build CLEAN, 42 tests passing (38 server + 4 client).

---

## Directory Structure

```
shared/src/
└── config.json                          # add Day 16 entry here

client/src/
├── App.tsx                              # add import + route for Day 16
└── components/tools/
    ├── Day16AspectRatio.tsx             # orchestrator — CREATE THIS
    └── aspect-ratio/
        ├── useCalculator.ts             # calculation logic hook — CREATE
        ├── Calculator.tsx               # calculator form — CREATE
        ├── PresetButtons.tsx            # aspect ratio + resolution presets — CREATE
        ├── VisualPreview.tsx            # side-by-side rectangles — CREATE
        ├── PlatformRecommendations.tsx  # platform table — CREATE
        └── CalculationHistory.tsx       # localStorage history — CREATE
```

---

## config.json Day 16 Entry

Add after Day 15. Read the existing entries first to match the exact format:

```json
{
  "day": 16,
  "name": "Aspect Ratio Calculator",
  "shortName": "AspectRatio",
  "icon": "📐",
  "status": "complete",
  "route": "/aspect-ratio",
  "purpose": "Bidirectional aspect ratio calculator with platform presets and visual comparison",
  "apisTech": ["React", "localStorage", "Canvas API"]
}
```

Also update Day 11 from `"status": "next"` → `"status": "complete"` (Story Builder was completed).

---

## App.tsx Wiring Pattern

Read App.tsx before editing. Follow the exact same pattern as Day15BatchGen:

```typescript
import Day16AspectRatio from './components/tools/Day16AspectRatio';
// ...
} : currentDay === 16 ? (
  <Day16AspectRatio />
) : (
```

---

## Calculation Logic

All pure functions — no server calls needed:

```typescript
// Aspect ratio → missing dimension
function calcHeight(width: number, ratioW: number, ratioH: number): number {
  return Math.round((width * ratioH) / ratioW);
}
function calcWidth(height: number, ratioW: number, ratioH: number): number {
  return Math.round((height * ratioW) / ratioH);
}

// Dimensions → aspect ratio (via GCD simplification)
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function dimsToRatio(width: number, height: number): { ratio: string; decimal: number } {
  const d = gcd(width, height);
  return { ratio: `${width / d}:${height / d}`, decimal: parseFloat((width / height).toFixed(3)) };
}
```

---

## Data Shapes

```typescript
interface HistoryEntry {
  id: string;
  timestamp: number;
  width: number;
  height: number;
  ratio: string;
  decimal: number;
}

interface Preset {
  label: string;
  ratioW: number;
  ratioH: number;
}

interface Resolution {
  label: string;
  width: number;
  height: number;
  ratio: string;
}

interface Platform {
  name: string;
  width: number;
  height: number;
  ratio: string;
  useCase: string;
}
```

---

## Platform Data (hardcode in PlatformRecommendations.tsx)

```typescript
const PLATFORMS: Platform[] = [
  { name: 'YouTube',             width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'YouTube Shorts',      width: 1080, height: 1920, ratio: '9:16', useCase: 'Vertical video' },
  { name: 'Instagram Feed',      width: 1080, height: 1080, ratio: '1:1',  useCase: 'Square posts' },
  { name: 'Instagram Story',     width: 1080, height: 1920, ratio: '9:16', useCase: 'Stories/Reels' },
  { name: 'Instagram Portrait',  width: 1080, height: 1350, ratio: '4:5',  useCase: 'Portrait posts' },
  { name: 'TikTok',              width: 1080, height: 1920, ratio: '9:16', useCase: 'Vertical video' },
  { name: 'Facebook',            width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'Twitter/X',           width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
  { name: 'LinkedIn',            width: 1920, height: 1080, ratio: '16:9', useCase: 'Standard video' },
];
```

---

## localStorage History

Key: `'fligen-aspect-ratio-history'`
Max entries: 20 (drop oldest when exceeded)
Format: `JSON.stringify(HistoryEntry[])`

```typescript
function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('fligen-aspect-ratio-history') || '[]');
  } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem('fligen-aspect-ratio-history', JSON.stringify(entries.slice(0, 20)));
}
```

---

## Styling — AppyDave Brand (TailwindCSS v4)

Consistent with existing FliGen tools — dark slate theme:
- Container: `bg-slate-900 text-white`
- Cards/sections: `bg-slate-800 rounded-lg border border-slate-700`
- Inputs: `bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white`
- Primary buttons: `bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2`
- Preset buttons: `bg-slate-700 hover:bg-slate-600 rounded px-3 py-1.5 text-sm`
- Active preset: `bg-blue-600 text-white`
- Visual preview rects: yellow (`#ffde59`) for primary, blue for comparison
- Accent: yellow (`text-yellow-400`)

---

## Anti-Patterns to Avoid

- Do NOT add a server route — this is 100% client-side
- Do NOT use canvas for the visual preview — use CSS `aspect-ratio` property on divs
- Do NOT hardcode the day number as a magic constant in the component — read it from props or DAYS config if needed
- Do NOT use `exec` or server calls
- Do NOT break the existing 42 tests — run `npm test` before marking done

---

## Quality Gates

- `npm run build -w shared && npm run build -w client` exits 0
- `npm test` exits 0 (42 tests still passing)
- Day 16 appears in the sidebar and navigates to the new tool
- Calculator produces correct results for: 1920+16:9→1080, 1920×1080→16:9
