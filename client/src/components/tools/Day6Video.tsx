import { useState, useEffect } from 'react';
import { ShotListStrip } from '../ui/ShotListStrip';
import { useSocket } from '../../hooks/useSocket';
import type { Shot, VideoTask } from '@fligen/shared';

const SERVER_URL = 'http://localhost:5401';

type VideoModel = 'veo3' | 'kling-o1' | 'wan-flf2v';

interface DropZoneProps {
  label: string;
  shot: Shot | null;
  onDrop: (shot: Shot) => void;
  onClear: () => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

function DropZone({ label, shot, onDrop, onClear, isDragOver, onDragOver, onDragLeave }: DropZoneProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log(`[Day6Video] Drop event on ${label}`);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const droppedShot = JSON.parse(data) as Shot;
        console.log(`[Day6Video] Dropped shot:`, droppedShot.id, droppedShot.filename);
        onDrop(droppedShot);
      } catch {
        console.error('[Day6Video] Failed to parse dropped shot data');
      }
    } else {
      console.log(`[Day6Video] No JSON data in drop event`);
    }
    onDragLeave();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium text-slate-400">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(e);
        }}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        className={`w-40 h-40 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/20'
            : shot
            ? 'border-slate-600 bg-slate-800'
            : 'border-slate-600 bg-slate-900'
        }`}
      >
        {shot ? (
          <img
            src={`${SERVER_URL}${shot.url}`}
            alt={label}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-slate-500 text-sm text-center px-4">
            {isDragOver ? 'Drop here' : 'Drag shot here'}
          </span>
        )}
      </div>
      {shot && (
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function Day6Video() {
  const { socket } = useSocket();

  const [startShot, setStartShot] = useState<Shot | null>(null);
  const [endShot, setEndShot] = useState<Shot | null>(null);
  const [model, setModel] = useState<VideoModel>('veo3');
  const [duration, setDuration] = useState<number>(5);
  const [prompt, setPrompt] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completedVideo, setCompletedVideo] = useState<VideoTask | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<VideoTask[]>([]);

  const [startDragOver, setStartDragOver] = useState(false);
  const [endDragOver, setEndDragOver] = useState(false);

  // Load existing videos on mount
  useEffect(() => {
    console.log('[Day6Video] Loading existing videos...');
    fetch(`${SERVER_URL}/api/video/list`)
      .then(res => res.json())
      .then(data => {
        console.log('[Day6Video] Videos loaded:', data.videos?.length ?? 0);
        if (data.videos) {
          const completed = data.videos.filter((v: VideoTask) => v.status === 'completed');
          console.log('[Day6Video] Completed videos:', completed.length);
          setGeneratedVideos(completed);
        }
      })
      .catch(err => console.error('[Day6Video] Failed to load videos:', err));
  }, []);

  // Listen for video events
  useEffect(() => {
    if (!socket) {
      console.log('[Day6Video] No socket available for video events');
      return;
    }

    console.log('[Day6Video] Setting up video socket listeners');

    const handleProgress = (data: { taskId: string; progress: number }) => {
      console.log('[Day6Video] video:progress', data.taskId, data.progress + '%');
      setProgress(data.progress);
    };

    const handleCompleted = (video: VideoTask) => {
      console.log('[Day6Video] video:completed', video.id, video.filename);
      setIsGenerating(false);
      setProgress(100);
      setCompletedVideo(video);
      setGeneratedVideos(prev => [...prev, video]);
    };

    const handleFailed = (data: { taskId: string; error: string }) => {
      console.log('[Day6Video] video:failed', data.taskId, data.error);
      setIsGenerating(false);
      setProgress(0);
      setError(data.error);
    };

    socket.on('video:progress', handleProgress);
    socket.on('video:completed', handleCompleted);
    socket.on('video:failed', handleFailed);

    return () => {
      socket.off('video:progress', handleProgress);
      socket.off('video:completed', handleCompleted);
      socket.off('video:failed', handleFailed);
    };
  }, [socket]);

  const handleGenerate = async () => {
    if (!startShot || !endShot) return;

    console.log('[Day6Video] Generate clicked');
    console.log('[Day6Video] Start shot:', startShot.id, startShot.filename);
    console.log('[Day6Video] End shot:', endShot.id, endShot.filename);
    console.log('[Day6Video] Model:', model, 'Duration:', duration);

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setCompletedVideo(null);

    try {
      console.log('[Day6Video] Sending video generation request...');
      const response = await fetch(`${SERVER_URL}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startShotId: startShot.id,
          endShotId: endShot.id,
          model,
          duration,
          prompt: prompt || undefined,
        }),
      });

      const data = await response.json();
      console.log('[Day6Video] API response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      console.log('[Day6Video] Video generation started, task:', data.task?.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Day6Video] Generation error:', message);
      setError(message);
      setIsGenerating(false);
    }
  };

  const canGenerate = startShot && endShot && !isGenerating;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Day 6 - Video Generator
          </h1>
          <p className="text-slate-400">Generate video transitions between images</p>
        </div>

        {/* Shot List Strip */}
        <ShotListStrip draggable />

        {/* Drop Zones */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-center gap-12">
            <DropZone
              label="START FRAME"
              shot={startShot}
              onDrop={setStartShot}
              onClear={() => setStartShot(null)}
              isDragOver={startDragOver}
              onDragOver={() => setStartDragOver(true)}
              onDragLeave={() => setStartDragOver(false)}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl text-slate-600">→</div>
              <span className="text-xs text-slate-500">Transition</span>
            </div>

            <DropZone
              label="END FRAME"
              shot={endShot}
              onDrop={setEndShot}
              onClear={() => setEndShot(null)}
              isDragOver={endDragOver}
              onDragOver={() => setEndDragOver(true)}
              onDragLeave={() => setEndDragOver(false)}
            />
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Provider / Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as VideoModel)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="veo3">KIE.AI - Veo 3.1</option>
              <option value="kling-o1">FAL.AI - Kling O1</option>
              <option value="wan-flf2v">FAL.AI - Wan 2.1 FLF2V</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Prompt (optional)</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Smooth cinematic transition with natural motion..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full py-4 px-4 rounded-lg text-sm font-medium transition-colors ${
            canGenerate
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate Transition'}
        </button>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className="text-slate-300">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Completed Video */}
        {completedVideo && completedVideo.url && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Generated Video</h3>
            <video
              src={`${SERVER_URL}${completedVideo.url}`}
              controls
              className="w-full rounded-lg"
            />
            <div className="flex gap-4">
              <a
                href={`${SERVER_URL}${completedVideo.url}`}
                download={completedVideo.filename}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg text-center transition-colors"
              >
                Download
              </a>
            </div>
          </div>
        )}

        {/* Previously Generated Videos */}
        {generatedVideos.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400">Previous Videos</h3>
            <div className="grid grid-cols-2 gap-4">
              {generatedVideos.map((video) => (
                video.url && (
                  <div key={video.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <video
                      src={`${SERVER_URL}${video.url}`}
                      controls
                      className="w-full rounded-lg mb-2"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{video.filename}</span>
                      <a
                        href={`${SERVER_URL}${video.url}`}
                        download={video.filename}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
