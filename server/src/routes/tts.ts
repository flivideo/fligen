/**
 * Text-to-Speech API Routes
 * FR-05: ElevenLabs TTS integration
 */

import { Router } from 'express';
import {
  getVoices,
  generateSpeech,
  saveAudioToCatalog,
} from '../tools/elevenlabs/index.js';
import type { GenerateSpeechRequest } from '../tools/elevenlabs/index.js';

const router = Router();

// TTS voices endpoint - list available voices
router.get('/voices', (_req, res) => {
  try {
    const voices = getVoices();
    res.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message, voices: [] });
  }
});

// TTS generate endpoint - convert text to speech and save to catalog
router.post('/generate', async (req, res) => {
  try {
    const { text, voiceId, name } = req.body as GenerateSpeechRequest;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid text' });
      return;
    }

    if (!voiceId || typeof voiceId !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid voiceId' });
      return;
    }

    console.log(
      `[API] /api/tts/generate - voiceId: "${voiceId}", text length: ${text.length}, name: "${name || 'none'}"`
    );
    const result = await generateSpeech(text, voiceId);

    if (!result.success || !result.audioBase64) {
      res.json(result);
      return;
    }

    // Save audio to catalog as narration
    const asset = await saveAudioToCatalog(
      result.audioBase64,
      text,
      voiceId,
      result.voiceName || 'Unknown',
      result.model || 'eleven_multilingual_v2',
      result.characterCount || text.length,
      result.durationMs || 0,
      {},
      name
    );

    // Return asset info instead of base64
    res.json({
      success: true,
      audioUrl: asset.url,
      assetId: asset.id,
      durationMs: result.durationMs,
      voiceName: result.voiceName,
      model: result.model,
      characterCount: result.characterCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/tts/generate - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
