# FR-25: Batch Generation and Query API

**Status:** Pending
**Added:** 2026-01-16
**Implemented:** -
**Priority:** HIGH
**Estimated Effort:** 5-8 days

---

## User Story

As a **VibeDeck developer** and **external tool integrator**, I want a **batch image generation API with CSV queue processing** and a **unified Query API tier** so that I can generate 30-100 mockup images efficiently and integrate FliGen with Claude Code, VibeDeck, and other external tools.

---

## Problem

### Current State

**FliGen Day 4 (Image Generation)** supports:
- ✅ Single/comparison generation (1-4 images)
- ✅ FAL.AI and KIE.AI providers
- ✅ Asset catalog storage
- ✅ Health checks

**What's Missing:**
- ❌ **Batch processing** - Cannot process 30-100 images from CSV
- ❌ **Queue management** - No async job tracking
- ❌ **Query API tier** - No unified external access layer (like FliHub NFR-68)
- ❌ **CSV workflow** - No upload/update endpoints
- ❌ **Cost estimation** - No pre-generation budget calculation
- ❌ **API discovery** - No endpoint listing or OpenAPI-style docs
- ❌ **Model flexibility** - Only 4 hardcoded models supported

### Use Case: VibeDeck Mockup Generation

**Scenario**: Generate 60 design variations for VibeDeck
- 30 design variations (different form factors)
- 25 material skins (wood, metal, glass, etc.)
- 7 reference images

**Current Workflow** (broken):
1. Create CSV with 60 prompts
2. ❌ No way to upload CSV to FliGen
3. ❌ Must generate images 1-4 at a time manually
4. ❌ No progress tracking for long batches
5. ❌ No automatic CSV update after completion

**Desired Workflow**:
1. Create CSV with 60 prompts
2. ✅ Upload CSV to FliGen → Start batch job
3. ✅ Poll progress via API
4. ✅ Download updated CSV (with completion flags)
5. ✅ Images saved to catalog with metadata

---

## Solution

Implement **two major capabilities**:

### Part 1: Batch Generation API (VibeDeck Priority)

**Batch processing with CSV queue management**:
- Upload CSV with prompts (compatible with `appydave-app-a-day/005-image-gen` format)
- Async job queue (in-memory for MVP, BullMQ for production)
- Progress tracking via polling endpoints
- Automatic catalog integration
- CSV update after completion (mark `a=1` → `a=9`)
- Cost estimation before generation
- Model flexibility (support custom models like FLUX.2 Turbo)
- Retry logic for failed generations

### Part 2: Query API Tier (FliHub Pattern)

**Unified external access layer** following FliHub NFR-68:
- Discovery endpoint: `GET /api/query/config` (providers, models, pricing)
- Health checks: `GET /api/query/health` (provider status)
- Catalog access: `GET /api/query/catalog` (browse generated assets)
- Batch status: `GET /api/query/batch/:id` (job progress)
- Inline JSDoc documentation for all endpoints
- Request logging middleware

---

## Acceptance Criteria

### MVP (Part 1: Batch Generation)

