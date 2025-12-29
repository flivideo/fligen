// Image API types for FAL.AI and KIE.AI

/**
 * Health check status for a single provider
 */
export interface ProviderHealth {
  configured: boolean;
  authenticated: boolean;
  error?: string;
}

/**
 * Combined health check response
 */
export interface ImageApiHealth {
  fal: ProviderHealth;
  kie: ProviderHealth;
}

/**
 * Test image generation result for a single provider
 */
export interface ProviderTestResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  durationMs: number;
}

/**
 * Combined test generation response
 */
export interface ImageTestResult {
  fal: ProviderTestResult;
  kie: ProviderTestResult;
}

/**
 * FAL.AI Flux Schnell response
 */
export interface FalFluxResponse {
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

/**
 * KIE.AI task submission response
 */
export interface KieTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

/**
 * KIE.AI task result response
 */
export interface KieTaskResult {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status?: string;
    successFlag?: number;
    response?: {
      resultImageUrl?: string;
      resultUrls?: string[];
      originImageUrl?: string;
    };
    progress?: number;
    errorMessage?: string;
    createTime?: string;
    completeTime?: string;
  };
}

/**
 * KIE.AI credit check response
 */
export interface KieCreditResponse {
  code: number;
  msg: string;
  data: number;
}

// ============================================
// FR-08: Image Comparison Types
// ============================================

/**
 * Provider identifier
 */
export type Provider = 'fal' | 'kie';

/**
 * Model tier identifier
 */
export type ModelTier = 'advanced' | 'midrange';

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  name: string;
  costPer1MP?: number;      // FAL.AI pricing (per megapixel)
  costPerImage?: number;    // KIE.AI pricing (fixed per image)
  width: number;
  height: number;
}

/**
 * Model configurations for all providers and tiers
 */
export const MODELS: Record<Provider, Record<ModelTier, ModelConfig>> = {
  fal: {
    advanced: {
      id: 'fal-ai/flux-pro/v1.1',
      name: 'Flux Pro v1.1',
      costPer1MP: 0.04,
      width: 1024,
      height: 1024,
    },
    midrange: {
      id: 'fal-ai/flux/schnell',
      name: 'Flux Schnell',
      costPer1MP: 0.003,
      width: 512,
      height: 512,
    },
  },
  kie: {
    advanced: {
      id: 'flux-kontext-max',
      name: 'Flux Kontext Max',
      costPerImage: 0.025,
      width: 1024,
      height: 1024,
    },
    midrange: {
      id: 'flux-kontext-pro',
      name: 'Flux Kontext Pro',
      costPerImage: 0.004,
      width: 512,
      height: 512,
    },
  },
};

/**
 * Single comparison result
 */
export interface CompareResult {
  provider: Provider;
  tier: ModelTier;
  model: string;
  imageUrl?: string;
  durationMs: number;
  estimatedCost: number;
  resolution: { width: number; height: number };
  error?: string;
}

/**
 * Comparison request body
 */
export interface CompareRequest {
  prompt: string;
}

/**
 * Comparison response
 */
export interface CompareResponse {
  results: CompareResult[];
}
