import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useShots } from '../../hooks/useShots';
import type { Shot } from '@fligen/shared';

// ============================================
// Brand Colors (from AppyDave design system)
// ============================================
const BRAND = {
  darkBrown: '#342d2d',
  lightBrown: '#ccba9d',
  yellow: '#ffde59',
  white: '#ffffff',
  black: '#000000',
} as const;

type BrandColor = keyof typeof BRAND;

// ============================================
// Types
// ============================================

type PresetPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'custom';

interface TextPanel {
  id: string;
  enabled: boolean;
  text: string;
  bgColor: BrandColor;
  textColor: BrandColor;
  position: PresetPosition;
  // Custom position (percentage of canvas, 0-100)
  customX: number;
  customY: number;
  // Style controls
  fontSize: number;
  paddingX: number;
  paddingY: number;
}

interface OverlayConfig {
  enabled: boolean;
  imageUrl: string | null;
  position: 'bottom-right' | 'bottom-left' | 'center-right';
  scale: number;
}

interface ThumbnailConfig {
  mainImageUrl: string | null;
  textPanels: TextPanel[];
  overlay: OverlayConfig;
}

type LayerId = 'background' | 'main-image' | 'text-panels' | 'overlay';

interface LayerVisibility {
  background: boolean;
  'main-image': boolean;
  'text-panels': boolean;
  overlay: boolean;
}

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
  customX: 2.5,  // percentage (maps to ~30px at 1280)
  customY: 4.2,  // percentage (maps to ~30px at 720)
  fontSize: 36,
  paddingX: 16,
  paddingY: 8,
});