- [ ] **FR25.1: Batch Generation Endpoint**
  - `POST /api/image/batch` accepts array of prompts
  - Returns batch ID for tracking
  - Processes async (doesn't block HTTP response)
  - Supports sequential (with delay) or parallel processing

- [ ] **FR25.2: Batch Progress Endpoint**
  - `GET /api/image/batch/:batchId` returns status
  - Shows completed/pending/failed counts
  - Lists individual prompt results with errors

- [ ] **FR25.3: CSV Upload Endpoint**
  - `POST /api/image/batch/upload-csv` accepts CSV file
  - Parses columns: `a`, `category`, `filename`, `prompt`, `provider`, `model`
  - Filters to `a=1` rows (active prompts)
  - Creates batch job and returns batch ID

- [ ] **FR25.4: CSV Update Endpoint**
  - `POST /api/image/batch/:batchId/update-csv` updates CSV
  - Marks completed prompts: `a=1` → `a=9`
  - Preserves all other columns and formatting
  - Returns download URL

- [ ] **FR25.5: Cost Estimation Endpoint**
  - `POST /api/image/batch/estimate` accepts same payload as batch generation
  - Returns cost breakdown by provider
  - Shows total estimated cost and time

- [ ] **FR25.6: Model Flexibility**
  - Accept any model ID from FAL/KIE, not just hardcoded list
  - Fallback to generic cost estimation if model not in registry
  - Return clear error if provider rejects model

### Production Ready (Part 2: Query API)

- [ ] **FR25.7: Query API Discovery**
  - `GET /api/query/config` returns:
    - Supported providers and models
    - Model pricing and capabilities
    - API version and status
    - Available endpoints

- [ ] **FR25.8: Query Health Endpoint**
  - `GET /api/query/health` checks all providers
  - Returns auth status, rate limits, last error

- [ ] **FR25.9: Query Catalog Access**
  - `GET /api/query/catalog` lists recent images
  - Supports filters: `?type=image&provider=kie&limit=50`

- [ ] **FR25.10: Inline Documentation**
  - All endpoints have JSDoc comments with:
    - HTTP method and path
    - FR reference
    - Request/response schemas
    - Example usage

- [ ] **FR25.11: Request Logging**
  - Log all query API requests to console
  - Format: `[Query API] GET /api/query/catalog?type=image`

### Nice to Have

- [ ] **FR25.12: Retry Logic**
  - Auto-retry failed generations (3 attempts)
  - Exponential backoff between retries
  - Log retry details

- [ ] **FR25.13: WebSocket Progress**
  - Emit `batch:progress` events during processing
  - Clients can subscribe for real-time updates

---

## Technical Implementation

### Architecture Overview

```
FliGen Server
├── routes/
│   ├── image.ts (existing - don't break)
│   ├── batch.ts (NEW - batch generation endpoints)
│   └── query/
│       ├── index.ts (NEW - query API orchestration)
│       ├── config.ts (NEW - discovery endpoint)
│       ├── health.ts (NEW - provider health)
│       └── catalog.ts (NEW - catalog access)
├── tools/
│   ├── image/ (existing)
│   │   ├── types.ts (extend MODELS registry)
│   │   ├── fal-client.ts (existing)
│   │   └── kie-client.ts (existing)
│   └── batch/ (NEW)
│       ├── types.ts (batch job interfaces)
│       ├── queue.ts (in-memory queue manager)
│       ├── csv.ts (CSV parsing/updating)
│       └── cost.ts (cost estimation logic)
└── index.ts (mount new routes)
```

### Batch Queue System (MVP: In-Memory)

```typescript
// server/src/tools/batch/types.ts
export interface BatchJob {
  id: string;
  prompts: PromptRequest[];
  options: BatchOptions;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  results: PromptResult[];
  csvFilePath?: string;
  totalCost: number;
  totalTimeMs: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PromptRequest {
  id: string;
  prompt: string;
  provider: 'fal' | 'kie';
  model: string;
  category?: string;
  filename?: string;
  metadata?: Record<string, any>;
}

export interface BatchOptions {
  save_to_catalog: boolean;
  parallel: boolean;
  delay_seconds: number;
  retry_attempts?: number;
}

export interface PromptResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  asset_id?: string;
  file_path?: string;
  generation_time_ms?: number;
  cost?: number;
  error?: {
    code: string;
    message: string;
    retries: number;
  };
}
```

```typescript
// server/src/tools/batch/queue.ts
class BatchQueue {
  private jobs = new Map<string, BatchJob>();

  createJob(prompts: PromptRequest[], options: BatchOptions): string {
    const id = `batch_${Date.now()}_${randomId()}`;
    const job: BatchJob = {
      id,
      prompts,
      options,
      status: 'queued',
      progress: { total: prompts.length, completed: 0, failed: 0, pending: prompts.length },
      results: prompts.map(p => ({ id: p.id, status: 'pending' })),
      totalCost: 0,
      totalTimeMs: 0,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    return id;
  }

  async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    job.status = 'processing';
    job.startedAt = new Date();

    for (let i = 0; i < job.prompts.length; i++) {
      const prompt = job.prompts[i];
      const result = job.results[i];

      result.status = 'processing';

      try {
        const startTime = Date.now();
        const generated = await this.generateImage(prompt);
        const endTime = Date.now();

        result.status = 'completed';
        result.asset_id = generated.asset_id;
        result.file_path = generated.file_path;
        result.generation_time_ms = endTime - startTime;
        result.cost = generated.cost;

        job.progress.completed++;
        job.progress.pending--;
        job.totalCost += generated.cost;
        job.totalTimeMs += result.generation_time_ms;

        if (job.options.save_to_catalog) {
          await saveImageToCatalog(generated, prompt);
        }

        // Delay between images (if sequential)
        if (!job.options.parallel && i < job.prompts.length - 1) {
          await sleep(job.options.delay_seconds * 1000);
        }
      } catch (error) {
        result.status = 'failed';
        result.error = {
          code: error.code || 'UNKNOWN',
          message: error.message,
          retries: 0
        };
        job.progress.failed++;
        job.progress.pending--;
      }
    }

    job.status = job.progress.failed === job.progress.total ? 'failed' : 'completed';
    job.completedAt = new Date();
  }

  getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }
}
```

### CSV Processing

```typescript
// server/src/tools/batch/csv.ts
import fs from 'fs';
import csvParser from 'csv-parser';
import { stringify } from 'csv-stringify/sync';

export interface CsvRow {
  a: string;
  category: string;
  filename: string;
  prompt: string;
  provider: 'fal' | 'kie';
  model: string;
  style?: string;
  size?: string;
  metadata?: string;
}

export async function parseCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export function filterActiveRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter(row => row.a === '1');
}

export async function updateCsv(filePath: string, completedIds: string[]): Promise<string> {
  const rows = await parseCsv(filePath);

  rows.forEach(row => {
    if (completedIds.includes(row.filename)) {
      row.a = '9';
    }
  });

  const updatedPath = filePath.replace('.csv', '_updated.csv');
  const csv = stringify(rows, { header: true });
  fs.writeFileSync(updatedPath, csv);

  return updatedPath;
}
```

### Cost Estimation

```typescript
// server/src/tools/batch/cost.ts
import { MODELS } from '../image/types';

export function estimateCost(prompts: PromptRequest[]): {
  total_cost: number;
  cost_breakdown: Record<string, { count: number; cost_per_image: number; total: number }>;
  estimated_time_seconds: number;
} {
  const breakdown: Record<string, any> = {};

  for (const prompt of prompts) {
    const key = prompt.provider;
    if (!breakdown[key]) {
      breakdown[key] = { count: 0, cost_per_image: 0, total: 0 };
    }

    const modelInfo = MODELS[prompt.provider]?.[prompt.model];
    const costPerImage = modelInfo?.cost || 0.01; // fallback

    breakdown[key].count++;
    breakdown[key].cost_per_image = costPerImage;
    breakdown[key].total += costPerImage;
  }

  const total_cost = Object.values(breakdown).reduce((sum: number, b: any) => sum + b.total, 0);
  const estimated_time_seconds = prompts.length * 10; // rough estimate: 10s per image

  return { total_cost, cost_breakdown: breakdown, estimated_time_seconds };
}
```

### API Endpoints

```typescript
// server/src/routes/batch.ts

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
router.post('/batch', async (req, res) => {
  const { prompts, options } = req.body;

  // Validate
  if (!prompts || !Array.isArray(prompts)) {
    return res.status(400).json({ error: 'Invalid prompts array' });
  }

  // Create job
  const batchId = batchQueue.createJob(prompts, options);

  // Start processing (async)
  batchQueue.processJob(batchId).catch(err => {
    console.error(`Batch ${batchId} failed:`, err);
  });

  // Estimate cost
  const estimate = estimateCost(prompts);

  res.json({
    batch_id: batchId,
    total_prompts: prompts.length,
    estimated_cost: estimate.total_cost,
    estimated_time_seconds: estimate.estimated_time_seconds,
    status: 'queued'
  });
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
  const job = batchQueue.getJob(req.params.batchId);

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
    started_at: job.startedAt,
    completed_at: job.completedAt
  });
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
  const filePath = req.file.path;

  // Parse CSV
  const rows = await parseCsv(filePath);
  const activeRows = filterActiveRows(rows);

  // Convert to prompts
  const prompts = activeRows.map(row => ({
    id: row.filename,
    prompt: row.prompt,
    provider: row.provider,
    model: row.model,
    category: row.category,
    filename: row.filename,
    metadata: row.metadata ? JSON.parse(row.metadata) : {}
  }));

  // Create batch job
  const options = { save_to_catalog: true, parallel: false, delay_seconds: 5 };
  const batchId = batchQueue.createJob(prompts, options);

  // Store CSV path for later update
  const job = batchQueue.getJob(batchId);
  job.csvFilePath = filePath;

  // Start processing
  batchQueue.processJob(batchId).catch(err => {
    console.error(`Batch ${batchId} failed:`, err);
  });

  const estimate = estimateCost(prompts);

  res.json({
    batch_id: batchId,
    total_prompts: rows.length,
    active_prompts: activeRows.length,
    skipped_prompts: rows.length - activeRows.length,
    estimated_cost: estimate.total_cost
  });
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
  const job = batchQueue.getJob(req.params.batchId);

  if (!job || !job.csvFilePath) {
    return res.status(404).json({ error: 'Batch or CSV not found' });
  }

  const completedIds = job.results
    .filter(r => r.status === 'completed')
    .map(r => r.id);

  const updatedPath = await updateCsv(job.csvFilePath, completedIds);

  res.json({
    csv_file_path: updatedPath,
    updated_rows: completedIds.length,
    download_url: `/api/image/batch/${job.id}/download-csv`
  });
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
  const { prompts } = req.body;

  if (!prompts || !Array.isArray(prompts)) {
    return res.status(400).json({ error: 'Invalid prompts array' });
  }

  const estimate = estimateCost(prompts);

  res.json({
    total_prompts: prompts.length,
    ...estimate
  });
});
```

### Query API Tier

```typescript
// server/src/routes/query/index.ts

/**
 * Query API Tier - Unified external access layer
 * FR25.7-25.11
 *
 * Follows FliHub NFR-68 pattern:
 * - Discovery endpoint
 * - Hierarchical access
 * - Inline documentation
 * - Request logging
 */

import { Router } from 'express';
import configRouter from './config';
import healthRouter from './health';
import catalogRouter from './catalog';

const router = Router();

// Request logging middleware
router.use((req, res, next) => {
  console.log(`[Query API] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount sub-routers
router.use('/config', configRouter);
router.use('/health', healthRouter);
router.use('/catalog', catalogRouter);

export default router;
```

```typescript
// server/src/routes/query/config.ts

/**
 * FR25.7: Query API Discovery
 * GET /api/query/config
 *
 * Returns: Supported providers, models, pricing, API version
 */
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    providers: [
      {
        id: 'fal',
        name: 'FAL.AI',
        models: [
          { id: 'flux-pro/v1.1', name: 'FLUX Pro v1.1', tier: 'advanced', cost: 0.04 },
          { id: 'flux/schnell', name: 'FLUX Schnell', tier: 'midrange', cost: 0.003 },
          { id: 'flux-2-turbo', name: 'FLUX.2 Turbo', tier: 'midrange', cost: 0.008 }
        ],
        auth_configured: !!process.env.FAL_API_KEY
      },
      {
        id: 'kie',
        name: 'KIE.AI',
        models: [
          { id: 'flux-kontext-max', name: 'FLUX Kontext Max', tier: 'advanced', cost: 0.025 },
          { id: 'flux-kontext-pro', name: 'FLUX Kontext Pro', tier: 'midrange', cost: 0.004 }
        ],
        auth_configured: !!process.env.KIE_API_KEY
      }
    ],
    endpoints: [
      { path: '/api/query/config', method: 'GET', description: 'API discovery' },
      { path: '/api/query/health', method: 'GET', description: 'Provider health checks' },
      { path: '/api/query/catalog', method: 'GET', description: 'Browse asset catalog' },
      { path: '/api/image/batch', method: 'POST', description: 'Start batch generation' },
      { path: '/api/image/batch/:id', method: 'GET', description: 'Check batch progress' }
    ]
  });
});
```

```typescript
// server/src/routes/query/health.ts

