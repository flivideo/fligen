// Directory scanner for Kybernesis
// Recursively scans docs folder for .md files

import fs from 'fs/promises';
import path from 'path';
import { DOCS_BASE } from './security.js';

export interface FileInfo {
  path: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface IndexResult {
  basePath: string;
  files: FileInfo[];
  totalFiles: number;
  totalSize: number;
}

/**
 * Recursively scans the docs directory for .md files.
 * Returns metadata for each file found.
 */
export async function scanDocsDirectory(): Promise<IndexResult> {
  const files: FileInfo[] = [];

  try {
    await scanDirectory(DOCS_BASE, files);
  } catch (error) {
    // If docs directory doesn't exist, return empty result
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        basePath: 'docs',
        files: [],
        totalFiles: 0,
        totalSize: 0,
      };
    }
    throw error;
  }

  // Sort files by path for consistent output
  files.sort((a, b) => a.path.localeCompare(b.path));

  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);

  return {
    basePath: 'docs',
    files,
    totalFiles: files.length,
    totalSize,
  };
}

/**
 * Recursively scan a directory and collect .md file info.
 */
async function scanDirectory(dirPath: string, files: FileInfo[]): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      await scanDirectory(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Get file stats
      const stats = await fs.stat(fullPath);

      // Create relative path from DOCS_BASE
      const relativePath = path.relative(DOCS_BASE, fullPath);

      files.push({
        path: `docs/${relativePath}`,
        name: entry.name,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
    // Skip symlinks and other file types for security
  }
}
