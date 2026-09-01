---
generated: 2026-04-05
generator: system-context
status: snapshot
sources:
  - package.json
  - README.md
  - CLAUDE.md
  - Procfile
  - start.sh
  - shared/src/index.ts
  - shared/src/apiRegistry.ts
  - shared/src/config.json
  - server/src/index.ts
  - server/src/config/env.ts
  - server/src/tools/image/index.ts
  - client/src/App.tsx
  - docs/backlog.md
  - docs/changelog.md
  - context.globs.json
regenerate: "Run /system-context in the repo root"
---

# FliGen — System Context

## Purpose

FliGen is a multi-tool harness that lets a solo creator (AppyDave) generate images, video, music, narration, thumbnails, and assembled stories for YouTube content — all from one React+Express UI backed by multiple AI provider APIs.

## Core Abstractions

- **Day Tool** — Each numbered "day" (1-16) is an independent creative tool (image gen, TTS, video, music, etc.) rendered as a panel in the sidebar. The `DayTool` type in `shared/src/config.json` defines the registry; the client switches content by `currentDay` state. Days are the primary unit of feature organisation — not modules, not pages.

- **Provider** — An external AI API (FAL.AI, KIE.AI, ElevenLabs, Suno) that generates media. Each tool domain (image, video, music) supports multiple providers with a common interface pattern: `*-client.ts` files per provider, unified through a domain `index.ts`. Providers are configured via environment variables and health-checked at startup.

- **Asset Catalog** — A JSON-based registry (`assets/catalog/`) that tracks every generated artifact (images, videos, music, narration, thumbnails, stories) with metadata including provider, model, prompt, cost, and generation time. All save-to-catalog operations go through domain-specific `save-to-catalog.ts` files. The catalog is the system of record for what has been generated.

- **Shot List** — An ordered sequence of reference images (`assets/shot-list/`) used as input for video generation. Shots define start/end frames for video animation tasks and are managed via Socket.io events for real-time UI updates.

- **Project** — A FliHub-linked content project (e.g., VSS-001) stored in `assets/projects/` containing human prompts, source transcripts, and metadata. Projects bridge FliGen's generation tools with FliHub's video recording workflow.

## Key Workflows

### Generate and compare images across providers
1. User navigates to Day 4 (Image Generator) and enters a text prompt
2. Server calls FAL.AI and KIE.AI in parallel, each at two tiers (advanced/midrange), producing 4 comparison images
3. Results display side-by-side with provider, model, cost, and generation time
4. User selects preferred images and saves them to the asset catalog

### Assemble a story from generated assets
1. User generates images (Day 4), animates them into video clips (Day 6), generates narration (Day 5), and creates music (Day 7)
2. In Day 11 (Story Builder), user selects 1-3 video files, a music track, and optional narration
3. Server uses FFmpeg to concatenate videos, layer audio, and optionally apply Ken Burns zoom on frozen frames
4. Assembled story is saved to the catalog and served as a static asset

### Batch-generate images from CSV
1. User uploads a CSV file with columns: category, filename, prompt, provider, model
2. Server creates a batch job, estimates cost, and queues sequential generation with configurable delay
3. Progress is polled via the batch status endpoint; completed rows are marked in the CSV
4. All generated images are saved to the catalog with metadata from the CSV

### Create a FliHub-linked project
1. User enters a FliHub chapter ID and segment numbers in Day 9 (Prompt Intake)
2. Server fetches source transcripts from the FliHub API (port 5101)
3. User writes human prompts (A/B/C) that will drive downstream generation
4. Project is saved to `assets/projects/` and can be refined via the Prompt Refinement panel (Day 15)

## Design Decisions

- **One app, many tools (not microservices)**: All 16 tools live in a single monorepo with shared types, one Express server, and one React client. This was chosen because the tools are tightly coupled (they share the asset catalog, shot list, and Socket.io connection) and the audience is a single user, not a team.
  - *Alternative considered*: Separate apps per tool
  - *Why rejected*: Would multiply deployment complexity and prevent cross-tool asset sharing without an additional coordination layer

- **Multi-provider with parallel comparison**: Image, video, and music generation each support multiple AI providers that can run in parallel for side-by-side comparison.
  - *Alternative considered*: Single best provider per domain
  - *Why rejected*: Provider quality varies by prompt style and changes rapidly; comparison lets the user pick the best result per use case

- **JSON file storage (not database)**: All state — asset catalog, shot list, projects, widget configs — is stored as JSON files in `assets/`. No database.
  - *Alternative considered*: SQLite or PostgreSQL
  - *Why rejected*: Single-user app with low write volume; JSON files are inspectable, version-controllable, and require zero setup

- **Socket.io for real-time, REST for CRUD**: Agent chat (Day 2) and shot list updates use Socket.io for streaming. Everything else (image generation, batch jobs, catalog queries) uses REST endpoints.
  - *Alternative considered*: All Socket.io or all REST
  - *Why rejected*: Agent SDK streams tokens naturally via WebSocket; batch image generation doesn't need real-time push — polling the batch status endpoint is simpler and more resilient

