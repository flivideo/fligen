// KIE.AI client for image generation

import type { ProviderHealth, ProviderTestResult, KieTaskResponse, KieTaskResult, KieCreditResponse, CompareResult, ModelTier, ModelConfig } from './types.js';
import { MODELS } from './types.js';

const BASE_URL = 'https://api.kie.ai';
const TIMEOUT_MS = 10000; // 10 seconds for individual requests
const MAX_POLL_TIME = 60000; // 60 seconds max wait for image generation
const POLL_INTERVAL = 2000; // 2 seconds between polls

// Test prompt for connectivity verification
const TEST_PROMPT = 'A simple red cube on a white background';

/**
 * Get KIE.AI API key from environment
 */
function getApiKey(): string | null {
  const key = process.env.KIE_API_KEY;
  if (!key || key === 'your_kie_api_key_here') {
    return null;
  }
  return key;
}

/**
 * Check if KIE.AI is configured
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Make an authenticated request to KIE.AI
 */
async function kieRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[KIE.AI] Request: ${method} ${endpoint}`);
    if (body) {
      console.log(`[KIE.AI] Body: ${JSON.stringify(body)}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[KIE.AI] Response: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        throw new Error('AUTH_ERROR: Authentication failed. Check your KIE_API_KEY.');
      }
      if (response.status === 402) {
        throw new Error('CREDITS_ERROR: Insufficient credits. Top up at https://kie.ai');
      }
      if (response.status === 429) {
        throw new Error('RATE_LIMIT: Rate limited. Try again later.');
      }
      throw new Error(`API_ERROR: KIE.AI returned ${response.status}`);
    }

    const data = await response.json() as T;
    console.log(`[KIE.AI] Response: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT: Request to KIE.AI timed out.');
      }
      throw error;
    }
    throw new Error('UNKNOWN_ERROR: An unexpected error occurred');
  }
}

/**
 * Check credit balance (verifies authentication)
 */
async function checkCredits(): Promise<number> {
  console.log('[KIE.AI] Health check: Checking credits...');
  const response = await kieRequest<KieCreditResponse>('GET', '/api/v1/chat/credit');
  if (response.code !== 200) {
    throw new Error(`API returned code ${response.code}: ${response.msg}`);
  }
  console.log(`[KIE.AI] Health check: Credits = ${response.data}`);
  return response.data;
}

/**
 * Check KIE.AI health status
 */
export async function checkHealth(): Promise<ProviderHealth> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('[KIE.AI] Health check: Not configured');
    return {
      configured: false,
      authenticated: false,
      error: 'KIE_API_KEY not configured. Get your key at https://kie.ai/api-key',
    };
  }

  try {
    const credits = await checkCredits();
    console.log('[KIE.AI] Health check: Authenticated');
    return {
      configured: true,
      authenticated: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[KIE.AI] Health check error: ${message}`);

    if (message.includes('AUTH_ERROR')) {
      return {
        configured: true,
        authenticated: false,
        error: 'Authentication failed. Check your KIE_API_KEY.',
      };
    }

    if (message.includes('CREDITS_ERROR')) {
      return {
        configured: true,
        authenticated: true, // Auth worked, just no credits
        error: 'Authenticated but no credits. Top up at https://kie.ai',
      };
    }

    if (message.includes('RATE_LIMIT')) {
      return {
        configured: true,
        authenticated: false,
        error: 'Rate limited. Try again later.',
      };
    }

    return {
      configured: true,
      authenticated: false,
      error: `Connection error: ${message}`,
    };
  }
}

/**
 * Poll for task completion
 */
async function pollForResult(taskId: string): Promise<string> {
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    pollCount++;
    console.log(`[KIE.AI] Poll #${pollCount} for task ${taskId}...`);

    const result = await kieRequest<KieTaskResult>(
      'GET',
      `/api/v1/flux/kontext/record-info?taskId=${taskId}`
    );

    if (result.code !== 200) {
      throw new Error(`API error: ${result.msg}`);
    }

    const { successFlag, status, response, errorMessage, progress } = result.data;
    console.log(`[KIE.AI] Task status: successFlag=${successFlag}, status=${status}, progress=${progress}`);

    // Check for success (successFlag: 1 or status: 'SUCCESS')
    if (successFlag === 1 || status === 'SUCCESS') {
      const imageUrl = response?.resultImageUrl || response?.resultUrls?.[0];
      if (imageUrl) {
        console.log(`[KIE.AI] Task complete! Image URL = ${imageUrl}`);
        return imageUrl;
      }
      throw new Error('No image URL in response');
    }

    // Check for failure (successFlag: 2 or 3)
    if (successFlag === 2 || successFlag === 3 ||
        status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
      console.log(`[KIE.AI] Task failed: ${errorMessage}`);
      throw new Error(errorMessage || 'Image generation failed');
    }

    // Still generating, wait and poll again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Timeout waiting for image generation');
}

/**
 * Generate a test image to verify end-to-end connectivity
 */
