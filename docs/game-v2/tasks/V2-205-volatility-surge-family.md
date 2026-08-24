# V2-205 — Volatility Surge Family (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-203` (indicator-event state machine, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs), §7.4 (Indicator-event lifecycle)
> Governing decisions: V2-ADR-110 through V2-ADR-115 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Same shape as `V2-204`: this task authors one family's real
`IndicatorEventProfile` plus the typed output it produces on activation,
mirroring `V2-108`'s enemy archetypes existing before `EnemyComposer` wired
them into a live spawn cadence. `WORLD_EVENT` is the output kind (design
line 185: "Produce a telegraphed arena, hazard, or environment event") — a
volatility surge reads naturally as an arena hazard, not an enemy rush
(`V2-204`'s `SPAWN`) or a loot opportunity (`V2-206`'s likely fit).
`EncounterOutput` (defined by `V2-204`) gains its second variant,
`WorldEventEncounterOutput`.

The entry threshold is anchored to a real, already-calibrated value rather
than a derived midpoint or an invented number — a stronger anchor than
`V2-204` had available. `railway-market-aggregator/src/indicators/ATRCalculator.ts`'s
`getSpawnRateMultiplier` already classifies `atrPercent` into four real
tiers: Calm (`< 0.005`), Normal (`< 0.015`), Volatile (`< 0.03`), Chaos
(`>= 0.03`). Design §7.1/`V2-ADR-085` exclude reusing the legacy
*gameplay-multiplier output* (`getSpawnRateMultiplier`'s return value,
already deliberately excluded from `MarketSnapshot`), not the underlying
*indicator classification boundaries* — those are the same class of fact
`V2-200` already carries through as `rsiState`
(`OVERSOLD`/`NEUTRAL`/`OVERBOUGHT`, itself computed from real RSI
threshold boundaries). Reusing the `0.03` Chaos boundary as the entry
threshold is reusing a real, already-tuned indicator fact, not a legacy
multiplier.

## Done When

1. `game-v2/contracts/EncounterOutput.ts` gains `WorldEventEncounterOutput`
   (`kind: 'WORLD_EVENT'`, `hazardId`, `telegraphTicks`) with a validator;
   `EncounterOutput` becomes `SpawnEncounterOutput | WorldEventEncounterOutput`.
2. A real, authored `IndicatorEventProfile` for Volatility Surge exists,
   sampling `MarketSnapshot.atrPercent`, anchored to the real ATR Chaos
   boundary.
3. `VolatilitySurgeEncounter` steps the profile against a real
   `MarketSnapshot` and produces a bounded `WorldEventEncounterOutput`
   exactly on the activation tick — never more than one per activation, and
   no output while `ARMED`/`CONFIRMING`/`COOLDOWN`.
4. Every authored numeric constant is derived from a real existing value
   (the ATR tier boundaries or `SIMULATION_HZ`) and pinned by an
   exact-equality test.
5. Not wired into `GameV2Runtime` or any hazard/world-event system —
   matches `V2-203`/`V2-204`'s own precedent.

## Design: the derivations

```
VOLATILITY_SURGE_ENTRY_THRESHOLD = 0.03   (ATRCalculator's own "Chaos" boundary)
VOLATILITY_SURGE_EXIT_THRESHOLD  = 0.03   (same value; V2-204's own worked-example precedent)
VOLATILITY_SURGE_HYSTERESIS      = 0.015  (ATRCalculator's own "Normal"/"Volatile" boundary)
  -> rearm threshold = exitThreshold - hysteresis = 0.015
     (atrPercent must recover to at most the real "Normal" volatility
     band before a new surge can be flagged — a stronger, more literal
     anchor than V2-204's "half the entry threshold" heuristic, since
     0.015 is itself a real ATRCalculator tier boundary, not a derived
     fraction)
VOLATILITY_SURGE_CONFIRMATION_TICKS = SIMULATION_HZ = 60    (1 real second sustained)
VOLATILITY_SURGE_COOLDOWN_TICKS     = 10 * SIMULATION_HZ = 600  (10 real seconds, matching V2-204's own reasoning)
VOLATILITY_SURGE_TELEGRAPH_TICKS    = 2 * SIMULATION_HZ = 120   (2 real seconds — no existing hazard/telegraph
                                                                   constant exists yet to anchor to; chosen with
                                                                   stated reasoning like V2-204's spawn-budget
                                                                   multiplier, matching design §6.4's own
                                                                   "telegraph before active threat" boss-rhythm
                                                                   language even though this is not a boss)
```

