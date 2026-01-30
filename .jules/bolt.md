## 2026-01-30 - Environment Quirks
**Learning:** `npm` scripts in this environment (likely Linux container) sometimes fail with `spawn powershell ENOENT`, suggesting a misconfigured or cross-platform polluted `npm` context.
**Action:** Prefer invoking binaries directly (e.g., `./node_modules/.bin/vitest`) or using `pnpm` carefully (avoiding lockfile commits) to bypass `npm` script shells.

## 2026-01-30 - Canvas Batching
**Learning:** Batching independent circles (like gems) into a single `Path2D` requires explicit `ctx.moveTo(x + r, y)` before `ctx.arc()` to avoid connecting lines. This reduces draw calls from N to 1 for the batch.
**Action:** Apply this pattern to other high-frequency entities (e.g., bullets, particles) if they share identical state (color, shadow, alpha).
