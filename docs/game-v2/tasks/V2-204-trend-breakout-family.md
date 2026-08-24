# V2-204 — Trend/Breakout Family (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-203` (indicator-event state machine, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs), §7.4 (Indicator-event lifecycle)
> Governing decisions: V2-ADR-104 through V2-ADR-109 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Master plan Done-When: "Profile produces a bounded typed encounter output."
Design §6.2 names the full output taxonomy
(`SPAWN | WORLD_EVENT | LOOT_EVENT | HYBRID`) but no concrete profile,
threshold, or output shape exists yet for any family. `V2-208`/`V2-209`/
`V2-210` ("Spawn output" / "World-event output" / "Loot-event output"),
which actually wire an output into a real spawn/hazard/loot system, are
listed *after* `V2-207` (the primary/support composer) — meaning this
task's job is the family's *data* (a real, authored `IndicatorEventProfile`
plus the typed output it produces when active), not consuming that output
anywhere. This mirrors `V2-108`'s enemy archetypes existing before
`EnemyComposer` wired them into a live spawn cadence.

`SPAWN` is the chosen output kind for this family (a trend breakout reads
naturally as an enemy rush), not `WORLD_EVENT`/`LOOT_EVENT`/`HYBRID` — those
fit `V2-205`/`V2-206` better and defining their concrete shapes now would be
guessing content ahead of the tasks that actually need them. This is the
first content family, so it also defines the shared `EncounterOutput`
contract other families will extend with their own variants; only `SPAWN`
is given a concrete shape here.

Every numeric constant this family authors is derived from a real existing
value, not felt, matching this project's standing bar:

- `trendStrength` is provably bounded `[0, 1]`:
  `railway-market-aggregator/src/services/indicatorService.ts` computes it
  as `Math.abs((rsi - 50) / 50)`, and `rsi` is itself validated to `[0, 100]`
  by `V2-200`'s `normalizeMarketUpdate`. The entry threshold is the
  mathematical midpoint of that proven range.
- The spawn budget is a multiple of the existing
  `MVP0_ENEMY_SPAWN_BUDGET`, not an invented number.
- Confirmation/cooldown durations are derived from `SIMULATION_HZ`
  (real seconds), matching every other tick-count constant in this
  codebase.

## Done When

1. `game-v2/contracts/EncounterOutput.ts` declares `EncounterOutputKind`
   (the full four-member design enum) and the concrete `SpawnEncounterOutput`
   variant with a validator; `EncounterOutput` is a union starting with just
   this one variant.
2. A real, authored `IndicatorEventProfile` for Trend/Breakout exists,
   built on `V2-203`'s mechanism, sampling `MarketSnapshot.trendStrength`.
3. `TrendBreakoutEncounter` steps the profile against a real `MarketSnapshot`
   and produces a bounded `SpawnEncounterOutput` (themed by
   `trendDirection`) exactly on the tick the profile activates — never
   more than one output per activation, and no output while `ARMED`/
   `CONFIRMING`/`COOLDOWN`.
4. Every authored numeric constant is derived and pinned by an
   exact-equality test, not chosen by feel.
5. Not wired into `GameV2Runtime` or any spawn/composer system — matches
   `V2-203`'s own precedent; that is `V2-207`'s and `V2-208`'s job.

## Design: the derivations

```
TREND_BREAKOUT_ENTRY_THRESHOLD = 0.5   (midpoint of trendStrength's proven [0,1] range)
TREND_BREAKOUT_EXIT_THRESHOLD  = 0.5   (same value; design's own worked example precedent)
TREND_BREAKOUT_HYSTERESIS      = TREND_BREAKOUT_ENTRY_THRESHOLD / 2 = 0.25
  -> rearm threshold = exitThreshold - hysteresis = 0.25
     (trendStrength must recover to at most half the entry threshold
     before a new breakout can arm)
TREND_BREAKOUT_CONFIRMATION_TICKS = SIMULATION_HZ = 60   (1 real second sustained)
TREND_BREAKOUT_COOLDOWN_TICKS     = 10 * SIMULATION_HZ = 600  (10 real seconds)
TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER = 4
TREND_BREAKOUT_SPAWN_BUDGET = MVP0_ENEMY_SPAWN_BUDGET * TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER = 8
```

