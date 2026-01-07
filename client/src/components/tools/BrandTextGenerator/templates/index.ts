import { CLAUDE_CODE_BRICK } from './claude-code-brick';
import type { BrandTemplate } from '../types';

// Template Registry
export const TEMPLATES: Record<string, BrandTemplate> = {
  claude_code_brick: CLAUDE_CODE_BRICK,
  // Future templates:
  // openai_minimal: OPENAI_MINIMAL,
  // cursor_terminal: CURSOR_TERMINAL,
  // replit_gradient: REPLIT_GRADIENT,
};

// Helper to get template by ID
export function getTemplate(id: string): BrandTemplate {
  return TEMPLATES[id] || CLAUDE_CODE_BRICK;
}

// Get list of available templates
export function getAvailableTemplates(): BrandTemplate[] {
  return Object.values(TEMPLATES);
}
