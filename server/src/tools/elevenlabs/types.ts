// ElevenLabs TTS API types

/**
 * Voice information
 */
export interface Voice {
  voiceId: string;
  name: string;
  description: string;
  previewUrl?: string;
}

/**
 * Available voices response
 */
export interface VoicesResponse {
  voices: Voice[];
}

/**
 * Generate speech request
 */
export interface GenerateSpeechRequest {
  text: string;
  voiceId: string;
}

/**
 * Generate speech result
 */
export interface GenerateSpeechResult {
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

/**
 * Health check response
 */
export interface TTSHealth {
  configured: boolean;
  authenticated: boolean;
  error?: string;
}

/**
 * Default voices to use (subset of ElevenLabs built-in voices)
 */
export const DEFAULT_VOICES: Voice[] = [
  {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'American female, warm, professional',
  },
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'American female, soft, friendly',
  },
  {
    voiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'American male, well-rounded',
  },
  {
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'American female, young, expressive',
  },
];

/**
 * Default model to use
 */
export const DEFAULT_MODEL = 'eleven_multilingual_v2';
