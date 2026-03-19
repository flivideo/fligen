/**
 * Widget API Routes
 * FR-23: Widget generation and management
 */

import { Router } from 'express';
import {
  WIDGET_TEMPLATES,
  getTemplate,
  renderWidget,
  saveWidget,
  listWidgets,
  getWidget,
  deleteWidget,
} from '../tools/widgets/index.js';
import type { SaveWidgetRequest, SaveWidgetResponse } from '@fligen/shared';

const router = Router();

// Get all widget templates
router.get('/widget-templates', (_req, res) => {
  try {
    res.json({ templates: WIDGET_TEMPLATES });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to get templates:', message);
    res.status(500).json({ error: message });
  }
});

// Get specific template by ID
router.get('/widget-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const template = getTemplate(id);

    if (!template) {
      res.status(404).json({ error: `Template not found: ${id}` });
      return;
    }

    res.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to get template:', message);
    res.status(500).json({ error: message });
  }
});

// List all saved widgets
router.get('/widgets', async (_req, res) => {
  try {
    const widgets = await listWidgets();
    res.json({ widgets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to list widgets:', message);
    res.status(500).json({ error: message });
  }
});

// Save new widget
router.post('/widgets', async (req, res) => {
  try {
    const { template, params } = req.body as SaveWidgetRequest;

    if (!template || !params) {
      res.status(400).json({ error: 'Missing template or params' });
      return;
    }

    // Validate template exists
    const templateDef = getTemplate(template);
    if (!templateDef) {
      res.status(400).json({ error: `Unknown template: ${template}` });
      return;
    }

    // Render HTML
    const html = renderWidget(template, params);

    // Save to disk
    const result = await saveWidget(template, params, html);

    const response: SaveWidgetResponse = result;
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to save widget:', message);
    res.status(500).json({ error: message });
  }
});

// Get widget by ID (returns both HTML and config)
router.get('/widgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const widget = await getWidget(id);

    if (!widget) {
      res.status(404).json({ error: `Widget not found: ${id}` });
      return;
    }

    res.json(widget);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to get widget:', message);
    res.status(500).json({ error: message });
  }
});

// Delete widget by ID
router.delete('/widgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteWidget(id);

    if (!success) {
      res.status(404).json({ error: `Widget not found: ${id}` });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Widget] Failed to delete widget:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
