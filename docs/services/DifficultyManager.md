# :Gauge: DifficultyManager

> **Status** live
> Owner: Game Design


Type: orchestrator service
Domain: gameplay balance

## Role in the runtime

`services/gameplay/DifficultyManager.ts` consumes the mutable state collected in `difficultyContext`, asks `UnifiedDirector` for smoothed rule outputs, and maps those values into concrete gameplay multipliers.

It is not the source of truth for market ingestion and it is no longer a wrapper around a neural network model.

## Inputs

DifficultyManager blends data from multiple sources:

- market indicators such as RSI, ATR, and normalized volume
- player state such as HP, kill streak, dash rate, and recent damage taken
- session context such as leverage, elapsed time, and active gem pressure
- optional admin overrides from `useAdminConfigStore`

## Outputs

The service returns a `DifficultyOutput` containing values like:

- spawn rate
- enemy speed
- enemy HP
- enemy damage
- gem drop rate
- total aggregate difficulty
- shock state and warning state

These outputs are consumed by loop phases and gameplay systems, not by React directly.

## Relationship to the director stack

The live difficulty stack is:

1. `difficultyContext` gathers hot-path inputs.
2. `FlowStateManager` and related services shape player-pressure signals.
3. `UnifiedDirector` applies ordered rules and smoothing.
4. `DifficultyManager` maps the director output to concrete game values.

## Loop integration

`DifficultyPhase` is the phase entry point used by `GameLoopCoordinator`. It advances timers and keeps `difficultyContext` synchronized with game time before downstream phases consume the updated outputs.
