// ============================================
// Shared types for Day 8 Thumbnail Generator
// ============================================

// ============================================
// Brand Colors (from AppyDave design system)
// ============================================
export const BRAND = {
  darkBrown: '#342d2d',
  lightBrown: '#ccba9d',
  yellow: '#ffde59',
  white: '#ffffff',
  black: '#000000',
} as const;

export type BrandColor = keyof typeof BRAND;

// ============================================
// Font System (AppyDave Brand Typography)
// ============================================
export const FONTS = {
  BebasNeue: {
    family: '"Bebas Neue", sans-serif',
    defaultSize: 72,
    weight: 700,
    style: 'normal',
    transform: 'uppercase' as const,
  },
  Oswald: {
    family: '"Oswald", sans-serif',
    defaultSize: 64,
    weight: 700,
    style: 'normal',
    transform: 'uppercase' as const,
  },
  Roboto: {
    family: '"Roboto", sans-serif',
    defaultSize: 56,
    weight: 400,
    style: 'normal',
    transform: 'none' as const,
  },
} as const;

export type FontFamily = keyof typeof FONTS;
export type OverflowMode = 'wrap' | 'scale' | 'scroll';

// ============================================
// Types
// ============================================

export type PresetPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export interface TextPanel {
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
  fontFamily: FontFamily;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  overflow: OverflowMode;
}

export interface OverlayConfig {
  enabled: boolean;
  imageUrl: string | null;
  position: 'bottom-right' | 'bottom-left' | 'center-right';
  scale: number;
}

export interface ThumbnailConfig {
  mainImageUrl: string | null;
  textPanels: TextPanel[];
  overlay: OverlayConfig;
}

export type LayerId = 'background' | 'main-image' | 'text-panels' | 'overlay';

export interface LayerVisibility {
  background: boolean;
  'main-image': boolean;
  'text-panels': boolean;
  overlay: boolean;
}