/**
 * FR25.8: Query Health Endpoint
 * GET /api/query/health
 *
 * Returns: Provider auth status, rate limits, last error
 */
router.get('/', async (req, res) => {
  const falHealth = await checkFalHealth();
  const kieHealth = await checkKieHealth();

  res.json({
    status: falHealth.ok && kieHealth.ok ? 'healthy' : 'degraded',
    providers: {
      fal: falHealth,
      kie: kieHealth
    },
    timestamp: new Date().toISOString()
  });
});
```

```typescript
// server/src/routes/query/catalog.ts

/**
 * FR25.9: Query Catalog Access
 * GET /api/query/catalog
 *
 * Query params: ?type=image&provider=kie&limit=50&offset=0
 *
 * Returns: Paginated list of catalog assets
 */
router.get('/', async (req, res) => {
  const { type, provider, limit = 50, offset = 0 } = req.query;

  const catalog = await loadCatalog();
  let filtered = catalog.assets;

  if (type) filtered = filtered.filter(a => a.type === type);
  if (provider) filtered = filtered.filter(a => a.metadata?.provider === provider);

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    total: filtered.length,
    offset: Number(offset),
    limit: Number(limit),
    assets: paginated
  });
});
```

### Model Registry Extension

```typescript
// server/src/tools/image/types.ts

