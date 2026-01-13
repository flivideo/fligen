import { useState, useRef, useEffect } from 'react';
import { getTemplate, getAvailableTemplates } from './BrandTextGenerator/templates';
import { renderToCanvas } from './BrandTextGenerator/rendering/canvas-renderer';
import { copyToClipboard, exportAndDownload } from './BrandTextGenerator/rendering/export';
import type { BrandTextConfig, TextSegment, CanvasPresetKey } from './BrandTextGenerator/types';
import { CANVAS_PRESETS } from './BrandTextGenerator/types';

export default function Day13BrandText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial configuration - "12 Days of Claudemas"
  const [config, setConfig] = useState<BrandTextConfig>({
    templateId: 'claude_code_brick',
    mode: 'multi',
    segments: [
      { id: '1', text: '12 Days of ', color: 'white' },
      { id: '2', text: 'Claude', color: 'orange' },
      { id: '3', text: 'mas', color: 'blue' },
    ],
    alignment: 'center',
    caseTransform: 'uppercase',
    fontSize: 80,
    letterSpacing: 4,
    brickSeams: 0.5,
    innerShadow: 0.5,
    bevelDepth: 0.5,
    glowEnabled: true,
    glowColor: 'orange',
    glowIntensity: 0.6,
    terminalEnabled: true,
    terminalControls: true,
    scanlinesEnabled: false,
    scanlinesStrength: 0.5,
    footerEnabled: true,
    footerText: 'Press Enter to continue',
    canvasSize: { width: 1280, height: 720 },
  });

  const [canvasPreset, setCanvasPreset] = useState<CanvasPresetKey>('youtube-thumb');

  const template = getTemplate(config.templateId);
  const availableTemplates = getAvailableTemplates();

  // Re-render canvas whenever config changes
  useEffect(() => {
    if (canvasRef.current) {
      renderToCanvas(canvasRef.current, config, template);
    }
  }, [config, template]);

  const updateConfig = (updates: Partial<BrandTextConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateSegment = (id: string, updates: Partial<TextSegment>) => {
    setConfig(prev => ({
      ...prev,
      segments: prev.segments.map(seg =>
        seg.id === id ? { ...seg, ...updates } : seg
      ),
    }));
  };

  const addSegment = () => {
    const newSegment: TextSegment = {
      id: Date.now().toString(),
      text: '',
      color: template.defaultColor,
    };
    setConfig(prev => ({
      ...prev,
      segments: [...prev.segments, newSegment],
    }));
  };

  const removeSegment = (id: string) => {
    if (config.segments.length > 1) {
      setConfig(prev => ({
        ...prev,
        segments: prev.segments.filter(seg => seg.id !== id),
      }));
    }
  };

  const moveSegmentUp = (id: string) => {
    setConfig(prev => {
      const index = prev.segments.findIndex(seg => seg.id === id);
      if (index <= 0) return prev; // Already at top

      const newSegments = [...prev.segments];
      [newSegments[index - 1], newSegments[index]] = [newSegments[index], newSegments[index - 1]];

      return { ...prev, segments: newSegments };
    });
  };

  const moveSegmentDown = (id: string) => {
    setConfig(prev => {
      const index = prev.segments.findIndex(seg => seg.id === id);
      if (index === -1 || index >= prev.segments.length - 1) return prev; // Already at bottom

      const newSegments = [...prev.segments];
      [newSegments[index], newSegments[index + 1]] = [newSegments[index + 1], newSegments[index]];

      return { ...prev, segments: newSegments };
    });
  };

  const handleCanvasPresetChange = (preset: CanvasPresetKey) => {
    setCanvasPreset(preset);
    if (preset !== 'custom') {
      const size = CANVAS_PRESETS[preset];
      updateConfig({ canvasSize: { width: size.width, height: size.height } });
    }
  };

  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;

    try {
      await copyToClipboard(canvasRef.current);
      setShowSuccess(true);
      setErrorMessage(null);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Clipboard copy failed');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleExport = async (transparent: boolean) => {
    if (!canvasRef.current) return;

    try {
      const fullText = config.segments.map(s => s.text).join('');
      await exportAndDownload(canvasRef.current, config.templateId, fullText, transparent);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      setErrorMessage('Export failed');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Day 13: Brand Text Generator</h1>
        <p className="text-xs text-slate-400">Create brand-styled title text for thumbnails and social graphics</p>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls (scrollable) */}
        <div className="w-96 overflow-y-auto border-r border-slate-700 p-4">
        <div className="space-y-4">
        {/* Template Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Template</label>
          <select
            value={config.templateId}
            onChange={(e) => updateConfig({ templateId: e.target.value })}
            className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            {availableTemplates.map(tpl => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
        </div>

        {/* Mode Toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Mode</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={config.mode === 'single'}
                onChange={() => updateConfig({ mode: 'single' })}
                className="accent-blue-500"
              />
              <span className="text-xs text-slate-300">Single</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={config.mode === 'multi'}
                onChange={() => updateConfig({ mode: 'multi' })}
                className="accent-blue-500"
              />
              <span className="text-xs text-slate-300">Multi-Color</span>
            </label>
          </div>
        </div>

        {/* Text Segments */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Text ({config.segments.length})
          </label>
          <div className="space-y-1.5">
            {config.segments.map((segment, idx) => (
              <div key={segment.id} className="flex gap-1 items-center text-xs">
                {/* Move Up/Down Buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveSegmentUp(segment.id)}
                    disabled={idx === 0}
                    className={`px-1 py-0 rounded text-xs leading-none ${
                      idx === 0
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                    }`}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSegmentDown(segment.id)}
                    disabled={idx === config.segments.length - 1}
                    className={`px-1 py-0 rounded text-xs leading-none ${
                      idx === config.segments.length - 1
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                    }`}
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                <input
                  type="text"
                  value={segment.text}
                  onChange={(e) => updateSegment(segment.id, { text: e.target.value })}
                  placeholder="Text..."
                  className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                />
                <div className="flex gap-1">
                  <select
                    value={Object.keys(template.colors).includes(segment.color) ? segment.color : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        updateSegment(segment.id, { color: e.target.value });
                      }
                    }}
                    className="px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs w-20"
                  >
                    {Object.keys(template.colors).map(colorKey => (
                      <option key={colorKey} value={colorKey}>
                        {colorKey}
                      </option>
                    ))}
                    <option value="custom">custom</option>
                  </select>
                  <input
                    type="color"
                    value={Object.keys(template.colors).includes(segment.color) ? template.colors[segment.color] : segment.color}
                    onChange={(e) => updateSegment(segment.id, { color: e.target.value })}
                    className="w-8 h-7 bg-slate-700 border border-slate-600 rounded cursor-pointer"
                    title="Pick custom color"
                  />
                </div>
                <button
                  onClick={() => updateSegment(segment.id, { newLine: !segment.newLine })}
                  className={`px-1.5 py-1 rounded text-white text-xs ${
                    segment.newLine
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  title="Start on new line"
                >
                  NL
                </button>
                {config.segments.length > 1 && (
                  <button
                    onClick={() => removeSegment(segment.id)}
                    className="px-1.5 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addSegment}
            className="mt-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
          >
            + Add
          </button>
        </div>

        {/* Typography Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Align</label>
            <select
              value={config.alignment}
              onChange={(e) => updateConfig({ alignment: e.target.value as any })}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Case</label>
            <select
              value={config.caseTransform}
              onChange={(e) => updateConfig({ caseTransform: e.target.value as any })}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
            >
              <option value="original">Orig</option>
              <option value="uppercase">UPPER</option>
              <option value="lowercase">lower</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Font Size: {config.fontSize}px
          </label>
          <input
            type="range"
            min="40"
            max="120"
            value={config.fontSize}
            onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Letter Spacing: {config.letterSpacing}px
          </label>
          <input
            type="range"
            min="0"
            max="16"
            value={config.letterSpacing}
            onChange={(e) => updateConfig({ letterSpacing: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Brick Style Controls */}
        <div className="border-t border-slate-700 pt-2">
          <h3 className="text-xs font-medium text-slate-300 mb-2">Brick Style</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">
                Seams: {Math.round(config.brickSeams * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.brickSeams}
                onChange={(e) => updateConfig({ brickSeams: Number(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-0.5">
                Bevel: {Math.round(config.bevelDepth * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.bevelDepth}
                onChange={(e) => updateConfig({ bevelDepth: Number(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="border-t border-slate-700 pt-2">
          <h3 className="text-xs font-medium text-slate-300 mb-2">Effects</h3>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.glowEnabled}
                onChange={(e) => updateConfig({ glowEnabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-slate-300">Glow</span>
            </label>

            {config.glowEnabled && (
              <div className="ml-5 space-y-1">
                <div className="flex gap-1">
                  <select
                    value={Object.keys(template.colors).includes(config.glowColor) ? config.glowColor : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        updateConfig({ glowColor: e.target.value });
                      }
                    }}
                    className="flex-1 px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                  >
                    {Object.keys(template.colors).map(colorKey => (
                      <option key={colorKey} value={colorKey}>{colorKey}</option>
                    ))}
                    <option value="custom">custom</option>
                  </select>
                  <input
                    type="color"
                    value={Object.keys(template.colors).includes(config.glowColor) ? template.colors[config.glowColor] : config.glowColor}
                    onChange={(e) => updateConfig({ glowColor: e.target.value })}
                    className="w-8 h-6 bg-slate-700 border border-slate-600 rounded cursor-pointer"
                    title="Pick custom glow color"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.glowIntensity}
                  onChange={(e) => updateConfig({ glowIntensity: Number(e.target.value) })}
                  className="w-full accent-orange-500"
                />
              </div>
            )}

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.terminalEnabled}
                onChange={(e) => updateConfig({ terminalEnabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-slate-300">Terminal</span>
            </label>

            {config.terminalEnabled && (
              <div className="ml-5">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={config.terminalControls}
                    onChange={(e) => updateConfig({ terminalControls: e.target.checked })}
                    className="w-3 h-3 accent-blue-500"
                  />
                  <span className="text-xs text-slate-400">Controls</span>
                </label>
              </div>
            )}

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.scanlinesEnabled}
                onChange={(e) => updateConfig({ scanlinesEnabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-slate-300">Scanlines</span>
            </label>

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.footerEnabled}
                onChange={(e) => updateConfig({ footerEnabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-blue-500"
              />
              <span className="text-xs text-slate-300">Footer</span>
            </label>

            {config.footerEnabled && (
              <div className="ml-5">
                <input
                  type="text"
                  value={config.footerText}
                  onChange={(e) => updateConfig({ footerText: e.target.value })}
                  placeholder="Footer text..."
                  className="w-full px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Canvas Size */}
        <div className="border-t border-slate-700 pt-2">
          <h3 className="text-xs font-medium text-slate-300 mb-1">Canvas Size</h3>
          <select
            value={canvasPreset}
            onChange={(e) => handleCanvasPresetChange(e.target.value as CanvasPresetKey)}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs mb-2"
          >
            {Object.entries(CANVAS_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>

          {/* Width Slider */}
          <div className="mb-2">
            <label className="block text-xs text-slate-400 mb-1">
              Width: {config.canvasSize.width}px
            </label>
            <input
              type="range"
              min="400"
              max="1920"
              step="20"
              value={config.canvasSize.width}
              onChange={(e) => {
                updateConfig({ canvasSize: { ...config.canvasSize, width: Number(e.target.value) } });
                setCanvasPreset('custom');
              }}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Height Slider */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Height: {config.canvasSize.height}px
            </label>
            <input
              type="range"
              min="200"
              max="1080"
              step="20"
              value={config.canvasSize.height}
              onChange={(e) => {
                updateConfig({ canvasSize: { ...config.canvasSize, height: Number(e.target.value) } });
                setCanvasPreset('custom');
              }}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        {/* Export Controls */}
        <div className="border-t border-slate-700 pt-2">
          <h3 className="text-xs font-medium text-slate-300 mb-1">Export</h3>
          <div className="space-y-1">
            <button
              onClick={() => handleExport(false)}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
            >
              PNG (with bg)
            </button>
            <button
              onClick={() => handleExport(true)}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
            >
              PNG (transparent)
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs"
            >
              Copy to Clipboard
            </button>
          </div>

          {showSuccess && (
            <p className="text-green-400 text-xs mt-1">✓ Success!</p>
          )}
          {errorMessage && (
            <p className="text-red-400 text-xs mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
        </div>

        {/* Right: Preview (fixed) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-medium text-slate-300">
              Preview ({config.canvasSize.width}×{config.canvasSize.height})
            </h3>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full border border-slate-700"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
