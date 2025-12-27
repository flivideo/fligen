// Path security utilities for Kybernesis
// Prevents path traversal and symlink escape attacks

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded base path - security critical, not configurable via tool input
export const DOCS_BASE = path.resolve(__dirname, '../../../../docs');

export interface SecurityError {
  code: 'PATH_TRAVERSAL' | 'SYMLINK_ESCAPE' | 'INVALID_EXTENSION' | 'FILE_NOT_FOUND' | 'NOT_A_FILE';
  message: string;
}

export type ValidateResult =
  | { valid: true; realPath: string }
  | { valid: false; error: SecurityError };

/**
 * Validates that a requested path is safe to access.
 *
 * Security checks:
 * 1. Normalize path to prevent traversal (../../)
 * 2. Resolve to absolute path and verify within DOCS_BASE
 * 3. Resolve symlinks and verify final path is still within DOCS_BASE
 * 4. Check file extension is .md
 * 5. Verify the path points to a file (not directory)
 */
export async function validatePath(requestedPath: string): Promise<ValidateResult> {
  try {
    // Handle paths with or without "docs/" prefix
    let normalizedInput = requestedPath;

    // Remove leading "docs/" if present since we're already resolving from DOCS_BASE
    if (normalizedInput.startsWith('docs/')) {
      normalizedInput = normalizedInput.slice(5);
    }

    // Normalize to handle ../ and other tricks
    const normalizedPath = path.normalize(normalizedInput);

    // Resolve to full path
    const fullPath = path.resolve(DOCS_BASE, normalizedPath);

    // First check: is the resolved path within DOCS_BASE?
    if (!fullPath.startsWith(DOCS_BASE + path.sep) && fullPath !== DOCS_BASE) {
      return {
        valid: false,
        error: {
          code: 'PATH_TRAVERSAL',
          message: 'Path traversal attempt blocked',
        },
      };
    }

    // Check extension before trying to access file
    if (!fullPath.endsWith('.md')) {
      return {
        valid: false,
        error: {
          code: 'INVALID_EXTENSION',
          message: 'Only .md files are accessible',
        },
      };
    }

    // Try to get file stats - also verifies file exists
    let stats;
    try {
      stats = await fs.lstat(fullPath);
    } catch {
      return {
        valid: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${requestedPath}`,
        },
      };
    }

    // If it's a symlink, resolve and verify
    let realPath = fullPath;
    if (stats.isSymbolicLink()) {
      realPath = await fs.realpath(fullPath);

      // Second check: is the real path (after symlink resolution) within DOCS_BASE?
      if (!realPath.startsWith(DOCS_BASE + path.sep) && realPath !== DOCS_BASE) {
        return {
          valid: false,
          error: {
            code: 'SYMLINK_ESCAPE',
            message: 'Symlink escape attempt blocked',
          },
        };
      }
    }

    // Get stats of the final path
    const finalStats = await fs.stat(realPath);
    if (!finalStats.isFile()) {
      return {
        valid: false,
        error: {
          code: 'NOT_A_FILE',
          message: 'Path is not a file',
        },
      };
    }

    return { valid: true, realPath };
  } catch (error) {
    // Catch-all for unexpected errors
    return {
      valid: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Validates that a path is a valid directory within DOCS_BASE.
 * Used for directory scanning operations.
 */
export async function validateDirectory(requestedPath: string): Promise<ValidateResult> {
  try {
    const normalizedPath = path.normalize(requestedPath);
    const fullPath = path.resolve(DOCS_BASE, normalizedPath);

    // Check if within DOCS_BASE
    if (!fullPath.startsWith(DOCS_BASE) || (fullPath !== DOCS_BASE && !fullPath.startsWith(DOCS_BASE + path.sep))) {
      return {
        valid: false,
        error: {
          code: 'PATH_TRAVERSAL',
          message: 'Path traversal attempt blocked',
        },
      };
    }

    // Check if directory exists
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return {
          valid: false,
          error: {
            code: 'NOT_A_FILE',
            message: 'Path is not a directory',
          },
        };
      }
    } catch {
      return {
        valid: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: `Directory not found: ${requestedPath}`,
        },
      };
    }

    return { valid: true, realPath: fullPath };
  } catch (error) {
    return {
      valid: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
