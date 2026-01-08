import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WidgetConfig, WidgetCatalog } from '@fligen/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory
const WIDGETS_DIR = path.join(__dirname, '../../../../assets/widgets');
const CATALOG_FILE = path.join(WIDGETS_DIR, 'index.json');

/**
 * Ensure widgets directory exists
 */
async function ensureWidgetsDir(): Promise<void> {
  await fs.mkdir(WIDGETS_DIR, { recursive: true });
}

/**
 * Load widget catalog from disk
 */
async function loadCatalog(): Promise<WidgetCatalog> {
  await ensureWidgetsDir();

  try {
    const data = await fs.readFile(CATALOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If catalog doesn't exist, return empty
    return { widgets: [] };
  }
}

/**
 * Save widget catalog to disk
 */
async function saveCatalog(catalog: WidgetCatalog): Promise<void> {
  await ensureWidgetsDir();
  await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');
}

/**
 * Generate next widget ID
 */
function generateWidgetId(catalog: WidgetCatalog): string {
  const count = catalog.widgets.length;
  return `widget-${String(count + 1).padStart(3, '0')}`;
}

/**
 * Extract preview text from params
 */
function extractPreview(params: Record<string, any>): string {
  // Try common fields
  if (params.post_text) {
    return params.post_text.substring(0, 100);
  }
  if (params.text) {
    return params.text.substring(0, 100);
  }
  if (params.title) {
    return params.title.substring(0, 100);
  }
  return 'Widget';
}

/**
 * Save widget HTML and configuration to disk
 */
export async function saveWidget(
  templateId: string,
  params: Record<string, any>,
  html: string
): Promise<{ id: string; htmlPath: string; configPath: string; preview: string }> {
  await ensureWidgetsDir();

  // Load catalog and generate ID
  const catalog = await loadCatalog();
  const id = generateWidgetId(catalog);

  // File paths
  const htmlFilename = `${id}.html`;
  const configFilename = `${id}.json`;
  const htmlPath = path.join(WIDGETS_DIR, htmlFilename);
  const configPath = path.join(WIDGETS_DIR, configFilename);

  // Save HTML file
  await fs.writeFile(htmlPath, html, 'utf-8');

  // Create config
  const config: WidgetConfig = {
    id,
    template: templateId,
    created: new Date().toISOString(),
    preview: extractPreview(params),
    params,
  };

  // Save config file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // Update catalog
  catalog.widgets.push(config);
  await saveCatalog(catalog);

  return {
    id,
    htmlPath: `/assets/widgets/${htmlFilename}`,
    configPath: `/assets/widgets/${configFilename}`,
    preview: config.preview,
  };
}

/**
 * List all widgets
 */
export async function listWidgets(): Promise<WidgetConfig[]> {
  const catalog = await loadCatalog();
  return catalog.widgets;
}

/**
 * Get widget by ID
 */
export async function getWidget(
  id: string
): Promise<{ config: WidgetConfig; html: string } | null> {
  const catalog = await loadCatalog();
  const config = catalog.widgets.find((w) => w.id === id);

  if (!config) {
    return null;
  }

  const htmlPath = path.join(WIDGETS_DIR, `${id}.html`);
  try {
    const html = await fs.readFile(htmlPath, 'utf-8');
    return { config, html };
  } catch (error) {
    return null;
  }
}

/**
 * Delete widget by ID
 */
export async function deleteWidget(id: string): Promise<boolean> {
  const catalog = await loadCatalog();
  const index = catalog.widgets.findIndex((w) => w.id === id);

  if (index === -1) {
    return false;
  }

  // Remove from catalog
  catalog.widgets.splice(index, 1);
  await saveCatalog(catalog);

  // Delete files
  const htmlPath = path.join(WIDGETS_DIR, `${id}.html`);
  const configPath = path.join(WIDGETS_DIR, `${id}.json`);

  try {
    await fs.unlink(htmlPath);
  } catch (error) {
    // Ignore if file doesn't exist
  }

  try {
    await fs.unlink(configPath);
  } catch (error) {
    // Ignore if file doesn't exist
  }

  return true;
}
