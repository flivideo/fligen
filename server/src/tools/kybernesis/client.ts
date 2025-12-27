// Kybernesis MCP client
// Makes MCP protocol calls to the Kybernesis second brain service

import type { SearchResponse, StoreResponse, KybernesisConfig, MemoryResult } from './types.js';

const DEFAULT_CONFIG: Omit<KybernesisConfig, 'apiKey'> = {
  baseUrl: 'https://api.kybernesis.ai',
  timeout: 10000, // 10 seconds
};

/**
 * Get Kybernesis configuration from environment
 */
export function getConfig(): KybernesisConfig | null {
  const apiKey = process.env.KYBERNESIS_API_KEY;

  if (!apiKey || apiKey === 'kb_your_api_key_here') {
    return null;
  }

  return {
    apiKey,
    ...DEFAULT_CONFIG,
  };
}

/**
 * Check if Kybernesis is configured
 */
export function isConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * MCP session state
 */
interface McpSession {
  sessionId: string | null;
  requestId: number;
}

const session: McpSession = {
  sessionId: null,
  requestId: 0,
};

/**
 * Parse SSE response from Kybernesis MCP endpoint
 */
function parseSSEResponse(text: string): unknown {
  // SSE format: "event: message\ndata: {...}\n\n"
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Continue searching
      }
    }
  }
  throw new Error('Could not parse SSE response');
}

/**
 * Call an MCP tool on the Kybernesis server
 */
async function callMcpTool<T>(
  config: KybernesisConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const requestId = ++session.requestId;

    const mcpRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    // Include session ID if we have one
    if (session.sessionId) {
      headers['Mcp-Session-Id'] = session.sessionId;
    }

    const response = await fetch(`${config.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Capture session ID from response headers
    const newSessionId = response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      session.sessionId = newSessionId;
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('AUTH_ERROR: Kybernesis authentication failed. Check KYBERNESIS_API_KEY.');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMIT: Rate limit exceeded. Please wait before retrying.');
      }
      if (response.status >= 500) {
        throw new Error(`SERVER_ERROR: Kybernesis server error (${response.status})`);
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API_ERROR: Kybernesis returned ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    const parsed = parseSSEResponse(text) as {
      result?: { content?: Array<{ type: string; text?: string }> };
      error?: { message: string; code: number };
    };

    // Check for MCP error response
    if (parsed.error) {
      throw new Error(`MCP_ERROR: ${parsed.error.message}`);
    }

    // Extract tool result from MCP response
    // MCP tool results come in content array format
    if (parsed.result?.content) {
      for (const block of parsed.result.content) {
        if (block.type === 'text' && block.text) {
          try {
            return JSON.parse(block.text) as T;
          } catch {
            // Return raw text wrapped
            return { raw: block.text } as T;
          }
        }
      }
    }

    return parsed.result as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT: Cannot reach Kybernesis API. Request timed out.');
      }
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        throw new Error('NETWORK_ERROR: Cannot reach Kybernesis API. Check network connection.');
      }
      throw error;
    }

    throw new Error('UNKNOWN_ERROR: An unexpected error occurred');
  }
}

/**
 * Search response - can be structured or text-based
 */
export interface KybernesisSearchResult {
  query: string;
  text: string;  // Human-readable response from Kybernesis
  raw?: unknown; // Raw response for debugging
}

/**
 * Search memories using the kybernesis_search_memory tool
 * Note: Kybernesis returns human-readable text, not structured JSON
 */
export async function searchMemories(
  query: string,
  limit: number = 10
): Promise<KybernesisSearchResult> {
  const config = getConfig();

  if (!config) {
    throw new Error('CONFIG_ERROR: Kybernesis not configured. Set KYBERNESIS_API_KEY in .env.');
  }

  const response = await callMcpTool<{ raw?: string } | string>(
    config,
    'kybernesis_search_memory',
    { query, limit }
  );

  // Response is either raw text or { raw: text }
  let text: string;
  if (typeof response === 'string') {
    text = response;
  } else if (response && typeof response === 'object' && 'raw' in response) {
    text = response.raw ?? 'No results found';
  } else {
    text = JSON.stringify(response);
  }

  return {
    query,
    text,
    raw: response,
  };
}

/**
 * Store a new memory using the kybernesis_add_memory tool
 */
export async function storeMemory(
  content: string,
  title?: string,
  tags?: string[]
): Promise<StoreResponse> {
  const config = getConfig();

  if (!config) {
    throw new Error('CONFIG_ERROR: Kybernesis not configured. Set KYBERNESIS_API_KEY in .env.');
  }

  const args: Record<string, unknown> = {
    content,
    source: 'chat',
  };

  if (title) {
    args.title = title;
  }

  if (tags && tags.length > 0) {
    args.tags = tags;
  }

  const response = await callMcpTool<{
    success?: boolean;
    id?: string;
    memoryId?: string;
    message?: string;
  }>(config, 'kybernesis_add_memory', args);

  return {
    success: response.success ?? true,
    message: response.message ?? 'Memory stored successfully',
    memoryId: response.memoryId || response.id,
  };
}
