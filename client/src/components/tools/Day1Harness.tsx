import { useEffect, useState } from 'react';
import type { HealthResponse } from '@fligen/shared';
import { ToolPanel } from '../ui/ToolPanel';

interface Day1HarnessProps {
  isConnected: boolean;
}

export function Day1Harness({ isConnected }: Day1HarnessProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Health check failed');
        return res.json();
      })
      .then(setHealth)
      .catch(() => {
        fetch('http://localhost:5401/health')
          .then((res) => res.json())
          .then(setHealth)
          .catch((err) => setError(err.message));
      });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Day 1 - FliGen Harness
        </h1>
        <p className="text-slate-400">12 Days of Claudemas</p>
      </div>

      {/* Server Health */}
      <ToolPanel title="Server Health">
        {error ? (
          <p className="text-red-400">Error: {error}</p>
        ) : health ? (
          <div className="space-y-2 text-sm">
            <p>
              Status:{' '}
              <span className={health.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                {health.status}
              </span>
            </p>
            <p className="text-slate-500">Uptime: {Math.floor(health.uptime)}s</p>
          </div>
        ) : (
          <p className="text-slate-500">Checking...</p>
        )}
      </ToolPanel>

      {/* Socket.io Status */}
      <ToolPanel title="Socket.io Connection">
        <p className="text-sm">
          Status:{' '}
          <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </p>
      </ToolPanel>

      {/* Tech Stack */}
      <ToolPanel title="Tech Stack">
        <div className="flex flex-wrap gap-2">
          {['React 19', 'Vite 6', 'TailwindCSS v4', 'Express 5', 'Socket.io', 'TypeScript'].map(
            (tech) => (
              <span
                key={tech}
                className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
              >
                {tech}
              </span>
            )
          )}
        </div>
      </ToolPanel>

      {/* Navigation Hint */}
      <div className="text-center text-slate-500 text-sm mt-8">
        <p>Use the sidebar or keyboard shortcuts to navigate</p>
        <p className="text-xs mt-1">
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Cmd/Ctrl + 1-9</kbd> for days,{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Cmd/Ctrl + [/]</kbd> for prev/next
        </p>
      </div>
    </div>
  );
}
