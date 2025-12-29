// ElevenLabs TTS API client

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { TTSHealth, GenerateSpeechResult, Voice } from './types.js';
import { DEFAULT_VOICES, DEFAULT_MODEL } from './types.js';

/**
 * Get ElevenLabs API key from environment
 */
function getApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || key === 'your_elevenlabs_api_key_here' || key === '') {
    return null;
  }
  return key;
}

/**
 * Check if ElevenLabs is configured
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Get available voices (returns default curated list)
 */
export function getVoices(): Voice[] {
  return DEFAULT_VOICES;
}

/**
 * Get voice name by ID
 */
export function getVoiceName(voiceId: string): string {
  const voice = DEFAULT_VOICES.find(v => v.voiceId === voiceId);
  return voice?.name ?? 'Unknown';
}

/**
 * Check ElevenLabs health status
 */
export async function checkHealth(): Promise<TTSHealth> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('[ElevenLabs] Health check: Not configured');
    return {
      configured: false,
      authenticated: false,
      error: 'ELEVENLABS_API_KEY not configured. Get your key at https://elevenlabs.io',
    };
  }

  try {
    console.log('[ElevenLabs] Health check: Testing authentication...');

    const client = new ElevenLabsClient({ apiKey });

    // Try to fetch user info to verify authentication
    const user = await client.user.get();

    if (user) {
      console.log('[ElevenLabs] Health check: Authenticated');
      return {
        configured: true,
        authenticated: true,
      };
    }

    return {
      configured: true,
      authenticated: false,
      error: 'Unable to verify authentication',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[ElevenLabs] Health check error: ${message}`);

    if (message.includes('401') || message.includes('Unauthorized') || message.includes('authentication')) {
      return {
        configured: true,
        authenticated: false,
        error: 'Authentication failed. Check your ELEVENLABS_API_KEY.',
      };
    }

    return {
      configured: true,
      authenticated: false,
      error: `Connection error: ${message}`,
    };
  }
}

/**
 * Convert ReadableStream to Buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Generate speech from text
 */
export async function generateSpeech(
  text: string,
  voiceId: string
): Promise<GenerateSpeechResult> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('[ElevenLabs] Generate: Not configured');
    return {
      success: false,
      error: 'ELEVENLABS_API_KEY not configured. Get your key at https://elevenlabs.io',
      durationMs: Date.now() - startTime,
    };
  }

  // Validate text length
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'Text is required',
      durationMs: Date.now() - startTime,
    };
  }

  if (text.length > 5000) {
    return {
      success: false,
      error: `Text exceeds maximum length of 5000 characters (got ${text.length})`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    console.log('[ElevenLabs] Generate: Starting speech generation...');
    console.log(`[ElevenLabs] Generate: Voice ID = "${voiceId}", Text length = ${text.length}`);

    const client = new ElevenLabsClient({ apiKey });

    // Call the text-to-speech API
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: DEFAULT_MODEL,
      outputFormat: 'mp3_44100_128',
    });

    const durationMs = Date.now() - startTime;

    // Convert stream to buffer
    const buffer = await streamToBuffer(audioStream);
    const base64 = buffer.toString('base64');

    console.log(`[ElevenLabs] Generate: Success! Audio size = ${buffer.length} bytes, Duration = ${durationMs}ms`);

    return {
      success: true,
      audioBase64: base64,
      mimeType: 'audio/mpeg',
      durationMs,
      voiceId,
      voiceName: getVoiceName(voiceId),
      model: DEFAULT_MODEL,
      characterCount: text.length,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[ElevenLabs] Generate: Error = ${message}`);

    if (message.includes('401') || message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Authentication failed. Check your ELEVENLABS_API_KEY.',
        durationMs,
      };
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return {
        success: false,
        error: 'Rate limited. Try again in a few seconds.',
        durationMs,
      };
    }

    if (message.includes('quota') || message.includes('credit')) {
      return {
        success: false,
        error: 'Quota exceeded. Check your ElevenLabs subscription.',
        durationMs,
      };
    }

    return {
      success: false,
      error: `Speech generation failed: ${message}`,
      durationMs,
    };
  }
}
