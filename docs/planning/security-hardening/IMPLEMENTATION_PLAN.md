# IMPLEMENTATION_PLAN.md — security-hardening

**Goal**: Fix 3 BLOCKERs + 2 MAJORs + 1 minor surfaced by code/test quality audits; replace D-grade placeholder test; add 2 critical missing behaviour tests.
**Started**: 2026-03-19
**Target**: Build clean; 42+ tests passing; no silent disk leak; no FFmpeg injection; no SSRF in N8N route; no divide-by-zero on aspect ratio calculator.

## Summary
- Total: 9 | Complete: 9 | In Progress: 0 | Pending: 0 | Failed: 0

---

## Pending

### Wave 1 (parallel — all touch different server/client files, no conflicts)
- [x] fix-delete-asset-path — TYPE_DIRS map added; `story` → `stories`; build clean; 42 tests passing
- [x] fix-ffmpeg-volume-injection — `clampVolume` + `assertFiniteNumber` helpers added to routes/story.ts; validation block before assembleVideo; build clean; 42 tests passing
- [x] fix-n8n-ssrf — `assertHttpsUrl` added; called before all 3 fetch blocks; build clean; 42 tests passing
- [x] fix-outputname-sanitise — regex strip + 100-char cap + `'story'` fallback applied; build clean; 42 tests passing
- [x] fix-gcd-divide-by-zero — `dimsToRatio` guards 0 with early return; Calculator.tsx onChange clamps to v > 0; build clean; 42 tests passing

### Wave 2 (parallel — all touch different test files + minor client fix, no conflicts)
- [x] fix-visual-preview-label — `computedRatio` prop added to VisualPreview; Day16AspectRatio passes it; displays `16:9` correctly; build clean; 45 tests passing
- [x] replace-example-test — 4 real smoke tests replace tautological placeholder; Node.js version, env, JSON round-trip, ISO date format; 45 tests passing
- [x] add-assembler-tests — 3 tests added: path-traversal video, path-traversal music, enableZoom zoompan+tpad shape; 45 tests passing
- [x] add-catalog-tests — concurrent addAsset test added; loadCatalog imported; both asset IDs persist after Promise.all; 45 tests passing

---

## In Progress

## Complete

## Failed / Needs Retry

---

## Notes & Decisions

- N8N SSRF fix: require `https://` prefix only (not domain allowlist) — CDN URLs vary by provider; blocking `file://`, `http://`, `data:` is the key defence for a local dev tool.
- FFmpeg volume: clamp to [0, 2] not [0, 1] — legitimate use case for 2x boost; values above 2 are unusual and should be rejected.
- `outputName` sanitisation applies only to the output filename, not the input asset paths (those already have `resolveAssetPath` guard).
- Wave 2 is safe to run in parallel with Wave 1 IF file conflict analysis holds — double-check before launching.
- Test baseline: 42 passing. This campaign should exit with ≥42 tests (adds new ones, none removed).
