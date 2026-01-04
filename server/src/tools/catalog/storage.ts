import fs from 'fs/promises';
import path from 'path';
import type { Asset, AssetCatalog } from '@fligen/shared';

// Resolve assets directory (one level up from server workspace)
const ASSETS_DIR = path.resolve(process.cwd(), '..', 'assets');
const CATALOG_DIR = path.join(ASSETS_DIR, 'catalog');
const INDEX_FILE = path.join(CATALOG_DIR, 'index.json');

// Initialize catalog
export async function initCatalog(): Promise<void> {
  await fs.mkdir(path.join(CATALOG_DIR, 'images'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'videos'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'music'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'narration'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'thumbnails'), { recursive: true });
  await fs.mkdir(path.join(CATALOG_DIR, 'n8n'), { recursive: true });

  const exists = await fs.access(INDEX_FILE).then(() => true).catch(() => false);
  if (!exists) {
    const initialCatalog: AssetCatalog = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      assets: [],
    };
    await fs.writeFile(INDEX_FILE, JSON.stringify(initialCatalog, null, 2));
  }
}

// Load catalog
export async function loadCatalog(): Promise<AssetCatalog> {
  const data = await fs.readFile(INDEX_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save catalog
async function saveCatalog(catalog: AssetCatalog): Promise<void> {
  catalog.lastUpdated = new Date().toISOString();
  await fs.writeFile(INDEX_FILE, JSON.stringify(catalog, null, 2));
}

// Add asset
export async function addAsset(asset: Asset): Promise<Asset> {
  const catalog = await loadCatalog();
  catalog.assets.push(asset);
  await saveCatalog(catalog);
  return asset;
}

// Update asset
export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | null> {
  const catalog = await loadCatalog();
  const index = catalog.assets.findIndex(a => a.id === id);
  if (index === -1) return null;

  catalog.assets[index] = { ...catalog.assets[index], ...updates };
  await saveCatalog(catalog);
  return catalog.assets[index];
}

// Get asset by ID
export async function getAsset(id: string): Promise<Asset | null> {
  const catalog = await loadCatalog();
  return catalog.assets.find(a => a.id === id) || null;
}

// Get all assets
export async function getAllAssets(): Promise<Asset[]> {
  const catalog = await loadCatalog();
  return catalog.assets;
}

// Filter assets
export async function filterAssets(filter: {
  type?: Asset['type'];
  provider?: string;
  status?: Asset['status'];
  tags?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<Asset[]> {
  const catalog = await loadCatalog();
  return catalog.assets.filter(asset => {
    if (filter.type && asset.type !== filter.type) return false;
    if (filter.provider && asset.provider !== filter.provider) return false;
    if (filter.status && asset.status !== filter.status) return false;
    if (filter.tags && !filter.tags.every(t => asset.tags?.includes(t))) return false;
    if (filter.startDate && asset.createdAt < filter.startDate) return false;
    if (filter.endDate && asset.createdAt > filter.endDate) return false;
    return true;
  });
}

// Delete asset
export async function deleteAsset(id: string): Promise<boolean> {
  const catalog = await loadCatalog();
  const index = catalog.assets.findIndex(a => a.id === id);
  if (index === -1) return false;

  const asset = catalog.assets[index];

  // Delete file
  const filePath = path.join(CATALOG_DIR, asset.type + 's', asset.filename);
  await fs.unlink(filePath).catch(() => {}); // Ignore errors

  // Remove from catalog
  catalog.assets.splice(index, 1);
  await saveCatalog(catalog);
  return true;
}

// Generate unique asset ID
export function generateAssetId(type: Asset['type']): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `asset_${type}_${timestamp}_${random}`;
}

// Generate filename
export function generateFilename(type: Asset['type'], provider: string, model: string, extension: string): string {
  const id = Date.now();
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  return `${type}-${id}-${provider}-${modelSlug}.${extension}`;
}

// Get next N8N workflow number
export async function getNextWorkflowNumber(): Promise<string> {
  const catalog = await loadCatalog();

  // Find all N8N workflow IDs in metadata
  const workflowNumbers = catalog.assets
    .filter(asset => asset.metadata?.workflowId)
    .map(asset => parseInt(asset.metadata.workflowId, 10))
    .filter(num => !isNaN(num));

  const maxNumber = workflowNumbers.length > 0 ? Math.max(...workflowNumbers) : 0;
  const nextNumber = maxNumber + 1;

  return nextNumber.toString().padStart(4, '0'); // 0001, 0002, etc.
}