The spawn budget multiplier (a themed wave is worth several times a normal
per-interval spawn budget) and the cooldown duration (long enough that a
signal needs genuine follow-through, not a momentary echo) are the two
values chosen with stated reasoning rather than derived from an existing
constant by pure arithmetic — `V2-108`'s own archetype multipliers set this
precedent, and `V2-405` (MVP-4, balance audit) is the task whose explicit
job is tuning these for real play.

`trendDirection` provably cannot be `'NEUTRAL'` when the profile activates:
activation requires `trendStrength > 0.5`, i.e. `|rsi - 50| > 25`, i.e.
`rsi < 25` or `rsi > 75` — both far outside the `[45, 55]` band
`indicatorService.ts` uses to derive `'NEUTRAL'`. `'UP'` maps to
`bullish-breakout`, `'DOWN'` to `bearish-breakout`; `'NEUTRAL'` is rejected
defensively (a real invariant, proven unreachable through the real pipeline
but guarded rather than assumed, mirroring `CombatSystem`'s own
defensive-guard precedent).

## Scope

In scope:

1. `game-v2/contracts/EncounterOutput.ts`: `EncounterOutputKind`, the
   frozen `SpawnEncounterOutput` type (`kind: 'SPAWN'`, `enemyBudget`,
   `themeId`), `assertSpawnEncounterOutput`, and `EncounterOutput` (today
   just `SpawnEncounterOutput`).
2. `game-v2/config/TrendBreakoutFamily.ts`: the derived constants above and
   the authored `TREND_BREAKOUT_PROFILE: IndicatorEventProfile`.
3. `game-v2/market/TrendBreakoutEncounter.ts`: `TrendBreakoutEncounter`
   wrapping one `IndicatorEventStateMachine` instance —
   `step(snapshot: MarketSnapshot, tick: number): SpawnEncounterOutput | null`,
   `reset()`.
4. Tests: `EncounterOutput.ts` validation; `TrendBreakoutFamily.ts` constant
   derivation (exact-equality); `TrendBreakoutEncounter.test.ts` — a real
   sequence of synthetic `MarketSnapshot`s driving an activation, proving
   the output is produced exactly on the activation tick, themed correctly
   for both directions, `null` on every other tick, and rejecting a
   (constructed, not really reachable) `'NEUTRAL'`-direction activation
   attempt.

Out of scope:

- `WORLD_EVENT`/`LOOT_EVENT`/`HYBRID` shapes (`V2-205`/`V2-206`'s own
  families will add their variant when they need it).
- The primary/support composer (`V2-207`) and any real spawn-system
  consumption of the output (`V2-208`).
- Wiring into `GameV2Runtime`, `MarketSnapshotAdapter`, or any other
  `game-v2/systems/**`/`game-v2/runtime/**` consumer.
- Final balance tuning of the authored constants (`V2-405`).

## Preflight Decisions To Record

- **V2-ADR-104 (proposed): `SPAWN` is the output kind Trend/Breakout
  produces.** Rationale: a trend breakout reads naturally as an enemy rush;
  `WORLD_EVENT`/`LOOT_EVENT` fit the other two families better.
- **V2-ADR-105 (proposed): `EncounterOutput.ts` is defined by this task as
  a union starting with only `SpawnEncounterOutput`; `WORLD_EVENT`/
  `LOOT_EVENT`/`HYBRID` variants are added by the families that need them.**
  Rationale: inventing their field shapes now, before `V2-205`/`V2-206`
  exist, would be guessing content ahead of the tasks that own it.
- **V2-ADR-106 (proposed): `TREND_BREAKOUT_ENTRY_THRESHOLD` is the
  mathematical midpoint (`0.5`) of `trendStrength`'s proven `[0, 1]`
  range.** Rationale: `trendStrength = |rsi - 50| / 50` and `rsi` is
  validated to `[0, 100]`, so `trendStrength`'s bound is provable, not
  assumed — the midpoint is the same "derived, not felt" anchor pattern
  used throughout this project when no other constraint applies.
