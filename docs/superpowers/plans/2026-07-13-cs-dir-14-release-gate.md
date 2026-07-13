# CS-DIR-14 Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the Director runtime is deterministic, fair, measurable, and releasable.

**Architecture:** Keep replay and Mirror PvP verification at the pure `DirectorSpawnOrchestrator` boundary, where canonical market frames, run seed, and immutable config determine a snapshot and spawn plan. Gate performance through the existing golden reference runner, while release operational controls live in the launch runbook and are executed by CI before deploy.

**Tech Stack:** TypeScript 5.8, Vitest 4, Playwright, GitHub Actions, Vite 6, Railway.

## Global Constraints

- Node.js is `>=20` and TypeScript runs in strict mode.
- Token and Mirror PvP runs never receive Practice Assist.
- Replay inputs use canonical market frames and seeded Director execution only.
- The game RAF loop must remain allocation-free.
- `npm run check:baseline` remains the mandatory frontend gate.

---

### Task 1: Deterministic Director Replay and Mirror Parity

**Files:**
- Modify: `tests/services/director/DirectorSpawnOrchestrator.test.ts`
- Test: `tests/services/engagement/IntensityModel.test.ts`

**Interfaces:**
- Consumes: `DirectorSpawnOrchestrator.update(DirectorSpawnOrchestratorInput)`.
- Produces: matching `GameplaySnapshot` and `SpawnPlan` hashes for equal frame, seed, config, and mode-neutral inputs.

- [ ] Add a replay test that runs the same recorded canonical frame sequence through independent orchestrators and compares snapshots and intent arrays.
- [ ] Add a Mirror PvP test that switches only `run.mode` from `TOKEN` to `MIRROR_PVP` and compares the resulting snapshot and plan.
- [ ] Run `npx vitest run tests/services/director/DirectorSpawnOrchestrator.test.ts tests/services/engagement/IntensityModel.test.ts --pool=forks --maxWorkers=1`.

### Task 2: Mandatory Performance Guard

**Files:**
- Modify: `tests/golden/PerformanceBaseline.golden.test.ts`
- Modify: `scripts/measure-director-baseline.ts`

**Interfaces:**
- Consumes: `performance-reference.v1.json` and the current deterministic replay workload.
- Produces: a release-gate assertion for same-environment median and P95 regression no greater than five percent.

- [ ] Add a failing threshold assertion for matching Node/platform/architecture references.
- [ ] Keep cross-environment measurements informational to avoid comparing incompatible hardware baselines.
- [ ] Run `npm run check:director-reference`.

### Task 3: Release Controls and Evidence

**Files:**
- Modify: `docs/workflows/BETA_LAUNCH_RUNBOOK.md`
- Modify: `public/docs/workflows/BETA_LAUNCH_RUNBOOK.md`
- Modify: `docs/navigation.json`
- Modify: `public/docs/navigation.json`

**Interfaces:**
- Consumes: `npm run check:baseline`, backend validation, replay/parity gate, and beta environment validation.
- Produces: rollout percentage stages, automated rollback thresholds, and a rehearsal checklist with no ledger-loss invariant.

- [ ] Add Director release prerequisites and a staged rollout table to the runbook.
- [ ] Add rollback triggers for replay mismatch, parity mismatch, performance regression, settlement failure, and unfair-death metrics.
- [ ] Run `npm run docs:check` and `npm run check:baseline`.

## Review

- Replay and Mirror parity use the same canonical frame sequence and seed.
- Practice Assist isolation remains covered for `TOKEN` and `MIRROR_PVP`.
- Performance comparisons fail only against a compatible environment reference.
- CI already requires `npm run check:baseline`; the release runbook adds the operational rehearsal evidence.
