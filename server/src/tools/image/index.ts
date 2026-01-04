// Image API module - FAL.AI and KIE.AI integration

export * from './types.js';
export * as falClient from './fal-client.js';
export * as kieClient from './kie-client.js';
export { saveImageToCatalog } from './save-to-catalog.js';

import * as falClient from './fal-client.js';
import * as kieClient from './kie-client.js';
import type { ImageApiHealth, ImageTestResult, CompareResponse } from './types.js';

/**
 * Check if FAL.AI is configured
 */
export function isFalConfigured(): boolean {
  return falClient.isConfigured();
}

/**
 * Check if KIE.AI is configured
 */
export function isKieConfigured(): boolean {
  return kieClient.isConfigured();
}

/**
 * Check health status of both image providers
 */
export async function checkHealth(): Promise<ImageApiHealth> {
  const [falHealth, kieHealth] = await Promise.all([
    falClient.checkHealth(),
    kieClient.checkHealth(),
  ]);

  return {
    fal: falHealth,
    kie: kieHealth,
  };
}

/**
 * Generate test images from both providers
 * Runs in parallel for faster results
 */
export async function generateTestImages(): Promise<ImageTestResult> {
  const [falResult, kieResult] = await Promise.all([
    falClient.generateTestImage(),
    kieClient.generateTestImage(),
  ]);

  return {
    fal: falResult,
    kie: kieResult,
  };
}

/**
 * Compare image generation across providers and tiers
 * Generates 4 images in parallel: FAL advanced, FAL midrange, KIE advanced, KIE midrange
 */
export async function compareImages(prompt: string): Promise<CompareResponse> {
  console.log(`[Image Compare] Starting comparison with prompt: "${prompt}"`);

  const results = await Promise.allSettled([
    falClient.generateForComparison(prompt, 'advanced'),
    falClient.generateForComparison(prompt, 'midrange'),
    kieClient.generateForComparison(prompt, 'advanced'),
    kieClient.generateForComparison(prompt, 'midrange'),
  ]);

  const processedResults = results.map((result, index) => {
    const labels = ['FAL Advanced', 'FAL Midrange', 'KIE Advanced', 'KIE Midrange'];
    if (result.status === 'fulfilled') {
      console.log(`[Image Compare] ${labels[index]}: Success`);
      return result.value;
    } else {
      console.log(`[Image Compare] ${labels[index]}: Failed - ${result.reason}`);
      // Return error result
      const providers = ['fal', 'fal', 'kie', 'kie'] as const;
      const tiers = ['advanced', 'midrange', 'advanced', 'midrange'] as const;
      return {
        provider: providers[index],
        tier: tiers[index],
        model: 'Unknown',
        durationMs: 0,
        estimatedCost: 0,
        resolution: { width: 0, height: 0 },
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    }
  });

  console.log(`[Image Compare] Completed - ${processedResults.filter(r => !r.error).length}/4 successful`);

  return { results: processedResults };
}
