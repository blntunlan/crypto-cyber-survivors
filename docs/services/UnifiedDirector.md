# :Brain: UnifiedDirector

> **Status** live
> Owner: AI Engineering


Type: deterministic rule pipeline
Domain: adaptive difficulty

## Summary

`services/difficulty/UnifiedDirector.ts` replaces the older neural-director narrative with a deterministic rule stack. The service updates a preallocated `RuleContext`, applies ordered rules in place, and smooths the numeric outputs before callers read them.

## Why it exists

The runtime needs difficulty changes that are:

- predictable under test
- cheap inside the hot loop
- easy to inspect and tune
- compatible with worker and replay style audit flows

A deterministic rule pipeline satisfies those constraints better than the older MLP-based design docs.

## Inputs

`UnifiedInputs` includes:

- market inputs: RSI, ATR, volume, price change, trend strength, MACD histogram, side
- player inputs: HP percent, PnL ratio, kills per minute, dash frequency, DPS, damage taken rate
- game context: elapsed minutes, level, leverage, gem pileup, engagement score, frustration score

## Outputs

`UnifiedOutputs` includes:

- spawnRate
- enemySpeed
- enemyHP
- enemyDamage
- gemDropRate
- enemyVariety
- chaosLevel
- mercyFactor
- pressureIntensity
- whaleProbability
- xpMultiplier
- trendAlignment
- lootboxDropChance

## Execution model

On each update call the service:

1. resets the reusable output object to defaults
2. resets shared scratch state
3. swaps the current input reference into the rule context
4. runs the ordered rule list
5. applies smoothing before exposing the final values

This keeps allocations low and lets tests swap rule sets without changing the calling contract.

## Upstream and downstream dependencies

- Upstream: `difficultyContext`, market indicators, leverage state, flow-state inputs
- Downstream: `DifficultyManager`, game loop phases, VFX and pacing logic that react to pressure or shock states
