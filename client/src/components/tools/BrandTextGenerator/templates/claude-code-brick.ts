import type { BrandTemplate } from '../types';

export const CLAUDE_CODE_BRICK: BrandTemplate = {
  id: 'claude_code_brick',
  name: 'Claude Code Brick',
  description: 'Retro terminal pixel/brick letters with glow and depth',

  // Typography - pixel-based rendering
  defaultFontSize: 80,
  letterSpacing: 4,
  lineHeight: 1.2,

  // Color palette
  colors: {
    orange: '#D97757',
    white: '#FFFFFF',
    blue: '#4A9FFF',
    yellow: '#FFDE59',
    darkBrown: '#342D2D',
    charcoal: '#141413',
  },
  defaultColor: 'orange',

  // Visual effects
  effects: {
    brickSeams: {
      enabled: true,
      seamWidth: 2,
      seamColor: '#2A2424',
      intensity: 0.5,
    },
    shadow: {
      enabled: true,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: 'rgba(0, 0, 0, 0.5)',
    },
    bevel: {
      enabled: true,
      depth: 0.5,
      highlightColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
    },
    glow: {
      enabled: true,
      color: '#D97757',
      intensity: 0.2,
      spread: 300,
    },
    grain: {
      enabled: true,
      intensity: 0.05,
    },
  },

  // Background styling
  background: {
    type: 'terminal',
    terminal: {
      backgroundColor: '#141413',
      showFrame: true,
      showControls: true,
      borderRadius: 12,
      scanlines: false,
      codeTexture: false,
    },
  },

  // Layout defaults
  layout: {
    defaultAlignment: 'center',
    paddingX: 40,
    paddingY: 40,
  },

  // Export settings
  export: {
    defaultSize: { width: 1280, height: 720 },
    supportsSvg: false, // Pixel art doesn't export well to SVG
  },
};