- **Environment variables for API keys, not database settings**: Provider keys are set via `.env` / environment variables validated with Zod at startup. The client also has a settings modal that stores keys in localStorage (for UI convenience, forwarded to server via headers).
  - *Alternative considered*: Server-side key storage
  - *Why rejected*: Single-user local app; env vars are the simplest secure approach

## Non-obvious Constraints

- **TailwindCSS v4 breaks `<dialog>` centering**: Preflight removes `margin: auto` from dialog elements, breaking native browser centering. Every modal must explicitly add the `m-auto` class. This is documented in CLAUDE.md but not obvious from the Tailwind docs.

- **Port 5101 must be running for FliHub integration**: Day 9 (Prompt Intake) fetches transcripts from FliHub at `localhost:5101`. If FliHub isn't running, those endpoints silently fail — no error modal, just empty transcript fields.

- **The `shared` workspace must be built before server or client**: Running `npm run dev` without first running `npm run build -w shared` causes import errors. The `start.sh` script handles this, but `npm run dev` alone does not.

- **Batch generation is sequential by default**: Despite the parallel flag in `BatchCreateRequest.options`, the queue processes images one at a time with a configurable delay to avoid rate limiting. True parallelism risks API throttling from providers.

- **Asset URLs are served as static files**: Generated assets are stored on disk under `assets/` and served via `express.static`. There is no CDN, no upload to cloud storage. Moving the assets directory breaks all saved asset URLs.

- **The `config.json` in shared is both runtime data and schema**: It defines the day list, settings schema, and metadata. Changes to this file affect both the sidebar navigation and the settings modal simultaneously.

## Expert Mental Model

- **Think "creative workbench", not "web application"**: FliGen isn't a product with users, authentication, or scaling concerns. It's a single-user creative tool running locally. Every architectural decision follows from this — JSON files, localhost-only, no auth, env vars for secrets. Trying to apply SaaS patterns (database, auth, API gateway) would over-engineer it.

- **Days are features, not time-boxed sprints**: Despite the "12 Days of Claudemas" framing, days are permanent tool panels that grew beyond 12. Day numbers are stable identifiers (Day 4 is always Image Generation) — they don't represent actual development days or priorities.

- **The asset catalog is the connective tissue**: Understanding FliGen's architecture requires understanding that the catalog connects all tools. An image generated in Day 4 can become a shot list entry for Day 6 video, whose output feeds Day 11 story assembly. The catalog tracks provenance (parentId, sourceAssetIds) across these relationships.

- **Provider abstraction follows a consistent pattern**: Every media domain (image, video, music, TTS) has the same file structure: `types.ts`, `fal-client.ts`/`kie-client.ts`, `save-to-catalog.ts`, `index.ts`. Once you understand one domain's structure, you can navigate any other without reading code.

- **Socket.io is only for the agent and shots**: Despite being configured, Socket.io is used sparingly — only the Claude Agent SDK chat (Day 2) and shot list real-time updates use it. Everything else is standard REST. Don't assume WebSocket connectivity for new features.

## Scope Limits

- Does NOT handle user authentication or multi-tenancy — it's a single-user local tool. No auth middleware exists.
- Does NOT deploy to production or cloud — runs exclusively on localhost (ports 5400/5401). There is no Dockerfile, no CI/CD pipeline, no production config.
- Does NOT store API keys server-side — keys come from environment variables or client localStorage. There is no key management system.
- Does NOT edit or trim generated media — it generates and assembles, but editing (cropping, colour grading, cutting) is done in external tools. FliGen is a generation pipeline, not an NLE.
- Does NOT replace FliHub — FliHub manages the broader video recording workflow (chapters, segments, recordings). FliGen consumes FliHub data for prompt intake but doesn't write back to it.

## Failure Modes

- **Silent provider failure in comparison mode**: When one provider fails during `compareImages()`, the error is caught and returned as a result with `error` field and zero-value metrics. The UI shows the result card but may not make it obvious that one comparison failed — the user sees 3/4 images without an explicit "Provider X failed" banner.

- **Stale catalog after manual file deletion**: If a user deletes asset files from `assets/` manually (or moves them), the catalog JSON still references them. Asset URLs return 404 but the catalog shows them as "ready". No integrity check runs on startup.

- **Batch job orphaned on server restart**: If the server restarts mid-batch, the in-memory job state is lost. The batch status endpoint returns 404 for the job ID. Generated images up to that point are saved to disk but the CSV isn't updated with completion markers.

- **FFmpeg not installed**: Story Builder (Day 11) requires FFmpeg to be installed system-wide. If it's missing, the assembly endpoint throws an unhandled error with no user-friendly message. The startup log doesn't check for FFmpeg availability.

- **Environment variable typo causes silent feature disablement**: If `FAL_KEY` is misspelled (e.g., `FAL_API_KEY`), Zod validation passes (the field is optional) but the provider shows as "not configured" at startup. The user must read the startup log banner to notice — no runtime error occurs when they try to use the feature.
