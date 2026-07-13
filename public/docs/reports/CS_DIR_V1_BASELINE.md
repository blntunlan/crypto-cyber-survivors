# CS-DIR-V1 Baseline Evidence

> **Status** complete  
> Owner: Core Engineering  
> Created: 2026-07-12

## Source

The behavior baseline targets clean source revision `1ce825ab6045a63636422556a7fd5621df5a0328`.

## Artifact Inventory

- `tests/golden/fixtures/market-scenarios.v1.json`
- `tests/golden/fixtures/unified-rules.v1.json`
- `tests/golden/fixtures/legacy-pipeline.v1.json`
- `tests/golden/fixtures/core-gameplay-loop.v1.json`
- `tests/golden/fixtures/spawn-system.v1.json`
- `tests/golden/fixtures/reward-preview.v1.json`
- `tests/golden/fixtures/performance-reference.v1.json`

Each artifact uses `schemaVersion: 1` and a canonical JSON SHA-256 payload hash.

## Commands

```terminal
npm run check:director-baseline
npm run check:director-reference
npm run check:baseline
```

`check:director-baseline` runs all Director golden tests with one worker. `check:director-reference` validates the committed performance reference and records a fresh local measurement. The complete repository gate retains all existing checks and invokes the reference validator before the full suite.

## Pacing Baseline

The 60 FPS CoreGameplayLoop output is locked as a golden artifact. The legacy implementation currently records up to `100.01 ms` phase-transition drift and `0.05` numeric smoothing drift across 30, 60, and 120 FPS simulations. This is a behavior-preserving baseline, not a declaration that parity is complete; the corrective work is tracked in Bug Takibi.

## Performance Policy

The reference artifact records Node/platform metadata, warmed iteration counts, median/p95 replay time, heap delta, bytes per simulated tick, and the market scenario hash. Timing and heap values are informational because they differ by machine. Schema validity, source revision, fixture linkage, deterministic hashes, and golden output parity are hard gates.

## Exit Evidence

Artifacts, command surface, and public documentation are transferred into the primary worktree. `npm run check:director-baseline` passes with 8 test files and 15 tests. The complete `npm run check:baseline` gate also passes: typecheck, architecture, reset coverage, lint, Director reference, 274 test files / 2671 tests, and production build are green.
