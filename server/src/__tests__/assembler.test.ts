import { describe, it, expect } from 'vitest';
import { buildFFmpegArgs } from '../tools/story/assembler.js';
import type { AssemblyRequest } from '@fligen/shared';

// Pure function — no I/O, no mocks needed.
// All path values use /assets/ prefix so resolveAssetPath strips it and joins to ASSETS_DIR.

const baseRequest = (): AssemblyRequest => ({
  videos: ['/assets/catalog/videos/clip1.mp4'],
  music: { file: '/assets/catalog/music/track.mp3', volume: 0.8 },
});

describe('buildFFmpegArgs', () => {
  it('single video + music → contains -i inputs, -filter_complex, -map [v] and [a], -c:v libx264, -y', () => {
    const args = buildFFmpegArgs(baseRequest(), '/output/story.mp4');

    // At least two -i args (one video, one music)
    const iFlags = args.filter((a) => a === '-i');
    expect(iFlags.length).toBeGreaterThanOrEqual(2);

    // filter_complex present
    expect(args).toContain('-filter_complex');

    // map outputs
    expect(args).toContain('[v]');
    expect(args).toContain('[a]');
    expect(args.indexOf('-map')).not.toBe(-1);

    // codec flags
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');

    // output path at end
    expect(args).toContain('-y');
    expect(args[args.length - 1]).toBe('/output/story.mp4');
  });

  it('two videos → filter_complex contains concat=n=2', () => {
    const req: AssemblyRequest = {
      ...baseRequest(),
      videos: ['/assets/catalog/videos/clip1.mp4', '/assets/catalog/videos/clip2.mp4'],
    };
    const args = buildFFmpegArgs(req, '/output/story.mp4');

    const filterIdx = args.indexOf('-filter_complex');
    expect(filterIdx).not.toBe(-1);
    const filterValue = args[filterIdx + 1];
    expect(filterValue).toContain('concat=n=2');
  });

  it('targetDuration set → -t <duration> present in args', () => {
    const req: AssemblyRequest = { ...baseRequest(), targetDuration: 15 };
    const args = buildFFmpegArgs(req, '/output/story.mp4');

    const tIdx = args.indexOf('-t');
    expect(tIdx).not.toBe(-1);
    expect(args[tIdx + 1]).toBe('15');
  });

  it('no targetDuration → -shortest present instead of -t', () => {
    const args = buildFFmpegArgs(baseRequest(), '/output/story.mp4');
    expect(args).toContain('-shortest');
    expect(args).not.toContain('-t');
  });

  it('narration.enabled = true → narration -i input and amix=inputs=2 in filter_complex', () => {
    const req: AssemblyRequest = {
      ...baseRequest(),
      narration: { file: '/assets/catalog/narration/voice.mp3', volume: 1.0, enabled: true },
    };
    const args = buildFFmpegArgs(req, '/output/story.mp4');

    // Three -i args: video + music + narration
    const iFlags = args.filter((a) => a === '-i');
    expect(iFlags.length).toBe(3);

    const filterIdx = args.indexOf('-filter_complex');
    const filterValue = args[filterIdx + 1];
    expect(filterValue).toContain('amix=inputs=2');
  });

  it('enableFadeOut = true with targetDuration > 2 → afade present in filter_complex', () => {
    const req: AssemblyRequest = {
      ...baseRequest(),
      targetDuration: 10,
      enableFadeOut: true,
    };
    const args = buildFFmpegArgs(req, '/output/story.mp4');

    const filterIdx = args.indexOf('-filter_complex');
    const filterValue = args[filterIdx + 1];
    expect(filterValue).toContain('afade');
  });

  it('enableFadeOut = true but targetDuration <= 2 → afade NOT in filter_complex', () => {
    const req: AssemblyRequest = {
      ...baseRequest(),
      targetDuration: 1,
      enableFadeOut: true,
    };
    const args = buildFFmpegArgs(req, '/output/story.mp4');

    const filterIdx = args.indexOf('-filter_complex');
    const filterValue = args[filterIdx + 1];
    // condition: enableFadeOut && targetDuration > 2 — fails here so no afade
    expect(filterValue).not.toContain('afade');
  });

  it('throws when a video path contains path traversal', () => {
    expect(() =>
      buildFFmpegArgs(
        {
          videos: ['/assets/../../../etc/passwd'],
          music: { file: '/assets/catalog/music/track.mp3', volume: 0.8 },
        },
        '/tmp/out.mp4'
      )
    ).toThrow(/path traversal/i);
  });

  it('throws when music path contains path traversal', () => {
    expect(() =>
      buildFFmpegArgs(
        {
          videos: ['/assets/catalog/videos/clip.mp4'],
          music: { file: '/assets/../../../etc/passwd', volume: 0.8 },
        },
        '/tmp/out.mp4'
      )
    ).toThrow(/path traversal/i);
  });

  it('includes zoompan filter when enableZoom is true and targetDuration > 0', () => {
    const args = buildFFmpegArgs(
      {
        videos: ['/assets/catalog/videos/clip.mp4'],
        music: { file: '/assets/catalog/music/track.mp3', volume: 0.8 },
        targetDuration: 10,
        enableZoom: true,
      },
      '/tmp/out.mp4'
    );
    const filterComplex = args[args.indexOf('-filter_complex') + 1];
    expect(filterComplex).toContain('zoompan');
    expect(filterComplex).toContain('tpad');
  });

  it('paths with spaces are passed as discrete string args — no shell quoting wrapping', () => {
    const req: AssemblyRequest = {
      videos: ['/assets/catalog/videos/my clip.mp4'],
      music: { file: '/assets/catalog/music/my track.mp3', volume: 0.5 },
    };
    const args = buildFFmpegArgs(req, '/output/my output.mp4');

    // The return value is a plain string[] — each path is its own element,
    // not wrapped in shell quotes.  This is the safety guarantee of execFile:
    // the OS receives each arg atomically, spaces included.
    expect(Array.isArray(args)).toBe(true);

    // The file paths are present as discrete elements (with ASSETS_DIR prefix stripped/joined)
    const videoArg = args.find((a) => a.endsWith('my clip.mp4'));
    expect(videoArg).toBeTruthy();

    // No shell-quote characters wrapping individual path args
    const pathArgs = args.filter((a) => a.endsWith('.mp4') || a.endsWith('.mp3'));
    for (const p of pathArgs) {
      // Should not start/end with shell quoting characters
      expect(p).not.toMatch(/^['"]|['"]$/);
    }
  });
});
