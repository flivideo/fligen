/**
 * Behaviour tests for filterAssets() and saveStoryToCatalog().
 *
 * Both functions ultimately read/write a single JSON file whose path is
 * determined by module-level constants in catalog/storage.ts (INDEX_FILE).
 * Rather than fighting those constants, we mock `fs/promises` with a tiny
 * in-memory store so the catalog module exercises its real filter/save logic
 * without touching the real filesystem.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory fs/promises mock
// ---------------------------------------------------------------------------

/** The store is keyed by absolute file path. */
const memFs: Map<string, string> = new Map();

vi.mock('fs/promises', () => {
  return {
    default: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockImplementation(async (p: string) => {
        if (!memFs.has(p)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }),
      readFile: vi.fn().mockImplementation(async (p: string) => {
        const content = memFs.get(p);
        if (content === undefined)
          throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
        return content;
      }),
      writeFile: vi.fn().mockImplementation(async (p: string, data: string) => {
        memFs.set(p, data);
      }),
      rename: vi.fn().mockImplementation(async (_src: string, _dst: string) => {
        // For saveStoryToCatalog — just no-op; we don't validate file movement here
      }),
      unlink: vi.fn().mockResolvedValue(undefined),
    },
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockImplementation(async (p: string) => {
      if (!memFs.has(p)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }),
    readFile: vi.fn().mockImplementation(async (p: string) => {
      const content = memFs.get(p);
      if (content === undefined)
        throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
      return content;
    }),
    writeFile: vi.fn().mockImplementation(async (p: string, data: string) => {
      memFs.set(p, data);
    }),
    rename: vi.fn().mockImplementation(async (_src: string, _dst: string) => {}),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

// Import AFTER mocking so the module picks up the mocked fs
import { filterAssets, addAsset, initCatalog, getAllAssets } from '../tools/catalog/storage.js';
import { saveStoryToCatalog } from '../tools/story/storage.js';
import type { Asset } from '@fligen/shared';
import type { AssemblyRequest, AssemblyResult } from '../tools/story/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<Asset>): Asset {
  return {
    id: `asset_${Math.random().toString(36).slice(2)}`,
    type: 'image',
    filename: 'test.png',
    url: '/assets/catalog/images/test.png',
    provider: 'fal',
    model: 'flux-dev',
    prompt: 'test prompt',
    status: 'ready',
    createdAt: '2025-06-01T00:00:00.000Z',
    estimatedCost: 0,
    generationTimeMs: 100,
    metadata: {},
    tags: [],
    ...overrides,
  };
}

async function seedCatalog(assets: Asset[]): Promise<void> {
  // initCatalog creates directories + index.json if it doesn't exist
  await initCatalog();
  for (const asset of assets) {
    await addAsset(asset);
  }
}

beforeEach(() => {
  memFs.clear();
});

// ---------------------------------------------------------------------------
// filterAssets tests
// ---------------------------------------------------------------------------

describe('filterAssets', () => {
  it('empty filter {} returns all assets', async () => {
    await seedCatalog([
      makeAsset({ id: 'a1', type: 'image' }),
      makeAsset({ id: 'a2', type: 'video' }),
      makeAsset({ id: 'a3', type: 'music' }),
    ]);

    const result = await filterAssets({});
    expect(result).toHaveLength(3);
  });

  it('filter by type: image returns only image assets', async () => {
    await seedCatalog([
      makeAsset({ id: 'b1', type: 'image' }),
      makeAsset({ id: 'b2', type: 'video' }),
      makeAsset({ id: 'b3', type: 'image' }),
    ]);

    const result = await filterAssets({ type: 'image' });
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.type === 'image')).toBe(true);
  });

  it('filter by provider: fal returns only fal assets', async () => {
    await seedCatalog([
      makeAsset({ id: 'c1', provider: 'fal' }),
      makeAsset({ id: 'c2', provider: 'kie' }),
      makeAsset({ id: 'c3', provider: 'fal' }),
    ]);

    const result = await filterAssets({ provider: 'fal' });
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.provider === 'fal')).toBe(true);
  });

  it('filter by tags uses AND logic — asset must have ALL specified tags', async () => {
    await seedCatalog([
      makeAsset({ id: 'd1', tags: ['nature', 'forest'] }),
      makeAsset({ id: 'd2', tags: ['nature'] }),         // only one tag
      makeAsset({ id: 'd3', tags: ['forest', 'nature', 'dark'] }),
    ]);

    const result = await filterAssets({ tags: ['nature', 'forest'] });
    // d1 and d3 have both tags; d2 only has 'nature'
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id).sort()).toEqual(['d1', 'd3'].sort());
  });

  it('filter by startDate excludes assets created before that date', async () => {
    await seedCatalog([
      makeAsset({ id: 'e1', createdAt: '2025-01-01T00:00:00.000Z' }),
      makeAsset({ id: 'e2', createdAt: '2025-06-01T00:00:00.000Z' }),
      makeAsset({ id: 'e3', createdAt: '2025-12-01T00:00:00.000Z' }),
    ]);

    const result = await filterAssets({ startDate: '2025-06-01T00:00:00.000Z' });
    // startDate filter: asset.createdAt < startDate → exclude
    // e1 (Jan) < Jun → excluded; e2 (Jun) == Jun → included; e3 (Dec) > Jun → included
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id).sort()).toEqual(['e2', 'e3'].sort());
  });

  it('filter by endDate excludes assets created after that date', async () => {
    await seedCatalog([
      makeAsset({ id: 'f1', createdAt: '2025-01-01T00:00:00.000Z' }),
      makeAsset({ id: 'f2', createdAt: '2025-06-01T00:00:00.000Z' }),
      makeAsset({ id: 'f3', createdAt: '2025-12-01T00:00:00.000Z' }),
    ]);

    const result = await filterAssets({ endDate: '2025-06-01T00:00:00.000Z' });
    // endDate filter: asset.createdAt > endDate → exclude
    // f1 < Jun → included; f2 == Jun → included; f3 > Jun → excluded
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id).sort()).toEqual(['f1', 'f2'].sort());
  });
});

// ---------------------------------------------------------------------------
// saveStoryToCatalog tests
// ---------------------------------------------------------------------------

describe('saveStoryToCatalog', () => {
  const assemblyResult: AssemblyResult = {
    success: true,
    outputPath: 'video-scenes/story-123.mp4',
    duration: 30,
    catalogId: 'sto-20250601-abc',
  };

  const assemblyRequest: AssemblyRequest = {
    videos: ['/assets/catalog/videos/clip1.mp4', '/assets/catalog/videos/clip2.mp4'],
    music: { file: '/assets/catalog/music/track.mp3', volume: 0.8 },
    outputName: 'my-story',
  };

  it('saved asset has type: video', async () => {
    await initCatalog();
    const asset = await saveStoryToCatalog(assemblyResult, assemblyRequest);
    expect(asset.type).toBe('video');
  });

  it('saved asset has status: ready', async () => {
    await initCatalog();
    const asset = await saveStoryToCatalog(assemblyResult, assemblyRequest);
    expect(asset.status).toBe('ready');
  });

  it('asset appears in catalog after save (getAllAssets returns it)', async () => {
    await initCatalog();
    const asset = await saveStoryToCatalog(assemblyResult, assemblyRequest);

    const all = await getAllAssets();
    const found = all.find((a) => a.id === asset.id);
    expect(found).toBeDefined();
  });

  it('saved asset metadata.type is story', async () => {
    await initCatalog();
    const asset = await saveStoryToCatalog(assemblyResult, assemblyRequest);
    expect(asset.metadata?.type).toBe('story');
  });
});
