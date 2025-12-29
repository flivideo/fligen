# FR-07: Image API Connectivity

**Status:** Complete
**Added:** 2025-12-28
**Day:** 4 of 12 Days of Claudemas

---

## User Story

As a developer, I want to verify that FliGen can connect to both FAL.AI and KIE.AI APIs so that I have confidence the integration works before building the full image generation feature.

## Problem

Day 4 introduces image generation capabilities using external APIs. Before building a full-featured image generator (FR-08), we need to verify:

1. API credentials are correctly configured
2. We can successfully authenticate with each provider
3. The APIs respond as expected
4. End-to-end image generation works (prompt in, image out)

Without this foundation, debugging the full feature becomes difficult - is it a connectivity issue or a feature bug?

## Solution

Create a connectivity verification system that:

1. **Health check endpoint** - Server endpoint that tests both APIs
2. **Test image generation** - Generate a small, cheap test image from each provider
3. **Display results** - Show the generated images in the UI to confirm end-to-end works

### API Details

**FAL.AI:**
- Docs: https://fal.ai/docs
- Auth: API key in header
- Test model: Use cheapest/fastest available (e.g., Flux Schnell)

**KIE.AI:**
- Docs: https://piapi.ai/docs
- Auth: API key in header
- Test model: Use cheapest option (e.g., Qwen Z-Image at $0.004)

### Test Image Specification

- Prompt: "A simple red cube on a white background" (minimal, fast)
- Size: Smallest available (e.g., 256x256 or 512x512)
- Purpose: Verify connectivity, not quality

## Acceptance Criteria

1. [x] Server has `/api/image/health` endpoint that returns status for both providers
2. [x] Health check verifies API key is configured (not empty)
3. [x] Health check tests authentication with each API
4. [x] Server has `/api/image/test` endpoint that generates test images
5. [x] Test endpoint returns image URLs (or base64) from both FAL.AI and KIE.AI
6. [x] Day 4 UI displays health status for each provider (green/red indicator)
7. [x] Day 4 UI has "Test Connection" button that triggers test image generation
8. [x] Generated test images are displayed in the UI
9. [x] Error messages clearly indicate which provider failed and why
10. [x] Missing API keys show configuration guidance (not just "error")

## Technical Notes

### Environment Variables

```bash
# server/.env
FAL_API_KEY=your_fal_api_key
KIE_API_KEY=your_kie_api_key
```

### API Response Format

```typescript
// Health check response
interface ImageApiHealth {
  fal: {
    configured: boolean;
    authenticated: boolean;
    error?: string;
  };
  kie: {
    configured: boolean;
    authenticated: boolean;
    error?: string;
  };
}

// Test generation response
interface ImageTestResult {
  fal: {
    success: boolean;
    imageUrl?: string;
    error?: string;
    durationMs: number;
  };
  kie: {
    success: boolean;
    imageUrl?: string;
    error?: string;
    durationMs: number;
  };
}
```

### Error Handling

- Missing API key: "FAL_API_KEY not configured. Get your key at https://fal.ai"
- Auth failure: "Authentication failed. Check your API key."
- Rate limit: "Rate limited. Try again in X seconds."
- Network error: "Could not connect to [provider]. Check network."

### Cost Estimate

Test images should be minimal cost:
- FAL.AI Flux Schnell: ~$0.003 per image
- KIE.AI Qwen Z-Image: ~$0.004 per image
- Total per test: ~$0.007

## Out of Scope

- Model selection (FR-08)
- Custom prompts (FR-08)
- Image size/quality options (FR-08)
- Image history/gallery (FR-08)
- Image editing (future)

## References

### Documentation Sources

**FAL.AI:**
- Use MCP tool: `mcp__fal__SearchFal` for API docs, examples, and pricing
- Official docs: https://fal.ai/docs

**KIE.AI:**
- Second Brain: `/Users/davidcruwys/dev/ad/brains/kie-ai/`
  - `kie-ai-fundamentals.md` - API basics, authentication
  - `kie-ai-image-generation.md` - Image generation specifics
- Official docs: https://piapi.ai/docs

### Other References

- [Day 4 Planning](../planning/multimodal-api-platforms-research.md)

---

## Completion Notes

**What was done:**
- Created image API client modules with types, FAL.AI client, and KIE.AI client
- FAL.AI uses `@fal-ai/client` npm package with Flux Schnell model
- KIE.AI uses REST API with async polling pattern (Flux Kontext Pro model)
- Added `/api/image/health` endpoint that checks both providers
- Added `/api/image/test` endpoint that generates test images in parallel
- Created Day 4 UI component with provider cards, status indicators, and test buttons
- Updated server startup to show FAL.AI and KIE.AI configuration status
- Integrated Day 4 UI into App.tsx routing

**Files created:**
- `server/src/tools/image/types.ts` - Type definitions
- `server/src/tools/image/fal-client.ts` - FAL.AI client
- `server/src/tools/image/kie-client.ts` - KIE.AI client
- `server/src/tools/image/index.ts` - Module exports
- `client/src/components/tools/Day4ImageGen.tsx` - Day 4 UI

**Files modified:**
- `server/src/index.ts` - Added image API endpoints and startup status
- `client/src/App.tsx` - Added Day 4 routing

**Testing notes:**
- Run `npm run dev` and navigate to Day 4
- Health check shows green/red status for each provider
- "Test All Providers" generates test images from both APIs
- Images display inline in the UI

**Status:** Complete

---

**Last updated:** 2025-12-28