`atrPercent` has no proven upper bound the way `trendStrength` did (it is
`(atr / close) * 100`, non-negative, but with no ceiling derivable from any
validator), so the entry threshold anchor here is the real *tier boundary*
rather than a range midpoint — a different, arguably stronger derivation
strategy than `V2-204`'s, recorded as its own decision rather than forcing
`V2-204`'s exact method onto data that does not support it the same way.

## Scope

In scope:

1. `game-v2/contracts/EncounterOutput.ts` (modified): adds
   `WorldEventEncounterOutput` and `assertWorldEventEncounterOutput`;
   `EncounterOutput` becomes the two-member union.
2. `game-v2/config/VolatilitySurgeFamily.ts`: the derived constants above
   and the authored `VOLATILITY_SURGE_PROFILE: IndicatorEventProfile`.
3. `game-v2/market/VolatilitySurgeEncounter.ts`: `VolatilitySurgeEncounter`
   wrapping one `IndicatorEventStateMachine` —
   `step(snapshot: MarketSnapshot, tick: number): WorldEventEncounterOutput | null`,
   `reset()`.
4. Tests: `EncounterOutput.ts`'s new variant validation; `VolatilitySurgeFamily.ts`
   constant derivation (exact-equality, tracing to the real ATR tier
   boundaries); `VolatilitySurgeEncounter.test.ts` — a real sequence of
   synthetic `MarketSnapshot`s driving an activation, proving the output is
   produced exactly on the activation tick, bounded, `null` on every other
   tick, and the anti-spam cooldown property re-verified through the real
   wrapper (mirrors `V2-204`'s own test shape).

Out of scope:

- `LOOT_EVENT`/`HYBRID` shapes (`V2-206`'s own family adds its variant
  when it needs one).
- The primary/support composer (`V2-207`) and any real hazard-system
  consumption of the output (`V2-209`).
- Wiring into `GameV2Runtime`, `MarketSnapshotAdapter`, or any other
  `game-v2/systems/**`/`game-v2/runtime/**` consumer.
- Final balance tuning of the authored constants (`V2-405`).

## Preflight Decisions To Record

- **V2-ADR-110 (proposed): `WORLD_EVENT` is the output kind Volatility
  Surge produces.** Rationale: a volatility surge reads naturally as an
  arena hazard (design line 185), not an enemy rush or a loot opportunity.
- **V2-ADR-111 (proposed): `VOLATILITY_SURGE_ENTRY_THRESHOLD` reuses
  `ATRCalculator`'s real, already-calibrated `0.03` "Chaos" tier boundary,
  not a derived range midpoint.** Rationale: `atrPercent` has no proven
  upper bound the way `trendStrength` did, so `V2-204`'s midpoint strategy
  does not apply; reusing the real tier boundary is reusing an
  already-tuned indicator classification fact (the same class of value
  `rsiState` already carries through from `V2-200`), not the excluded
  legacy gameplay-multiplier *output* `V2-ADR-085` excludes.
- **V2-ADR-112 (proposed): `VOLATILITY_SURGE_HYSTERESIS` reuses
  `ATRCalculator`'s real `0.015` "Normal"/"Volatile" tier boundary as the
  rearm threshold, rather than a derived fraction of the entry
  threshold.** Rationale: a second real anchor point exists in the same
  already-calibrated tier table; using it is more literal than inventing
  a fractional margin.
- **V2-ADR-113 (proposed): `VOLATILITY_SURGE_CONFIRMATION_TICKS`/
  `VOLATILITY_SURGE_COOLDOWN_TICKS` reuse `V2-204`'s own derived durations
  (1 and 10 real seconds via `SIMULATION_HZ`).** Rationale: no
  family-specific reason exists to differ; consistency across families
  keeps the "why this number" story simple until `V2-405` tunes per-family
  balance.
- **V2-ADR-114 (proposed): `VOLATILITY_SURGE_TELEGRAPH_TICKS` (2 real
  seconds via `SIMULATION_HZ`) is chosen with stated reasoning, not
  derived from an existing constant.** Rationale: no hazard/telegraph
  system or constant exists yet to anchor to; matches `V2-204`'s own
  precedent for its spawn-budget multiplier — a first-pass authored value,
  `V2-405`'s job to tune for real play.
- **V2-ADR-115 (proposed): `WorldEventEncounterOutput` carries `hazardId`
  and `telegraphTicks` only — no hazard-effect payload (no arena-region
  shape, no damage/DoT numbers).** Rationale: no hazard system exists to
  consume those fields yet (`V2-209`); inventing their shape now would
  repeat `V2-204`'s own reasoning for leaving `WORLD_EVENT`/`LOOT_EVENT`
  unauthored until needed, applied one level deeper to this variant's own
  optional richness.

## Files

- New: `game-v2/config/VolatilitySurgeFamily.ts`,
  `game-v2/market/VolatilitySurgeEncounter.ts`,
  `tests/game-v2/config/VolatilitySurgeFamily.test.ts`,
  `tests/game-v2/market/VolatilitySurgeEncounter.test.ts`
- Modify: `game-v2/contracts/EncounterOutput.ts`,
  `tests/game-v2/contracts/EncounterOutput.test.ts`

## Steps

- [ ] **Step 1: `WorldEventEncounterOutput` (RED then implement)**

  Extend `EncounterOutput.ts`. Prove: valid `WorldEventEncounterOutput`
  validates and freezes; each invalid field is independently rejected;
  existing `SpawnEncounterOutput` tests are unaffected.

- [ ] **Step 2: `VolatilitySurgeFamily` constants and profile (RED then
  implement)**

  Prove every derivation formula above by exact equality, tracing the two
  ATR-anchored constants to the real `ATRCalculator` values; prove
  `VOLATILITY_SURGE_PROFILE` passes `assertIndicatorEventProfile`.

- [ ] **Step 3: `VolatilitySurgeEncounter` (RED then implement)**

  Prove: a real `MarketSnapshot` sequence (`atrPercent` climbing past
  `0.03`, held for `VOLATILITY_SURGE_CONFIRMATION_TICKS`) produces exactly
  one `WorldEventEncounterOutput` on the activation tick; every other tick
  (armed, confirming, cooldown) returns `null`; the anti-spam property
  (a second surge cannot spam a second activation before rearming) holds
  through the real wrapper.

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

  At minimum: the output produced on a non-activation tick; the entry
  threshold reverted to a felt value instead of the real ATR boundary; the
  telegraphTicks constant dropped to a raw tick count instead of the
  derived real-second duration; the cooldown anti-spam property broken.

## Acceptance Criteria

1. `WorldEventEncounterOutput` validates and freezes correctly; existing
   `SpawnEncounterOutput` behavior is unaffected.
2. `VOLATILITY_SURGE_PROFILE` and every derived constant are pinned by
   exact-equality tests tracing to a real existing value.
3. `VolatilitySurgeEncounter` produces exactly one bounded
   `WorldEventEncounterOutput` per activation, `null` otherwise, including
   through `COOLDOWN`'s anti-spam property.
4. Nothing outside `game-v2/contracts/**`/`game-v2/config/**`/
   `game-v2/market/**` is touched; no wiring into any runtime or system.
5. Every Step 4 gate passes and the Step 5 mutation pass leaves no
   survivor.
