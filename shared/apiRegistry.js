/**
 * API Registry
 * Metadata for all FliGen REST API endpoints
 */
/**
 * API Endpoint Registry
 * Grouped by functional area
 */
export const API_ENDPOINTS = [
  // ========================================
  // Image Generation - Health
  // ========================================
  {
    id: 'image-health',
    method: 'GET',
    path: '/api/image/health',
    group: 'Image Generation',
    description: 'Check image generation API health (FAL + KIE)',
    parameters: [],
    exampleResponse: {
      fal: { configured: true, authenticated: true },
      kie: { configured: true, authenticated: true },
    },
  },
  {
    id: 'image-test',
    method: 'GET',
    path: '/api/image/test',
    group: 'Image Generation',
    description: 'Generate test images with both providers',
    parameters: [],
    exampleResponse: {
      fal: { success: true, imageUrl: 'https://...', durationMs: 5000 },
      kie: { success: true, imageUrl: 'https://...', durationMs: 8000 },
    },
  },
  {
    id: 'image-compare',
    method: 'POST',
    path: '/api/image/compare',
    group: 'Image Generation',
    description: 'Generate 4 comparison images (2 providers × 2 tiers)',
    parameters: [
      {
        name: 'prompt',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'Image generation prompt',
        example: 'A red sports car on a mountain road at sunset',
      },
    ],
    exampleResponse: {
      results: [
        {
          provider: 'fal',
          tier: 'advanced',
          model: 'flux-pro/v1.1',
          imageUrl: 'https://...',
          durationMs: 12000,
          estimatedCost: 0.04,
          resolution: { width: 1024, height: 1024 },
        },
      ],
    },
  },
  // ========================================
  // Batch Generation API (FR-25)
  // ========================================
  {
    id: 'batch-create',
    method: 'POST',
    path: '/api/image/batch',
    group: 'Batch Generation',
    description: 'Create batch image generation job',
    parameters: [
      {
        name: 'prompts',
        type: 'body',
        dataType: 'array',
        required: true,
        description: 'Array of prompts to generate',
        example: [
          {
            id: 'stream-deck-hybrid',
            prompt: 'A VibeDeck hardware controller...',
            provider: 'kie',
            model: 'flux-kontext-pro',
            category: 'design-variations',
            filename: 'stream-deck-hybrid',
          },
        ],
      },
      {
        name: 'options',
        type: 'body',
        dataType: 'object',
        description: 'Batch generation options',
        example: {
          save_to_catalog: true,
          parallel: false,
          delay_seconds: 5,
        },
      },
    ],
    exampleResponse: {
      batch_id: 'batch_1767515187647_abc123',
      total_prompts: 30,
      estimated_cost: 0.12,
      estimated_time_seconds: 300,
      status: 'queued',
    },
  },
  {
    id: 'batch-status',
    method: 'GET',
    path: '/api/image/batch/:batchId',
    group: 'Batch Generation',
    description: 'Get batch generation progress and results',
    parameters: [
      {
        name: 'batchId',
        type: 'path',
        dataType: 'string',
        required: true,
        description: 'Batch job ID',
        example: 'batch_1767515187647_abc123',
      },
    ],
    exampleResponse: {
      batch_id: 'batch_123',
      status: 'processing',
      progress: { total: 30, completed: 15, failed: 0, pending: 15 },
      results: [],
      total_cost: 0.06,
      total_time_ms: 127500,
    },
  },
  {
    id: 'batch-upload-csv',
    method: 'POST',
    path: '/api/image/batch/upload-csv',
    group: 'Batch Generation',
    description: 'Upload CSV file and create batch job',
    notes:
      'Use multipart/form-data with file field named "file". CSV format: a,category,filename,prompt,provider,model',
    parameters: [
      {
        name: 'file',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'CSV file with prompts (columns: a,category,filename,prompt,provider,model)',
        example: 'Upload via form data',
      },
    ],
    exampleResponse: {
      batch_id: 'batch_123',
      total_prompts: 60,
      active_prompts: 30,
      skipped_prompts: 30,
      estimated_cost: 0.12,
    },
  },
  {
    id: 'batch-update-csv',
    method: 'POST',
    path: '/api/image/batch/:batchId/update-csv',
    group: 'Batch Generation',
    description: 'Update CSV file marking completed prompts as a=9',
    parameters: [
      {
        name: 'batchId',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'batch_123',
      },
    ],
    exampleResponse: {
      csv_file_path: '/uploads/prompts_updated.csv',
      updated_rows: 30,
      download_url: '/api/image/batch/batch_123/download-csv',
    },
  },
  {
    id: 'batch-estimate',
    method: 'POST',
    path: '/api/image/batch/estimate',
    group: 'Batch Generation',
    description: 'Estimate cost before creating batch',
    parameters: [
      {
        name: 'prompts',
        type: 'body',
        dataType: 'array',
        required: true,
        description: 'Same as /api/image/batch prompts',
        example: [],
      },
    ],
    exampleResponse: {
      total_prompts: 30,
      cost_breakdown: {
        fal: { count: 10, cost_per_image: 0.003, total: 0.03 },
        kie: { count: 20, cost_per_image: 0.004, total: 0.08 },
      },
      total_cost: 0.11,
    },
  },
  {
    id: 'batch-download-csv',
    method: 'GET',
    path: '/api/image/batch/:batchId/download-csv',
    group: 'Batch Generation',
    description: 'Download updated CSV file',
    parameters: [
      {
        name: 'batchId',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'batch_123',
      },
    ],
    notes: 'Returns CSV file download',
  },
  // ========================================
  // Query API (Discovery & Health)
  // ========================================
  {
    id: 'query-config',
    method: 'GET',
    path: '/api/query/config',
    group: 'Query API',
    description: 'Get API configuration and available endpoints',
    parameters: [],
    exampleResponse: {
      success: true,
      endpoints: {
        imageGeneration: ['/api/image/health', '/api/image/test', '/api/image/compare'],
        batch: ['/api/image/batch', '/api/image/batch/:batchId'],
      },
      providers: ['fal', 'kie'],
      models: ['flux-pro/v1.1', 'flux-schnell', 'flux-kontext-pro'],
    },
  },
  {
    id: 'query-health',
    method: 'GET',
    path: '/api/query/health',
    group: 'Query API',
    description: 'Check provider health and authentication status',
    parameters: [],
    exampleResponse: {
      success: true,
      providers: {
        fal: { configured: true, authenticated: true },
        kie: { configured: true, authenticated: true },
      },
    },
  },
  {
    id: 'query-catalog',
    method: 'GET',
    path: '/api/query/catalog',
    group: 'Query API',
    description: 'List generated images in catalog',
    parameters: [
      {
        name: 'limit',
        type: 'query',
        dataType: 'number',
        description: 'Maximum number of results',
        example: 50,
      },
      {
        name: 'provider',
        type: 'query',
        dataType: 'string',
        enum: ['fal', 'kie'],
        description: 'Filter by provider',
      },
    ],
    exampleResponse: {
      success: true,
      images: [
        {
          id: 'asset_image_123',
          filename: 'image-123-fal-flux-pro.png',
          provider: 'fal',
          model: 'flux-pro/v1.1',
          prompt: 'A red sports car...',
          createdAt: '2026-01-16T12:00:00Z',
        },
      ],
    },
  },
];
/**
 * Group endpoints by category
 */
export function getEndpointGroups() {
  const groups = new Map();
  for (const endpoint of API_ENDPOINTS) {
    const existing = groups.get(endpoint.group) || [];
    existing.push(endpoint);
    groups.set(endpoint.group, existing);
  }
  return groups;
}
/**
 * Get endpoint by ID
 */
export function getEndpointById(id) {
  return API_ENDPOINTS.find((e) => e.id === id);
}