// FR25.6: Extend MODELS to support custom models
export const MODELS = {
  fal: {
    'flux-pro/v1.1': { name: 'FLUX Pro v1.1', cost: 0.04, tier: 'advanced', resolution: '1024x1024' },
    'flux/schnell': { name: 'FLUX Schnell', cost: 0.003, tier: 'midrange', resolution: '512x512' },
    'flux-2-turbo': { name: 'FLUX.2 Turbo', cost: 0.008, tier: 'midrange', resolution: '1024x1024' } // NEW
  },
  kie: {
    'flux-kontext-max': { name: 'FLUX Kontext Max', cost: 0.025, tier: 'advanced', resolution: '1024x1024' },
    'flux-kontext-pro': { name: 'FLUX Kontext Pro', cost: 0.004, tier: 'midrange', resolution: '512x512' }
  }
};

// Fallback for unknown models
export function getModelCost(provider: string, model: string): number {
  return MODELS[provider]?.[model]?.cost || 0.01; // generic fallback
}
```

---

## Files to Create

```
server/src/
├── routes/
│   ├── batch.ts (NEW - 300+ lines)
│   └── query/
│       ├── index.ts (NEW - 30 lines)
│       ├── config.ts (NEW - 50 lines)
│       ├── health.ts (NEW - 40 lines)
│       └── catalog.ts (NEW - 50 lines)
└── tools/
    └── batch/
        ├── types.ts (NEW - 80 lines)
        ├── queue.ts (NEW - 150 lines)
        ├── csv.ts (NEW - 80 lines)
        └── cost.ts (NEW - 50 lines)
