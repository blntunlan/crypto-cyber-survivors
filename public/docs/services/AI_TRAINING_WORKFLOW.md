# :Dna: AI Training Workflow

> **Status** live
> Owner: AI Engineering


Type: backtest and tuning workflow
Domain: difficulty tuning

## Summary

`Project Darwin` is now best understood as a backtest and tuning pipeline for the live rule-based difficulty stack, not as a client neural-network deployment path.

The current workflow centers on `services/training/BacktestEngine.ts` and related tooling used to replay historical market conditions, score flow-state quality, and tune difficulty parameters.

## Current goals

The workflow is used to evaluate whether the runtime keeps players in a healthy pressure band while market conditions change.

Typical targets:

- stable flow-state occupancy
- acceptable death rate under leverage pressure
- predictable reward and spawn curves
- reproducible backtests across historical slices

## Practical loop

1. Load or synthesize historical market data.
2. Run headless or simulated gameplay episodes.
3. Measure flow-state, survival, kill pressure, and reward outcomes.
4. Compare parameter sets.
5. Promote tuned thresholds or rule constants back into the live difficulty stack.

## What it is not

The active gameplay runtime does not currently depend on a shipped MLP or `synaptic.js` brain for difficulty decisions. The live path is driven by `UnifiedDirector`, `DifficultyManager`, and the phase-based gameplay loop.

## Relevant code

- `services/training/BacktestEngine.ts`
- `services/difficulty/UnifiedDirector.ts`
- `services/gameplay/DifficultyManager.ts`
- `docs/services/UnifiedDirector.md`
- `docs/workflows/difficulty-pipeline.md`
