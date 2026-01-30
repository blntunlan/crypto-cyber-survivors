---
description: Refactor Enemy System to a Centralized Data-Driven Registry [COMPLETED]
---

This workflow guides the process of migrating hardcoded enemy configurations from `EnemyFactory.ts` into a unified `EnemyRegistry`. This makes it easier to add new enemies, balance spawn rates, and manage difficulty multipliers.

## Phase 1: Analysis & Preparation

1.  **Audit Existing Enemies** [DONE]
    -   Examine `factories/EnemyFactory.ts`.
    -   List all current enemy types (`bear`, `bull`, `whale`, etc.).
    -   Extract their properties: `radius`, `baseHealth`, `baseSpeed`, `color`, and `spawnWeight`.
    -   Identify special behaviors linked to enemy types in `createEnemy`.

2.  **Audit External Dependencies** [DONE]
    -   Check `types.ts` for the `Enemy` interface and type unions.
    -   Identify where enemy types are used as strings (e.g., `SpawnSystem.ts`, `MetricsService.ts`).

## Phase 2: Implementation of Enemy Registry

3.  **Create Registry File** [DONE]
    -   Create `config/EnemyRegistry.ts`.
    -   Define an `EnemyDefinition` interface:
        ```typescript
        export interface EnemyDefinition {
          id: string; // Internal ID (e.g., 'bear')
          type: 'bear' | 'bull' | 'fud' | 'whale' | 'liquidator' | 'pumpdump';
          radius: number;
          baseHealth: number;
          baseSpeed: number;
          color: string; // Tailwind context or hex
          spawnWeight: number; // For random spawn logic
          description?: string;
          experienceValue?: number; // Optional: specific exp drop
        }
        ```
    -   Populate `ENEMY_DEFINITIONS` with the audited data.

4.  **Derive Shared Types** [DONE]
    -   Update `types.ts` to derive the enemy type union from the registry if possible:
        ```typescript
        import { ENEMY_DEFINITIONS } from './config/EnemyRegistry';
        export type EnemyId = keyof typeof ENEMY_DEFINITIONS;
        ```

## Phase 3: Refactoring the Factory & Systems

5.  **Refactor EnemyFactory** [DONE]
    -   Replace the hardcoded `ENEMY_CONFIGS` with imports from `EnemyRegistry.ts`.
    -   Update `createEnemy` to use the registry data.
    -   Update `totalWeight` calculation to use the registry.

6.  **Refactor Logic Alignment** [DONE]
    -   Ensure `SpawnSystem.ts` (if it handles specific spawn logic) uses the registry weights or definitions.
    -   Update any logic that uses `switch` statements on enemy types to use data-driven properties from the registry where appropriate.

7.  **Decouple Colors and Visuals** [DONE]
    -   If colors are dynamic (e.g., based on Market Position), ensure the registry provides the "base" color or a key used for lookup.

## Phase 4: Integration & Testing

8.  **Verify Type Safety** [DONE]
    -   Run `npm run lint` and `npm run build` (or `tsc`) to ensure no broken references.

9.  **Balance Check** [DONE]
    -   Modify a value in `EnemyRegistry.ts` (e.g., double the `baseHealth` of a `bear`).
    -   Verify the change is reflected in-game without touching the Factory code.

10. **Runtime Smoke Test** [DONE]
    -   Start a game session.
    -   Confirm different enemy types spawn as expected.
    -   Verify that "Market Opposite" coloring logic still works for Bulls/Bears using the registry values as defaults.