```

## Files to Modify

```
server/src/
├── index.ts (mount /api/query routes)
├── tools/image/types.ts (extend MODELS registry)
└── package.json (add multer, csv-parser, csv-stringify)

shared/src/
└── index.ts (add BatchJob, PromptRequest types)
```

---

## Dependencies

```bash
npm install --workspace=server multer csv-parser csv-stringify
```

---

## Testing Strategy

### Unit Tests

1. CSV parsing and validation
2. Cost estimation logic
3. Batch queue management (create, process, get)
4. CSV update after processing

### Integration Tests

1. Upload CSV → Create batch → Poll progress → Download updated CSV
2. Batch generation with FAL.AI (5 images)
3. Batch generation with KIE.AI (5 images)
4. Error handling (timeout, invalid model, rate limit)
5. Query API discovery endpoint
6. Query API health check

### Manual Testing (VibeDeck Use Case)

1. Create CSV with 10 VibeDeck design prompts
2. Upload via `POST /api/image/batch/upload-csv`
3. Poll progress via `GET /api/image/batch/:id`
4. Verify images saved to catalog
5. Download updated CSV with `a=9` flags
6. Check catalog access via `GET /api/query/catalog?type=image`

---

## Success Metrics

**MVP Complete When**:
- ✅ Can upload CSV with 10 prompts
- ✅ Batch generates all 10 images (KIE or FAL)
- ✅ Can track progress via API
- ✅ CSV updated with `a=9` for completed prompts
- ✅ Images saved to catalog with metadata
- ✅ Query API returns provider config and health

**Production Ready When**:
- ✅ Retry logic handles failures (3 attempts)
- ✅ Cost estimation accurate (±10%)
- ✅ Inline documentation on all endpoints
- ✅ Error handling graceful (partial failures don't break batch)
- ✅ Query API catalog browsing works

---

## Integration with VibeDeck

### Workflow

1. **VibeDeck**: Create CSV with 60 prompts
   - Path: `/Users/davidcruwys/dev/ad/flivideo/vibedeck/docs/image-generation/vibedeck-prompts.csv`
   - Format: `a,category,filename,prompt,provider,model`

2. **FliGen API**: Upload CSV and start batch
   ```bash
   curl -X POST http://localhost:5401/api/image/batch/upload-csv \
     -F "file=@vibedeck-prompts.csv"
   # Response: { "batch_id": "batch_123", "estimated_cost": 0.24 }
   ```

3. **FliGen**: Process batch (async)
   - Sequential generation with 5s delay
   - Save images to `/assets/catalog/images/`
   - Update CSV in-place

4. **Claude Code**: Poll progress
   ```bash
   curl http://localhost:5401/api/image/batch/batch_123
   # Response: { "status": "processing", "progress": { "completed": 15, "total": 60 } }
   ```

5. **VibeDeck**: Download updated CSV
   ```bash
   curl -O http://localhost:5401/api/image/batch/batch_123/download-csv
   ```

6. **VibeDeck Viewer**: Display at `http://localhost:5500/mockups`

