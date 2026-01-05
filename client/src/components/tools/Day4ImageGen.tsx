import { useState, useEffect } from 'react';
import { ToolPanel } from '../ui/ToolPanel';
import { ShotListStrip } from '../ui/ShotListStrip';
import { useShots } from '../../hooks/useShots';
import type { Provider } from '@fligen/shared';

// ============================================
// Types
// ============================================

interface ProviderHealth {
  configured: boolean;
  authenticated: boolean;
  error?: string;
}

interface ImageApiHealth {
  fal: ProviderHealth;
  kie: ProviderHealth;
}

interface ProviderTestResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  durationMs: number;
}

interface ImageTestResult {
  fal: ProviderTestResult;
  kie: ProviderTestResult;
}

interface CompareResult {
  provider: 'fal' | 'kie';
  tier: 'advanced' | 'midrange';
  model: string;
  imageUrl?: string;
  durationMs: number;
  estimatedCost: number;
  resolution: { width: number; height: number };
  error?: string;
}

interface CompareResponse {
  results: CompareResult[];
}

type TabId = 'comparison' | 'status';

const SERVER_URL = 'http://localhost:5401';
const DEFAULT_PROMPT = 'A red sports car on a mountain road at sunset';

// ============================================
// Status Indicator Component
// ============================================

function StatusIndicator({ health }: { health: ProviderHealth }) {
  if (!health.configured) {
    return (
      <span className="flex items-center gap-2 text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        Not Configured
      </span>
    );
  }

  if (!health.authenticated) {
    return (
      <span className="flex items-center gap-2 text-yellow-400">
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        Auth Failed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-green-400">
      <span className="w-2 h-2 rounded-full bg-green-400" />
      Connected
    </span>
  );
}

// ============================================
// Comparison Grid Cell Component
// ============================================

function ComparisonCell({
  result,
  isLoading,
  prompt,
  onAddToShots,
  addedIds,
}: {
  result: CompareResult | null;
  isLoading: boolean;
  prompt: string;
  onAddToShots: (result: CompareResult, prompt: string) => Promise<void>;
  addedIds: Set<string>;
}) {
  const [isAdding, setIsAdding] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 animate-pulse">
        <div className="aspect-square bg-slate-700 rounded mb-3 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Generating...</div>
        </div>
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="aspect-square bg-slate-900 rounded mb-3 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Waiting...</div>
        </div>
        <div className="text-slate-500 text-sm">Click "Generate All" to start</div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="bg-slate-800 rounded-lg border border-red-800 p-4">
        <div className="aspect-square bg-red-900/20 rounded mb-3 flex items-center justify-center">
          <div className="text-red-400 text-sm text-center px-2">{result.error}</div>
        </div>
        <div className="text-slate-300 text-sm font-medium">{result.model}</div>
        <div className="text-slate-500 text-xs">
          {(result.durationMs / 1000).toFixed(1)}s | ${result.estimatedCost.toFixed(3)}
        </div>
      </div>
    );
  }

  const resultKey = `${result.provider}-${result.tier}`;
  const isAdded = addedIds.has(resultKey);

  const handleClick = async () => {
    if (isAdded || isAdding || !result.imageUrl) return;
    setIsAdding(true);
    try {
      await onAddToShots(result, prompt);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {result.imageUrl && (
        <div
          className="relative aspect-square w-full rounded mb-3 border border-slate-600 overflow-hidden group cursor-pointer"
          onClick={handleClick}
        >
          <img
            src={result.imageUrl}
            alt={`${result.model} result`}
            className="w-full h-full object-cover"
          />
          {/* Hover overlay */}
          {!isAdded && !isAdding && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">+ Add to Shots</span>
            </div>
          )}
          {/* Adding state */}
          {isAdding && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-sm">Adding...</span>
            </div>
          )}
          {/* Added state */}
          {isAdded && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Added
            </div>
          )}
        </div>
      )}
      <div className="text-slate-300 text-sm font-medium">{result.model}</div>
      <div className="text-slate-500 text-xs">
        {(result.durationMs / 1000).toFixed(1)}s | ${result.estimatedCost.toFixed(3)} | {result.resolution.width}×{result.resolution.height}
      </div>
    </div>
  );
}

