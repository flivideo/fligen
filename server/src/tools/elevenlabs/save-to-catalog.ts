import * as catalog from '../catalog/index.js';
import fs from 'fs/promises';
import path from 'path';
import type { Asset } from '@fligen/shared';

export async function saveAudioToCatalog(
  audioBase64: string,
  narrationText: string,
  voiceId: string,
  voiceName: string,
  model: string,
  characterCount: number,
  generationTimeMs: number,
  metadata: Record<string, any> = {},
  customName?: string
): Promise<Asset> {
  const startTime = Date.now();

  // Generate unique ID and filename
  const id = catalog.generateAssetId('narration');
  const filename = catalog.generateFilename('narration', 'elevenlabs', model, 'mp3');

  // Convert base64 to buffer
  const buffer = Buffer.from(audioBase64, 'base64');

  // Save to catalog/narration/
  const assetsDir = path.resolve(process.cwd(), '..', 'assets');
  const filePath = path.join(assetsDir, 'catalog', 'narration', filename);
  await fs.writeFile(filePath, buffer);

  // Calculate duration from audio file (approximate based on file size)
  // MP3 at 128kbps is ~16KB per second of audio
  const durationSeconds = Math.round(buffer.length / 16000);

  // Create asset record
  const asset: Asset = {
    id,
    type: 'narration',
    filename,
    url: `/assets/catalog/narration/${filename}`,
    provider: 'elevenlabs',
    model,
    prompt: narrationText, // The text being spoken
    status: 'ready',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    estimatedCost: 0.003, // ElevenLabs approximate cost per request
    generationTimeMs,
    metadata: {
      name: customName, // Custom user-provided name
      voice: voiceName,
      voiceId,
      narrationText,
      characterCount,
      durationSeconds,
      format: 'mp3',
      outputFormat: 'mp3_44100_128',
      ...metadata,
    },
  };

  // Add to catalog
  await catalog.addAsset(asset);

  console.log(`[Audio] Saved to catalog: ${id}`);
  return asset;
}