### Cost Analysis

**60 VibeDeck Images**:
- 30 design variations × $0.004 (KIE flux-kontext-pro) = **$0.12**
- 25 skins × $0.004 = **$0.10**
- 7 reference × $0.025 (KIE flux-kontext-max) = **$0.18**
- **Total: $0.40**

### File Locations

```
VibeDeck: /Users/davidcruwys/dev/ad/flivideo/vibedeck/
├── vibedeck-mocks/design-variations/ (generated images go here)
├── docs/image-generation/vibedeck-prompts.csv (input CSV)
└── scripts/generate-mockups.sh (cURL wrapper)

FliGen: /Users/davidcruwys/dev/ad/flivideo/fligen/
├── assets/catalog/images/ (catalog storage)
└── server/uploads/ (uploaded CSV files)
```

---

## Open Questions

1. **Job Queue**: In-memory (simple) or BullMQ (production)? → **Decision: Start with in-memory, migrate to BullMQ if needed**

2. **File Storage**: Where to store uploaded CSV files? → **Decision: `/server/uploads/` directory**

3. **Rate Limits**: Does KIE/FAL have rate limits? → **Action: Test with 50 images and measure**

4. **Custom Output Path**: Should FliGen support saving directly to VibeDeck mockups folder? → **Decision: No, use catalog only. VibeDeck copies from catalog.**

5. **Authentication**: Should batch API require auth? → **Decision: No auth for localhost (trust local network)**

6. **Parallel vs Sequential**: Default behavior? → **Decision: Sequential with 5s delay (safer for rate limits)**

---

## References

- **VibeDeck Handover**: `/Users/davidcruwys/dev/ad/flivideo/vibedeck/docs/image-generation/FLIGEN-HANDOVER.md`
- **VibeDeck Full Spec**: `/Users/davidcruwys/dev/ad/flivideo/vibedeck/docs/image-generation/fligen-api-integration-requirements.md`
- **FliHub Query API**: NFR-68 at `/Users/davidcruwys/dev/ad/flivideo/flihub/server/src/routes/query/`
- **Existing Image Client**: `server/src/tools/image/`
- **Existing Day 4 UI**: `client/src/components/tools/Day4ImageGen.tsx`

---

## Completion Notes

_To be filled by developer upon completion._

- Implementation summary
- Deviations from spec
- Known limitations
- Performance benchmarks (time to generate 60 images)
- Cost accuracy verification
