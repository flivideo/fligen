// Kybernesis - Second brain memory integration for FliGen
// Exposes persistent memory search and storage to the Claude agent

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { searchMemories, storeMemory, isConfigured } from './client.js';

/**
 * Tool: kybernesis_search
 * Search memories and knowledge from the Kybernesis second brain.
 */
const kybernesisSearchTool = tool(
  'kybernesis_search',
  'Search memories and knowledge from the Kybernesis second brain. Use this to find relevant context, past learnings, and stored insights. Results include relevance scores for ranking.',
  {
    query: z.string().describe('Search query for memory retrieval'),
    limit: z.number().optional().describe('Max results to return (default 10)'),
  },
  async ({ query, limit }) => {
    // Check configuration first
    if (!isConfigured()) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Kybernesis not configured. Set KYBERNESIS_API_KEY in .env.',
              code: 'CONFIG_ERROR',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await searchMemories(query, limit ?? 10);
      return {
        content: [
          {
            type: 'text' as const,
            text: result.text,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = message.split(':')[0] || 'UNKNOWN_ERROR';

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: message,
              code,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Tool: kybernesis_store
 * Store new memories in the Kybernesis second brain.
 */
const kybernesisStoreTool = tool(
  'kybernesis_store',
  'Store a new memory or insight in the Kybernesis second brain. Use this to save important learnings, user preferences, or context for future reference.',
  {
    content: z.string().min(1).describe('Content to store in memory'),
    title: z.string().optional().describe('Optional title for the memory'),
    tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
  },
  async ({ content, title, tags }) => {
    // Check configuration first
    if (!isConfigured()) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Kybernesis not configured. Set KYBERNESIS_API_KEY in .env.',
              code: 'CONFIG_ERROR',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await storeMemory(content, title, tags);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = message.split(':')[0] || 'UNKNOWN_ERROR';

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: message,
              code,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Creates the Kybernesis MCP server with all tools.
 * This server runs in-process with the SDK.
 */
export function createKybernesisServer() {
  return createSdkMcpServer({
    name: 'kybernesis',
    version: '1.0.0',
    tools: [kybernesisSearchTool, kybernesisStoreTool],
  });
}

/**
 * Check if Kybernesis is available (configured)
 */
export { isConfigured as isKybernesisConfigured };

// Export individual tool definitions for testing
export { kybernesisSearchTool, kybernesisStoreTool };
