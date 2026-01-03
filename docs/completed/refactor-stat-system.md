---
description: Refactor Player Stats to a Centralized Data-Driven Registry [COMPLETED]
---

This workflow guides the process of migrating scattered player stat definitions (types, defaults, UI config, caps) into a unified `StatRegistry`. This eliminates "shotgun surgery" when adding new stats.

## Phase 1: Analysis & Preparation

9.  **Audit Existing Stats** [DONE]
    -   List all current stats in `types.ts` (Player interface).
    -   List all default values in `config/PlayerConfig.ts`.
    -   List all UI configurations (labels, colors, formatting) in `components/hud/KernelStatus.tsx`.
    -   Identify all stat caps in `config/PlayerConfig.ts`.

10. **Backup** [DONE]
    -   Ensure specific backup of `types.ts`, `config/PlayerConfig.ts`, and `components/hud/KernelStatus.tsx` or commit current state.

## Phase 2: Implementation of Stat Registry

11. **Create Registry File** [DONE]
    -   Create `config/StatRegistry.ts`.
    -   Define a `StatDefinition` interface:
        ```typescript
        export interface StatDefinition {
          id: string; // The variable name in code (e.g., 'fireRate')
          label: string; // UI Label (e.g., 'A/S')
          description: string; // Tooltip or detailed description
          defaultValue: number;
          cap?: number; // Max value cap
          minValue?: number; // Min value limit (optional)
          isPercentage: boolean; // For formatting (e.g., 0.05 -> 5%)
          isInverse?: boolean; // For display (e.g., lower fireRate is better/higher A/S)
          uiColor?: string; // Tailwind class
          showInKernel?: boolean; // Whether to show in KernelStatus
          category: 'combat' | 'defense' | 'movement' | 'economy';
        }
        ```
    -   Populate `STAT_DEFINITIONS` constant with all data gathered in Phase 1.

12. **Derive Types** [DONE]
    -   In `config/StatRegistry.ts` or `types.ts`, create the `PlayerStats` type derived from the registry:
        ```typescript
        import { STAT_DEFINITIONS } from './config/StatRegistry';
        
        // Setup keys based on registry
        export type StatKey = keyof typeof STAT_DEFINITIONS;
        
        // Helper to infer the numeric stats structure
        export type PlayerStats = {
            [K in StatKey]: number;
        };
        ```
    -   *Note:* The full `Player` interface usually extends `PlayerStats` plus other fields like `x`, `y`, `id`, market position, etc.

## Phase 3: Application & Refactoring

13. **Refactor Type Definitions** [DONE]
    -   Update `types.ts` to use the derived `PlayerStats` type or ensure `Player` interface matches the keys in `StatRegistry`.

14. **Refactor Defaults & Config** [DONE]
    -   Update `config/PlayerConfig.ts` to generate `PLAYER_STATS` constants (like `INITIAL_HP`, `MAX_SPEED`) from `STAT_DEFINITIONS` where possible, or replace usage with direct registry lookups.
    -   Update `services/GameStateManager.ts` (specifically `PLAYER_DEFAULTS` and `createInitialPlayer`) to initialize the player object by iterating over `STAT_DEFINITIONS`.
        ```typescript
        // Example logic
        export const createInitialPlayer = (...) => {
           const p = { ...otherFields };
           Object.values(STAT_DEFINITIONS).forEach(stat => {
              p[stat.id] = stat.defaultValue;
           });
           return p;
        }
        ```

15. **Refactor UI Components** [DONE]
    -   Update `components/hud/KernelStatus.tsx`:
        -   Remove hardcoded `StatRow` components.
        -   Map over `Object.values(STAT_DEFINITIONS)` where `showInKernel` is true.
        -   Render `StatRow` dynamically using properties from the definition (`label`, `uiColor`, `isPercentage`).
        -   *Bonus:* Verify `NaN` handling is centralized here.

16. **Refactor Logic/Caps** [DONE]
    -   Check usage of caps in `CombatSystem.ts`, `PhysicsSystem.ts`, etc.
    -   Replace hardcoded numbers (e.g., `Math.min(0.5, ...)`) with `STAT_DEFINITIONS.lifesteal.cap`.

## Phase 4: Verification

17. **Type Check** [DONE]
    -   Run `npm run tsc` (or checks via IDE) to ensure no type errors remain.

18. **Runtime Verification** [DONE]
    -   Start the game.
    -   Verify initial stats match defaults.
    -   Verify UI renders correctly (labels, colors, values).
    -   Verify upgrades (cards) still modify stats correctly.
    -   Verify caps are enforced.
