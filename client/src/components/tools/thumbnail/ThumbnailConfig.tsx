import React, { useState, useCallback, useRef } from 'react';
import type { Shot } from '@fligen/shared';
import {
  BRAND,
  type BrandColor,
  type FontFamily,
  type OverflowMode,
  type PresetPosition,
  type TextPanel,
  type OverlayConfig,
  type ThumbnailConfig,
  type LayerId,
  type LayerVisibility,
} from './types';

// ============================================
// Layer Stack Component (Visual Layer Panel)
// ============================================

export interface LayerStackProps {
  selectedLayer: LayerId;
  onSelectLayer: (layer: LayerId) => void;
  visibility: LayerVisibility;
  onToggleVisibility: (layer: LayerId) => void;
  config: ThumbnailConfig;
}

export function LayerStack({
  selectedLayer,
  onSelectLayer,
  visibility,
  onToggleVisibility,
  config,
}: LayerStackProps) {
  const layers: { id: LayerId; name: string; icon: string; hasContent: boolean }[] = [
    {
      id: 'overlay',
      name: 'Overlay Image',
      icon: '◈',
      hasContent: config.overlay.enabled && !!config.overlay.imageUrl,
    },
    {
      id: 'text-panels',
      name: 'Text Panels',
      icon: '▤',
      hasContent: config.textPanels.some((p) => p.enabled),
    },
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
                selectedLayer === layer.id
                  ? 'text-amber-400'
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              {layer.icon}
            </span>

            {/* Layer Name */}
            <span
              className={`flex-1 text-left text-sm ${
                selectedLayer === layer.id
                  ? 'text-white font-medium'
                  : 'text-slate-400 group-hover:text-white'
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
        <p className="text-[10px] text-slate-500 text-center">Layer 4 (top) → Layer 1 (bottom)</p>
      </div>
    </div>
  );
}

// ============================================
// Image Drop Zone Component
// ============================================

export interface ImageDropZoneProps {
  label: string;
  imageUrl: string | null;
  onImageSelect: (url: string) => void;
  onClear: () => void;
  shots?: Shot[];
  compact?: boolean;
}

export function ImageDropZone({
  label,
  imageUrl,
  onImageSelect,
  onClear,
  shots = [],
  compact = false,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showShotPicker, setShowShotPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
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
    },
    [onImageSelect]
  );

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

export interface TextPanelEditorProps {
  panels: TextPanel[];
  onChange: (panels: TextPanel[]) => void;
}

export function TextPanelEditor({ panels, onChange }: TextPanelEditorProps) {
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

  const fontOptions: { value: FontFamily; label: string; description: string }[] = [
    { value: 'BebasNeue', label: 'BebasNeue', description: 'Bold display font (h1/buttons)' },
    { value: 'Oswald', label: 'Oswald', description: 'Uppercase subheading (h2-h6)' },
    { value: 'Roboto', label: 'Roboto', description: 'Body text' },
  ];

  const overflowOptions: { value: OverflowMode; label: string }[] = [
    { value: 'wrap', label: 'Wrap (multi-line)' },
    { value: 'scale', label: 'Scale to Fit' },
    { value: 'scroll', label: 'Scroll (preview only)' },
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
                  onChange={(e) => updatePanel(panel.id, { text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Enter text"
                />
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Font</label>
                <select
                  value={panel.fontFamily}
                  onChange={(e) =>
                    updatePanel(panel.id, { fontFamily: e.target.value as FontFamily })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {fontOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size Slider */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Font Size: {panel.fontSize}px
                </label>
                <input
                  type="range"
                  min="72"
                  max="200"
                  step="4"
                  value={panel.fontSize}
                  onChange={(e) => updatePanel(panel.id, { fontSize: parseInt(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Overflow Mode Selector */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Text Overflow</label>
                <select
                  value={panel.overflow}
                  onChange={(e) =>
                    updatePanel(panel.id, { overflow: e.target.value as OverflowMode })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {overflowOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
                          panel.bgColor === opt.value
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-600'
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
                          panel.textColor === opt.value
                            ? 'border-amber-400 scale-110'
                            : 'border-slate-600'
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
                  onChange={(e) =>
                    updatePanel(panel.id, { position: e.target.value as PresetPosition })
                  }
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

              {/* Padding Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    H Padding: {panel.paddingX}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="80"
                    step="4"
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
                    min="4"
                    max="60"
                    step="4"
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

export interface OverlayEditorProps {
  overlay: OverlayConfig;
  onChange: (overlay: OverlayConfig) => void;
  shots: Shot[];
}

export function OverlayEditor({ overlay, onChange, shots }: OverlayEditorProps) {
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
              onChange={(e) =>
                onChange({ ...overlay, position: e.target.value as OverlayConfig['position'] })
              }
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

export interface ConfigPanelProps {
  selectedLayer: LayerId;
  config: ThumbnailConfig;
  onChange: (config: ThumbnailConfig) => void;
  shots: Shot[];
}

export function ConfigPanel({ selectedLayer, config, onChange, shots }: ConfigPanelProps) {
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
              The main image fills the center of the thumbnail. It will be scaled to fit while
              maintaining aspect ratio.
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
