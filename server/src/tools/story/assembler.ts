// Story Builder - FFmpeg Video Assembly

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { AssemblyRequest, AssemblyResult } from './types.js';

const execAsync = promisify(exec);

const ASSETS_DIR = path.join(process.cwd(), '..', 'assets');
const VIDEO_SCENES_DIR = path.join(ASSETS_DIR, 'video-scenes');

/**
 * Assembles multiple videos with music and optional narration using FFmpeg
 */
export async function assembleVideo(request: AssemblyRequest): Promise<AssemblyResult> {
  try {
    // Validate inputs
    if (!request.videos || request.videos.length === 0) {
      throw new Error('At least one video is required');
    }
    if (request.videos.length > 3) {
      throw new Error('Maximum 3 videos allowed');
    }
    if (!request.music?.file) {
      throw new Error('Music file is required');
    }

    // Helper to resolve asset paths (strips /assets/ prefix and resolves relative to project root)
    const resolveAssetPath = (urlPath: string): string => {
      // Strip leading /assets/ if present
      const relativePath = urlPath.replace(/^\/assets\//, '');
      return path.join(ASSETS_DIR, relativePath);
    };

    // Ensure all files exist
    for (const video of request.videos) {
      const videoPath = resolveAssetPath(video);
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${video} (resolved to: ${videoPath})`);
      }
    }

    const musicPath = resolveAssetPath(request.music.file);
    if (!fs.existsSync(musicPath)) {
      throw new Error(`Music file not found: ${request.music.file} (resolved to: ${musicPath})`);
    }

    if (request.narration?.enabled && request.narration.file) {
      const narrationPath = resolveAssetPath(request.narration.file);
      if (!fs.existsSync(narrationPath)) {
        throw new Error(`Narration file not found: ${request.narration.file} (resolved to: ${narrationPath})`);
      }
    }

    // Generate output filename
    const timestamp = Date.now();
    const outputName = request.outputName
      ? `${request.outputName}-${timestamp}.mp4`
      : `story-${timestamp}.mp4`;

    const outputPath = path.join(VIDEO_SCENES_DIR, outputName);

    // Ensure output directory exists
    if (!fs.existsSync(VIDEO_SCENES_DIR)) {
      fs.mkdirSync(VIDEO_SCENES_DIR, { recursive: true });
    }

    // Build FFmpeg command
    const ffmpegCommand = buildFFmpegCommand(request, outputPath);

    console.log('[Story Assembler] Executing FFmpeg command:', ffmpegCommand);

    // Execute FFmpeg
    const { stdout, stderr } = await execAsync(ffmpegCommand);

    if (stderr && !stderr.includes('frame=') && !stderr.includes('time=')) {
      console.warn('[Story Assembler] FFmpeg stderr:', stderr);
    }

    // Get video duration
    const duration = await getVideoDuration(outputPath);

    // Generate catalog ID
    const catalogId = `sto-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${timestamp.toString(36)}`;

    return {
      success: true,
      outputPath: path.relative(process.cwd(), outputPath),
      duration,
      catalogId,
    };

  } catch (error) {
    console.error('[Story Assembler] Error:', error);
    return {
      success: false,
      outputPath: '',
      duration: 0,
      catalogId: '',
      error: error instanceof Error ? error.message : 'Unknown error during assembly',
    };
  }
}

/**
 * Builds the FFmpeg command based on the request
 */
function buildFFmpegCommand(request: AssemblyRequest, outputPath: string): string {
  const { videos, music, narration, targetDuration, enableZoom, enableFadeOut } = request;

  // Helper to resolve asset paths
  const resolveAssetPath = (urlPath: string): string => {
    const relativePath = urlPath.replace(/^\/assets\//, '');
    return path.join(ASSETS_DIR, relativePath);
  };

  // Convert URL paths to absolute file paths
  const videoPaths = videos.map(v => resolveAssetPath(v));
  const musicPath = resolveAssetPath(music.file);

  let cmd = 'ffmpeg';

  // Add video inputs
  videoPaths.forEach(video => {
    cmd += ` -i "${video}"`;
  });

  // Add music input with optional trimming
  if (music.startTime !== undefined || music.endTime !== undefined) {
    if (music.startTime !== undefined) {
      cmd += ` -ss ${music.startTime}`;
    }
    if (music.endTime !== undefined) {
      cmd += ` -to ${music.endTime}`;
    }
  }
  cmd += ` -i "${musicPath}"`;

  // Add narration input if enabled
  const narrationEnabled = narration?.enabled && narration?.file;
  let narrationPath: string | undefined;
  if (narrationEnabled) {
    narrationPath = resolveAssetPath(narration!.file);
    cmd += ` -i "${narrationPath}"`;
  }

  // Build filter_complex
  const musicIndex = videos.length;
  const narrationIndex = narrationEnabled ? musicIndex + 1 : -1;

  let filterComplex = '';

  // Concatenate videos (video-only, no audio streams)
  const concatInputs = videos.map((_, i) => `[${i}:v]`).join('');
  filterComplex += `${concatInputs}concat=n=${videos.length}:v=1:a=0[vconcat];`;

  // If targetDuration is set, pad the video to match it (freezes last frame)
  if (targetDuration !== undefined && targetDuration > 0) {
    if (enableZoom) {
      // Apply zoom effect on the frozen frame portion
      // Strategy: tpad to extend, then use scale+crop with expressions for gradual zoom
      filterComplex += `[vconcat]tpad=stop_mode=clone:stop_duration=${targetDuration}[vpad];`;

      // Use zoompan for Ken Burns zoom effect
      // Zoom from 1.0 to 1.2 gradually over the entire duration
      // fps=24 ensures smooth playback, d=1 means each input frame produces 1 output frame
      const fps = 24;
      const totalFrames = Math.floor(targetDuration * fps);
      const zoomPerFrame = 0.2 / totalFrames; // Zoom from 1.0 to 1.2 (0.2 increase)
      filterComplex += `[vpad]zoompan=z='min(1+${zoomPerFrame}*on,1.2)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1928x1076:fps=${fps}[v];`;
    } else {
      // Just freeze the last frame with tpad
      filterComplex += `[vconcat]tpad=stop_mode=clone:stop_duration=${targetDuration}[v];`;
    }
  } else {
    filterComplex += `[vconcat]copy[v];`;
  }

  // Apply volume to music
  filterComplex += `[${musicIndex}:a]volume=${music.volume}[music];`;

  // Mix audio (just music and optional narration, no video audio)
  if (narrationEnabled) {
    // Apply volume to narration and mix with music
    filterComplex += `[${narrationIndex}:a]volume=${narration!.volume}[narr];`;
    filterComplex += `[music][narr]amix=inputs=2:duration=shortest[amix];`;
  } else {
    // Just use music
    filterComplex += `[music]anull[amix];`;
  }

  // Apply fade out if enabled (fade out over last 2 seconds)
  if (enableFadeOut && targetDuration !== undefined && targetDuration > 2) {
    const fadeStartTime = targetDuration - 2;
    filterComplex += `[amix]afade=t=out:st=${fadeStartTime}:d=2[a]`;
  } else {
    filterComplex += `[amix]acopy[a]`;
  }

  cmd += ` -filter_complex "${filterComplex}"`;
  cmd += ` -map "[v]" -map "[a]"`;

  // Output settings
  cmd += ` -c:v libx264 -preset fast -crf 23`;
  cmd += ` -c:a aac -b:a 192k`;

  // Duration control
  if (targetDuration !== undefined && targetDuration > 0) {
    // Use exact target duration
    cmd += ` -t ${targetDuration}`;
  } else {
    // Stop encoding when shortest stream ends (video)
    cmd += ` -shortest`;
  }

  cmd += ` -y "${outputPath}"`;

  return cmd;
}

/**
 * Gets the duration of a video file using ffprobe
 */
async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('[Story Assembler] Error getting duration:', error);
    return 0;
  }
}