- **V2-ADR-107 (proposed): `TREND_BREAKOUT_HYSTERESIS` is half of
  `TREND_BREAKOUT_ENTRY_THRESHOLD`.** Rationale: derives the rearm
  threshold from the same proven range rather than an independent
  invented margin.
- **V2-ADR-108 (proposed): `TREND_BREAKOUT_CONFIRMATION_TICKS`/
  `TREND_BREAKOUT_COOLDOWN_TICKS` are derived from `SIMULATION_HZ`
  (1 and 10 real seconds respectively).** Rationale: matches every other
  tick-count constant in this codebase being expressed as a real-time
  duration through `SIMULATION_HZ`, not a bare tick count chosen by feel.
- **V2-ADR-109 (proposed): `TREND_BREAKOUT_SPAWN_BUDGET` is
  `MVP0_ENEMY_SPAWN_BUDGET` times a stated multiplier (`4`), and the
  multiplier itself (like `TREND_BREAKOUT_COOLDOWN_TICKS`'s `10`) is
  chosen with stated reasoning rather than derived by pure arithmetic.**
  Rationale: mirrors `V2-108`'s own archetype-multiplier precedent; final
  tuning is `V2-405`'s explicit job, not this task's.

## Files

- New: `game-v2/contracts/EncounterOutput.ts`,
  `game-v2/config/TrendBreakoutFamily.ts`,
  `game-v2/market/TrendBreakoutEncounter.ts`,
  `tests/game-v2/contracts/EncounterOutput.test.ts`,
  `tests/game-v2/config/TrendBreakoutFamily.test.ts`,
  `tests/game-v2/market/TrendBreakoutEncounter.test.ts`
- Modify: none outside `game-v2/**`/`tests/game-v2/**`.

## Steps

- [ ] **Step 1: `EncounterOutput` contract (RED then implement)**

  Prove: valid `SpawnEncounterOutput` validates and freezes; each invalid
  field is independently rejected.

- [ ] **Step 2: `TrendBreakoutFamily` constants and profile (RED then
  implement)**

  Prove every derivation formula above by exact equality; prove
  `TREND_BREAKOUT_PROFILE` itself passes `assertIndicatorEventProfile`.

- [ ] **Step 3: `TrendBreakoutEncounter` (RED then implement)**

  Prove: a real `MarketSnapshot` sequence (trendStrength climbing past
  `0.5`, held for `TREND_BREAKOUT_CONFIRMATION_TICKS`, direction `'UP'`)
  produces exactly one `SpawnEncounterOutput` on the activation tick,
  themed `bullish-breakout`, budget `TREND_BREAKOUT_SPAWN_BUDGET`; the
  mirrored `'DOWN'` sequence produces `bearish-breakout`; every other tick
  (armed, confirming, cooldown) returns `null`; a forged `'NEUTRAL'`-
  direction activation is rejected.

- [ ] **Step 4: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 5: Mutation pass**

  At minimum: the output produced on a non-activation tick; the theme
  mapping reversed (`'UP'` producing `bearish-breakout`); the spawn budget
  constant reverted to a raw `MVP0_ENEMY_SPAWN_BUDGET` (multiplier
  dropped); the `'NEUTRAL'` rejection guard removed.

## Acceptance Criteria

1. `EncounterOutput`/`SpawnEncounterOutput` validate and freeze correctly.
2. `TREND_BREAKOUT_PROFILE` and every derived constant are pinned by
   exact-equality tests tracing to a real existing value.
3. `TrendBreakoutEncounter` produces exactly one themed, bounded
   `SpawnEncounterOutput` per activation, `null` otherwise.
4. Nothing outside `game-v2/contracts/**`/`game-v2/config/**`/
   `game-v2/market/**` is touched; no wiring into any runtime or system.
5. Every Step 4 gate passes and the Step 5 mutation pass leaves no
   survivor.
