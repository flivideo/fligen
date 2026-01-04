// FliHub REST API client for FR-13

import type { FliHubTranscriptsResponse, FliHubHealthResponse } from './types.js';

const FLIHUB_BASE_URL = process.env.FLIHUB_BASE_URL || 'http://localhost:5101';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Check if FliHub is running and accessible
 */
export async function checkFliHubHealth(): Promise<FliHubHealthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`${FLIHUB_BASE_URL}/api/system/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: 'error',
        message: `FliHub returned ${response.status}: ${response.statusText}`,
      };
    }

    return {
      status: 'ok',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'error',
          message: 'FliHub request timed out (is it running on port 5101?)',
        };
      }
      return {
        status: 'error',
        message: `FliHub connection failed: ${error.message}`,
      };
    }
    return {
      status: 'error',
      message: 'Unknown error connecting to FliHub',
    };
  }
}

/**
 * Fetch transcripts for multiple segments at once
 *
 * @param projectCode - FliHub project code (e.g., "c04-12-days-of-claudmas-09")
 * @param chapter - Chapter number (e.g., "3")
 * @param segments - Array of segment numbers (e.g., [1, 2, 3])
 */
export async function fetchTranscripts(
  projectCode: string,
  chapter: string,
  segments: number[]
): Promise<FliHubTranscriptsResponse> {
  try {
    const segmentsStr = segments.join(',');
    console.log(`[FliHub] Fetching transcripts for project: ${projectCode}, chapter: ${chapter}, segments: ${segmentsStr}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const url = `${FLIHUB_BASE_URL}/api/query/projects/${encodeURIComponent(projectCode)}/transcripts?chapter=${chapter}&segments=${encodeURIComponent(segmentsStr)}&include=content`;

    console.log(`[FliHub] Request URL: ${url}`);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[FliHub] Request failed: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `FliHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log(`[FliHub] Response:`, data);

    if (data.success && data.transcripts && Array.isArray(data.transcripts)) {
      return {
        success: true,
        transcripts: data.transcripts,
      };
    } else {
      return {
        success: false,
        error: data.error || 'No transcripts found in response',
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[FliHub] Request timed out');
        return {
          success: false,
          error: 'Request timed out (is FliHub running?)',
        };
      }
      console.error(`[FliHub] Error: ${error.message}`);
      return {
        success: false,
        error: `Connection failed: ${error.message}`,
      };
    }
    return {
      success: false,
      error: 'Unknown error fetching transcripts',
    };
  }
}

/**
 * Check if FliHub is configured (base URL is set)
 */
export function isFliHubConfigured(): boolean {
  return !!FLIHUB_BASE_URL;
}

/**
 * Get FliHub base URL
 */
export function getFliHubUrl(): string {
  return FLIHUB_BASE_URL;
}
