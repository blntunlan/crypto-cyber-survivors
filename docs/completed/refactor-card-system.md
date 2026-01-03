---
description: Refactor Card System to a Data-Driven Modifier Registry [COMPLETED]
---

This workflow guides the process of refactoring the card system. The goal is to move from hardcoded effect functions to a declarative modifier system. This reduces code duplication, centralizes stat cap enforcement, and makes it easier to add new cards.

## Phase 1: Analysis & Preparation

1.  **Audit Existing Cards** [DONE]
    -   Examine `services/cards/cardDefinitions.ts`.
    -   Identify common patterns:
        -   Fixed additions (e.g., `baseDamage + 8`)
        -   Multiplicative bonuses (e.g., `speed * 1.05`)
        -   Stat overrides or complex logic.
    -   List all icon keys used (e.g., `lucide:zap`, `lucide:shield`).

2.  **Stat Boundary Check** [DONE]
    -   Ensure all stats being modified are defined in `StatRegistry.ts`.
    -   Identify any "hidden" stats that might need to be added to the registry for consistency.

## Phase 2: Implementation of Card Registry & Utils

3.  **Define Modifier Types** [DONE]
    -   In `services/cards/types.ts`, define a `StatModifier` type:
        ```typescript
        export interface StatModifier {
          stat: StatKey;
          value: number;
          type: 'add' | 'multiply' | 'percent'; // e.g., percent 0.05 = 5% increase
        }
        ```

4.  **Create Card Definition Template** [DONE]
    -   Update the `Card` interface to support declarative modifiers:
        ```typescript
        export interface Card {
          id: string;
          name: string;
          description: string;
          icon: string;
          tier: 'common' | 'rare' | 'epic' | 'legendary';
          modifiers?: StatModifier[];
          effect?: (player: Player) => Player; // Replaces modifiers for complex logic
        }
        ```

5.  **Build the Modifier Applicator** [DONE]
    -   Create a utility function (e.g., in `services/cards/CardManager.ts`) that applies `StatModifier[]` to a player object.
    -   **CRITICAL**: This utility must automatically respect `STAT_DEFINITIONS` caps and minValues.

## Phase 3: Migration & Refactoring

6.  **Migrate Common Cards** [DONE]
    -   Convert simple cards in `cardDefinitions.ts` to use the `modifiers` array instead of the `effect` function.
    -   *Example Migration*:
        ```typescript
        // OLD
        effect: p => ({ ...p, baseDamage: p.baseDamage + 8 })
        
        // NEW
        modifiers: [{ stat: 'baseDamage', value: 8, type: 'add' }]
        ```

7.  **Handle Complex Cards** [DONE]
    -   For cards with multiple effects or unique logic, decide whether to use multiple modifiers or keep the `effect` function.
    -   Prefer `modifiers` even for multi-stat cards for maximum transparency.

8.  **Update Level Up Logic** [DONE]
    -   Ensure the system that applies chosen cards (likely `App.tsx` or a `PlayerService`) uses the new applicator logic.

## Phase 4: Verification & Cleanup

9.  **Verification** [DONE]
    -   Start a game and level up.
    -   Select a card using the new `modifiers` system.
    -   Verify the player stats are updated correctly in the Kernel Status UI.
    -   Verify that caps (e.g., max fire rate) are still enforced through the automatic lookup in the applicator.

10. **Cleanup** [DONE]
    -   Remove unnecessary manual `Math.min`/`Math.max` calls from any remaining `effect` functions if the applicator can handle them.
    -   Run `npm run lint` to ensure no issues with the new types.
