// Brand Text Generator Type Definitions

export interface TextSegment {
  id: string;
  text: string;
  color: string; // Color key from template
  style?: 'normal' | 'bold' | 'italic';
  newLine?: boolean; // Start this segment on a new line
}

export interface BrickSeamConfig {
  enabled: boolean;
  seamWidth: number;
  seamColor: string;
  intensity: number; // 0-1
}

export interface ShadowConfig {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface BevelConfig {
  enabled: boolean;
  depth: number; // 0-1
  highlightColor: string;
  shadowColor: string;
}

export interface GlowConfig {
  enabled: boolean;
  color: string;
  intensity: number; // 0-1
  spread: number; // px
}

export interface GrainConfig {
  enabled: boolean;
  intensity: number; // 0-1
}

export interface TerminalConfig {
  backgroundColor: string;
  showFrame: boolean;
  showControls: boolean;
  borderRadius: number;
  scanlines: boolean;
  codeTexture: boolean;
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'terminal' | 'none';
  color?: string;
  gradient?: string[];
  terminal?: TerminalConfig;
}

export interface LayoutConfig {
  defaultAlignment: 'left' | 'center' | 'right';
  paddingX: number;
  paddingY: number;
}

export interface ExportConfig {
  defaultSize: { width: number; height: number };
  supportsSvg: boolean;
}

export interface BrandTemplate {
  id: string;
  name: string;
  description: string;

  // Typography
  fontFamily?: string; // If using web fonts instead of pixel rendering
  defaultFontSize: number; // px
  letterSpacing: number; // px between letters
  lineHeight: number; // multiplier

  // Colors
  colors: Record<string, string>;
  defaultColor: string; // Color key

  // Effects
  effects: {
    brickSeams?: BrickSeamConfig;
    shadow?: ShadowConfig;
    bevel?: BevelConfig;
    glow?: GlowConfig;
    grain?: GrainConfig;
  };

  // Background
  background: BackgroundConfig;

  // Layout
  layout: LayoutConfig;

  // Export
  export: ExportConfig;
}

export interface BrandTextConfig {
  templateId: string;
  mode: 'single' | 'multi';
  segments: TextSegment[];
  alignment: 'left' | 'center' | 'right';
  caseTransform: 'original' | 'uppercase' | 'lowercase';
  fontSize: number;
  letterSpacing: number;
  brickSeams: number; // 0-1 intensity
  innerShadow: number; // 0-1 intensity
  bevelDepth: number; // 0-1 intensity
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  terminalEnabled: boolean;
  terminalControls: boolean;
  scanlinesEnabled: boolean;
  scanlinesStrength: number;
  footerEnabled: boolean;
  footerText: string;
  canvasSize: { width: number; height: number };
}

// Preset canvas sizes
export const CANVAS_PRESETS = {
  'youtube-thumb': { width: 1280, height: 720, label: 'YouTube Thumbnail (1280×720)' },
  'square': { width: 1024, height: 1024, label: 'Square (1024×1024)' },
  'portrait': { width: 1080, height: 1920, label: 'Portrait (1080×1920)' },
  'twitter-header': { width: 1500, height: 500, label: 'Twitter Header (1500×500)' },
  'custom': { width: 1280, height: 720, label: 'Custom' },
} as const;

export type CanvasPresetKey = keyof typeof CANVAS_PRESETS;
