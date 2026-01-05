import { useState, useEffect } from 'react';
import type { AssemblyRequest, AssemblyResponse, Asset } from '@fligen/shared';

export default function Day11StoryBuilder() {
  // Asset lists
  const [videos, setVideos] = useState<Asset[]>([]);
  const [musicTracks, setMusicTracks] = useState<Asset[]>([]);
  const [narrations, setNarrations] = useState<Asset[]>([]);

  // Selected assets
  const [selectedVideos, setSelectedVideos] = useState<string[]>(['', '', '']);
  const [selectedMusic, setSelectedMusic] = useState<string>('');
  const [selectedNarration, setSelectedNarration] = useState<string>('');

  // Audio settings
  const [musicVolume, setMusicVolume] = useState<number>(35);
  const [musicStartTime, setMusicStartTime] = useState<string>('');
  const [musicEndTime, setMusicEndTime] = useState<string>('');
  const [narrationEnabled, setNarrationEnabled] = useState<boolean>(false);
  const [narrationVolume, setNarrationVolume] = useState<number>(100);

  // Output
  const [outputName, setOutputName] = useState<string>('');
  const [targetDuration, setTargetDuration] = useState<string>('');
  const [enableZoom, setEnableZoom] = useState<boolean>(false);
  const [enableFadeOut, setEnableFadeOut] = useState<boolean>(true);
  const [assembling, setAssembling] = useState<boolean>(false);
  const [assembledVideo, setAssembledVideo] = useState<AssemblyResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await fetch('http://localhost:5401/api/catalog');
      const data = await response.json();
      const assets = data.assets as Asset[] || [];

      // Filter by type
      const videoAssets = assets.filter(a => a.type === 'video');
      const musicAssets = assets.filter(a => a.type === 'music');
      const narrationAssets = assets.filter(a => a.type === 'narration');

      console.log('[Day11] Loaded music assets:', musicAssets.map(m => ({
        name: m.metadata?.name,
        duration: m.metadata?.duration,
        durationSeconds: m.metadata?.durationSeconds
      })));

      setVideos(videoAssets);
      setMusicTracks(musicAssets);
      setNarrations(narrationAssets);

    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets');
    }
  };

  const handleVideoChange = (index: number, value: string) => {
    const newVideos = [...selectedVideos];
    newVideos[index] = value;
    setSelectedVideos(newVideos);
  };

  const getVideoLength = (videoUrl: string): number => {
    const asset = videos.find(v => v.url === videoUrl);
    return asset?.metadata?.duration || 0;
  };

  const getTotalVideoLength = () => {
    return selectedVideos
      .filter(v => v !== '')
      .reduce((sum, url) => sum + getVideoLength(url), 0);
  };

  const getMusicFullLength = () => {
    if (!selectedMusic) return 0;
    const asset = musicTracks.find(m => m.url === selectedMusic);
    const duration = asset?.metadata?.duration || asset?.metadata?.durationSeconds || 0;
    console.log('[Day11] getMusicFullLength:', {
      selectedMusic,
      assetFound: !!asset,
      metadata: asset?.metadata,
      duration
    });
    return duration;
  };

  const getNarrationLength = () => {
    if (!narrationEnabled || !selectedNarration) return 0;
    const asset = narrations.find(n => n.url === selectedNarration);
    return asset?.metadata?.duration || asset?.metadata?.durationSeconds || 0;
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAssemble = async () => {
    setError('');
    setAssembledVideo(null);

    // Validate inputs
    const videosToUse = selectedVideos.filter(v => v !== '');
    if (videosToUse.length === 0) {
      setError('Please select at least one video');
      return;
    }
    if (!selectedMusic) {
      setError('Please select a music track');
      return;
    }

    try {
      setAssembling(true);

      const request: AssemblyRequest = {
        videos: videosToUse,
        music: {
          file: selectedMusic,
          volume: musicVolume / 100,
          startTime: musicStartTime ? parseFloat(musicStartTime) : undefined,
          endTime: musicEndTime ? parseFloat(musicEndTime) : undefined,
        },
        narration: narrationEnabled && selectedNarration ? {
          file: selectedNarration,
          volume: narrationVolume / 100,
          enabled: true,
        } : undefined,
        outputName: outputName || undefined,
        targetDuration: targetDuration ? parseFloat(targetDuration) : undefined,
        enableZoom,
        enableFadeOut,
      };

      const response = await fetch('http://localhost:5401/api/story/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: AssemblyResponse = await response.json();

      if (result.success) {
        setAssembledVideo(result);
      } else {
        setError(result.error || 'Assembly failed');
      }

    } catch (err) {
      console.error('Assembly error:', err);
      setError(err instanceof Error ? err.message : 'Assembly failed');
    } finally {
      setAssembling(false);
    }
  };

  const handleDownload = async () => {
    if (!assembledVideo) return;

    try {
      const url = `http://localhost:5401/${assembledVideo.outputPath}`;

      // Fetch the video file
      const response = await fetch(url);
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = assembledVideo.outputPath.split('/').pop() || 'story.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download video');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Story Builder</h1>
          <p className="text-slate-400">Combine videos, music, and narration into your final story</p>
        </div>

        {/* Videos Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Video Clips</h2>
            {selectedVideos.some(v => v !== '') && (
              <span className="text-sm text-emerald-400">
                Total: {getTotalVideoLength().toFixed(1)}s
              </span>
            )}
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map(index => {
              const videoUrl = selectedVideos[index];
              const duration = videoUrl ? getVideoLength(videoUrl) : 0;

              return (
                <div key={index} className="relative">
                  <select
                    value={videoUrl}
                    onChange={(e) => handleVideoChange(index, e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200
                             focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all
                             appearance-none cursor-pointer"
                  >
                    <option value="">Clip {index + 1} (optional)</option>
                    {videos.map(video => {
                      let label = '';

                      if (video.metadata?.workflowId) {
                        label = `[N8N ${video.metadata.workflowId}] `;
                      } else if (video.metadata?.startShot && video.metadata?.endShot) {
                        label = `[${video.metadata.startShot} → ${video.metadata.endShot}] `;
                      }

                      label += video.filename;

                      const videoDuration = video.metadata?.duration || video.metadata?.durationSeconds;
                      if (videoDuration) {
                        label += ` (${videoDuration.toFixed(1)}s)`;
                      }

                      if (video.prompt && video.prompt.length > 40) {
                        label += ` - ${video.prompt.substring(0, 40)}...`;
                      }

                      return (
                        <option key={video.id} value={video.url} title={video.prompt}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {duration > 0 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-xs text-emerald-400 bg-slate-900/80 px-2 py-1 rounded">
                        {duration.toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Music Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Music Track</h2>
            {selectedMusic && getMusicFullLength() > 0 && (
              <span className="text-sm text-emerald-400">
                {formatTime(getMusicFullLength())}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <select
              value={selectedMusic}
              onChange={(e) => setSelectedMusic(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200
                       focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="">Select music track...</option>
              {musicTracks.map(track => {
                const displayName = track.metadata?.name || track.filename;
                const trackDuration = track.metadata?.duration || track.metadata?.durationSeconds;
                const duration = trackDuration
                  ? ` (${formatTime(trackDuration)})`
                  : '';

                return (
                  <option key={track.id} value={track.url}>
                    {displayName}{duration}
                  </option>
                );
              })}
            </select>

            {selectedMusic && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-slate-400 mb-2">Volume</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-slate-300 w-12 text-right">{musicVolume}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-2">Start (s)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={musicStartTime}
                      onChange={(e) => setMusicStartTime(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-3 py-2 text-sm text-slate-200
                               focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-2">End (s)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={musicEndTime}
                      onChange={(e) => setMusicEndTime(e.target.value)}
                      placeholder="auto"
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded px-3 py-2 text-sm text-slate-200
                               focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Narration Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={narrationEnabled}
                onChange={(e) => setNarrationEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <h2 className="text-lg font-semibold text-slate-200">Add Narration (optional)</h2>
            </div>
            {narrationEnabled && selectedNarration && getNarrationLength() > 0 && (
              <span className="text-sm text-emerald-400">
                {formatTime(getNarrationLength())}
              </span>
            )}
          </div>

          {narrationEnabled && (
            <div className="space-y-4">
              <select
                value={selectedNarration}
                onChange={(e) => setSelectedNarration(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200
                         focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="">Select narration...</option>
                {narrations.map(narr => {
                  // Show custom name if available, otherwise filename + voice name
                  const displayName = narr.metadata?.name
                    ? narr.metadata.name
                    : `${narr.filename} - ${narr.metadata?.voice || 'Unknown Voice'}`;

                  const narrDuration = narr.metadata?.duration || narr.metadata?.durationSeconds;
                  const duration = narrDuration
                    ? ` (${formatTime(narrDuration)})`
                    : '';

                  return (
                    <option key={narr.id} value={narr.url}>
                      {displayName}{duration}
                    </option>
                  );
                })}
              </select>

              {selectedNarration && (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
                  <label className="block text-slate-400 mb-2 text-sm">Volume</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={narrationVolume}
                      onChange={(e) => setNarrationVolume(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-slate-300 w-12 text-right">{narrationVolume}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output Settings */}
        <div className="mb-8 space-y-4">
          <div>
            <label className="block text-slate-400 mb-2 text-sm">Output Name (optional)</label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="my-story"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200
                       focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-2 text-sm">
              Target Duration (seconds, optional)
              <span className="text-slate-500 ml-2">
                {getTotalVideoLength() > 0 && `(videos: ${getTotalVideoLength().toFixed(1)}s)`}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={targetDuration}
              onChange={(e) => setTargetDuration(e.target.value)}
              placeholder={`${getTotalVideoLength().toFixed(1)}`}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200
                       focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to use video length. Set longer to freeze last frame.
            </p>
          </div>

          {/* Effects (only show when target duration is set) */}
          {targetDuration && parseFloat(targetDuration) > getTotalVideoLength() && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 space-y-3">
              <p className="text-xs text-slate-400 mb-2">Freeze Frame Effects:</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableZoom}
                  onChange={(e) => setEnableZoom(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm text-slate-200">Zoom effect on frozen frame</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableFadeOut}
                  onChange={(e) => setEnableFadeOut(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm text-slate-200">Fade out audio (last 2 seconds)</span>
              </label>
            </div>
          )}
        </div>

        {/* Assemble Button */}
        <button
          onClick={handleAssemble}
          disabled={assembling}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed
                   text-white font-semibold py-4 px-6 rounded-lg mb-6 transition-colors"
        >
          {assembling ? 'Assembling Video...' : 'Assemble Video'}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-300 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Preview */}
        {assembledVideo && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Your Story</h3>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
              <video
                src={`http://localhost:5401/${assembledVideo.outputPath}`}
                controls
                className="w-full rounded-lg mb-4"
              />
              <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                <span>Duration: {assembledVideo.duration.toFixed(1)}s</span>
                <span className="text-xs opacity-50">{assembledVideo.catalogId}</span>
              </div>
              <button
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Download Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
