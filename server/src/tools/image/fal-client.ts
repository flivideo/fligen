// FAL.AI client for image generation

import { fal } from '@fal-ai/client';
import type { ProviderHealth, ProviderTestResult, CompareResult, ModelTier, ModelConfig } from './types.js';
import { MODELS } from './types.js';

// FAL.AI response type
interface FalImageData {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  timings?: {
    inference: number;
  };
  seed?: number;
  has_nsfw_concepts?: boolean[];
  prompt?: string;
}

// FAL.AI subscribe response wrapper
interface FalSubscribeResult {
  data: FalImageData;
  requestId: string;
}

// Test prompt for connectivity verification
const TEST_PROMPT = 'A simple red cube on a white background';

/**
 * Get FAL.AI API key from environment
 */
function getApiKey(): string | null {
  const key = process.env.FAL_API_KEY;
  if (!key || key === 'your_fal_api_key_here') {
    return null;
  }
  return key;
}

/**
 * Check if FAL.AI is configured
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Check FAL.AI health status
 */
export async function checkHealth(): Promise<ProviderHealth> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('[FAL.AI] Health check: Not configured');
    return {
      configured: false,
      authenticated: false,
      error: 'FAL_API_KEY not configured. Get your key at https://fal.ai/dashboard/keys',
    };
  }

  // Configure the client
  fal.config({ credentials: apiKey });

  try {
    console.log('[FAL.AI] Health check: Testing authentication...');

    // Use a simple API call to verify authentication
    // We intentionally use invalid params to trigger a validation error
    // If we get a validation error, auth worked. If we get 401, auth failed.
    await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt: 'test',
        num_images: 0, // Invalid - will trigger validation error
      },
    });

    // If we somehow succeed, auth definitely worked
    console.log('[FAL.AI] Health check: Authenticated (unexpected success)');
    return {
      configured: true,
      authenticated: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[FAL.AI] Health check error: ${message}`);

    // Check for auth-specific errors
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('authentication')) {
      console.log('[FAL.AI] Health check: Authentication failed');
      return {
        configured: true,
        authenticated: false,
        error: 'Authentication failed. Check your FAL_API_KEY.',
      };
    }

    // Check for rate limit
    if (message.includes('429') || message.includes('rate limit')) {
      console.log('[FAL.AI] Health check: Rate limited');
      return {
        configured: true,
        authenticated: false,
        error: 'Rate limited. Try again later.',
      };
    }

    // Validation errors (422 Unprocessable Entity) mean auth worked
    // The API rejected our invalid request, but authenticated us first
    if (message.includes('Unprocessable') || message.includes('422') ||
        message.includes('validation') || message.includes('invalid')) {
      console.log('[FAL.AI] Health check: Authenticated (validation error = auth worked)');
      return {
        configured: true,
        authenticated: true,
      };
    }

    console.log('[FAL.AI] Health check: Connection error');
    return {
      configured: true,
      authenticated: false,
      error: `Connection error: ${message}`,
    };
  }
}

/**
 * Generate a test image to verify end-to-end connectivity
 */
export async function generateTestImage(): Promise<ProviderTestResult> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  if (!apiKey) {
    console.log('[FAL.AI] Generate: Not configured');
    return {
      success: false,
      error: 'FAL_API_KEY not configured. Get your key at https://fal.ai/dashboard/keys',
      durationMs: Date.now() - startTime,
    };
  }

  // Configure the client
  fal.config({ credentials: apiKey });

  try {
    console.log('[FAL.AI] Generate: Starting image generation...');
    console.log(`[FAL.AI] Generate: Prompt = "${TEST_PROMPT}"`);

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt: TEST_PROMPT,
        image_size: 'square_hd', // 1024x1024
        num_images: 1,
        num_inference_steps: 4, // Flux Schnell uses 1-4 steps
        enable_safety_checker: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[FAL.AI] Queue update: ${JSON.stringify(update)}`);
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[FAL.AI] Generate: Raw response = ${JSON.stringify(result)}`);

    // Type assertion after logging - FAL returns { data: {...}, requestId: "..." }
    const output = result as unknown as FalSubscribeResult;

    // Check for images in data property (FAL.AI response structure)
    if (output.data?.images && output.data.images.length > 0) {
      const imageUrl = output.data.images[0].url;
      console.log(`[FAL.AI] Generate: Success! Image URL = ${imageUrl}`);
      return {
        success: true,
        imageUrl,
        durationMs,
      };
    }

    console.log('[FAL.AI] Generate: No images in response');
    return {
      success: false,
      error: `No image returned from FAL.AI. Response: ${JSON.stringify(result)}`,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[FAL.AI] Generate: Error = ${message}`);

    if (message.includes('401') || message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Authentication failed. Check your FAL_API_KEY.',
        durationMs,
      };
    }

    if (message.includes('429') || message.includes('rate limit')) {
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
 * Calculate cost based on megapixels
 */
function calculateCost(config: ModelConfig): number {
  const megapixels = (config.width * config.height) / 1_000_000;
  return (config.costPer1MP ?? 0) * megapixels;
}

/**
 * Generate image for comparison (supports multiple models)
 */
export async function generateForComparison(
  prompt: string,
  tier: ModelTier
): Promise<CompareResult> {
  const config = MODELS.fal[tier];
  const startTime = Date.now();

  const baseResult: CompareResult = {
    provider: 'fal',
    tier,
    model: config.name,
    durationMs: 0,
    estimatedCost: calculateCost(config),
    resolution: { width: config.width, height: config.height },
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ...baseResult,
      durationMs: Date.now() - startTime,
      error: 'FAL_API_KEY not configured',
    };
  }

  fal.config({ credentials: apiKey });

  try {
    console.log(`[FAL.AI] Compare: Generating ${tier} image with ${config.name}...`);
    console.log(`[FAL.AI] Compare: Model ID = ${config.id}, Size = ${config.width}x${config.height}`);

    const result = await fal.subscribe(config.id, {
      input: {
        prompt,
        image_size: {
          width: config.width,
          height: config.height,
        },
        num_images: 1,
        num_inference_steps: tier === 'advanced' ? 28 : 4,
        enable_safety_checker: false,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[FAL.AI] Compare (${tier}): Queue update = ${JSON.stringify(update)}`);
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[FAL.AI] Compare (${tier}): Raw response = ${JSON.stringify(result)}`);

    const output = result as unknown as FalSubscribeResult;

    if (output.data?.images && output.data.images.length > 0) {
      const image = output.data.images[0];
      console.log(`[FAL.AI] Compare (${tier}): Success! URL = ${image.url}`);
      return {
        ...baseResult,
        imageUrl: image.url,
        durationMs,
        resolution: { width: image.width, height: image.height },
      };
    }

    return {
      ...baseResult,
      durationMs,
      error: 'No image returned from FAL.AI',
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[FAL.AI] Compare (${tier}): Error = ${message}`);

    return {
      ...baseResult,
      durationMs,
      error: `Generation failed: ${message}`,
    };
  }
}
