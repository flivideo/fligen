import { getGlyph, GLYPH_WIDTH, GLYPH_HEIGHT } from './pixel-glyphs';
import type { BrandTemplate, BrandTextConfig, TextSegment } from '../types';

// Block size for pixel rendering (each "pixel" in the glyph is this many canvas pixels)
const BLOCK_SIZE = 12;

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  config: BrandTextConfig,
  template: BrandTemplate
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas dimensions
  canvas.width = config.canvasSize.width;
  canvas.height = config.canvasSize.height;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Render background
  renderBackground(ctx, canvas, config, template);

  // 2. Render text segments
  renderTextSegments(ctx, canvas, config, template);

  // 3. Render effects (scanlines, footer)
  renderPostEffects(ctx, canvas, config, template);
}

function renderBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: BrandTextConfig,
  template: BrandTemplate
): void {
  const { background } = template;

  if (background.type === 'solid' && background.color) {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (background.type === 'terminal' && background.terminal) {
    const { backgroundColor, showFrame, showControls, borderRadius } = background.terminal;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Terminal frame
    if (showFrame && config.terminalEnabled) {
      const frameInset = 20;
      const frameX = frameInset;
      const frameY = frameInset;
      const frameWidth = canvas.width - frameInset * 2;
      const frameHeight = canvas.height - frameInset * 2;

      // Draw frame with rounded corners
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(frameX, frameY, frameWidth, frameHeight, borderRadius);
      ctx.stroke();

      // Window controls (3 dots)
      if (showControls && config.terminalControls) {
        const controlY = frameY + 15;
        const controlStartX = frameX + 15;
        const dotSize = 8;
        const dotSpacing = 12;

        // Red dot
        ctx.fillStyle = '#FF5F56';
        ctx.beginPath();
        ctx.arc(controlStartX, controlY, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Yellow dot
        ctx.fillStyle = '#FFBD2E';
        ctx.beginPath();
        ctx.arc(controlStartX + dotSpacing, controlY, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Green dot
        ctx.fillStyle = '#27C93F';
        ctx.beginPath();
        ctx.arc(controlStartX + dotSpacing * 2, controlY, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glow effect behind text
    if (config.glowEnabled && template.effects.glow) {
      // Support both template color keys and custom hex colors
      const glowColor = template.colors[config.glowColor] || config.glowColor || template.effects.glow.color;
      const glowIntensity = config.glowIntensity;
      const spread = template.effects.glow.spread * glowIntensity;

      // Center glow
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, spread
      );

      gradient.addColorStop(0, `${glowColor}${Math.round(glowIntensity * 0.3 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.5, `${glowColor}${Math.round(glowIntensity * 0.15 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${glowColor}00`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function renderTextSegments(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: BrandTextConfig,
  template: BrandTemplate
): void {
  const blockSize = BLOCK_SIZE * (config.fontSize / 80); // Scale based on font size
  const letterSpacing = config.letterSpacing;
  const lineHeight = GLYPH_HEIGHT * blockSize * 1.3; // 1.3x spacing between lines

  // Group segments into lines based on newLine flag
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];

  for (let i = 0; i < config.segments.length; i++) {
    const segment = config.segments[i];

    // Start new line if this segment has newLine flag (but not for the first segment)
    if (segment.newLine && i > 0 && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
    }

    currentLine.push(segment);
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Calculate total height for vertical centering
  const totalHeight = lines.length * lineHeight;
  let startY = (canvas.height - totalHeight) / 2;

  // Render each line
  for (const lineSegments of lines) {
    // Calculate line width
    const lineText = lineSegments.map(s => s.text).join('');
    const transformedLineText = applyCaseTransform(lineText, config.caseTransform);
    const lineWidth = transformedLineText.length * (GLYPH_WIDTH * blockSize + letterSpacing);

    // Calculate starting X position based on alignment
    let startX: number;
    switch (config.alignment) {
      case 'left':
        startX = template.layout.paddingX;
        break;
      case 'right':
        startX = canvas.width - lineWidth - template.layout.paddingX;
        break;
      case 'center':
      default:
        startX = (canvas.width - lineWidth) / 2;
        break;
    }

    // Render segments in this line
    let xOffset = startX;
    for (const segment of lineSegments) {
      const segmentText = applyCaseTransform(segment.text, config.caseTransform);
      // Support both template color keys and custom hex colors
      const color = template.colors[segment.color] || segment.color || template.colors[template.defaultColor];

      for (const char of segmentText) {
        renderBrickLetter(
          ctx,
          char,
          xOffset,
          startY,
          color,
          blockSize,
          config,
          template
        );

        xOffset += GLYPH_WIDTH * blockSize + letterSpacing;
      }
    }

    // Move to next line
    startY += lineHeight;
  }
}

function renderBrickLetter(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number,
  color: string,
  blockSize: number,
  config: BrandTextConfig,
  template: BrandTemplate
): void {
  const glyph = getGlyph(char);

  glyph.forEach((row, rowIndex) => {
    row.forEach((filled, colIndex) => {
      if (filled) {
        const blockX = x + colIndex * blockSize;
        const blockY = y + rowIndex * blockSize;

        // Draw filled block with main color
        ctx.fillStyle = color;
        ctx.fillRect(blockX, blockY, blockSize, blockSize);

        // Apply bevel effect
        if (template.effects.bevel?.enabled && config.bevelDepth > 0) {
          const bevelDepth = config.bevelDepth;
          const bevelSize = blockSize * 0.2 * bevelDepth;

          // Highlight (top-left)
          const highlightGradient = ctx.createLinearGradient(
            blockX, blockY,
            blockX + bevelSize, blockY + bevelSize
          );
          highlightGradient.addColorStop(0, template.effects.bevel.highlightColor);
          highlightGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = highlightGradient;
          ctx.fillRect(blockX, blockY, blockSize, blockSize);

          // Shadow (bottom-right)
          const shadowGradient = ctx.createLinearGradient(
            blockX + blockSize - bevelSize, blockY + blockSize - bevelSize,
            blockX + blockSize, blockY + blockSize
          );
          shadowGradient.addColorStop(0, 'transparent');
          shadowGradient.addColorStop(1, template.effects.bevel.shadowColor);
          ctx.fillStyle = shadowGradient;
          ctx.fillRect(blockX, blockY, blockSize, blockSize);
        }

        // Draw brick seams
        if (template.effects.brickSeams?.enabled && config.brickSeams > 0) {
          const seamIntensity = config.brickSeams;
          const seamWidth = template.effects.brickSeams.seamWidth * seamIntensity;
          const seamColor = template.effects.brickSeams.seamColor;

          ctx.strokeStyle = seamColor;
          ctx.lineWidth = seamWidth;
          ctx.strokeRect(blockX, blockY, blockSize, blockSize);
        }
      }
    });
  });
}

function renderPostEffects(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: BrandTextConfig,
  template: BrandTemplate
): void {
  // Scanlines effect
  if (config.scanlinesEnabled) {
    const lineHeight = 2;
    const lineSpacing = 4;
    const opacity = Math.round(config.scanlinesStrength * 0.05 * 255).toString(16).padStart(2, '0');

    ctx.fillStyle = `#ffffff${opacity}`;

    for (let y = 0; y < canvas.height; y += lineSpacing) {
      ctx.fillRect(0, y, canvas.width, lineHeight);
    }
  }

  // Footer text
  if (config.footerEnabled && config.footerText) {
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(config.footerText, 20, canvas.height - 20);
  }

  // Grain effect
  if (template.effects.grain?.enabled) {
    const grainIntensity = template.effects.grain.intensity;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * grainIntensity * 255;
      pixels[i] += noise;     // R
      pixels[i + 1] += noise; // G
      pixels[i + 2] += noise; // B
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

function applyCaseTransform(text: string, transform: 'original' | 'uppercase' | 'lowercase'): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'original':
    default:
      return text;
  }
}
