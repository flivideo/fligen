/**
 * N8N Workflow API Routes
 * FR-14 / Day 10: N8N workflow orchestration
 */

import { Router } from 'express';
import path from 'path';
import * as catalog from '../tools/catalog/index.js';
import type { Asset } from '@fligen/shared';

const router = Router();

// Check if N8N webhook is configured
function isN8nConfigured(): boolean {
  return !!process.env.N8N_WEBHOOK_URL;
}

// Clean prompts - remove "Prompt" prefix, punctuation, newlines
function cleanPrompt(text: string): string {
  return (
    text
      // Remove "Prompt" or "Prompt," or similar from the beginning
      .replace(/^(Prompt|prompt)[,:\s]*/i, '')
      // Remove newlines and carriage returns
      .replace(/[\r\n]+/g, ' ')
      // Remove all punctuation
      .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?]/g, '')
      // Collapse multiple spaces into single space
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim()
  );
}

// Trigger N8N workflow
router.post('/workflow', async (req, res) => {
  try {
    const { seedImage, editInstruction, animation } = req.body;

    if (!seedImage || !editInstruction || !animation) {
      res.status(400).json({ error: 'Missing required prompts' });
      return;
    }

    // Clean prompts - remove punctuation
    const cleanedSeedImage = cleanPrompt(seedImage);
    const cleanedEditInstruction = cleanPrompt(editInstruction);
    const cleanedAnimation = cleanPrompt(animation);

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('[API] /api/n8n/workflow - N8N_WEBHOOK_URL not configured');
      res.status(500).json({ error: 'N8N webhook not configured' });
      return;
    }

    // Anonymize webhook URL for logging
    const anonymizedUrl = webhookUrl.replace(/\/webhook\/[^/]+$/, '/webhook/***');

    console.log('[API] /api/n8n/workflow - triggering N8N workflow');
    console.log('[API] Webhook URL:', anonymizedUrl);
    console.log('[API] Original prompts:', {
      seedImage: seedImage.substring(0, 50) + '...',
      editInstruction: editInstruction.substring(0, 50) + '...',
      animation: animation.substring(0, 50) + '...',
    });
    console.log('[API] Cleaned prompts:', {
      seedImage: cleanedSeedImage.substring(0, 50) + '...',
      editInstruction: cleanedEditInstruction.substring(0, 50) + '...',
      animation: cleanedAnimation.substring(0, 50) + '...',
    });

    // Prepare payload with cleaned prompts
    const dataObject = {
      prompt_a: cleanedSeedImage,
      prompt_b: cleanedEditInstruction,
      prompt_c: cleanedAnimation,
    };

    // Convert to clean, valid JSON string
    const jsonString = JSON.stringify(dataObject);
    console.log('[API] JSON payload length:', jsonString.length, 'bytes');

    // Save payload to file for debugging/sharing with Steve
    const fs = await import('fs/promises');
    const payloadPath = path.resolve(process.cwd(), 'n8n-last-payload.json');
    await fs.writeFile(payloadPath, JSON.stringify(dataObject, null, 2));
    console.log('[API] Payload saved to:', payloadPath);

    // Call N8N webhook with clean JSON string
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });

    console.log('[API] N8N response status:', n8nResponse.status);

    // Get raw response text first
    const responseText = await n8nResponse.text();
    console.log('[API] N8N raw response:', responseText || '(empty)');

    if (!n8nResponse.ok) {
      // Anonymize webhook ID in error messages
      const anonymizedError = responseText.replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
        '***'
      );
      console.error('[API] N8N webhook error:', anonymizedError);
      res.status(500).json({ error: 'N8N workflow failed to start', details: anonymizedError });
      return;
    }

    // Parse JSON if response has content
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
        console.log('[API] N8N response data:', data);
      } catch (err) {
        console.error('[API] Failed to parse N8N response as JSON:', err);
      }
    }

    // Save generated assets to catalog in sequential workflow folder
    let savedAssets: any[] = [];
    if (data && (data.image1 || data.image2 || data.video)) {
      try {
        // Get next workflow number (0001, 0002, etc.)
        const workflowId = await catalog.getNextWorkflowNumber();
        const assetsDir = path.resolve(process.cwd(), '..', 'assets');
        const workflowFolder = path.join(assetsDir, 'catalog', 'n8n', workflowId);
        const fs = await import('fs/promises');
        await fs.mkdir(workflowFolder, { recursive: true });

        console.log(`[API] Saving N8N workflow ${workflowId} assets...`);

        const workflowMetadata = {
          workflowId,
          workflowType: 'image-edit-and-animate',
          workflowName: seedImage.substring(0, 50),
          runDate: new Date().toISOString(),
          prompts: {
            seedImage: { human: seedImage, cleaned: cleanedSeedImage },
            editInstruction: { human: editInstruction, cleaned: cleanedEditInstruction },
            animation: { human: animation, cleaned: cleanedAnimation },
          },
        };

        const savePromises: Promise<Asset>[] = [];

        // Save Image 1 (start frame) to workflow folder
        if (data.image1) {
          const imageBuffer = await fetch(data.image1).then((r) => r.arrayBuffer());
          const filename = 'image-start.png';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(imageBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('image'),
            type: 'image',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'flux-pro',
            prompt: seedImage,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.04,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'start',
              step: 'seed-image',
              humanPrompt: seedImage,
              cleanedPrompt: cleanedSeedImage,
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        // Save Image 2 (end frame) to workflow folder
        if (data.image2) {
          const imageBuffer = await fetch(data.image2).then((r) => r.arrayBuffer());
          const filename = 'image-end.png';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(imageBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('image'),
            type: 'image',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'flux-edit',
            prompt: editInstruction,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.04,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'end',
              step: 'edit-image',
              humanPrompt: editInstruction,
              cleanedPrompt: cleanedEditInstruction,
              sourceImageUrl: data.image1,
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        // Save Video to workflow folder
        if (data.video) {
          const videoBuffer = await fetch(data.video).then((r) => r.arrayBuffer());
          const filename = 'video.mp4';
          const filePath = path.join(workflowFolder, filename);
          await fs.writeFile(filePath, Buffer.from(videoBuffer));

          const asset: Asset = {
            id: catalog.generateAssetId('video'),
            type: 'video',
            filename,
            url: `/assets/catalog/n8n/${workflowId}/${filename}`,
            provider: 'n8n',
            model: 'veo-3',
            prompt: animation,
            status: 'ready',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            estimatedCost: 0.15,
            generationTimeMs: 0,
            metadata: {
              ...workflowMetadata,
              position: 'video',
              step: 'animate',
              duration: 5,
              humanPrompt: animation,
              cleanedPrompt: cleanedAnimation,
              sourceImages: [data.image1, data.image2].filter(Boolean),
            },
          };
          savePromises.push(catalog.addAsset(asset).then(() => asset));
        }

        savedAssets = await Promise.all(savePromises);
        console.log(
          '[N8N] Saved',
          savedAssets.length,
          'assets to catalog:',
          savedAssets.map((a) => a.id)
        );
      } catch (saveError) {
        console.error('[N8N] Failed to save assets to catalog:', saveError);
        // Don't fail the request - just log the error
      }
    }

    res.json({
      success: true,
      data,
      savedAssets: savedAssets.map((a) => ({ id: a.id, url: a.url, type: a.type })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/n8n/workflow - error:', message);
    res.status(500).json({ error: message });
  }
});

export { isN8nConfigured };
export default router;
