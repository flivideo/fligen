import { useState, useEffect } from 'react';
import type { MachinePrompts } from '@fligen/shared';

const SERVER_URL = 'http://localhost:5401';

interface SystemPrompts {
  seed: string;
  edit: string;
  animation: string;
}

interface PromptRefinementPanelProps {
  humanPrompts: {
    seed: string;
    edit: string;
    animation: string;
  };
  onMachinePromptsGenerated: (prompts: MachinePrompts) => void;
}

export function PromptRefinementPanel({ humanPrompts, onMachinePromptsGenerated }: PromptRefinementPanelProps) {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts | null>(null);
  const [machinePrompts, setMachinePrompts] = useState<MachinePrompts | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Load system prompts on mount
  useEffect(() => {
    loadSystemPrompts();
  }, []);

  const loadSystemPrompts = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/prompts/system`);
      const data = await response.json();
      setSystemPrompts(data.systemPrompts);
    } catch (err) {
      console.error('[PromptRefinement] Failed to load system prompts:', err);
    }
  };

  const handleGenerateMachinePrompts = async () => {
    if (!humanPrompts.seed || !humanPrompts.edit || !humanPrompts.animation) {
      setError('All human prompts must be filled');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      console.log('[PromptRefinement] Generating machine prompts...');

      const response = await fetch(`${SERVER_URL}/api/prompts/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanPrompts }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PromptRefinement] Machine prompts generated:', data.machinePrompts);

      setMachinePrompts(data.machinePrompts);
      onMachinePromptsGenerated(data.machinePrompts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate machine prompts';
      console.error('[PromptRefinement] Error:', err);
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const hasAllHumanPrompts = humanPrompts.seed && humanPrompts.edit && humanPrompts.animation;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-sm font-bold text-slate-400">
          02
        </div>
        <h2 className="font-mono text-lg font-semibold text-slate-200">
          REFINEMENT • PROMPT COMPILATION
        </h2>
      </div>

      {/* System Prompts (Top Row) */}
      <div className="mb-3">
        <h3 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
          System Prompts (Templates)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Seed System */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Seed System</label>
            <textarea
              value={systemPrompts?.seed || 'Loading...'}
              readOnly
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-slate-400"
            />
          </div>

          {/* Edit System */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Edit System</label>
            <textarea
              value={systemPrompts?.edit || 'Loading...'}
              readOnly
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-slate-400"
            />
          </div>

          {/* Animation System */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Animation System</label>
            <textarea
              value={systemPrompts?.animation || 'Loading...'}
              readOnly
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="my-4">
        <button
          onClick={handleGenerateMachinePrompts}
          disabled={!hasAllHumanPrompts || generating}
          className="w-full rounded border border-amber-600 bg-amber-600 px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-600"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              Generating Machine Prompts...
            </span>
          ) : (
            '🤖 Generate Machine Prompts'
          )}
        </button>
        {error && (
          <div className="mt-2 rounded border border-red-800 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Machine Prompts (Bottom Row) */}
      <div>
        <h3 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
          Machine Prompts (Claude-Generated)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Seed Machine */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Seed Machine</label>
            <textarea
              value={machinePrompts?.seed || ''}
              readOnly
              placeholder="Generate to see optimized prompt..."
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-emerald-400 placeholder:text-slate-600"
            />
          </div>

          {/* Edit Machine */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Edit Machine</label>
            <textarea
              value={machinePrompts?.edit || ''}
              readOnly
              placeholder="Generate to see optimized prompt..."
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-emerald-400 placeholder:text-slate-600"
            />
          </div>

          {/* Animation Machine */}
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-500">Animation Machine</label>
            <textarea
              value={machinePrompts?.animation || ''}
              readOnly
              placeholder="Generate to see optimized prompt..."
              className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-800/30 px-3 py-2 font-mono text-xs text-emerald-400 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
