# FR-08: Image Generation Comparison

**Status:** Implemented
**Added:** 2025-12-28
**Implemented:** 2025-12-28
**Day:** 4 of 12 Days of Claudemas

---

## User Story

As a content creator, I want to compare image generation across FAL.AI and KIE.AI providers with different model tiers so that I can evaluate quality, speed, and cost trade-offs for my workflow.

## Problem

FR-07 established API connectivity with both providers. Now we need a practical comparison tool that:

1. Generates images from the same prompt across both providers
2. Compares advanced vs mid-range models side-by-side
3. Shows real metrics (time, cost, resolution) for each generation
4. Allows rapid iteration with a single button

This enables informed decisions about which provider/model to use for different use cases.

## Solution

Extend the Day 4 UI with a tabbed interface:
- **Tab 1: Image Comparison** - New 2x2 comparison grid
- **Tab 2: API Status** - Existing FR-07 health check UI

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Day 4: Image Generation                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Image Comparison ]  [ API Status ]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Prompt: [A red sports car on a mountain road at sunset________________]    │
│                                                                             │
│                        [ Generate All ]                                     │
│                                                                             │
├────────────────────────────────┬────────────────────────────────────────────┤
│  FAL.AI                        │  KIE.AI                                    │
├────────────────────────────────┼────────────────────────────────────────────┤
│  ADVANCED                      │  ADVANCED                                  │
│  ┌────────────────────────┐    │  ┌────────────────────────┐                │
│  │      [Image]           │    │  │      [Image]           │                │
│  └────────────────────────┘    │  └────────────────────────┘                │
│  Flux 2 Pro                    │  Flux 2 Pro                                │
│  Time: 2.3s | $0.035 | 1024²   │  Time: 24.1s | $0.025 | 1024²             │
│                                │                                            │
├────────────────────────────────┼────────────────────────────────────────────┤
│  MID-RANGE                     │  MID-RANGE                                 │
│  ┌────────────────────────┐    │  ┌────────────────────────┐                │
│  │      [Image]           │    │  │      [Image]           │                │
│  └────────────────────────┘    │  └────────────────────────┘                │
│  Flux Schnell                  │  Qwen Z-Image                              │
│  Time: 1.1s | $0.003 | 512²    │  Time: 8.2s | $0.004 | 512²               │
│                                │                                            │
└────────────────────────────────┴────────────────────────────────────────────┘
```

### Model Selection

| Tier | FAL.AI | KIE.AI | Rationale |
|------|--------|--------|-----------|
| Advanced | Flux 2 Pro | Flux 2 Pro | Best photorealism, same model for fair comparison |
| Mid-range | Flux Schnell | Qwen Z-Image | Cheapest/fastest options on each platform |

### Stats to Display

For each generated image:
- **Model name** - Which model was used
- **Time** - Generation duration in seconds
- **Cost** - Estimated cost in USD
- **Resolution** - Image dimensions (e.g., 1024×1024)

## Acceptance Criteria

### Tab Structure
1. [x] Day 4 UI has two tabs: "Image Comparison" and "API Status"
2. [x] Tab state persists during session (doesn't reset on re-render)
3. [x] "API Status" tab contains existing FR-07 health check UI

### Comparison UI
4. [x] Prompt input field at top of comparison tab
5. [x] Default prompt: "A red sports car on a mountain road at sunset"
6. [x] Single "Generate All" button triggers all 4 generations
7. [x] 2×2 grid layout: FAL/KIE columns, Advanced/Mid-range rows
8. [x] Each cell shows: image, model name, time, cost, resolution

### Generation Behavior
9. [x] All 4 images generate in parallel (don't wait for one to finish)
10. [x] Loading spinner shown per cell while generating
11. [x] Images display inline when complete
12. [x] Error state shown per cell if generation fails

### Stats Display
13. [x] Time shown in seconds (e.g., "2.3s")
14. [x] Cost shown in USD (e.g., "$0.035")
15. [x] Resolution shown as dimensions (e.g., "1024×1024")
16. [x] Stats update immediately when generation completes

## Technical Notes

### New API Endpoint

Extend the existing image API with a comparison endpoint:

```typescript
// POST /api/image/compare
interface CompareRequest {
  prompt: string;
}

interface CompareResponse {
  results: {
    provider: 'fal' | 'kie';
    tier: 'advanced' | 'midrange';
    model: string;
    imageUrl: string;
    durationMs: number;
    estimatedCost: number;
    resolution: { width: number; height: number };
    error?: string;
  }[];
}
```

### Model Configuration (Implemented)

```typescript
const MODELS = {
  fal: {
    advanced: { id: 'fal-ai/flux-pro/v1.1', name: 'Flux Pro v1.1', costPer1MP: 0.04 },
    midrange: { id: 'fal-ai/flux/schnell', name: 'Flux Schnell', costPer1MP: 0.003 }
  },
  kie: {
    advanced: { id: 'flux-kontext-max', name: 'Flux Kontext Max', costPerImage: 0.025 },
    midrange: { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', costPerImage: 0.004 }
  }
};
```

**Note:** Models were adjusted from original spec based on API availability. Flux Pro v1.1 used instead of Flux 2 Pro, and Flux Kontext models used for KIE.AI (Qwen Z-Image not available via Kontext API).

### Resolution Settings

- **Advanced models**: 1024×1024 (1MP)
- **Mid-range models**: 512×512 (0.25MP)

### Cost Calculation

- FAL.AI: Cost per megapixel × image megapixels
- KIE.AI: Fixed cost per image (from pricing table)

### Parallel Generation

Use `Promise.all()` or `Promise.allSettled()` to run all 4 generations concurrently. Each generation is independent - one failure shouldn't block others.

```typescript
const results = await Promise.allSettled([
  generateFalAdvanced(prompt),
  generateFalMidrange(prompt),
  generateKieAdvanced(prompt),
  generateKieMidrange(prompt)
]);
```

## Out of Scope

- Model selection dropdown (fixed models for comparison)
- Custom resolution settings
- Image download/save functionality
- Generation history
- Style/parameter tweaking

## References

### Documentation Sources

**FAL.AI:**
- Use MCP tool: `mcp__fal__SearchFal` for API docs
- Models: `fal-ai/flux-2-pro`, `fal-ai/flux/schnell`

**KIE.AI:**
- Second Brain: `/Users/davidcruwys/dev/ad/brains/kie-ai/`
  - `kie-ai-fundamentals.md` - API basics, async polling pattern
  - `kie-ai-image-generation.md` - Image generation specifics

### Related Requirements

- [FR-07: Image API Connectivity](fr-07-api-connectivity.md) - Foundation this builds on

---

**Last updated:** 2025-12-28
