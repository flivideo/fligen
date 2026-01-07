import { useState } from 'react';
import { DAYS } from '@fligen/shared';
import { ConfigModal } from './components/ui/ConfigModal';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { useSocket } from './hooks/useSocket';
import { Day2AgentSDK } from './components/tools/Day2AgentSDK';
import { Day4ImageGen } from './components/tools/Day4ImageGen';
import { Day5TTS } from './components/tools/Day5TTS';
import { Day6Video } from './components/tools/Day6Video';
import { Day7MusicGen } from './components/tools/Day7MusicGen';
import { Day8Thumbnail } from './components/tools/Day8Thumbnail';
import { Day9PromptIntake } from './components/tools/Day9PromptIntake';
import Day10N8N from './components/tools/Day10N8N';
import Day11StoryBuilder from './components/tools/Day11StoryBuilder';
import Day13BrandText from './components/tools/Day13BrandText';
import { AssetBrowser } from './components/tools/AssetBrowser';

function AppContent() {
  const { connected: socketConnected } = useSocket();
  const [currentDay, setCurrentDay] = useState(2); // Start on Day 2 for chat demo
  const [showSettings, setShowSettings] = useState(false);
  const [viewingLibrary, setViewingLibrary] = useState(false);
  const { showDayIcons } = useSettings();

  const day = DAYS[currentDay - 1];

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-[200px] shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        <nav className="flex-1 py-2 overflow-y-auto">
          {DAYS.map((d) => (
            <button
              key={d.day}
              onClick={() => {
                setCurrentDay(d.day);
                setViewingLibrary(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                currentDay === d.day && !viewingLibrary
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {showDayIcons && (
                <span className="text-lg shrink-0">{d.icon}</span>
              )}
              <span className="flex-1 truncate text-sm">Day {d.day} - {d.shortName}</span>
              <span className={d.status === 'complete' ? 'text-green-400' : d.status === 'next' ? 'text-yellow-400' : 'text-slate-500'}>
                {d.status === 'complete' ? '✓' : d.status === 'next' ? '▶' : '○'}
              </span>
            </button>
          ))}
        </nav>

        {/* Library Navigation */}
        <div className="border-t border-slate-700">
          <button
            onClick={() => setViewingLibrary(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
              viewingLibrary
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <span className="text-lg shrink-0">📚</span>
            <span className="flex-1 truncate text-sm">Asset Library</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 shrink-0 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center">
            <span className="font-bold text-blue-400">FliGen</span>
            <span className="mx-2 text-slate-500">›</span>
            <span className="text-slate-400">
              {viewingLibrary ? 'Asset Library' : `Day ${day.day} - ${day.name}`}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden bg-slate-900">
          {viewingLibrary ? (
            <AssetBrowser />
          ) : currentDay === 2 ? (
            <Day2AgentSDK />
          ) : currentDay === 4 ? (
            <Day4ImageGen />
          ) : currentDay === 5 ? (
            <Day5TTS />
          ) : currentDay === 6 ? (
            <Day6Video />
          ) : currentDay === 7 ? (
            <Day7MusicGen />
          ) : currentDay === 8 ? (
            <Day8Thumbnail />
          ) : currentDay === 9 ? (
            <Day9PromptIntake />
          ) : currentDay === 10 ? (
            <Day10N8N />
          ) : currentDay === 11 ? (
            <Day11StoryBuilder />
          ) : currentDay === 13 ? (
            <Day13BrandText />
          ) : (
            <div className="h-full overflow-auto p-4">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Day {day.day} - {day.name}
                </h1>

                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
                  <h2 className="text-sm text-slate-400 mb-2">Connection Status</h2>
                  <p className={socketConnected ? 'text-green-400' : 'text-yellow-400'}>
                    {socketConnected ? '● Connected' : '○ Connecting...'}
                  </p>
                </div>

                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
                  <h2 className="text-sm text-slate-400 mb-2">Purpose</h2>
                  <p className="text-white">{day.purpose}</p>
                </div>

                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <h2 className="text-sm text-slate-400 mb-2">Tech Stack</h2>
                  <div className="flex flex-wrap gap-2">
                    {day.apisTech?.map(tech => (
                      <span key={tech} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Status bar */}
        <footer className="h-8 shrink-0 bg-slate-800 border-t border-slate-700 flex items-center px-4 text-xs">
          <span className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="mx-3 text-slate-500">│</span>
          <span className="text-slate-400">Idle</span>
        </footer>
      </div>

      {/* Settings Modal */}
      <ConfigModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
