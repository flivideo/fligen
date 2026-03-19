import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BRAND,
  FONTS,
  type BrandColor,
  type TextPanel,
  type OverlayConfig,
  type ThumbnailConfig,
  type LayerVisibility,
} from './types';

// ============================================
// Text Rendering Helper Functions
// ============================================

export function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  textColor: BrandColor
): number {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  const lineHeight = fontSize * 1.2; // 120% line height

  ctx.fillStyle = BRAND[textColor];
  ctx.textBaseline = 'top';

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== '') {
      // Draw current line
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  // Draw last line
  if (line) {
    ctx.fillText(line, x, lineY);
    lineY += lineHeight;
  }

  return lineY - y; // Return total height used
}

export function renderScaledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  textColor: BrandColor
): number {
  // Measure text at current size
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);

  // Scale down if needed
  let scaledFontSize = fontSize;
  if (metrics.width > maxWidth) {
    scaledFontSize = Math.floor(fontSize * (maxWidth / metrics.width));
    ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = BRAND[textColor];
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);

  return scaledFontSize; // Return used font size
}

// ============================================
// Canvas Rendering Function
// ============================================

export async function renderToCanvas(
  config: ThumbnailConfig,
  visibility: LayerVisibility
): Promise<HTMLCanvasElement> {
  const WIDTH = 1280;
  const HEIGHT = 720;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Preload all fonts used in text panels
  const fontsToLoad = config.textPanels
    .filter((p) => p.enabled)
    .map((p) => {
      const font = FONTS[p.fontFamily];
      return document.fonts.load(`${font.weight} ${p.fontSize}px ${font.family}`);
    });

  await Promise.all(fontsToLoad);
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
    const enabledPanels = config.textPanels.filter((p) => p.enabled);
    for (let i = 0; i < enabledPanels.length; i++) {
      const panel = enabledPanels[i];
      const offset = i * 50; // Stack offset for preset positions

      // Get font configuration
      const font = FONTS[panel.fontFamily];
      const displayText = font.transform === 'uppercase' ? panel.text.toUpperCase() : panel.text;

      // Use panel's font size and padding
      const fontSize = panel.fontSize;
      const paddingX = panel.paddingX;
      const paddingY = panel.paddingY;

      // Set up text measurement
      ctx.font = `${font.weight} ${fontSize}px ${font.family}`;
      const textMetrics = ctx.measureText(displayText);
      const textWidth = textMetrics.width;

      // Calculate max width for text (canvas width minus margins and padding)
      const maxTextWidth = WIDTH - 60 - paddingX * 2; // 30px margin each side

      // Determine box dimensions based on overflow mode
      let boxWidth = Math.min(textWidth + paddingX * 2, WIDTH - 60);
      let boxHeight = fontSize + paddingY * 2;

      // For wrap mode, estimate height (will be precise when rendering)
      if (panel.overflow === 'wrap' && textWidth > maxTextWidth) {
        const estimatedLines = Math.ceil(textWidth / maxTextWidth);
        boxHeight = fontSize * 1.2 * estimatedLines + paddingY * 2;
      }

      // Calculate position
      let x = 0,
        y = 0;
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

      // Draw text with overflow handling
      ctx.font = `${font.weight} ${fontSize}px ${font.family}`;

      switch (panel.overflow) {
        case 'wrap':
          renderWrappedText(
            ctx,
            displayText,
            x + paddingX,
            y + paddingY,
            maxTextWidth,
            fontSize,
            panel.textColor
          );
          break;
        case 'scale':
          renderScaledText(
            ctx,
            displayText,
            x + paddingX,
            y + paddingY,
            maxTextWidth,
            fontSize,
            font.family,
            font.weight,
            panel.textColor
          );
          break;
        case 'scroll':
          // For export, treat scroll same as scale (no animation in PNG)
          renderScaledText(
            ctx,
            displayText,
            x + paddingX,
            y + paddingY,
            maxTextWidth,
            fontSize,
            font.family,
            font.weight,
            panel.textColor
          );
          break;
      }
    }
  }

  // Layer 4: Overlay Image
  if (visibility.overlay && config.overlay.enabled && config.overlay.imageUrl) {
    const img = await loadImage(config.overlay.imageUrl);
    const size = 120 * config.overlay.scale;
    let x = 0,
      y = 0;

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

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ============================================
// Preview Canvas Component
// ============================================

export interface PreviewCanvasProps {
  config: ThumbnailConfig;
  visibility: LayerVisibility;
  onUpdatePanel?: (id: string, updates: Partial<TextPanel>) => void;
}

export function PreviewCanvas({ config, visibility, onUpdatePanel }: PreviewCanvasProps) {
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
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingPanel || !containerRef.current || !onUpdatePanel) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      // Clamp to canvas bounds (with some padding)
      const clampedX = Math.max(0, Math.min(95, x));
      const clampedY = Math.max(0, Math.min(95, y));

      onUpdatePanel(draggingPanel, { customX: clampedX, customY: clampedY });
    },
    [draggingPanel, dragOffset, onUpdatePanel]
  );

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
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 1280 720"
            >
              {/* Light brown diagonal stripe - from (750,0) to (1150,720) */}
              <polygon points="750,0 1280,0 1280,720 1150,720" fill={BRAND.lightBrown} />
              {/* Dark brown bottom-right corner - edge parallel to main diagonal (slope 720/400 = 1.8) */}
              <polygon points="1180,720 1280,540 1280,720" fill={BRAND.darkBrown} />
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

                // Apply font transform
                const font = FONTS[panel.fontFamily];
                const displayText =
                  font.transform === 'uppercase' ? panel.text.toUpperCase() : panel.text;

                return (
                  <div
                    key={panel.id}
                    className={`absolute rounded-lg transition-shadow ${
                      onUpdatePanel ? 'cursor-move hover:ring-2 hover:ring-amber-400/50' : ''
                    } ${isDragging ? 'ring-2 ring-amber-400 shadow-lg z-50' : ''}`}
                    style={{
                      ...posStyle,
                      backgroundColor: BRAND[panel.bgColor],
                      fontFamily: font.family,
                      fontWeight: font.weight,
                      padding: `${scaledPaddingY}px ${scaledPaddingX}px`,
                    }}
                    onMouseDown={
                      onUpdatePanel ? (e) => handleDragStart(e, panel.id, panel) : undefined
                    }
                  >
                    <span
                      className="tracking-wide whitespace-nowrap"
                      style={{
                        color: BRAND[panel.textColor],
                        fontSize: `${scaledFontSize}px`,
                      }}
                    >
                      {displayText}
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
        {!config.mainImageUrl && !config.textPanels.some((p) => p.enabled) && (
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
