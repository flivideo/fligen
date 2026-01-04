import { useState, useEffect, useRef } from 'react';
import { ToolPanel } from '../ui/ToolPanel';

// ============================================
// Types
// ============================================

type MusicProvider = 'fal' | 'kie';
type OutputFormat = 'wav' | 'mp3' | 'flac';
type TrackStatus = 'generating' | 'ready' | 'saved' | 'error';

interface GeneratedTrack {
  id: string;
  name: string;
  audioUrl: string;
  audioBase64?: string;
  provider: MusicProvider;
  model: string;
  prompt: string;
  lyrics?: string;
  style?: string;
  duration: number; // seconds
  generatedAt: Date;
  status: TrackStatus;
  estimatedCost: number;
  generationTimeMs: number;
}

interface SavedTrack extends GeneratedTrack {
  savedAt: Date;
  filename: string;
}

// MusicGenerationRequest type - matches server request format
// (kept inline in generateMusic function to avoid unused type warning)

const SERVER_URL = 'http://localhost:5401';

// Default prompts for quick testing
const DEFAULT_PROMPT = 'An upbeat electronic track with synth melodies and driving drums';
const DEFAULT_LYRICS = `Verse 1:
Dancing through the night
Stars are shining bright
Feel the rhythm flow
Let the music go

Chorus:
We're alive tonight
Everything feels right
Moving to the beat
Feel the energy`;

// ============================================
// Provider Toggle Component
// ============================================

