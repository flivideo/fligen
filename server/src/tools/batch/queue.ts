/**
 * Batch Queue Manager
 * FR25.1: Batch Generation Endpoint
 * FR25.2: Batch Progress Endpoint
 */

import { fal } from '@fal-ai/client';
import { saveImageToCatalog } from '../image/save-to-catalog.js';
import { getModelCost } from '../image/types.js';
import type { BatchJob, PromptRequest, BatchOptions, PromptResult } from './types';

// Simple in-memory storage (MVP)
const jobs = new Map<string, BatchJob>();

/**
 * Generate random ID for batch jobs
 */
function randomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Sleep utility for delays between generations
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate single image using FAL.AI
 */
async function generateWithFal(
  prompt: string,
  model: string
): Promise<{ imageUrl: string; cost: number }> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  fal.config({ credentials: apiKey });

  console.log(`[Batch FAL] Generating with model: ${model}`);

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: {
        width: 1024,
        height: 1024,
      },
      num_images: 1,
      num_inference_steps: 4,
      enable_safety_checker: false,
    },
    logs: true,
  });

  const output = result as any;

  if (output.data?.images && output.data.images.length > 0) {
    const imageUrl = output.data.images[0].url;
    const cost = getModelCost('fal', model);
    return { imageUrl, cost };
  }

  throw new Error('No image returned from FAL.AI');
}

/**
 * Generate single image using KIE.AI
 */
async function generateWithKie(
  prompt: string,
  model: string
): Promise<{ imageUrl: string; cost: number }> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  const BASE_URL = 'https://api.kie.ai';

  console.log(`[Batch KIE] Generating with model: ${model}`);

  // Submit task
  const submitResponse = await fetch(`${BASE_URL}/api/v1/flux/kontext/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model,
      aspectRatio: '1:1',
      outputFormat: 'jpeg',
    }),
  });

  const submitData = (await submitResponse.json()) as any;

  if (submitData.code !== 200 || !submitData.data?.taskId) {
    throw new Error(`KIE.AI task submission failed: ${submitData.msg}`);
  }

  const taskId = submitData.data.taskId;
  console.log(`[Batch KIE] Task submitted: ${taskId}`);

  // Poll for result
  const MAX_POLL_TIME = 60000; // 60s
  const POLL_INTERVAL = 2000; // 2s
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    await sleep(POLL_INTERVAL);

    const statusResponse = await fetch(
      `${BASE_URL}/api/v1/flux/kontext/record-info?taskId=${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const statusData = (await statusResponse.json()) as any;

    if (statusData.code !== 200) {
      throw new Error(`KIE.AI status check failed: ${statusData.msg}`);
    }

    if (statusData.data?.successFlag === 1) {
      const imageUrl =
        statusData.data.response?.resultImageUrl || statusData.data.response?.resultUrls?.[0];

      if (!imageUrl) {
        throw new Error('No image URL in KIE.AI response');
      }

      console.log(`[Batch KIE] Task completed: ${taskId}`);
      const cost = getModelCost('kie', model);
      return { imageUrl, cost };
    }

    if (statusData.data?.successFlag === 2) {
      throw new Error(`KIE.AI generation failed: ${statusData.data.errorMessage}`);
    }
  }

  throw new Error('KIE.AI task timeout after 60s');
}

/**
 * Generate single image based on provider
 */
async function generateImage(request: PromptRequest): Promise<{ imageUrl: string; cost: number }> {
  if (request.provider === 'fal') {
    return await generateWithFal(request.prompt, request.model);
  } else if (request.provider === 'kie') {
    return await generateWithKie(request.prompt, request.model);
  } else {
    throw new Error(`Unknown provider: ${request.provider}`);
  }
}

/**
 * Create a new batch job
 *
 * @param prompts - Array of prompt requests
 * @param options - Batch options
 * @returns Batch job ID
 */
export function createJob(prompts: PromptRequest[], options: BatchOptions): string {
  const id = `batch_${Date.now()}_${randomId()}`;

  const job: BatchJob = {
    id,
    prompts,
    options,
    status: 'queued',
    progress: {
      total: prompts.length,
      completed: 0,
      failed: 0,
      pending: prompts.length,
    },
    results: prompts.map((p) => ({
      id: p.id,
      status: 'pending',
    })),
    totalCost: 0,
    totalTimeMs: 0,
    createdAt: new Date(),
  };

  jobs.set(id, job);
  console.log(`[Batch Queue] Created job ${id} with ${prompts.length} prompts`);

  return id;
}

/**
 * Process a batch job
 *
 * @param jobId - Batch job ID
 */
export async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  console.log(`[Batch Queue] Processing job ${jobId}...`);
  job.status = 'processing';
  job.startedAt = new Date();

  for (let i = 0; i < job.prompts.length; i++) {
    const prompt = job.prompts[i];
    const result = job.results[i];

    result.status = 'processing';
    console.log(`[Batch Queue] Processing ${i + 1}/${job.prompts.length}: ${prompt.id}`);

    try {
      const startTime = Date.now();
      const generated = await generateImage(prompt);
      const endTime = Date.now();

      result.status = 'completed';
      result.generation_time_ms = endTime - startTime;
      result.cost = generated.cost;

      job.progress.completed++;
      job.progress.pending--;
      job.totalCost += generated.cost;
      job.totalTimeMs += result.generation_time_ms;

      console.log(
        `[Batch Queue] Success: ${prompt.id} (${result.generation_time_ms}ms, $${generated.cost})`
      );

      // Save to catalog if requested
      if (job.options.save_to_catalog) {
        try {
          const asset = await saveImageToCatalog(
            generated.imageUrl,
            prompt.prompt,
            prompt.provider,
            prompt.model,
            1024,
            1024,
            {
              category: prompt.category,
              filename: prompt.filename,
              batch_id: job.id,
              ...prompt.metadata,
            }
          );

          result.asset_id = asset.id;
          result.file_path = asset.filename;
          console.log(`[Batch Queue] Saved to catalog: ${asset.id}`);
        } catch (error) {
          console.error(`[Batch Queue] Failed to save to catalog:`, error);
          // Don't fail the entire job if catalog save fails
        }
      }

      // Delay between images (if sequential and not last image)
      if (!job.options.parallel && i < job.prompts.length - 1) {
        const delayMs = job.options.delay_seconds * 1000;
        console.log(`[Batch Queue] Delaying ${job.options.delay_seconds}s...`);
        await sleep(delayMs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Batch Queue] Failed: ${prompt.id} - ${message}`);

      result.status = 'failed';
      result.error = {
        code: 'GENERATION_FAILED',
        message,
        retries: 0,
      };

      job.progress.failed++;
      job.progress.pending--;
    }
  }

  job.status = job.progress.failed === job.progress.total ? 'failed' : 'completed';
  job.completedAt = new Date();

  console.log(
    `[Batch Queue] Job ${jobId} complete: ${job.progress.completed}/${job.progress.total} succeeded`
  );
}

/**
 * Get batch job status
 *
 * @param jobId - Batch job ID
 * @returns Batch job or null if not found
 */
export function getJob(jobId: string): BatchJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get all batch jobs (for debugging)
 */
export function getAllJobs(): BatchJob[] {
  return Array.from(jobs.values());
}
