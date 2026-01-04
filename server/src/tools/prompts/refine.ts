import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { SYSTEM_PROMPTS } from './system-prompts.js';

interface HumanPrompts {
  seed: string;
  edit: string;
  animation: string;
}

interface MachinePrompts {
  seed: string;
  edit: string;
  animation: string;
}

/**
 * Refine human prompts into machine-optimized prompts using Claude Agent SDK
 */
export async function refinePrompts(humanPrompts: HumanPrompts): Promise<MachinePrompts> {
  console.log('[Prompts] Refining prompts with Claude Agent SDK...');

  try {
    // Refine each prompt in parallel
    const [seedResult, editResult, animationResult] = await Promise.all([
      refineSinglePrompt('seed', humanPrompts.seed, SYSTEM_PROMPTS.seed),
      refineSinglePrompt('edit', humanPrompts.edit, SYSTEM_PROMPTS.edit),
      refineSinglePrompt('animation', humanPrompts.animation, SYSTEM_PROMPTS.animation),
    ]);

    console.log('[Prompts] All prompts refined successfully');

    return {
      seed: seedResult,
      edit: editResult,
      animation: animationResult,
    };
  } catch (error) {
    console.error('[Prompts] Failed to refine prompts:', error);
    throw error;
  }
}

/**
 * Refine a single prompt using Claude Agent SDK
 */
async function refineSinglePrompt(
  type: string,
  humanPrompt: string,
  systemPrompt: string
): Promise<string> {
  console.log(`[Prompts] Refining ${type} prompt...`);

  try {
    let fullResponse = '';

    const options: Options = {
      systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      permissionMode: 'acceptEdits',
      maxTurns: 1,
    };

    const queryIterator = query({ prompt: humanPrompt, options });

    for await (const message of queryIterator) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
          }
        }
      } else if (message.type === 'stream_event') {
        const event = message.event;
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta && delta.text) {
            fullResponse += delta.text;
          }
        }
      }
    }

    const refined = fullResponse.trim();
    console.log(`[Prompts] ${type} refined (${refined.length} chars)`);

    return refined;
  } catch (error) {
    console.error(`[Prompts] Failed to refine ${type}:`, error);
    throw new Error(`Failed to refine ${type} prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
