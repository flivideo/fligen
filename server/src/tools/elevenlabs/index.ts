// ElevenLabs TTS module exports

export * from './types.js';
export {
  isConfigured,
  getVoices,
  getVoiceName,
  checkHealth,
  generateSpeech,
} from './client.js';
export {
  saveAudioToCatalog,
} from './save-to-catalog.js';
