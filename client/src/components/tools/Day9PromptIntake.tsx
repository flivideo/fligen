import { useState, useEffect } from 'react';
import { ToolPanel } from '../ui/ToolPanel';
import type { ProjectData, ProjectListItem, SourceTranscript } from '@fligen/shared';

const SERVER_URL = 'http://localhost:5401';

// ============================================
// Types
// ============================================

interface ImportStatus {
  loading: boolean;
  error: string | null;
}

// ============================================
// Main Component
// ============================================

export function Day9PromptIntake() {
  // Project setup state
  const [flihubProjectCode, setFlihubProjectCode] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [chapter, setChapter] = useState('');
  const [segmentA, setSegmentA] = useState<number>(1);
  const [segmentB, setSegmentB] = useState<number>(2);
  const [segmentC, setSegmentC] = useState<number>(3);

  // Prompt state
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [promptC, setPromptC] = useState('');

  // Source transcripts (optional, stored when importing)
  const [sourceA, setSourceA] = useState<SourceTranscript | null>(null);
  const [sourceB, setSourceB] = useState<SourceTranscript | null>(null);
  const [sourceC, setSourceC] = useState<SourceTranscript | null>(null);

  // Import status
  const [statusA, setStatusA] = useState<ImportStatus>({ loading: false, error: null });
  const [statusB, setStatusB] = useState<ImportStatus>({ loading: false, error: null });
  const [statusC, setStatusC] = useState<ImportStatus>({ loading: false, error: null });

  // Save/Load status
  const [saveStatus, setSaveStatus] = useState<{ loading: boolean; error: string | null; success: boolean }>({
    loading: false,
    error: null,
    success: false,
  });

  const [loadStatus, setLoadStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  // Available projects
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');

  // FliHub health
  const [fliHubOnline, setFliHubOnline] = useState<boolean | null>(null);

  // Check FliHub health on mount
  useEffect(() => {
    checkFliHubHealth();
  }, []);

  // Load projects list on mount
  useEffect(() => {
    loadProjectsList();
  }, []);

  async function checkFliHubHealth() {
    try {
      const response = await fetch(`${SERVER_URL}/api/flihub/health`);
      const data = await response.json();
      setFliHubOnline(data.status === 'ok');
    } catch {
      setFliHubOnline(false);
    }
  }

  async function loadProjectsList() {
    try {
      const response = await fetch(`${SERVER_URL}/api/projects`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  async function importAllTranscripts() {
    if (!flihubProjectCode) {
      setStatusA({ loading: false, error: 'FliHub project code is required' });
      setStatusB({ loading: false, error: 'FliHub project code is required' });
      setStatusC({ loading: false, error: 'FliHub project code is required' });
      return;
    }

    if (!chapter) {
      setStatusA({ loading: false, error: 'Chapter is required' });
      setStatusB({ loading: false, error: 'Chapter is required' });
      setStatusC({ loading: false, error: 'Chapter is required' });
      return;
    }

    // Set all to loading
    setStatusA({ loading: true, error: null });
    setStatusB({ loading: true, error: null });
    setStatusC({ loading: true, error: null });

    try {
      const segments = `${segmentA},${segmentB},${segmentC}`;
      const response = await fetch(
        `${SERVER_URL}/api/flihub/transcripts?projectCode=${encodeURIComponent(flihubProjectCode)}&chapter=${encodeURIComponent(chapter)}&segments=${encodeURIComponent(segments)}`
      );

      const data = await response.json();

      if (data.success && data.transcripts && Array.isArray(data.transcripts)) {
        // Map transcripts to prompts by sequence number
        data.transcripts.forEach((transcript: any) => {
          const sequence = parseInt(transcript.sequence, 10);
          const content = transcript.content;
          const source: SourceTranscript = {
            segmentId: sequence,
            text: content,
            fetchedAt: new Date().toISOString(),
          };

          if (sequence === segmentA) {
            setPromptA(content);
            setSourceA(source);
            setStatusA({ loading: false, error: null });
          } else if (sequence === segmentB) {
            setPromptB(content);
            setSourceB(source);
            setStatusB({ loading: false, error: null });
          } else if (sequence === segmentC) {
            setPromptC(content);
            setSourceC(source);
            setStatusC({ loading: false, error: null });
          }
        });

        // Check if any segments were missing
        const foundSequences = data.transcripts.map((t: any) => parseInt(t.sequence, 10));
        if (!foundSequences.includes(segmentA)) {
          setStatusA({ loading: false, error: 'Segment not found' });
        }
        if (!foundSequences.includes(segmentB)) {
          setStatusB({ loading: false, error: 'Segment not found' });
        }
        if (!foundSequences.includes(segmentC)) {
          setStatusC({ loading: false, error: 'Segment not found' });
        }
      } else {
        const errorMsg = data.error || 'Import failed';
        setStatusA({ loading: false, error: errorMsg });
        setStatusB({ loading: false, error: errorMsg });
        setStatusC({ loading: false, error: errorMsg });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Import failed';
      setStatusA({ loading: false, error: errorMsg });
      setStatusB({ loading: false, error: errorMsg });
      setStatusC({ loading: false, error: errorMsg });
    }
  }

  async function saveProject() {
    if (!projectCode) {
      setSaveStatus({ loading: false, error: 'Project code is required', success: false });
      return;
    }

    if (!flihubProjectCode || !chapter) {
      setSaveStatus({ loading: false, error: 'FliHub project code and chapter are required', success: false });
      return;
    }

    if (!promptA && !promptB && !promptC) {
      setSaveStatus({ loading: false, error: 'At least one prompt is required', success: false });
      return;
    }

    setSaveStatus({ loading: true, error: null, success: false });

    try {
      const requestData = {
        projectCode,
        chapterId: `${flihubProjectCode}-ch${chapter}`,
        segmentA,
        segmentB,
        segmentC,
        promptA,
        promptB,
        promptC,
        sourceTranscripts:
          sourceA || sourceB || sourceC
            ? {
                a: sourceA || { segmentId: segmentA, text: '', fetchedAt: new Date().toISOString() },
                b: sourceB || { segmentId: segmentB, text: '', fetchedAt: new Date().toISOString() },
                c: sourceC || { segmentId: segmentC, text: '', fetchedAt: new Date().toISOString() },
              }
            : undefined,
      };

      const response = await fetch(`${SERVER_URL}/api/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus({ loading: false, error: null, success: true });
        // Refresh projects list
        await loadProjectsList();
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, success: false }));
        }, 3000);
      } else {
        setSaveStatus({ loading: false, error: data.error || 'Save failed', success: false });
      }
    } catch (error) {
      setSaveStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Save failed',
        success: false,
      });
    }
  }

  async function loadProject() {
    if (!selectedProject) {
      setLoadStatus({ loading: false, error: 'Please select a project' });
      return;
    }

    setLoadStatus({ loading: true, error: null });

    try {
      const response = await fetch(`${SERVER_URL}/api/projects/${selectedProject}`);

      if (!response.ok) {
        setLoadStatus({ loading: false, error: 'Project not found' });
        return;
      }

      const data: ProjectData = await response.json();

      // Populate fields from loaded data
      setProjectCode(data.metadata.projectCode);

      // Parse the chapterId to extract FliHub project code and chapter
      // Format is: "{flihubProjectCode}-ch{chapter}"
      const chapterId = data.metadata.flihub.chapterId;
      const match = chapterId.match(/^(.+)-ch(\d+)$/);
      if (match) {
        setFlihubProjectCode(match[1]);
        setChapter(match[2]);
      } else {
        // Fallback if format doesn't match
        setFlihubProjectCode(chapterId);
        setChapter('');
      }

      setSegmentA(data.metadata.flihub.segments.prompt_a);
      setSegmentB(data.metadata.flihub.segments.prompt_b);
      setSegmentC(data.metadata.flihub.segments.prompt_c);

      setPromptA(data.humanPrompts.prompt_a);
      setPromptB(data.humanPrompts.prompt_b);
      setPromptC(data.humanPrompts.prompt_c);

      // Populate source transcripts if available
      if (data.sourceTranscripts) {
        setSourceA(data.sourceTranscripts.transcripts.prompt_a);
        setSourceB(data.sourceTranscripts.transcripts.prompt_b);
        setSourceC(data.sourceTranscripts.transcripts.prompt_c);
      }

      setLoadStatus({ loading: false, error: null });
    } catch (error) {
      setLoadStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Load failed',
      });
    }
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <ToolPanel title="DAY 9: PROMPT INTAKE">
          <div className="space-y-6">
        {/* FliHub Status */}
        {fliHubOnline !== null && (
          <div
            className={`p-3 rounded-lg text-sm ${
              fliHubOnline
                ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                : 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-300'
            }`}
          >
            {fliHubOnline ? (
              <span>✓ FliHub online (port 5101)</span>
            ) : (
              <span>⚠ FliHub offline - manual entry only</span>
            )}
          </div>
        )}

        {/* FliHub Source */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">FliHub Source</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">FliHub Project Code</label>
              <input
                type="text"
                value={flihubProjectCode}
                onChange={e => setFlihubProjectCode(e.target.value)}
                placeholder="c04-12-days-of-claudmas-09"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Chapter</label>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="3"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* FliGen Output Project */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">FliGen Project Name</h3>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Project Code (for output folder)</label>
            <input
              type="text"
              value={projectCode}
              onChange={e => setProjectCode(e.target.value)}
              placeholder="VSS-001"
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </section>

        {/* Segments */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Segments</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Segment A (Seed)</label>
              <input
                type="number"
                value={segmentA}
                onChange={e => setSegmentA(parseInt(e.target.value, 10) || 1)}
                min="1"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Segment B (Edit)</label>
              <input
                type="number"
                value={segmentB}
                onChange={e => setSegmentB(parseInt(e.target.value, 10) || 2)}
                min="1"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Segment C (Animate)</label>
              <input
                type="number"
                value={segmentC}
                onChange={e => setSegmentC(parseInt(e.target.value, 10) || 3)}
                min="1"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={importAllTranscripts}
              disabled={statusA.loading || statusB.loading || statusC.loading || !fliHubOnline || !flihubProjectCode || !chapter}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium transition-colors"
            >
              {statusA.loading || statusB.loading || statusC.loading ? 'Importing...' : 'Import All Prompts from FliHub'}
            </button>
          </div>
        </section>

        <hr className="border-slate-700" />

        {/* Prompt A */}
        <section>
          <div className="mb-2">
            <label className="text-sm font-medium text-slate-300">HUMAN PROMPT A (Seed Image)</label>
          </div>
          <textarea
            value={promptA}
            onChange={e => setPromptA(e.target.value)}
            placeholder="Enter or import seed image prompt..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {statusA.error && <p className="text-sm text-red-400 mt-1">{statusA.error}</p>}
        </section>

        {/* Prompt B */}
        <section>
          <div className="mb-2">
            <label className="text-sm font-medium text-slate-300">HUMAN PROMPT B (Edit Instruction)</label>
          </div>
          <textarea
            value={promptB}
            onChange={e => setPromptB(e.target.value)}
            placeholder="Enter or import edit instruction prompt..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {statusB.error && <p className="text-sm text-red-400 mt-1">{statusB.error}</p>}
        </section>

        {/* Prompt C */}
        <section>
          <div className="mb-2">
            <label className="text-sm font-medium text-slate-300">HUMAN PROMPT C (Animation)</label>
          </div>
          <textarea
            value={promptC}
            onChange={e => setPromptC(e.target.value)}
            placeholder="Enter or import animation prompt..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {statusC.error && <p className="text-sm text-red-400 mt-1">{statusC.error}</p>}
        </section>

        <hr className="border-slate-700" />

        {/* Action Buttons */}
        <section>
          <div className="flex justify-between items-start gap-4">
            {/* Load Project */}
            <div className="flex-1">
              <div className="flex gap-2">
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.projectCode} value={p.projectCode}>
                      {p.projectCode}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadProject}
                  disabled={loadStatus.loading || !selectedProject}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition-colors"
                >
                  {loadStatus.loading ? 'Loading...' : 'Load Project'}
                </button>
              </div>
              {loadStatus.error && <p className="text-sm text-red-400 mt-1">{loadStatus.error}</p>}
            </div>

            {/* Save Project */}
            <div className="flex-1 text-right">
              <button
                onClick={saveProject}
                disabled={saveStatus.loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium transition-colors"
              >
                {saveStatus.loading ? 'Saving...' : 'Save Project'}
              </button>
              {saveStatus.success && <p className="text-sm text-green-400 mt-1">✓ Project saved successfully</p>}
              {saveStatus.error && <p className="text-sm text-red-400 mt-1">{saveStatus.error}</p>}
            </div>
          </div>
        </section>

        {/* Info Panel */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">About Prompt Intake</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            This tool creates a canonical project structure for video generation workflows. Record your prompts
            verbally in FliHub, then import them here. Save creates a project folder at{' '}
            <code className="text-blue-400">/assets/projects/{'<projectCode>'}/</code> with three JSON files that Day
            10 (Prompt Refinery) can consume directly.
          </p>
          <div className="mt-3 text-xs text-slate-500">
            <p>
              <strong>Prompt A:</strong> Seed image (text-to-image)
            </p>
            <p>
              <strong>Prompt B:</strong> Edit instruction (image-to-image)
            </p>
            <p>
              <strong>Prompt C:</strong> Animation (image-to-video)
            </p>
          </div>
        </section>
          </div>
        </ToolPanel>
      </div>
    </div>
  );
}
