import type { WidgetTemplate } from '@fligen/shared';
import {
  socialMediaPostTemplate,
  renderSocialMediaPost,
} from './social-media-post.js';

/**
 * Template registry
 */
export const WIDGET_TEMPLATES: WidgetTemplate[] = [socialMediaPostTemplate];

/**
 * Get template by ID
 */
export function getTemplate(id: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find((t) => t.id === id);
}

/**
 * Render widget HTML based on template ID and parameters
 */
export function renderWidget(templateId: string, params: Record<string, any>): string {
  switch (templateId) {
    case 'social-media-post':
      return renderSocialMediaPost(params);
    default:
      throw new Error(`Unknown template: ${templateId}`);
  }
}
