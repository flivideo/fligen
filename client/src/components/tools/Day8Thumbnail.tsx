import { useState, useCallback } from 'react';
import { useShots } from '../../hooks/useShots';
import {
  type TextPanel,
  type ThumbnailConfig,
  type LayerId,
  type LayerVisibility,
} from './thumbnail/types';
import { PreviewCanvas } from './thumbnail/ThumbnailCanvas';
import { ThumbnailExport } from './thumbnail/ThumbnailExport';
import { ThumbnailHistory } from './thumbnail/ThumbnailHistory';
import { LayerStack, ConfigPanel } from './thumbnail/ThumbnailConfig';

// ============================================
// Initial State
// ============================================

const createDefaultTextPanel = (id: string): TextPanel => ({
  id,
  enabled: false,
  text: 'TITLE',
  bgColor: 'black',
  textColor: 'yellow',
  position: 'top-left',
  customX: 2.5, // percentage (maps to ~30px at 1280)
  customY: 4.2, // percentage (maps to ~30px at 720)
  fontFamily: 'BebasNeue',
  fontSize: 72,
  paddingX: 24,
  paddingY: 12,
  overflow: 'wrap',
});

const initialConfig: ThumbnailConfig = {
  mainImageUrl: null,
  textPanels: [
    {
      ...createDefaultTextPanel('panel-1'),
      enabled: true,
      text: 'CLAUDE CODE',
      fontFamily: 'BebasNeue',
      fontSize: 72,
      position: 'top-left',
    },
    {
      ...createDefaultTextPanel('panel-2'),
      enabled: true,
      text: '12 DAYS',
      fontFamily: 'BebasNeue',
      fontSize: 72,
      bgColor: 'black',
      textColor: 'white',
      position: 'top-left',
      customY: 11,
    },
    {
      ...createDefaultTextPanel('panel-3'),
      enabled: false,
      text: 'PANEL 3',
      fontFamily: 'Oswald',
      fontSize: 64,
      position: 'bottom-left',
    },
  ],
  overlay: {
    enabled: false,
    imageUrl: null,
    position: 'bottom-right',
    scale: 1.0,
  },
};

const initialVisibility: LayerVisibility = {
  background: true,
  'main-image': true,
  'text-panels': true,
  overlay: true,
};

// ============================================
// Main Day8Thumbnail Component
// ============================================

export function Day8Thumbnail() {
  const { shots } = useShots();
  const [config, setConfig] = useState<ThumbnailConfig>(initialConfig);
  const [selectedLayer, setSelectedLayer] = useState<LayerId>('main-image');
  const [visibility, setVisibility] = useState<LayerVisibility>(initialVisibility);
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleVisibility = (layer: LayerId) => {
    setVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleReset = () => {
    setConfig(initialConfig);
    setVisibility(initialVisibility);
    setSelectedLayer('main-image');
  };

  // Handler for updating individual text panels (used by drag-and-drop)
  const handleUpdatePanel = useCallback((id: string, updates: Partial<TextPanel>) => {
    setConfig((prev) => ({
      ...prev,
      textPanels: prev.textPanels.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  return (
    <div className="h-full overflow-auto p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Thumbnail Generator
            </span>
          </h1>
          <p className="text-slate-400">
            Compose YouTube thumbnails with the AppyDave brand template
          </p>
        </div>

        {/* Main Layout: Preview + Sidebar */}
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Left: Preview Canvas */}
          <div className="space-y-6">
            <PreviewCanvas
              config={config}
              visibility={visibility}
              onUpdatePanel={handleUpdatePanel}
            />

            {/* Export / Action Bar */}
            <ThumbnailExport
              config={config}
              visibility={visibility}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              onReset={handleReset}
            />

            {/* History (FR-19 placeholder) */}
            <ThumbnailHistory />
          </div>

          {/* Right: Layer Stack + Config */}
          <div className="space-y-4">
            <LayerStack
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
              visibility={visibility}
              onToggleVisibility={handleToggleVisibility}
              config={config}
            />

            <ConfigPanel
              selectedLayer={selectedLayer}
              config={config}
              onChange={setConfig}
              shots={shots}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
