# :TrendingUp: Difficulty Pipeline

> **Status** live
> Owner: Game Design


## Purpose

This workflow documents how live market and player state become concrete spawn and combat pressure.

## 1. Phase entry

`DifficultyPhase` runs early in the frame. It advances wave timers and synchronizes `difficultyContext` with the current game time.

## 2. Input collection

`difficultyContext` aggregates market, leverage, combat, and player-health state. `DifficultyManager` also tracks dash count, damage intake, kill windows, and momentum values that are cheaper to maintain incrementally.

## 3. Rule evaluation

`UnifiedDirector` receives normalized inputs and executes ordered rules against a reusable context object. Shared scratch state and output smoothing keep the system deterministic and allocation-light.

## 4. Output mapping

`DifficultyManager` maps the director outputs into gameplay-facing values such as spawn rate, enemy speed, enemy HP, enemy damage, and total difficulty.

## 5. Downstream consumers

Those outputs feed:

- spawn logic
- combat pacing
- warning or shock effects
- reward pressure and whale probability signals

Because the pipeline is phase-based, downstream systems always consume the latest frame-consistent difficulty snapshot.
