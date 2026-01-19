/**
 * Batch Generation API Routes
 * FR-25: Batch Generation and Query API
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as batch from '../tools/batch/index.js';

const router = Router();

// Configure multer for CSV upload
const uploadDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * FR25.1: Batch Generation Endpoint
 * POST /api/image/batch
 *
 * Request body:
 * {
 *   "prompts": [{ id, prompt, provider, model, category, filename }],
 *   "options": { save_to_catalog, parallel, delay_seconds }
 * }
 *
 * Response:
 * {
 *   "batch_id": "batch_123",
 *   "total_prompts": 30,
 *   "estimated_cost": 0.12,
 *   "estimated_time_seconds": 300,
 *   "status": "queued"
 * }
 */
router.post('/batch', (req, res) => {
  try {
    const { prompts, options } = req.body;

    // Validate
    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Invalid prompts array' });
    }

    if (prompts.length === 0) {
      return res.status(400).json({ error: 'Prompts array cannot be empty' });
    }

    // Default options
    const batchOptions: batch.BatchOptions = {
      save_to_catalog: options?.save_to_catalog ?? true,
      parallel: options?.parallel ?? false,
      delay_seconds: options?.delay_seconds ?? 5,
    };

    // Create job
    const batchId = batch.queue.createJob(prompts, batchOptions);

    // Start processing (async - don't await)
    batch.queue.processJob(batchId).catch((err) => {
      console.error(`[Batch API] Job ${batchId} processing error:`, err);
    });

    // Estimate cost
    const estimate = batch.estimateCost(prompts);

    res.json({
      batch_id: batchId,
      total_prompts: prompts.length,
      estimated_cost: estimate.total_cost,
      estimated_time_seconds: estimate.estimated_time_seconds,
      status: 'queued',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error creating batch:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * FR25.2: Batch Progress Endpoint
 * GET /api/image/batch/:batchId
 *
 * Response:
 * {
 *   "batch_id": "batch_123",
 *   "status": "processing",
 *   "progress": { total, completed, failed, pending },
 *   "results": [...],
 *   "total_cost": 0.08,
 *   "total_time_ms": 45000
 * }
 */
router.get('/batch/:batchId', (req, res) => {
  try {
    const job = batch.queue.getJob(req.params.batchId);

    if (!job) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({
      batch_id: job.id,
      status: job.status,
      progress: job.progress,
      results: job.results,
      total_cost: job.totalCost,
      total_time_ms: job.totalTimeMs,
      created_at: job.createdAt,
      started_at: job.startedAt,
      completed_at: job.completedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error getting batch status:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * FR25.3: CSV Upload Endpoint
 * POST /api/image/batch/upload-csv
 *
 * Multipart form data with CSV file
 *
 * Response:
 * {
 *   "batch_id": "batch_123",
 *   "total_prompts": 60,
 *   "active_prompts": 30,
 *   "skipped_prompts": 28,
 *   "estimated_cost": 0.12
 * }
 */
router.post('/batch/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log(`[Batch API] CSV uploaded: ${filePath}`);

    // Parse CSV
    const rows = await batch.parseCsv(filePath);
    const activeRows = batch.filterActiveRows(rows);

    console.log(`[Batch API] Parsed ${rows.length} rows, ${activeRows.length} active (a=1)`);

    if (activeRows.length === 0) {
      return res.status(400).json({
        error: 'No active prompts found (a=1)',
        total_prompts: rows.length,
        active_prompts: 0,
      });
    }

    // Convert to prompts
    const prompts: batch.PromptRequest[] = activeRows.map((row) => ({
      id: row.filename,
      prompt: row.prompt,
      provider: row.provider,
      model: row.model,
      category: row.category,
      filename: row.filename,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));

    // Create batch job
    const options: batch.BatchOptions = {
      save_to_catalog: true,
      parallel: false,
      delay_seconds: 5,
    };

    const batchId = batch.queue.createJob(prompts, options);

    // Store CSV path for later update
    const job = batch.queue.getJob(batchId);
    if (job) {
      job.csvFilePath = filePath;
    }

    // Start processing (async)
    batch.queue.processJob(batchId).catch((err) => {
      console.error(`[Batch API] Job ${batchId} processing error:`, err);
    });

    const estimate = batch.estimateCost(prompts);

    res.json({
      batch_id: batchId,
      total_prompts: rows.length,
      active_prompts: activeRows.length,
      skipped_prompts: rows.length - activeRows.length,
      estimated_cost: estimate.total_cost,
      estimated_time_seconds: estimate.estimated_time_seconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error uploading CSV:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * FR25.4: CSV Update Endpoint
 * POST /api/image/batch/:batchId/update-csv
 *
 * Updates CSV file, marking completed prompts as a=9
 *
 * Response:
 * {
 *   "csv_file_path": "/uploads/prompts_updated.csv",
 *   "updated_rows": 30,
 *   "download_url": "/api/image/batch/batch_123/download-csv"
 * }
 */
router.post('/batch/:batchId/update-csv', async (req, res) => {
  try {
    const job = batch.queue.getJob(req.params.batchId);

    if (!job) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!job.csvFilePath) {
      return res.status(404).json({ error: 'No CSV file associated with this batch' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Batch not completed yet',
        status: job.status,
        progress: job.progress,
      });
    }

    const completedIds = job.results
      .filter((r) => r.status === 'completed')
      .map((r) => r.id);

    const updatedPath = await batch.updateCsv(job.csvFilePath, completedIds);

    console.log(`[Batch API] Updated CSV: ${updatedPath}`);

    res.json({
      csv_file_path: updatedPath,
      updated_rows: completedIds.length,
      download_url: `/api/image/batch/${job.id}/download-csv`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error updating CSV:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Download updated CSV file
 * GET /api/image/batch/:batchId/download-csv
 */
router.get('/batch/:batchId/download-csv', (req, res) => {
  try {
    const job = batch.queue.getJob(req.params.batchId);

    if (!job || !job.csvFilePath) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    const updatedPath = job.csvFilePath.replace('.csv', '_updated.csv');

    if (!fs.existsSync(updatedPath)) {
      return res.status(404).json({ error: 'Updated CSV not generated yet' });
    }

    res.download(updatedPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error downloading CSV:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * FR25.5: Cost Estimation Endpoint
 * POST /api/image/batch/estimate
 *
 * Request body: Same as /api/image/batch
 *
 * Response:
 * {
 *   "total_prompts": 30,
 *   "cost_breakdown": { fal: {...}, kie: {...} },
 *   "total_cost": 0.12,
 *   "estimated_time_seconds": 300
 * }
 */
router.post('/batch/estimate', (req, res) => {
  try {
    const { prompts } = req.body;

    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Invalid prompts array' });
    }

    const estimate = batch.estimateCost(prompts);

    res.json({
      total_prompts: prompts.length,
      ...estimate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Batch API] Error estimating cost:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