export async function generateTestImage(): Promise<ProviderTestResult> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  if (!apiKey) {
    console.log('[KIE.AI] Generate: Not configured');
    return {
      success: false,
      error: 'KIE_API_KEY not configured. Get your key at https://kie.ai/api-key',
      durationMs: Date.now() - startTime,
    };
  }

  try {
    console.log('[KIE.AI] Generate: Starting image generation...');
    console.log(`[KIE.AI] Generate: Prompt = "${TEST_PROMPT}"`);

    // Submit generation task using Flux Kontext (cheapest option)
    const submitResponse = await kieRequest<KieTaskResponse>(
      'POST',
      '/api/v1/flux/kontext/generate',
      {
        prompt: TEST_PROMPT,
        model: 'flux-kontext-pro',
        aspectRatio: '1:1', // Square for simplicity
        outputFormat: 'jpeg',
      }
    );

    if (submitResponse.code !== 200 || !submitResponse.data?.taskId) {
      console.log(`[KIE.AI] Generate: Failed to submit - ${submitResponse.msg}`);
      return {
        success: false,
        error: `Failed to submit task: ${submitResponse.msg}`,
        durationMs: Date.now() - startTime,
      };
    }

    const taskId = submitResponse.data.taskId;
    console.log(`[KIE.AI] Generate: Task submitted, ID = ${taskId}`);

    // Poll for result
    const imageUrl = await pollForResult(taskId);

    const durationMs = Date.now() - startTime;
    console.log(`[KIE.AI] Generate: Success in ${durationMs}ms`);

    return {
      success: true,
      imageUrl,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[KIE.AI] Generate: Error = ${message}`);

    if (message.includes('AUTH_ERROR')) {
      return {
        success: false,
        error: 'Authentication failed. Check your KIE_API_KEY.',
        durationMs,
      };
    }

    if (message.includes('CREDITS_ERROR')) {
      return {
        success: false,
        error: 'Insufficient credits. Top up at https://kie.ai',
        durationMs,
      };
    }

    if (message.includes('RATE_LIMIT')) {
      return {
        success: false,
        error: 'Rate limited. Try again in a few seconds.',
        durationMs,
      };
    }

    return {
      success: false,
      error: `Generation failed: ${message}`,
      durationMs,
    };
  }
}

/**
 * Poll for task completion with a specific endpoint
 */
async function pollForResultGeneric(taskId: string, endpoint: string): Promise<string> {
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    pollCount++;
    console.log(`[KIE.AI] Poll #${pollCount} for task ${taskId}...`);

    const result = await kieRequest<KieTaskResult>(
      'GET',
      `${endpoint}?taskId=${taskId}`
    );

    if (result.code !== 200) {
      throw new Error(`API error: ${result.msg}`);
    }

    const { successFlag, status, response, errorMessage, progress } = result.data;
    console.log(`[KIE.AI] Task status: successFlag=${successFlag}, status=${status}, progress=${progress}`);

    // Check for success (successFlag: 1 or status: 'SUCCESS')
    if (successFlag === 1 || status === 'SUCCESS') {
      const imageUrl = response?.resultImageUrl || response?.resultUrls?.[0];
      if (imageUrl) {
        console.log(`[KIE.AI] Task complete! Image URL = ${imageUrl}`);
        return imageUrl;
      }
      throw new Error('No image URL in response');
    }

    // Check for failure (successFlag: 2 or 3)
    if (successFlag === 2 || successFlag === 3 ||
        status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
      console.log(`[KIE.AI] Task failed: ${errorMessage}`);
      throw new Error(errorMessage || 'Image generation failed');
    }

    // Still generating, wait and poll again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Timeout waiting for image generation');
}

/**
 * Generate image for comparison (supports multiple models)
 */
export async function generateForComparison(
  prompt: string,
  tier: ModelTier
): Promise<CompareResult> {
  const config = MODELS.kie[tier];
  const startTime = Date.now();

  const baseResult: CompareResult = {
    provider: 'kie',
    tier,
    model: config.name,
    durationMs: 0,
    estimatedCost: config.costPerImage ?? 0,
    resolution: { width: config.width, height: config.height },
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ...baseResult,
      durationMs: Date.now() - startTime,
      error: 'KIE_API_KEY not configured',
    };
  }

  try {
    console.log(`[KIE.AI] Compare: Generating ${tier} image with ${config.name}...`);
    console.log(`[KIE.AI] Compare: Model ID = ${config.id}, Size = ${config.width}x${config.height}`);

    // Use Flux Kontext API for both models
    const aspectRatio = config.width === config.height ? '1:1' : '16:9';

    const submitResponse = await kieRequest<KieTaskResponse>(
      'POST',
      '/api/v1/flux/kontext/generate',
      {
        prompt,
        model: config.id,
        aspectRatio,
        outputFormat: 'jpeg',
      }
    );

    if (submitResponse.code !== 200 || !submitResponse.data?.taskId) {
      return {
        ...baseResult,
        durationMs: Date.now() - startTime,
        error: `Failed to submit task: ${submitResponse.msg}`,
      };
    }

    const taskId = submitResponse.data.taskId;
    console.log(`[KIE.AI] Compare (${tier}): Task submitted, ID = ${taskId}`);

    // Poll for result
    const imageUrl = await pollForResultGeneric(taskId, '/api/v1/flux/kontext/record-info');

    const durationMs = Date.now() - startTime;
    console.log(`[KIE.AI] Compare (${tier}): Success in ${durationMs}ms`);

    return {
      ...baseResult,
      imageUrl,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[KIE.AI] Compare (${tier}): Error = ${message}`);

    return {
      ...baseResult,
      durationMs,
      error: `Generation failed: ${message}`,
    };
  }
}
