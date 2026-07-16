# Modular Difficulty Runtime Design Errata

> **Status:** normative written-review correction
> **Applies to:** `2026-07-15-modular-difficulty-runtime-design.md`
> **Created:** 2026-07-15

This errata records the DRY and consistency corrections found during the design self-review. These rules override conflicting or ambiguous wording in the parent design and must be folded into it before implementation begins.

## Canonical Snapshot Contract

The existing `types/runtimeDifficulty.ts` file is evolved in place. Its minimal `RuntimeDifficultySnapshot` becomes the one expanded public difficulty contract.

Any `DifficultySnapshot` name in the parent design means this canonical `RuntimeDifficultySnapshot`; implementation must not introduce a second public snapshot type.

The existing `GameplaySnapshot` in `services/director/contracts.ts` remains an internal current-director comparison type during shadow mode. It is renamed to `CurrentDirectorSnapshot` or removed when the compatibility path is retired.

## Sole Coordinator

`DifficultyRuntimeOrchestrator` is the sole modular coordinator and final snapshot commit owner.

`ExperienceDirector` and `DirectorSpawnOrchestrator` remain only behind the `current` rollout adapter while shadow comparison is required. Their reusable allocator and planner responsibilities move into explicit domain managers. They do not wrap or remain alongside the modular orchestrator after cutover.

## Runtime Mode Reuse

`config/directorRuntime.ts`, `DirectorRuntimeMode`, and `DirectorRuntimePlan` are evolved to resolve `VITE_DIFFICULTY_RUNTIME_MODE=current|shadow|modular`.

The new environment setting is independent from `VITE_MARKET_RUNTIME_MODE`, but implementation must not create a second director-mode resolver or parallel mode state model.

## Atomic Fallback Commits

Manager fallback cannot silently mix a newly evaluated input set with an older domain output under normal quality.

During the configured grace period, a manager failure keeps the entire previously committed `RuntimeDifficultySnapshot`; no partial new snapshot is committed. After grace expiry, the failed manager contributes its documented neutral output against the current coherent input set, and the newly committed snapshot is marked `DEGRADED` with explicit fallback reason codes.

This rule preserves atomic revision semantics while allowing bounded long-lived degradation.
