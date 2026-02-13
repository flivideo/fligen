/**
 * Cost Estimation Module
 * FR25.5: Cost Estimation Endpoint
 */

import { getModelCost } from '../image/types';
import type { PromptRequest } from './types';

export interface CostBreakdown {
  count: number;
  cost_per_image: number;
  total: number;
}

export interface CostEstimate {
  total_cost: number;
  cost_breakdown: Record<string, CostBreakdown>;
  estimated_time_seconds: number;
}

/**
 * Estimate cost for a batch of prompts
 *
 * @param prompts - Array of prompt requests
 * @returns Cost breakdown and time estimate
 */
export function estimateCost(prompts: PromptRequest[]): CostEstimate {
  const breakdown: Record<string, CostBreakdown> = {};

  for (const prompt of prompts) {
    const key = prompt.provider;

    if (!breakdown[key]) {
      breakdown[key] = { count: 0, cost_per_image: 0, total: 0 };
    }

    const costPerImage = getModelCost(prompt.provider, prompt.model);

    breakdown[key].count++;
    breakdown[key].cost_per_image = costPerImage;
    breakdown[key].total += costPerImage;
  }

  const total_cost = Object.values(breakdown).reduce((sum, b) => sum + b.total, 0);

  // Rough estimate: 10s per image (average across FAL/KIE)
  const estimated_time_seconds = prompts.length * 10;

  return {
    total_cost: parseFloat(total_cost.toFixed(4)),
    cost_breakdown: breakdown,
    estimated_time_seconds,
  };
}