function ProviderToggle({
  selected,
  onChange,
}: {
  selected: MusicProvider;
  onChange: (provider: MusicProvider) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-600">
      <button
        onClick={() => onChange('fal')}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          selected === 'fal'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
      >
        <span className="block text-xs opacity-70">FAL.AI</span>
        <span>SonAuto</span>
      </button>
      <button
        onClick={() => onChange('kie')}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-slate-600 ${
          selected === 'kie'
            ? 'bg-purple-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
      >
        <span className="block text-xs opacity-70">KIE.AI</span>
        <span>Suno</span>
      </button>
    </div>
  );
}

// ============================================
// Audio Player Component (compact for list)
// ============================================

function CompactAudioPlayer({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
}: {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      <button
        onClick={onTogglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-slate-400 w-10">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-xs text-slate-400 w-10">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// ============================================
// Track Card Component
// ============================================

function TrackCard({
  track,
  onNameChange,
  onSave,
  onDelete,
  isSaving,
}: {
  track: GeneratedTrack;
  onNameChange: (id: string, name: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSaveName = () => {
    onNameChange(track.id, editName);
    setIsEditing(false);
  };

  const providerColors = {
    fal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    kie: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const statusColors = {
    generating: 'bg-yellow-500/20 text-yellow-400',
    ready: 'bg-slate-500/20 text-slate-400',
    saved: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className={`bg-slate-800 rounded-lg border p-4 ${
      track.status === 'saved' ? 'border-green-600/50' : 'border-slate-700'
    }`}>
      <audio
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Row: Name + Status */}
      <div className="flex items-center gap-3 mb-3">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button
              onClick={handleSaveName}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              ✓
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditName(track.name); }}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className="font-medium text-white truncate">{track.name}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-500 hover:text-slate-300 text-xs"
              title="Edit name"
            >
              ✎
            </button>
          </div>
        )}

        {/* Status badges */}
        <span className={`px-2 py-0.5 rounded text-xs border ${providerColors[track.provider]}`}>
          {track.provider === 'fal' ? 'SonAuto' : 'Suno'}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[track.status]}`}>
          {track.status === 'saved' ? '✓ Saved' : track.status}
        </span>
      </div>

      {/* Audio Player */}
      <div className="mb-3">
        <CompactAudioPlayer
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          currentTime={currentTime}
          duration={audioDuration}
          onSeek={handleSeek}
        />
      </div>

      {/* Meta Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span>
          {new Date(track.generatedAt).toLocaleTimeString()} · {(track.generationTimeMs / 1000).toFixed(1)}s · ${track.estimatedCost.toFixed(3)}
        </span>
        <span className="truncate max-w-[200px]" title={track.prompt}>
          {track.prompt}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {track.status !== 'saved' && (
          <button
            onClick={() => onSave(track.id)}
            disabled={isSaving}
            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save to Library'}
          </button>
        )}
        <button
          onClick={() => {
            const a = document.createElement('a');
            a.href = track.audioUrl;
            a.download = `${track.name}.mp3`;
            a.click();
          }}
          className="py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          Download
        </button>
        <button
          onClick={() => onDelete(track.id)}
          className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ============================================
// Saved Library Track Component
// ============================================

function SavedTrackRow({
  track,
  onDelete,
}: {
  track: SavedTrack;
  onDelete: (id: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-slate-850 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
      <audio
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{track.name}</div>
        <div className="text-xs text-slate-500">
          {track.provider === 'fal' ? 'SonAuto' : 'Suno'} · Saved {new Date(track.savedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-32 hidden md:block">
        <input
          type="range"
          min={0}
          max={audioDuration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const a = document.createElement('a');
            a.href = track.audioUrl;
            a.download = track.filename;
            a.click();
          }}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Download"
        >
          ↓
        </button>
        <button
          onClick={() => onDelete(track.id)}
          className="p-2 text-red-400 hover:text-red-300 transition-colors"
          title="Delete"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ============================================
// Main Day7 Component
// ============================================

export function Day7MusicGen() {
  // Form state
  const [provider, setProvider] = useState<MusicProvider>('fal');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('electronic, synth, upbeat');
  const [instrumental, setInstrumental] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp3');
  const [bpm, setBpm] = useState<number | 'auto'>('auto');
  const [showLyrics, setShowLyrics] = useState(false);

  // KIE-specific options
  const [kieModel, setKieModel] = useState('V4.5');
  const [vocalGender, setVocalGender] = useState<'male' | 'female'>('female');
  const [title, setTitle] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null);

  // Load saved tracks from server on mount
  useEffect(() => {
    loadSavedTracks();
  }, []);

  const loadSavedTracks = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/music/library`);
      if (response.ok) {
        const data = await response.json();
        setSavedTracks(data.tracks || []);
      }
    } catch (error) {
      console.error('Failed to load saved tracks:', error);
    }
  };

  const generateMusic = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`${SERVER_URL}/api/music/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          prompt,
          lyrics: showLyrics ? lyrics : undefined,
          style,
          tags: style ? style.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          instrumental,
          outputFormat,
          bpm,
          title: title || `Track ${generatedTracks.length + 1}`,
          model: provider === 'kie' ? kieModel : undefined,
          vocalGender: provider === 'kie' && !instrumental ? vocalGender : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate music');
      }

      // Convert generatedAt string to Date for display
      const track: GeneratedTrack = {
        ...data.track,
        generatedAt: new Date(data.track.generatedAt),
      };

      setGeneratedTracks((prev) => [track, ...prev]);
    } catch (error) {
      console.error('Failed to generate music:', error);
      alert(`Failed to generate music: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNameChange = (id: string, name: string) => {
    setGeneratedTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const handleSaveTrack = async (id: string) => {
    const track = generatedTracks.find((t) => t.id === id);
    if (!track) return;

    setSavingTrackId(id);

    try {
      const response = await fetch(`${SERVER_URL}/api/music/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: track.name,
          audioBase64: track.audioBase64,
          provider: track.provider,
          model: track.model,
          prompt: track.prompt,
          lyrics: track.lyrics,
          style: track.style,
        }),
      });

      if (response.ok) {
        const savedTrack = await response.json();

        // Update track status to saved
        setGeneratedTracks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'saved' as TrackStatus } : t))
        );

        // Add to saved tracks
        setSavedTracks((prev) => [savedTrack, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save track:', error);
    } finally {
      setSavingTrackId(null);
    }
  };

  const handleDeleteTrack = (id: string) => {
    setGeneratedTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeleteSavedTrack = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/music/library/${id}`, { method: 'DELETE' });
      setSavedTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete saved track:', error);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Day 7 - Music Generator
          </h1>
          <p className="text-slate-400">Create AI-generated music with vocals and instrumentals</p>
        </div>

        {/* Provider Selection */}
        <ToolPanel title="Provider">
          <ProviderToggle selected={provider} onChange={setProvider} />
        </ToolPanel>

        {/* Generation Form */}
        <ToolPanel title="Music Settings">
          <div className="space-y-4">
            {/* Prompt */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Prompt <span className="text-slate-600">(describe the music)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                rows={2}
                placeholder="An upbeat electronic track with synth melodies..."
              />
            </div>

            {/* Style/Tags */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Style / Tags <span className="text-slate-600">(genres, moods, instruments)</span>
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="electronic, ambient, chill, piano"
              />
            </div>

            {/* Lyrics Toggle + Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">Lyrics</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLyrics}
                    onChange={(e) => setShowLyrics(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm text-slate-400">Include lyrics</span>
                </label>
              </div>
              {showLyrics && (
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 font-mono"
                  rows={6}
                  placeholder={DEFAULT_LYRICS}
                />
              )}
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Instrumental */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => setInstrumental(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm text-slate-300">Instrumental</span>
              </label>

              {/* Output Format */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="flac">FLAC</option>
                </select>
              </div>

              {/* BPM */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">BPM</label>
                <input
                  type="text"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) || 'auto')}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="auto"
                />
              </div>

              {/* Title (for saved file) */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="My Track"
                />
              </div>
            </div>

            {/* KIE-specific options */}
            {provider === 'kie' && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Suno Model</label>
                  <select
                    value={kieModel}
                    onChange={(e) => setKieModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="V3.5">V3.5</option>
                    <option value="V4">V4</option>
                    <option value="V4.5">V4.5</option>
                    <option value="V5">V5 (Latest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Vocal Gender</label>
                  <select
                    value={vocalGender}
                    onChange={(e) => setVocalGender(e.target.value as 'male' | 'female')}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateMusic}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                isGenerating || !prompt.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : provider === 'fal'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating with {provider === 'fal' ? 'SonAuto' : 'Suno'}...
                </span>
              ) : (
                `Generate Music (~$${provider === 'fal' ? '0.075' : '0.06'})`
              )}
            </button>
          </div>
        </ToolPanel>

        {/* Generated Tracks */}
        {generatedTracks.length > 0 && (
          <ToolPanel title={`Generated Tracks (${generatedTracks.length})`}>
            <div className="space-y-4">
              {generatedTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onNameChange={handleNameChange}
                  onSave={handleSaveTrack}
                  onDelete={handleDeleteTrack}
                  isSaving={savingTrackId === track.id}
                />
              ))}
            </div>
          </ToolPanel>
        )}

        {/* Saved Library */}
        <ToolPanel title={`Saved Library (${savedTracks.length})`}>
          {savedTracks.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <div className="text-4xl mb-2">🎵</div>
              <p>No saved tracks yet</p>
              <p className="text-sm">Generate music and save it to your library</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedTracks.map((track) => (
                <SavedTrackRow
                  key={track.id}
                  track={track}
                  onDelete={handleDeleteSavedTrack}
                />
              ))}
            </div>
          )}
        </ToolPanel>

        {/* Configuration Info */}
        <ToolPanel title="Configuration">
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              API keys should be configured in{' '}
              <code className="px-1 py-0.5 bg-slate-700 rounded">server/.env</code>:
            </p>
            <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto">
{`# FAL.AI (SonAuto) - https://fal.ai/dashboard/keys
FAL_API_KEY=your_fal_api_key_here

# KIE.AI (Suno) - https://kie.ai/api-key
KIE_API_KEY=your_kie_api_key_here`}
            </pre>
            <div className="flex gap-4 text-xs">
              <span className="text-blue-400">SonAuto: $0.075/track</span>
              <span className="text-purple-400">Suno: ~$0.06/track</span>
            </div>
          </div>
        </ToolPanel>
      </div>
    </div>
  );
}