const initialConfig: ThumbnailConfig = {
  mainImageUrl: null,
  textPanels: [
    { ...createDefaultTextPanel('panel-1'), enabled: true, text: 'CLAUDE CODE', position: 'top-left' },
    { ...createDefaultTextPanel('panel-2'), enabled: true, text: '12 DAYS', bgColor: 'black', textColor: 'white', position: 'top-left', customY: 11 },
    { ...createDefaultTextPanel('panel-3'), enabled: false, text: 'PANEL 3', position: 'bottom-left' },
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
// Layer Stack Component (Visual Layer Panel)
// ============================================

interface LayerStackProps {
  selectedLayer: LayerId;
  onSelectLayer: (layer: LayerId) => void;
  visibility: LayerVisibility;
  onToggleVisibility: (layer: LayerId) => void;
  config: ThumbnailConfig;
}

function LayerStack({ selectedLayer, onSelectLayer, visibility, onToggleVisibility, config }: LayerStackProps) {
  const layers: { id: LayerId; name: string; icon: string; hasContent: boolean }[] = [
    { id: 'overlay', name: 'Overlay Image', icon: '◈', hasContent: config.overlay.enabled && !!config.overlay.imageUrl },
    { id: 'text-panels', name: 'Text Panels', icon: '▤', hasContent: config.textPanels.some(p => p.enabled) },
    { id: 'main-image', name: 'Main Image', icon: '◻', hasContent: !!config.mainImageUrl },
    { id: 'background', name: 'Background', icon: '▨', hasContent: true },
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/80">
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Layers</h3>
      </div>

      {/* Layer List */}
      <div className="p-2 space-y-1">
        {layers.map((layer, index) => (
          <button
            key={layer.id}
            onClick={() => onSelectLayer(layer.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
              selectedLayer === layer.id
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30'
                : 'hover:bg-slate-700/50 border border-transparent'
            }`}
          >
            {/* Visibility Toggle */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(layer.id);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onToggleVisibility(layer.id);
                }
              }}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                visibility[layer.id]
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {visibility[layer.id] ? '◉' : '○'}
            </span>

            {/* Layer Icon */}
            <span
              className={`text-lg ${
                selectedLayer === layer.id ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              {layer.icon}
            </span>

            {/* Layer Name */}
            <span
              className={`flex-1 text-left text-sm ${
                selectedLayer === layer.id ? 'text-white font-medium' : 'text-slate-400 group-hover:text-white'
              }`}
            >
              {layer.name}
            </span>

            {/* Content Indicator */}
            <span
              className={`w-2 h-2 rounded-full ${
                layer.hasContent ? 'bg-green-400' : 'bg-slate-600'
              }`}
            />

            {/* Layer Number */}
            <span className="text-[10px] text-slate-600 font-mono">{4 - index}</span>
          </button>
        ))}
      </div>

      {/* Exploded View Hint */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-900/50">
        <p className="text-[10px] text-slate-500 text-center">
          Layer 4 (top) → Layer 1 (bottom)
        </p>
      </div>
    </div>
  );
}

// ============================================
// Preview Canvas Component
// ============================================

interface PreviewCanvasProps {
  config: ThumbnailConfig;
  visibility: LayerVisibility;
  onUpdatePanel?: (id: string, updates: Partial<TextPanel>) => void;
}

function PreviewCanvas({ config, visibility, onUpdatePanel }: PreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingPanel, setDraggingPanel] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Get position style for a text panel
  const getTextPanelStyle = (panel: TextPanel, index: number): React.CSSProperties => {
    const style: React.CSSProperties = {};

    // Use custom position if set, otherwise use preset
    if (panel.position === 'custom') {
      style.left = `${panel.customX}%`;
      style.top = `${panel.customY}%`;
    } else {
      const offset = index * 7; // Stack offset in percentage

      // Vertical positioning
      if (panel.position.startsWith('top')) {
        style.top = `${4.2 + offset}%`;
      } else if (panel.position.startsWith('middle')) {
        style.top = '50%';
        style.transform = 'translateY(-50%)';
      } else if (panel.position.startsWith('bottom')) {
        style.bottom = `${4.2 + offset}%`;
      }

      // Horizontal positioning
      if (panel.position.endsWith('left')) {
        style.left = '2.5%';
      } else if (panel.position.endsWith('center')) {
        style.left = '50%';
        style.transform = style.transform ? 'translate(-50%, -50%)' : 'translateX(-50%)';
      } else if (panel.position.endsWith('right')) {
        style.right = '2.5%';
      }
    }

    return style;
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, panelId: string, panel: TextPanel) => {
    if (!onUpdatePanel || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const panelElement = e.currentTarget as HTMLElement;
    const panelRect = panelElement.getBoundingClientRect();

    // Calculate offset from mouse to panel top-left
    setDragOffset({
      x: e.clientX - panelRect.left,
      y: e.clientY - panelRect.top,
    });

    // Switch to custom position if not already
    if (panel.position !== 'custom') {
      const currentX = ((panelRect.left - rect.left) / rect.width) * 100;
      const currentY = ((panelRect.top - rect.top) / rect.height) * 100;
      onUpdatePanel(panelId, { position: 'custom', customX: currentX, customY: currentY });
    }

    setDraggingPanel(panelId);
    e.preventDefault();
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingPanel || !containerRef.current || !onUpdatePanel) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    // Clamp to canvas bounds (with some padding)
    const clampedX = Math.max(0, Math.min(95, x));
    const clampedY = Math.max(0, Math.min(95, y));

    onUpdatePanel(draggingPanel, { customX: clampedX, customY: clampedY });
  }, [draggingPanel, dragOffset, onUpdatePanel]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingPanel(null);
  }, []);

  // Add/remove global event listeners for dragging
  useEffect(() => {
    if (draggingPanel) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingPanel, handleDragMove, handleDragEnd]);

  // Position mappings for overlay
  const getOverlayStyle = (position: OverlayConfig['position'], scale: number) => {
    const size = 120 * scale;
    switch (position) {
      case 'bottom-right':
        return { bottom: 20, right: 20, width: size, height: size };
      case 'bottom-left':
        return { bottom: 20, left: 20, width: size, height: size };
      case 'center-right':
        return { top: '50%', right: 20, width: size, height: size, transform: 'translateY(-50%)' };
    }
  };

  // Scale factor for preview (font sizes, padding are based on 1280x720)
  // We use CSS calc or percentage-based scaling where possible

  return (
    <div className="relative w-full" style={{ aspectRatio: '1280/720' }}>
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700/50"
      >
        {/* Layer 1: Background Template */}
        {visibility.background && (
          <div className="absolute inset-0">
            {/* Dark brown base */}
            <div className="absolute inset-0" style={{ backgroundColor: BRAND.darkBrown }} />
            {/* Light brown diagonal stripe */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1280 720">
              {/* Light brown diagonal stripe - from (750,0) to (1150,720) */}
              <polygon
                points="750,0 1280,0 1280,720 1150,720"
                fill={BRAND.lightBrown}
              />
              {/* Dark brown bottom-right corner - edge parallel to main diagonal (slope 720/400 = 1.8) */}
              <polygon
                points="1180,720 1280,540 1280,720"
                fill={BRAND.darkBrown}
              />
            </svg>
          </div>
        )}

        {/* Layer 2: Main Image */}
        {visibility['main-image'] && config.mainImageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={config.mainImageUrl}
              alt="Main thumbnail image"
              className="w-full h-full object-contain"
              style={{ maxWidth: '90%', maxHeight: '90%' }}
            />
          </div>
        )}

        {/* Layer 3: Text Panels */}
        {visibility['text-panels'] && (
          <div className="absolute inset-0">
            {config.textPanels
              .filter((panel) => panel.enabled)
              .map((panel, index) => {
                const posStyle = getTextPanelStyle(panel, index);
                const isDragging = draggingPanel === panel.id;
                // Scale font size and padding based on preview width (assuming ~640px preview = 50% of 1280)
                const scaleFactor = 0.5; // Preview is roughly half the export size
                const scaledFontSize = panel.fontSize * scaleFactor;
                const scaledPaddingX = panel.paddingX * scaleFactor;
                const scaledPaddingY = panel.paddingY * scaleFactor;

                return (
                  <div
                    key={panel.id}
                    className={`absolute rounded-lg transition-shadow ${
                      onUpdatePanel ? 'cursor-move hover:ring-2 hover:ring-amber-400/50' : ''
                    } ${isDragging ? 'ring-2 ring-amber-400 shadow-lg z-50' : ''}`}
                    style={{
                      ...posStyle,
                      backgroundColor: BRAND[panel.bgColor],
                      fontFamily: 'Bebas Neue, sans-serif',
                      padding: `${scaledPaddingY}px ${scaledPaddingX}px`,
                    }}
                    onMouseDown={onUpdatePanel ? (e) => handleDragStart(e, panel.id, panel) : undefined}
                  >
                    <span
                      className="font-bold tracking-wide whitespace-nowrap"
                      style={{
                        color: BRAND[panel.textColor],
                        fontSize: `${scaledFontSize}px`,
                      }}
                    >
                      {panel.text}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Layer 4: Overlay Image */}
        {visibility.overlay && config.overlay.enabled && config.overlay.imageUrl && (
          <div
            className="absolute rounded-full overflow-hidden border-2 border-white/20 shadow-lg"
            style={getOverlayStyle(config.overlay.position, config.overlay.scale)}
          >
            <img
              src={config.overlay.imageUrl}
              alt="Overlay"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Empty State */}
        {!config.mainImageUrl && !config.textPanels.some(p => p.enabled) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-20">🖼</div>
              <p className="text-slate-500 text-sm">Add a main image to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Label */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="text-[10px] text-slate-500 font-mono">1280 × 720</span>
      </div>
    </div>
  );
}

// ============================================
// Image Drop Zone Component
// ============================================

interface ImageDropZoneProps {
  label: string;
  imageUrl: string | null;
  onImageSelect: (url: string) => void;
  onClear: () => void;
  shots?: Shot[];
  compact?: boolean;
}

function ImageDropZone({ label, imageUrl, onImageSelect, onClear, shots = [], compact = false }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showShotPicker, setShowShotPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelect(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }

    // Check for URL in text data
    const url = e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
      onImageSelect(url);
    }
  }, [onImageSelect]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelect(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400 font-medium">{label}</label>

      {imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt={label}
            className={`w-full rounded-lg border border-slate-600 object-cover ${compact ? 'h-20' : 'h-32'}`}
          />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="text-white text-xs">✕</span>
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`${compact ? 'h-20' : 'h-32'} border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-400/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
          }`}
        >
          <span className={`${compact ? 'text-xl' : 'text-2xl'} mb-1 opacity-40`}>📁</span>
          <span className="text-xs text-slate-500">Drop image or click</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Shot Picker */}
      {shots.length > 0 && (
        <div>
          <button
            onClick={() => setShowShotPicker(!showShotPicker)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            {showShotPicker ? '▼ Hide shots' : '▶ Select from shots'}
          </button>
          {showShotPicker && (
            <div className="mt-2 grid grid-cols-4 gap-1">
              {shots.map((shot) => (
                <button
                  key={shot.id}
                  onClick={() => {
                    onImageSelect(`http://localhost:5401/assets/shot-list/${shot.filename}`);
                    setShowShotPicker(false);
                  }}
                  className="aspect-square rounded overflow-hidden border border-slate-600 hover:border-amber-400 transition-colors"
                >
                  <img
                    src={`http://localhost:5401/assets/shot-list/${shot.filename}`}
                    alt={shot.prompt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Text Panel Editor Component
// ============================================

interface TextPanelEditorProps {
  panels: TextPanel[];
  onChange: (panels: TextPanel[]) => void;
}

function TextPanelEditor({ panels, onChange }: TextPanelEditorProps) {
  const updatePanel = (id: string, updates: Partial<TextPanel>) => {
    onChange(panels.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const colorOptions: { value: BrandColor; label: string; color: string }[] = [
    { value: 'black', label: 'Black', color: BRAND.black },
    { value: 'darkBrown', label: 'Dark Brown', color: BRAND.darkBrown },
    { value: 'lightBrown', label: 'Light Brown', color: BRAND.lightBrown },
    { value: 'yellow', label: 'Yellow', color: BRAND.yellow },
    { value: 'white', label: 'White', color: BRAND.white },
  ];

  const positionOptions: { value: PresetPosition; label: string }[] = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'middle-left', label: 'Middle Left' },
    { value: 'middle-center', label: 'Middle Center' },
    { value: 'middle-right', label: 'Middle Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'custom', label: 'Custom (drag to position)' },
  ];

  return (
    <div className="space-y-4">
      {panels.map((panel, index) => (
        <div
          key={panel.id}
          className={`p-3 rounded-lg border transition-all ${
            panel.enabled
              ? 'bg-slate-800/80 border-slate-600'
              : 'bg-slate-900/50 border-slate-700/50 opacity-60'
          }`}
        >
          {/* Panel Header */}
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={panel.enabled}
                onChange={(e) => updatePanel(panel.id, { enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm font-medium text-slate-300">Panel {index + 1}</span>
            </label>
          </div>

          {panel.enabled && (
            <div className="space-y-3">
              {/* Text Input */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Text</label>
                <input
                  type="text"
                  value={panel.text}
                  onChange={(e) => updatePanel(panel.id, { text: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="ENTER TEXT"
                />
              </div>

              {/* Color Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Background</label>
                  <div className="flex gap-1">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updatePanel(panel.id, { bgColor: opt.value })}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          panel.bgColor === opt.value ? 'border-amber-400 scale-110' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: opt.color }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Text Color</label>
                  <div className="flex gap-1">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updatePanel(panel.id, { textColor: opt.value })}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          panel.textColor === opt.value ? 'border-amber-400 scale-110' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: opt.color }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Position Selector */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Position</label>
                <select
                  value={panel.position}
                  onChange={(e) => updatePanel(panel.id, { position: e.target.value as PresetPosition })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {positionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {panel.position === 'custom' && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    X: {panel.customX.toFixed(1)}% | Y: {panel.customY.toFixed(1)}%
                  </p>
                )}
              </div>

              {/* Font Size Slider */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Font Size: {panel.fontSize}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="2"
                  value={panel.fontSize}
                  onChange={(e) => updatePanel(panel.id, { fontSize: parseInt(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Padding Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    H Padding: {panel.paddingX}px
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    step="2"
                    value={panel.paddingX}
                    onChange={(e) => updatePanel(panel.id, { paddingX: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    V Padding: {panel.paddingY}px
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="32"
                    step="2"
                    value={panel.paddingY}
                    onChange={(e) => updatePanel(panel.id, { paddingY: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Overlay Editor Component
// ============================================

interface OverlayEditorProps {
  overlay: OverlayConfig;
  onChange: (overlay: OverlayConfig) => void;
  shots: Shot[];
}

function OverlayEditor({ overlay, onChange, shots }: OverlayEditorProps) {
  const positionOptions: { value: OverlayConfig['position']; label: string }[] = [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'center-right', label: 'Center Right' },
  ];

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={overlay.enabled}
          onChange={(e) => onChange({ ...overlay, enabled: e.target.checked })}
          className="w-4 h-4 rounded accent-amber-500"
        />
        <span className="text-sm font-medium text-slate-300">Enable Overlay</span>
      </label>

      {overlay.enabled && (
        <>
          {/* Image Drop Zone */}
          <ImageDropZone
            label="Overlay Image"
            imageUrl={overlay.imageUrl}
            onImageSelect={(url) => onChange({ ...overlay, imageUrl: url })}
            onClear={() => onChange({ ...overlay, imageUrl: null })}
            shots={shots}
            compact
          />

          {/* Position */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Position</label>
            <select
              value={overlay.position}
              onChange={(e) => onChange({ ...overlay, position: e.target.value as OverlayConfig['position'] })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {positionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scale Slider */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Scale: {overlay.scale.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={overlay.scale}
              onChange={(e) => onChange({ ...overlay, scale: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Configuration Panel Component
// ============================================

interface ConfigPanelProps {
  selectedLayer: LayerId;
  config: ThumbnailConfig;
  onChange: (config: ThumbnailConfig) => void;
  shots: Shot[];
}

function ConfigPanel({ selectedLayer, config, onChange, shots }: ConfigPanelProps) {
  const renderContent = () => {
    switch (selectedLayer) {
      case 'background':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              The background template uses the AppyDave brand diagonal stripe pattern.
            </p>
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Brand Colors</h4>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: BRAND.darkBrown }} />
                  <span className="text-xs text-slate-400">Dark Brown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: BRAND.lightBrown }} />
                  <span className="text-xs text-slate-400">Light Brown</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 italic">
              This layer is fixed and cannot be modified.
            </p>
          </div>
        );

      case 'main-image':
        return (
          <div className="space-y-4">
            <ImageDropZone
              label="Main Image"
              imageUrl={config.mainImageUrl}
              onImageSelect={(url) => onChange({ ...config, mainImageUrl: url })}
              onClear={() => onChange({ ...config, mainImageUrl: null })}
              shots={shots}
            />
            <p className="text-xs text-slate-500 italic">
              The main image fills the center of the thumbnail. It will be scaled to fit while maintaining aspect ratio.
            </p>
          </div>
        );

      case 'text-panels':
        return (
          <TextPanelEditor
            panels={config.textPanels}
            onChange={(panels) => onChange({ ...config, textPanels: panels })}
          />
        );

      case 'overlay':
        return (
          <OverlayEditor
            overlay={config.overlay}
            onChange={(overlay) => onChange({ ...config, overlay })}
            shots={shots}
          />
        );
    }
  };

  const titles: Record<LayerId, string> = {
    background: 'Layer 1: Background Template',
    'main-image': 'Layer 2: Main Image',
    'text-panels': 'Layer 3: Text Panels',
    overlay: 'Layer 4: Overlay Image',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/80">
        <h3 className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
          {titles[selectedLayer]}
        </h3>
      </div>
      <div className="p-4">{renderContent()}</div>
    </div>
  );
}

// ============================================
// Canvas Rendering Function
// ============================================

async function renderToCanvas(config: ThumbnailConfig, visibility: LayerVisibility): Promise<HTMLCanvasElement> {
  const WIDTH = 1280;
  const HEIGHT = 720;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Wait for fonts to be ready
  await document.fonts.ready;

  // Layer 1: Background
  if (visibility.background) {
    // Dark brown base
    ctx.fillStyle = BRAND.darkBrown;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Light brown diagonal stripe
    ctx.fillStyle = BRAND.lightBrown;
    ctx.beginPath();
    ctx.moveTo(750, 0);
    ctx.lineTo(WIDTH, 0);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(1150, HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Dark brown bottom-right corner (parallel to main diagonal)
    ctx.fillStyle = BRAND.darkBrown;
    ctx.beginPath();
    ctx.moveTo(1180, HEIGHT);
    ctx.lineTo(WIDTH, 540);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // Layer 2: Main Image
  if (visibility['main-image'] && config.mainImageUrl) {
    const img = await loadImage(config.mainImageUrl);
    // Calculate fit dimensions (90% of canvas, centered)
    const maxWidth = WIDTH * 0.9;
    const maxHeight = HEIGHT * 0.9;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const x = (WIDTH - drawWidth) / 2;
    const y = (HEIGHT - drawHeight) / 2;
    ctx.drawImage(img, x, y, drawWidth, drawHeight);
  }

  // Layer 3: Text Panels
  if (visibility['text-panels']) {
    const enabledPanels = config.textPanels.filter(p => p.enabled);
    for (let i = 0; i < enabledPanels.length; i++) {
      const panel = enabledPanels[i];
      const offset = i * 50; // Stack offset for preset positions

      // Use panel's font size and padding
      const fontSize = panel.fontSize;
      const paddingX = panel.paddingX;
      const paddingY = panel.paddingY;

      // Set up text measurement
      ctx.font = `bold ${fontSize}px "Bebas Neue", sans-serif`;
      const textMetrics = ctx.measureText(panel.text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = textHeight + paddingY * 2;

      // Calculate position
      let x = 0, y = 0;
      const pos = panel.position;

      if (pos === 'custom') {
        // Custom position uses percentage
        x = (panel.customX / 100) * WIDTH;
        y = (panel.customY / 100) * HEIGHT;
      } else {
        // Preset positions
        if (pos.endsWith('left')) x = 30;
        else if (pos.endsWith('center')) x = (WIDTH - boxWidth) / 2;
        else if (pos.endsWith('right')) x = WIDTH - boxWidth - 30;

        if (pos.startsWith('top')) y = 30 + offset;
        else if (pos.startsWith('middle')) y = (HEIGHT - boxHeight) / 2;
        else if (pos.startsWith('bottom')) y = HEIGHT - boxHeight - 30 - offset;
      }

      // Draw background
      ctx.fillStyle = BRAND[panel.bgColor];
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, 8);
      ctx.fill();

      // Draw text
      ctx.fillStyle = BRAND[panel.textColor];
      ctx.font = `bold ${fontSize}px "Bebas Neue", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(panel.text, x + paddingX, y + boxHeight / 2);
    }
  }

  // Layer 4: Overlay Image
  if (visibility.overlay && config.overlay.enabled && config.overlay.imageUrl) {
    const img = await loadImage(config.overlay.imageUrl);
    const size = 120 * config.overlay.scale;
    let x = 0, y = 0;

    switch (config.overlay.position) {
      case 'bottom-right':
        x = WIDTH - size - 20;
        y = HEIGHT - size - 20;
        break;
      case 'bottom-left':
        x = 20;
        y = HEIGHT - size - 20;
        break;
      case 'center-right':
        x = WIDTH - size - 20;
        y = (HEIGHT - size) / 2;
        break;
    }

    // Draw circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ============================================
// Action Bar Component
// ============================================

interface ActionBarProps {
  onReset: () => void;
  onExport: () => void;
  onCopyToClipboard: () => void;
  isExporting: boolean;
}

function ActionBar({ onReset, onExport, onCopyToClipboard, isExporting }: ActionBarProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onReset}
        disabled={isExporting}
        className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        Reset
      </button>
      <button
        onClick={onCopyToClipboard}
        disabled={isExporting}
        className="flex-1 py-2.5 px-4 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isExporting ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          <>
            <span>📋</span>
            <span>Copy to Clipboard</span>
          </>
        )}
      </button>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
      >
        Export PNG
      </button>
    </div>
  );
}

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

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(config, visibility);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `thumbnail-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [config, visibility]);

  const handleCopyToClipboard = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(config, visibility);

      // Convert to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            // Brief visual feedback could be added here
          } catch (clipboardError) {
            console.error('Clipboard write failed:', clipboardError);
            alert('Failed to copy to clipboard. Your browser may not support this feature.');
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert('Failed to copy to clipboard. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [config, visibility]);

  // Handler for updating individual text panels (used by drag-and-drop)
  const handleUpdatePanel = useCallback((id: string, updates: Partial<TextPanel>) => {
    setConfig(prev => ({
      ...prev,
      textPanels: prev.textPanels.map(p => p.id === id ? { ...p, ...updates } : p)
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

            {/* Action Bar */}
            <ActionBar
              onReset={handleReset}
              onExport={handleExport}
              onCopyToClipboard={handleCopyToClipboard}
              isExporting={isExporting}
            />
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
