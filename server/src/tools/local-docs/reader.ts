// File reader with chunking for Kybernesis
// Handles large files by splitting into chunks

import fs from 'fs/promises';
import { validatePath } from './security.js';

// Maximum lines per chunk
const LINES_PER_CHUNK = 500;

export interface ContentResult {
  path: string;
  content: string;
  totalLines: number;
  chunk: number;
  totalChunks: number;
}

export interface ContentError {
  error: string;
  code: string;
}

export type ReadResult = ContentResult | ContentError;

/**
 * Read file contents with chunking support.
 *
 * @param requestedPath - Relative path to file (e.g., "docs/backlog.md" or "backlog.md")
 * @param chunk - Optional chunk number (1-based). Defaults to 1.
 */
export async function readFileContent(
  requestedPath: string,
  chunk: number = 1
): Promise<ReadResult> {
  // Validate the path is safe to access
  const validation = await validatePath(requestedPath);

  if (!validation.valid) {
    return {
      error: validation.error.message,
      code: validation.error.code,
    };
  }

  // Read the file
  const content = await fs.readFile(validation.realPath, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Calculate chunking
  const totalChunks = Math.ceil(totalLines / LINES_PER_CHUNK);

  // Validate chunk number
  if (chunk < 1) {
    return {
      error: 'Chunk number must be >= 1',
      code: 'INVALID_CHUNK',
    };
  }

  if (chunk > totalChunks && totalChunks > 0) {
    return {
      error: `Chunk ${chunk} does not exist. File has ${totalChunks} chunks.`,
      code: 'INVALID_CHUNK',
    };
  }

  // Extract the requested chunk
  const startLine = (chunk - 1) * LINES_PER_CHUNK;
  const endLine = Math.min(startLine + LINES_PER_CHUNK, totalLines);
  const chunkLines = lines.slice(startLine, endLine);
  const chunkContent = chunkLines.join('\n');

  // Normalize the path for response (ensure it has docs/ prefix)
  let normalizedPath = requestedPath;
  if (!normalizedPath.startsWith('docs/')) {
    normalizedPath = `docs/${normalizedPath}`;
  }

  return {
    path: normalizedPath,
    content: chunkContent,
    totalLines,
    chunk,
    totalChunks,
  };
}
