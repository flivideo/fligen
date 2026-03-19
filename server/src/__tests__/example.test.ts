// Real behaviour tests have moved to dedicated files:
//   assembler.test.ts  — buildFFmpegArgs() (pure function, no I/O)
//   catalog.test.ts    — filterAssets() and saveStoryToCatalog()
//
// This file is intentionally minimal.  Add integration tests here
// (e.g. HTTP endpoint smoke tests via supertest) as the project grows.

import { describe, it, expect } from 'vitest';

describe('Server smoke test', () => {
  it('process is Node.js', () => {
    expect(typeof process.version).toBe('string');
  });
});
