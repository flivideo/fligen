import { useState, useEffect, useRef } from 'react';
import { ToolPanel } from '../ui/ToolPanel';

// ============================================
// Types
// ============================================

interface Voice {
  voiceId: string;
  name: string;
  description: string;
}

interface VoicesResponse {
  voices: Voice[];
}

interface GenerateSpeechResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  durationMs?: number;
  voiceId?: string;
  voiceName?: string;
  model?: string;
  characterCount?: number;
  error?: string;
}

const SERVER_URL = 'http://localhost:5401';
const MAX_CHARACTERS = 5000;

// Default narration text from the Fox and Lazy Dog story
const DEFAULT_TEXT = `A quick brown fox discovers a lazy hound dozing beneath an old oak tree. With one graceful leap, the fox soars over the sleeping dog and disappears into the golden meadow.`;

// ============================================
// Audio Player Component
// ============================================

function AudioPlayer({
  audioUrl,
  voiceName,
  model,
  durationMs,
}: {
  audioUrl: string;
  voiceName: string;
  model: string;
  durationMs: number;
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Player Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={audioDuration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-400">
        <span className="text-slate-300 font-medium">Voice:</span> {voiceName} |{' '}
        <span className="text-slate-300 font-medium">Generation:</span> {(durationMs / 1000).toFixed(1)}s |{' '}
        <span className="text-slate-300 font-medium">Model:</span> {model}
      </div>
    </div>
  );
}

// ============================================
// Main Day5 Component
// ============================================

export function Day5TTS() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateSpeechResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load voices on mount
  useEffect(() => {
    fetch(`${SERVER_URL}/api/tts/voices`)
      .then((res) => res.json())
      .then((data: VoicesResponse) => {
        setVoices(data.voices);
        if (data.voices.length > 0) {
          setSelectedVoiceId(data.voices[0].voiceId);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch voices:', err);
      });
  }, []);

  // Cleanup audio URL on unmount or when generating new audio
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const generateAudio = async () => {
    if (!text.trim() || !selectedVoiceId) return;

    setIsGenerating(true);
    setResult(null);

    // Cleanup previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoiceId }),
      });

      const data: GenerateSpeechResult = await response.json();
      setResult(data);

      // Convert base64 to blob URL for audio playback
      if (data.success && data.audioBase64) {
        const binaryString = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate audio',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl || !result) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `narration-${timestamp}.mp3`;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedVoice = voices.find((v) => v.voiceId === selectedVoiceId);
  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Day 5 - Text-to-Speech
          </h1>
          <p className="text-slate-400">Convert text to natural-sounding voice narration</p>
        </div>

        {/* Voice Selection */}
        <ToolPanel title="Voice Selection">
          <div className="space-y-3">
            <label className="block text-sm text-slate-400">Select Voice</label>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {voices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.name} - {voice.description}
                </option>
              ))}
            </select>
          </div>
        </ToolPanel>

        {/* Text Input */}
        <ToolPanel title="Narration Text">
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full bg-slate-900 border rounded-lg p-3 text-white text-sm resize-none focus:outline-none ${
                isOverLimit
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-700 focus:border-blue-500'
              }`}
              rows={6}
              placeholder="Enter your narration text here..."
            />
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isOverLimit ? 'text-red-400' : 'text-slate-400'}`}>
                {characterCount} / {MAX_CHARACTERS} characters
              </span>
              <button
                onClick={generateAudio}
                disabled={isGenerating || !text.trim() || isOverLimit || !selectedVoiceId}
                className={`py-2 px-6 rounded-lg text-sm font-medium transition-colors ${
                  isGenerating || !text.trim() || isOverLimit || !selectedVoiceId
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Generate Audio'}
              </button>
            </div>
          </div>
        </ToolPanel>

        {/* Error Display */}
        {result && !result.success && result.error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            <strong>Error:</strong> {result.error}
          </div>
        )}

        {/* Audio Player */}
        {result?.success && audioUrl && (
          <ToolPanel title="Generated Audio">
            <div className="space-y-4">
              <AudioPlayer
                audioUrl={audioUrl}
                voiceName={result.voiceName || selectedVoice?.name || 'Unknown'}
                model={result.model || 'eleven_multilingual_v2'}
                durationMs={result.durationMs || 0}
              />

              <div className="flex gap-4">
                <button
                  onClick={downloadAudio}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Download MP3
                </button>
                <button
                  onClick={generateAudio}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </ToolPanel>
        )}

        {/* Configuration Info */}
        <ToolPanel title="Configuration">
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              Add your ElevenLabs API key to{' '}
              <code className="px-1 py-0.5 bg-slate-700 rounded">server/.env</code>:
            </p>
            <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto">
{`# ElevenLabs TTS API
# Get your API key from: https://elevenlabs.io
ELEVENLABS_API_KEY=your_api_key_here`}
            </pre>
            <p className="text-slate-500">Restart the server after updating .env</p>
          </div>
        </ToolPanel>
      </div>
    </div>
  );
}
