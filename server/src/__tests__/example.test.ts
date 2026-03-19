import { describe, it, expect } from 'vitest';

describe('Server environment smoke tests', () => {
  it('Node.js version is v18 or later', () => {
    const major = parseInt(process.version.slice(1), 10);
    expect(major).toBeGreaterThanOrEqual(18);
  });

  it('process.env is an object', () => {
    expect(typeof process.env).toBe('object');
    expect(process.env).not.toBeNull();
  });

  it('JSON serialisation round-trips correctly', () => {
    const obj = { id: 'asset_image_123', type: 'image', status: 'ready' };
    expect(JSON.parse(JSON.stringify(obj))).toEqual(obj);
  });

  it('Date.toISOString produces a valid ISO 8601 string', () => {
    const iso = new Date().toISOString();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