// ============================================
// Comparison Tab Content
// ============================================

function ComparisonTab() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [imageHistory, setImageHistory] = useState<any[]>([]);
  const { addShot } = useShots();

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/catalog/filter?type=image`);
      const data = await response.json();
      setImageHistory(data.assets.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('[Day4] Failed to load history:', error);
    }
  };

  const generateAll = async () => {
    setIsGenerating(true);
    setResults([]);
    setAddedIds(new Set()); // Reset added state for new generation

    try {
      const response = await fetch(`${SERVER_URL}/api/image/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data: CompareResponse = await response.json();
      setResults(data.results);

      // Auto-save all successful images to catalog
      const savePromises = data.results
        .filter(result => result.imageUrl && !result.error)
        .map(async (result) => {
          try {
            const saveResponse = await fetch(`${SERVER_URL}/api/images/save-to-catalog`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: result.imageUrl,
                prompt,
                provider: result.provider,
                model: result.model,
                width: result.resolution.width,
                height: result.resolution.height,
                metadata: {
                  tier: result.tier,
                  estimatedCost: result.estimatedCost,
                  generationTimeMs: result.durationMs,
                },
              }),
            });

            const saveData = await saveResponse.json();
            console.log('[Day4] Image saved to catalog:', saveData.asset?.id);
            return saveData.asset;
          } catch (err) {
            console.error('[Day4] Failed to save image to catalog:', err);
            return null;
          }
        });

      await Promise.all(savePromises);
      console.log('[Day4] All images saved to catalog');

      // Reload history to show newly generated images
      await loadHistory();
    } catch (error) {
      console.error('Failed to generate comparison:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle adding image to shots
  const handleAddToShots = async (result: CompareResult, promptText: string) => {
    if (!result.imageUrl) return;

    const success = await addShot({
      imageUrl: result.imageUrl,
      prompt: promptText,
      provider: result.provider as Provider,
      model: result.model,
      width: result.resolution.width,
      height: result.resolution.height,
    });

    if (success) {
      const resultKey = `${result.provider}-${result.tier}`;
      setAddedIds(prev => new Set([...prev, resultKey]));
    }
  };

  // Helper to find result by provider and tier
  const getResult = (provider: 'fal' | 'kie', tier: 'advanced' | 'midrange'): CompareResult | null => {
    return results.find(r => r.provider === provider && r.tier === tier) ?? null;
  };

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div className="space-y-3">
        <label className="block text-sm text-slate-400">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
          rows={2}
          placeholder="Enter your prompt..."
        />
        <button
          onClick={generateAll}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
            isGenerating || !prompt.trim()
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isGenerating ? 'Generating 4 images...' : 'Generate All'}
        </button>
      </div>

      {/* Shot List Strip */}
      <ShotListStrip />

      {/* 2x2 Comparison Grid - only show after first generation */}
      {(results.length > 0 || isGenerating) && (
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4">
          {/* Header Row */}
          <div></div>
          <div className="text-center text-sm font-medium text-slate-400">FAL.AI</div>
          <div className="text-center text-sm font-medium text-slate-400">KIE.AI</div>

          {/* Advanced Row */}
          <div className="flex items-center justify-end pr-2 text-sm font-medium text-slate-400">
            ADVANCED
          </div>
          <ComparisonCell
            result={getResult('fal', 'advanced')}
            isLoading={isGenerating}
            prompt={prompt}
            onAddToShots={handleAddToShots}
            addedIds={addedIds}
          />
          <ComparisonCell
            result={getResult('kie', 'advanced')}
            isLoading={isGenerating}
            prompt={prompt}
            onAddToShots={handleAddToShots}
            addedIds={addedIds}
          />

          {/* Mid-range Row */}
          <div className="flex items-center justify-end pr-2 text-sm font-medium text-slate-400">
            MID-RANGE
          </div>
          <ComparisonCell
            result={getResult('fal', 'midrange')}
            isLoading={isGenerating}
            prompt={prompt}
            onAddToShots={handleAddToShots}
            addedIds={addedIds}
          />
          <ComparisonCell
            result={getResult('kie', 'midrange')}
            isLoading={isGenerating}
            prompt={prompt}
            onAddToShots={handleAddToShots}
            addedIds={addedIds}
          />
        </div>
      )}

      {/* Summary Stats */}
      {results.length > 0 && (
        <ToolPanel title="Summary">
          <div className="text-sm text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-300">Successful:</strong>{' '}
              {results.filter(r => !r.error).length}/{results.length}
            </p>
            <p>
              <strong className="text-slate-300">Total Cost:</strong>{' '}
              ${results.reduce((sum, r) => sum + r.estimatedCost, 0).toFixed(3)}
            </p>
            <p>
              <strong className="text-slate-300">Total Time:</strong>{' '}
              {(results.reduce((sum, r) => sum + r.durationMs, 0) / 1000).toFixed(1)}s (parallel)
            </p>
          </div>
        </ToolPanel>
      )}

      {/* Generation History */}
      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-lg font-semibold mb-4">Generation History ({imageHistory.length})</h3>

        {imageHistory.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No images generated yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imageHistory.map((asset: any) => (
              <div key={asset.id} className="bg-slate-800 rounded-lg border border-slate-700 p-3 hover:border-slate-600 transition-colors">
                <div className="aspect-square w-full rounded mb-2 border border-slate-600 overflow-hidden">
                  <img
                    src={`http://localhost:5401${asset.url}`}
                    alt={asset.prompt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-400 truncate mb-1" title={asset.prompt}>
                  {asset.prompt}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  {new Date(asset.createdAt).toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {asset.provider} • {asset.metadata?.width}×{asset.metadata?.height}
                  </span>
                  <button
                    onClick={() => setPrompt(asset.prompt)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Reuse
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// API Status Tab Content (from FR-07)
// ============================================

function ProviderCard({
  name,
  health,
  testResult,
  onTest,
  isTesting,
  setupUrl,
}: {
  name: string;
  health: ProviderHealth | null;
  testResult: ProviderTestResult | null;
  onTest: () => void;
  isTesting: boolean;
  setupUrl: string;
}) {
  return (
    <ToolPanel title={name}>
      <div className="space-y-4">
        {/* Health Status */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Status:</span>
          {health ? (
            <StatusIndicator health={health} />
          ) : (
            <span className="text-slate-500">Checking...</span>
          )}
        </div>

        {/* Error Message */}
        {health?.error && (
          <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm text-red-300">
            {health.error}
          </div>
        )}

        {/* Setup Link */}
        {health && !health.configured && (
          <a
            href={setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:text-blue-300 text-sm"
          >
            Get your API key
          </a>
        )}

        {/* Test Button */}
        <button
          onClick={onTest}
          disabled={!health?.configured || isTesting}
          className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
            !health?.configured || isTesting
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isTesting ? 'Generating...' : 'Test Connection'}
        </button>

        {/* Test Result */}
        {testResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Result:</span>
              <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                {testResult.success ? 'Success' : 'Failed'}
              </span>
            </div>

            {testResult.durationMs > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Duration:</span>
                <span className="text-slate-300">{(testResult.durationMs / 1000).toFixed(2)}s</span>
              </div>
            )}

            {testResult.error && (
              <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm text-red-300">
                {testResult.error}
              </div>
            )}

            {testResult.imageUrl && (
              <div className="mt-2">
                <img
                  src={testResult.imageUrl}
                  alt="Generated test image"
                  className="w-full rounded border border-slate-700"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

function ApiStatusTab() {
  const [health, setHealth] = useState<ImageApiHealth | null>(null);
  const [testResults, setTestResults] = useState<ImageTestResult | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isTesting, setIsTesting] = useState<{ fal: boolean; kie: boolean }>({
    fal: false,
    kie: false,
  });

  // Load health status on mount
  useEffect(() => {
    fetch(`${SERVER_URL}/api/image/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setIsLoadingHealth(false);
      })
      .catch((err) => {
        console.error('Failed to fetch health:', err);
        setIsLoadingHealth(false);
      });
  }, []);

  const testProvider = async (provider: 'fal' | 'kie') => {
    setIsTesting((prev) => ({ ...prev, [provider]: true }));

    try {
      const response = await fetch(`${SERVER_URL}/api/image/test`);
      const results: ImageTestResult = await response.json();

      setTestResults((prev) => ({
        fal: prev?.fal ?? results.fal,
        kie: prev?.kie ?? results.kie,
        [provider]: results[provider],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setTestResults((prev) => ({
        fal: prev?.fal ?? { success: false, error: message, durationMs: 0 },
        kie: prev?.kie ?? { success: false, error: message, durationMs: 0 },
        [provider]: { success: false, error: message, durationMs: 0 },
      }));
    } finally {
      setIsTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const testAll = async () => {
    setIsTesting({ fal: true, kie: true });

    try {
      const response = await fetch(`${SERVER_URL}/api/image/test`);
      const results: ImageTestResult = await response.json();
      setTestResults(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setTestResults({
        fal: { success: false, error: message, durationMs: 0 },
        kie: { success: false, error: message, durationMs: 0 },
      });
    } finally {
      setIsTesting({ fal: false, kie: false });
    }
  };

  const refreshHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/image/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to refresh health:', error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={refreshHealth}
          disabled={isLoadingHealth}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors disabled:opacity-50"
        >
          {isLoadingHealth ? 'Checking...' : 'Refresh Status'}
        </button>
        <button
          onClick={testAll}
          disabled={isTesting.fal || isTesting.kie || !health}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors disabled:opacity-50"
        >
          {isTesting.fal || isTesting.kie ? 'Testing...' : 'Test All Providers'}
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProviderCard
          name="FAL.AI"
          health={health?.fal ?? null}
          testResult={testResults?.fal ?? null}
          onTest={() => testProvider('fal')}
          isTesting={isTesting.fal}
          setupUrl="https://fal.ai/dashboard/keys"
        />
        <ProviderCard
          name="KIE.AI"
          health={health?.kie ?? null}
          testResult={testResults?.kie ?? null}
          onTest={() => testProvider('kie')}
          isTesting={isTesting.kie}
          setupUrl="https://kie.ai/api-key"
        />
      </div>

      {/* Configuration */}
      <ToolPanel title="Configuration">
        <div className="text-sm text-slate-400 space-y-3">
          <p>Add API keys to <code className="px-1 py-0.5 bg-slate-700 rounded">server/.env</code>:</p>
          <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto">
{`# FAL.AI - https://fal.ai/dashboard/keys
FAL_API_KEY=your_fal_api_key_here

# KIE.AI - https://kie.ai/api-key
KIE_API_KEY=your_kie_api_key_here`}
          </pre>
          <p className="text-slate-500">Restart the server after updating .env</p>
        </div>
      </ToolPanel>
    </div>
  );
}

// ============================================
// Main Day4 Component with Tabs
// ============================================

export function Day4ImageGen() {
  const [activeTab, setActiveTab] = useState<TabId>('comparison');

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Day 4 - Image Generator
          </h1>
          <p className="text-slate-400">Compare FAL.AI and KIE.AI image generation</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-700 pb-2">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === 'comparison'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Image Comparison
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === 'status'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            API Status
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'comparison' ? <ComparisonTab /> : <ApiStatusTab />}
      </div>
    </div>
  );
}
