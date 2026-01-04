import { useState, useEffect } from 'react';
import type { ProjectData, ProjectListItem, MachinePrompts } from '@fligen/shared';
import { PromptRefinementPanel } from './PromptRefinementPanel';

interface WorkflowResult {
  images: string[];
  video: string;
}

type PipelineStage = 'idle' | 'loading' | 'processing' | 'complete' | 'error';

const SERVER_URL = 'http://localhost:5401';

export default function Day10N8N() {
  const [seedImage, setSeedImage] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [animation, setAnimation] = useState('');
  const [machinePrompts, setMachinePrompts] = useState<MachinePrompts | null>(null);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState('');

  // Project loading state
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadStatus, setLoadStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  // Load projects list on mount
  useEffect(() => {
    loadProjectsList();
  }, []);

  // Simulate progress during processing
  useEffect(() => {
    if (stage === 'processing') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 3;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const loadProjectsList = async () => {
    try {
      console.log('[Day10N8N] Fetching projects from:', `${SERVER_URL}/api/projects`);
      const response = await fetch(`${SERVER_URL}/api/projects`);

      if (!response.ok) {
        console.error('[Day10N8N] Projects fetch failed:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('[Day10N8N] Projects loaded:', data.projects);
      setProjects(data.projects || []);
    } catch (error) {
      console.error('[Day10N8N] Failed to load projects:', error);
    }
  };

  const loadProject = async () => {
    if (!selectedProject) {
      setLoadStatus({ loading: false, error: 'Please select a project' });
      return;
    }

    setLoadStatus({ loading: true, error: null });

    try {
      console.log('[Day10N8N] Loading project:', selectedProject);
      const response = await fetch(`${SERVER_URL}/api/projects/${selectedProject}`);

      if (!response.ok) {
        console.error('[Day10N8N] Project load failed:', response.status, response.statusText);
        setLoadStatus({ loading: false, error: `Project not found (${response.status})` });
        return;
      }

      const data: ProjectData = await response.json();
      console.log('[Day10N8N] Project data loaded:', data);

      // Populate prompts from loaded project
      setSeedImage(data.humanPrompts.prompt_a || '');
      setEditInstruction(data.humanPrompts.prompt_b || '');
      setAnimation(data.humanPrompts.prompt_c || '');

      setLoadStatus({ loading: false, error: null });
      console.log('[Day10N8N] Prompts populated successfully');
    } catch (error) {
      console.error('[Day10N8N] Load project error:', error);
      setLoadStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Load failed',
      });
    }
  };

  const handleGenerate = async (mode: 'human' | 'machine') => {
    console.log('[Day10N8N] ========== GENERATE WORKFLOW STARTED ==========');
    console.log('[Day10N8N] Mode:', mode);

    // Select prompts based on mode
    const prompts = mode === 'machine' && machinePrompts ? {
      seedImage: machinePrompts.seed,
      editInstruction: machinePrompts.edit,
      animation: machinePrompts.animation,
    } : {
      seedImage,
      editInstruction,
      animation,
    };

    console.log('[Day10N8N] Prompts:', {
      seedImage: prompts.seedImage.substring(0, 50) + '...',
      editInstruction: prompts.editInstruction.substring(0, 50) + '...',
      animation: prompts.animation.substring(0, 50) + '...',
    });

    setStage('loading');
    setProgress(0);
    setError('');
    setResult(null);
    setStatusMessage('Initiating N8N workflow...');

    try {
      const endpoint = `${SERVER_URL}/api/n8n/workflow`;
      const payload = {
        seedImage: prompts.seedImage,
        editInstruction: prompts.editInstruction,
        animation: prompts.animation,
      };

      console.log('[Day10N8N] POST request to:', endpoint);
      console.log('[Day10N8N] Payload:', payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[Day10N8N] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Day10N8N] Response error:', errorText);
        throw new Error(`Workflow failed to start: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[Day10N8N] Response data:', responseData);

      setStage('processing');
      setStatusMessage('Generating images and video...');
      setProgress(50);

      // N8N returns: { image1, image2, video }
      if (responseData.success && responseData.data) {
        const { image1, image2, video } = responseData.data;

        setProgress(100);
        setStage('complete');
        setStatusMessage('Workflow complete');
        setResult({
          images: [image1, image2],
          video: video,
        });
        console.log('[Day10N8N] ========== WORKFLOW COMPLETED ==========');
      } else {
        throw new Error('Invalid response format from N8N');
      }

    } catch (err) {
      console.error('[Day10N8N] ========== WORKFLOW FAILED ==========');
      console.error('[Day10N8N] Error:', err);
      setStage('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatusMessage('Workflow failed');
    }
  };

  const downloadAsset = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const getStageColor = (currentStage: PipelineStage) => {
    switch (currentStage) {
      case 'idle': return 'text-slate-500';
      case 'loading': return 'text-amber-400';
      case 'processing': return 'text-amber-400';
      case 'complete': return 'text-emerald-400';
      case 'error': return 'text-red-400';
    }
  };

  const getStageIcon = (currentStage: PipelineStage) => {
    switch (currentStage) {
      case 'idle': return '○';
      case 'loading': return '◐';
      case 'processing': return '◉';
      case 'complete': return '✓';
      case 'error': return '✕';
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold text-slate-100">
              N8N PIPELINE
            </h1>
            <p className="font-mono text-xs text-slate-500">
              ORCHESTRATION • DAY 10
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`font-mono text-sm ${getStageColor(stage)}`}>
              {getStageIcon(stage)} {stage.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-1 p-6">

          {/* STAGE 1: INPUT */}
          <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-sm font-bold text-slate-400">
                01
              </div>
              <h2 className="font-mono text-lg font-semibold text-slate-200">
                INPUT • PROMPT INTAKE
              </h2>
            </div>

            {/* Load Project Controls */}
            <div className="mb-6 flex gap-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-200 transition-colors focus:border-amber-500/50 focus:outline-none"
              >
                <option value="">Select saved project...</option>
                {projects.map((p) => (
                  <option key={p.projectCode} value={p.projectCode}>
                    {p.projectCode}
                  </option>
                ))}
              </select>
              <button
                onClick={loadProject}
                disabled={loadStatus.loading || !selectedProject}
                className="rounded border border-slate-700 bg-slate-800 px-6 py-2 font-mono text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                {loadStatus.loading ? 'Loading...' : 'Load Project'}
              </button>
            </div>
            {loadStatus.error && (
              <div className="mb-4 rounded border border-red-800 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-400">
                {loadStatus.error}
              </div>
            )}

            <div className="space-y-4">
              {/* Seed Image Prompt */}
              <div>
                <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
                  Seed Image Description
                </label>
                <textarea
                  value={seedImage}
                  onChange={(e) => setSeedImage(e.target.value)}
                  className="h-20 w-full resize-none rounded border border-slate-700 bg-slate-800/50 px-4 py-3 font-sans text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-amber-500/50 focus:bg-slate-800 focus:outline-none"
                  placeholder="Describe the initial image..."
                  disabled={stage === 'processing' || stage === 'loading'}
                />
              </div>

              {/* Edit Instruction */}
              <div>
                <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
                  Edit Instruction
                </label>
                <textarea
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  className="h-20 w-full resize-none rounded border border-slate-700 bg-slate-800/50 px-4 py-3 font-sans text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-amber-500/50 focus:bg-slate-800 focus:outline-none"
                  placeholder="How should the image be edited..."
                  disabled={stage === 'processing' || stage === 'loading'}
                />
              </div>

              {/* Animation Prompt */}
              <div>
                <label className="mb-2 block font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
                  Animation Instructions
                </label>
                <textarea
                  value={animation}
                  onChange={(e) => setAnimation(e.target.value)}
                  className="h-20 w-full resize-none rounded border border-slate-700 bg-slate-800/50 px-4 py-3 font-sans text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-amber-500/50 focus:bg-slate-800 focus:outline-none"
                  placeholder="Describe the desired animation..."
                  disabled={stage === 'processing' || stage === 'loading'}
                />
              </div>
            </div>
          </section>

          {/* Prompt Refinement Panel */}
          <PromptRefinementPanel
            humanPrompts={{
              seed: seedImage,
              edit: editInstruction,
              animation,
            }}
            onMachinePromptsGenerated={(prompts) => setMachinePrompts(prompts)}
          />

          {/* STAGE 2: PROCESS */}
          <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-sm font-bold text-slate-400">
                02
              </div>
              <h2 className="font-mono text-lg font-semibold text-slate-200">
                PROCESS • WORKFLOW EXECUTION
              </h2>
            </div>

            <div className="space-y-4">
              {/* Generate Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Human Prompts Button */}
                <button
                  onClick={() => handleGenerate('human')}
                  disabled={stage === 'processing' || stage === 'loading' || !seedImage || !editInstruction || !animation}
                  className="rounded border border-blue-600 bg-blue-600 px-6 py-4 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-600"
                >
                  {stage === 'processing' || stage === 'loading' ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      PROCESSING
                    </span>
                  ) : (
                    '▶ HUMAN PROMPTS'
                  )}
                </button>

                {/* Machine Prompts Button */}
                <button
                  onClick={() => handleGenerate('machine')}
                  disabled={stage === 'processing' || stage === 'loading' || !machinePrompts}
                  className="rounded border border-amber-600 bg-amber-600 px-6 py-4 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-600"
                >
                  {stage === 'processing' || stage === 'loading' ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      PROCESSING
                    </span>
                  ) : (
                    '🤖 MACHINE PROMPTS'
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              {(stage === 'processing' || stage === 'loading') && (
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                    <span>{statusMessage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {stage === 'complete' && (
                <div className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/30 px-4 py-3 font-mono text-sm text-emerald-400">
                  <span>✓</span>
                  <span>Workflow completed successfully</span>
                </div>
              )}

              {stage === 'error' && (
                <div className="flex items-center gap-2 rounded border border-red-800 bg-red-950/30 px-4 py-3 font-mono text-sm text-red-400">
                  <span>✕</span>
                  <span>{error || 'An error occurred'}</span>
                </div>
              )}
            </div>
          </section>

          {/* STAGE 3: OUTPUT */}
          {result && stage === 'complete' && (
            <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-sm font-bold text-slate-400">
                  03
                </div>
                <h2 className="font-mono text-lg font-semibold text-slate-200">
                  OUTPUT • GENERATED ASSETS
                </h2>
              </div>

              <div className="space-y-6">
                {/* Images */}
                <div>
                  <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
                    Generated Images ({result.images.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {result.images.map((img, idx) => (
                      <div key={idx} className="group relative overflow-hidden rounded border border-slate-700 bg-slate-800">
                        <img
                          src={img}
                          alt={`Generated image ${idx + 1}`}
                          className="aspect-video w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => downloadAsset(img, `image-${idx + 1}.png`)}
                            className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 font-mono text-xs font-bold uppercase text-slate-950 hover:bg-emerald-500"
                          >
                            ↓ Download
                          </button>
                        </div>
                        <div className="absolute left-2 top-2 rounded bg-slate-950/70 px-2 py-1 font-mono text-xs text-slate-300">
                          IMG {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video */}
                <div>
                  <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-slate-400">
                    Generated Video
                  </h3>
                  <div className="group relative overflow-hidden rounded border border-slate-700 bg-slate-800">
                    <video
                      src={result.video}
                      controls
                      className="aspect-video w-full"
                    />
                    <div className="absolute left-2 top-2 rounded bg-slate-950/70 px-2 py-1 font-mono text-xs text-slate-300">
                      VIDEO
                    </div>
                  </div>
                  <button
                    onClick={() => downloadAsset(result.video, 'video.mp4')}
                    className="mt-3 w-full rounded border border-emerald-600 bg-emerald-600 px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-500"
                  >
                    ↓ Download Video
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
