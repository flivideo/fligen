// LocalDocs - Local documentation reader for FliGen
// Exposes project documentation to the Claude agent

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { scanDocsDirectory } from './scanner.js';
import { readFileContent } from './reader.js';

/**
 * Tool: local_docs_index
 * Lists all markdown documentation files in the project docs folder.
 */
const localDocsIndexTool = tool(
  'local_docs_index',
  'List all markdown documentation files in the project docs folder with metadata (path, name, size, modified date). Use this to discover what documentation is available before reading specific files.',
  {},
  async () => {
    try {
      const result = await scanDocsDirectory();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error scanning docs directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Tool: local_docs_content
 * Reads contents of a specific markdown documentation file with chunking support.
 */
const localDocsContentTool = tool(
  'local_docs_content',
  'Read contents of a specific markdown documentation file from the project docs folder. Supports chunking for large files (500 lines per chunk). Use the path from local_docs_index results.',
  {
    path: z.string().describe('Relative path to file (e.g., "docs/backlog.md" or "backlog.md")'),
    chunk: z.number().optional().describe('Chunk number for large files (1-based). Defaults to 1.'),
  },
  async ({ path, chunk }) => {
    try {
      const result = await readFileContent(path, chunk);

      // Check if it's an error response
      if ('error' in result) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: result.error, code: result.code }, null, 2),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Creates the LocalDocs MCP server with all tools.
 * This server runs in-process with the SDK.
 */
export function createLocalDocsServer() {
  return createSdkMcpServer({
    name: 'local_docs',
    version: '1.0.0',
    tools: [localDocsIndexTool, localDocsContentTool],
  });
}

// Export individual tool definitions for testing
export { localDocsIndexTool, localDocsContentTool };
