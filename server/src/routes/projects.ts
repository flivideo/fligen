/**
 * Projects, Prompts, and FliHub API Routes
 * FR-13: Project management and FliHub integration
 * FR-15: Prompt refinement
 */

import { Router } from 'express';
import { checkFliHubHealth, fetchTranscripts, isFliHubConfigured } from '../tools/flihub/index.js';
import { saveProject, loadProject, listProjects, projectExists } from '../tools/projects/index.js';
import type { SaveProjectRequest, ProjectData, RefinePromptsRequest, RefinePromptsResponse } from '@fligen/shared';
import { SYSTEM_PROMPTS, refinePrompts } from '../tools/prompts/index.js';

const router = Router();

// ============================================
// FliHub Integration API Endpoints (FR-13)
// ============================================

// Check FliHub health
router.get('/flihub/health', async (_req, res) => {
  try {
    const health = await checkFliHubHealth();
    res.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/flihub/health - error: ${message}`);
    res.status(500).json({ status: 'error', message });
  }
});

// Fetch transcripts from FliHub
router.get('/flihub/transcripts', async (req, res) => {
  try {
    const { projectCode, chapter, segments } = req.query;

    if (!projectCode || typeof projectCode !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid projectCode' });
      return;
    }

    if (!chapter || typeof chapter !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid chapter' });
      return;
    }

    if (!segments || typeof segments !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid segments' });
      return;
    }

    // Parse segments (comma-separated string like "1,2,3")
    const segmentArray = segments
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (segmentArray.length === 0) {
      res.status(400).json({ success: false, error: 'No valid segments provided' });
      return;
    }

    console.log(
      `[API] /api/flihub/transcripts - project: "${projectCode}", chapter: "${chapter}", segments: [${segmentArray.join(', ')}]`
    );
    const result = await fetchTranscripts(projectCode, chapter, segmentArray);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/flihub/transcripts - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================
// Prompt Refinement API Endpoints (FR-15)
// ============================================

// Get system prompts
router.get('/prompts/system', (_req, res) => {
  try {
    res.json({ systemPrompts: SYSTEM_PROMPTS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/prompts/system - error:', message);
    res.status(500).json({ error: message });
  }
});

// Refine human prompts into machine prompts using Claude Agent SDK
router.post('/prompts/refine', async (req, res) => {
  try {
    const { humanPrompts } = req.body as RefinePromptsRequest;

    if (!humanPrompts || !humanPrompts.seed || !humanPrompts.edit || !humanPrompts.animation) {
      res.status(400).json({ error: 'Missing humanPrompts (seed, edit, animation required)' });
      return;
    }

    console.log('[API] /api/prompts/refine - refining prompts with Claude Agent SDK');

    const machinePrompts = await refinePrompts(humanPrompts);

    const response: RefinePromptsResponse = { machinePrompts };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/prompts/refine - error:', message);
    res.status(500).json({ error: message });
  }
});

// ============================================
// Projects API Endpoints (FR-13)
// ============================================

// List all projects
router.get('/projects', async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects - error: ${message}`);
    res.status(500).json({ error: message, projects: [] });
  }
});

// Save project — must come before /:projectCode to avoid route conflict
router.post('/projects/save', async (req, res) => {
  try {
    const {
      projectCode,
      chapterId,
      segmentA,
      segmentB,
      segmentC,
      promptA,
      promptB,
      promptC,
      sourceTranscripts,
    } = req.body as SaveProjectRequest;

    // Validation
    if (!projectCode || typeof projectCode !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid projectCode' });
      return;
    }

    if (!chapterId || typeof chapterId !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid chapterId' });
      return;
    }

    if (!promptA && !promptB && !promptC) {
      res.status(400).json({ success: false, error: 'At least one prompt is required' });
      return;
    }

    console.log(`[API] /api/projects/save - saving project: ${projectCode}`);

    // Check if project already exists
    const exists = await projectExists(projectCode);
    if (exists) {
      // Allow overwrite, but log it
      console.log(`[API] /api/projects/save - overwriting existing project: ${projectCode}`);
    }

    const now = new Date().toISOString();

    // Build project data
    const projectData: ProjectData = {
      metadata: {
        projectCode,
        createdAt: exists ? (await loadProject(projectCode))?.metadata.createdAt || now : now,
        updatedAt: now,
        flihub: {
          chapterId,
          segments: {
            prompt_a: segmentA,
            prompt_b: segmentB,
            prompt_c: segmentC,
          },
        },
      },
      humanPrompts: {
        projectCode,
        prompt_a: promptA || '',
        prompt_b: promptB || '',
        prompt_c: promptC || '',
      },
    };

    // Add source transcripts if provided
    if (sourceTranscripts) {
      projectData.sourceTranscripts = {
        projectCode,
        transcripts: {
          prompt_a: sourceTranscripts.a,
          prompt_b: sourceTranscripts.b,
          prompt_c: sourceTranscripts.c,
        },
      };
    }

    const result = await saveProject(projectData);

    if (result.success) {
      res.json({ success: true, projectCode });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects/save - error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

// Get specific project
router.get('/projects/:projectCode', async (req, res) => {
  try {
    const { projectCode } = req.params;
    console.log(`[API] /api/projects/${projectCode} - loading project`);

    const project = await loadProject(projectCode);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] /api/projects/${req.params.projectCode} - error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export { isFliHubConfigured };
export default router;
