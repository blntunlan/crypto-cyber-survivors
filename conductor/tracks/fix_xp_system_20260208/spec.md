# Specification: Fix Broken XP Progression (GameMasterBrain Logic)

## Overview
The leveling system is currently non-functional because experience gems provide 0 or `NaN` XP. This was traced to the `GameMasterBrain` service, where the `gemValueMultiplier` (a core component of the XP calculation) is missing from the smoothing and default state initialization logic.

## Functional Requirements
- **Restore XP Gain:** Ensure every experience gem collected by the player correctly increments the `player.exp` value.
- **Fix GameMasterBrain Outputs:**
    - Add `gemValueMultiplier` to `getDefaultOutputs()` with a base value of `1.0`.
    - Include `gemValueMultiplier` in the `smoothOutputs()` function to ensure it transitions correctly between brain updates.
- **Prevent NaN Propagation:** Ensure `DifficultyManager.getXpMultiplier()` always returns a valid number (minimum `1.0`).

## Non-Functional Requirements
- **Performance:** Maintain the GC-free nature of the update loop; no new object allocations during the smoothing or mapping process.
- **Type Safety:** Ensure all `GameMasterOutputs` are strictly typed and initialized.

## Acceptance Criteria
- [ ] XP bar increments correctly when picking up gems in a live game session.
- [ ] Level-up events trigger when `player.exp >= player.nextLevelExp`.
- [ ] No `NaN` values appear in `DifficultyManager` debug states or metrics.
- [ ] Unit tests for `GameMasterBrain` verify that `gemValueMultiplier` is properly smoothed and initialized.

## Out of Scope
- Balancing the XP curve (this track only fixes the broken logic).
- Modifying the UI/HUD components.
