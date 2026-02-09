# Implementation Plan: Fix Broken XP Progression

Fixing the critical logic error in `GameMasterBrain` where `gemValueMultiplier` is missing from default outputs and smoothing, causing `NaN` in experience calculations.

## Phase 1: Core Logic Fix & Unit Testing
- [ ] Task: Create dedicated unit test `tests/services/difficulty/GameMasterBrain.test.ts` that fails when `gemValueMultiplier` is missing from defaults or smoothing.
- [ ] Task: Update `services/difficulty/GameMasterBrain.ts` to include `gemValueMultiplier` in `getDefaultOutputs()` and `smoothOutputs()`.
- [ ] Task: Verify unit tests pass and ensure `gemValueMultiplier` transitions correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Logic Fix & Unit Testing' (Protocol in workflow.md)

## Phase 2: System Integration & Regression
- [ ] Task: Verify `DifficultyManager.getXpMultiplier()` correctly incorporates the brain's `gemValueMultiplier` without producing `NaN`.
- [ ] Task: Run existing difficulty and combat tests (`tests/DifficultyManager.test.ts`, `tests/NewMechanics.test.ts`) to ensure no regressions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: System Integration & Regression' (Protocol in workflow.md)
