# V2-206 — Volume/Whale Family (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-203` (indicator-event state machine, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs), §7.4 (Indicator-event lifecycle)
> Governing decisions: V2-ADR-116 through V2-ADR-121 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Same shape as `V2-204`/`V2-205`: one family's real `IndicatorEventProfile`
plus the typed output it produces on activation. `LOOT_EVENT` is the
output kind (design line 186: "Produce a lootbox or opportunity event") —
a whale trade reads naturally as a loot opportunity, completing the
three-way `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT` mapping this milestone's three
families were always heading toward. `EncounterOutput` gains its third
variant, `LootEventEncounterOutput`; only `HYBRID` remains unauthored
(design line 187 — it combines the other three under one budget and has no
owning task yet).

This family's real anchor is stronger than either prior family's: unlike
`trendStrength`/`atrPercent`, which needed a threshold picked against a
continuous value, `MarketSnapshot.whaleTier` is *already* the server's own
discrete classification (`0..3`), computed by
`railway-market-aggregator/src/indicators/VolumeAnalyzer.ts` from real
z-score cutoffs (`BABY_WHALE >= 1.5σ`, `WHALE >= 2.0σ`,
`MEGA_WHALE >= 2.5σ`). `V2-203`'s mechanism works on any `number` sample,
so `whaleTier` itself is sampled directly — no derived threshold on a
continuous range is needed at all.

Whale events are also thematically different from a sustained trend or an
elevated ATR reading: they are momentary statistical spikes, not something
that needs to hold steady before it counts. `VolumeAnalyzer`'s own
real-world cooldown (`whaleCooldownMs = 30000`, a genuine existing
constant, not derived from anything else) confirms this — the legacy
system's own anti-spam mechanism is a flat cooldown after one spike, not a
sustained-holding confirmation window. `V2-206`'s `confirmationTicks` is
therefore `0` (instant activation), a deliberate, reasoned departure from
`V2-204`/`V2-205`'s `SIMULATION_HZ`-tick confirmation window, not a copy of
it.

## Done When

1. `game-v2/contracts/EncounterOutput.ts` gains `LootEventEncounterOutput`
   (`kind: 'LOOT_EVENT'`, `lootTierId`, `lootValue`) with a validator;
   `EncounterOutput` becomes the three-member union.
2. A real, authored `IndicatorEventProfile` for Volume/Whale exists,
   sampling `MarketSnapshot.whaleTier` directly (no continuous-threshold
   derivation needed), with `confirmationTicks: 0` and a cooldown reusing
   the real `VolumeAnalyzer.whaleCooldownMs` constant.
3. `VolumeWhaleEncounter` steps the profile against a real `MarketSnapshot`
   and produces a bounded `LootEventEncounterOutput`, themed and valued by
   the triggering `whaleTier`, exactly on the activation tick — never more
   than one per activation, and no output while `ARMED`/`COOLDOWN`.
4. Every authored numeric constant is derived from a real existing value
   and pinned by an exact-equality test.
5. Not wired into `GameV2Runtime` or any loot/economy system — matches
   `V2-203`/`V2-204`/`V2-205`'s own precedent.

## Design: the derivations

```
VOLUME_WHALE_ENTRY_THRESHOLD  = 1   (direction 'above': whaleTier > 1, i.e. WHALE or MEGA_WHALE —
                                      the real ~1-per-10-min WHALE cadence VolumeAnalyzer documents,
                                      not the more frequent BABY_WHALE tier)
VOLUME_WHALE_EXIT_THRESHOLD   = 1   (same value; V2-204's own worked-example precedent)
VOLUME_WHALE_HYSTERESIS       = 1   (the domain's own integer step size: whaleTier must fully
                                      return to 0/NONE, not merely below the WHALE tier, before
                                      rearming)
  -> rearm threshold = exitThreshold - hysteresis = 0
VOLUME_WHALE_CONFIRMATION_TICKS = 0                              (instant: a whale spike is
                                                                    itself the signal, not a
                                                                    sustained pattern to confirm —
                                                                    see Scope Decision above)
VOLUME_WHALE_COOLDOWN_TICKS     = round(30_000 / 1000 * SIMULATION_HZ) = 1800
                                  (VolumeAnalyzer's own real whaleCooldownMs = 30000, converted
                                   to ticks — not an invented duration)
```

`lootValue` is the triggering `whaleTier` itself (`2` or `3` at
activation, since `1` cannot satisfy `entryThreshold`), a real pass-through
rather than an invented number. `lootTierId` maps `2 -> 'whale-loot'`,
`3 -> 'mega-whale-loot'`; any other tier at activation is rejected
defensively (a real invariant — `whaleTier` cannot be `0` or `1` when
`entryThreshold = 1` under `'above'` — guarded rather than assumed,
mirroring `V2-204`'s `'NEUTRAL'`-direction guard).

## Scope

In scope:

1. `game-v2/contracts/EncounterOutput.ts` (modified): adds
   `LootEventEncounterOutput` and `assertLootEventEncounterOutput`;
   `EncounterOutput` becomes the three-member union.
2. `game-v2/config/VolumeWhaleFamily.ts`: the derived constants above and
   the authored `VOLUME_WHALE_PROFILE: IndicatorEventProfile`.
3. `game-v2/market/VolumeWhaleEncounter.ts`: `VolumeWhaleEncounter`
   wrapping one `IndicatorEventStateMachine` —
   `step(snapshot: MarketSnapshot, tick: number): LootEventEncounterOutput | null`,
   `reset()`.
4. Tests: `EncounterOutput.ts`'s new variant validation;
   `VolumeWhaleFamily.ts` constant derivation (exact-equality, tracing to
   `VolumeAnalyzer`'s real z-score tiers and cooldown); `VolumeWhaleEncounter.test.ts`
   — a real sequence of synthetic `MarketSnapshot`s proving instant
   activation on a single qualifying tick (no confirmation delay, unlike
   `V2-204`/`V2-205`), themed and valued correctly for both `WHALE` and
   `MEGA_WHALE`, `null` on every other tick, the anti-spam cooldown
   property, and the defensive tier guard.

Out of scope:

- `HYBRID` (design line 187 — combines the other three under one budget;
  no owning task exists yet).
- The primary/support composer (`V2-207`) and any real loot/economy-system
  consumption of the output (no task ID yet — the master plan names
  `V2-208`/`V2-209` for `SPAWN`/`WORLD_EVENT` but no equivalent `LOOT_EVENT`
  consumption task; flagged as a real gap in `PROGRESS.md`, not silently
  assumed to exist).
- Wiring into `GameV2Runtime`, `MarketSnapshotAdapter`, or any other
  `game-v2/systems/**`/`game-v2/runtime/**` consumer.
- Final balance tuning of the authored constants (`V2-405`).

## Preflight Decisions To Record

- **V2-ADR-116 (proposed): `LOOT_EVENT` is the output kind Volume/Whale
  produces.** Rationale: a whale trade reads naturally as a loot
  opportunity (design line 186); completes the milestone's
  `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT` mapping across the three families.
- **V2-ADR-117 (proposed): `VolumeWhaleEncounter` samples
  `MarketSnapshot.whaleTier` directly — a discrete, already-classified
  server value — rather than deriving a threshold on a continuous field
  (`normalizedVolume`/`volumePercentile`).** Rationale: `whaleTier` is
  already computed from real z-score cutoffs by `VolumeAnalyzer`; using it
  directly is the most literal possible reuse of an already-tuned
  classification, stronger than `V2-204`/`V2-205`'s own threshold-on-a-
  continuous-value derivations.
- **V2-ADR-118 (proposed): `VOLUME_WHALE_ENTRY_THRESHOLD = 1` (direction
  `'above'`), so activation requires `WHALE` or `MEGA_WHALE`, not
  `BABY_WHALE`.** Rationale: `VolumeAnalyzer`'s own documentation gives
  `WHALE`'s real-world cadence as ~once per 10 minutes, a reasonable pace
  for a loot opportunity inside this vertical slice's 5-10 minute session
  target; `BABY_WHALE` (~2-3 per 10 min) would fire too often for a bounded
  encounter output.
- **V2-ADR-119 (proposed): `VOLUME_WHALE_CONFIRMATION_TICKS = 0`,
  a deliberate departure from `V2-204`/`V2-205`'s `SIMULATION_HZ`-tick
  confirmation window.** Rationale: a whale spike is itself the signal, not
  a sustained pattern — `VolumeAnalyzer`'s own anti-spam mechanism
  (`whaleCooldownMs`) is a flat cooldown after one spike, not a
  confirmation-holding window, confirming this family's nature differs
  from the other two.
- **V2-ADR-120 (proposed): `VOLUME_WHALE_COOLDOWN_TICKS` is derived from
  `VolumeAnalyzer`'s own real `whaleCooldownMs = 30000` constant, converted
  to ticks, not chosen independently like `V2-204`/`V2-205`'s 10-second
  cooldowns.** Rationale: a real, already-established anti-spam duration
  exists for this exact family; reusing it is stronger than picking a new
  value with only narrative justification.
- **V2-ADR-121 (proposed): `lootValue` is the triggering `whaleTier`
  itself, a real pass-through value, not an invented loot-value number.**
  Rationale: no loot/economy system exists yet to price a lootbox
  (`V2-306`+, MVP-3); passing through the real observed tier avoids
  inventing a number nothing can yet validate against, matching
  `V2-204`/`V2-205`'s own "derived, not felt" bar.

## Files

- New: `game-v2/config/VolumeWhaleFamily.ts`,
  `game-v2/market/VolumeWhaleEncounter.ts`,
  `tests/game-v2/config/VolumeWhaleFamily.test.ts`,
  `tests/game-v2/market/VolumeWhaleEncounter.test.ts`
- Modify: `game-v2/contracts/EncounterOutput.ts`,
  `tests/game-v2/contracts/EncounterOutput.test.ts`

## Steps

- [ ] **Step 1: `LootEventEncounterOutput` (RED then implement)**

  Extend `EncounterOutput.ts`. Prove: valid `LootEventEncounterOutput`
  validates and freezes; each invalid field is independently rejected;
  existing `SpawnEncounterOutput`/`WorldEventEncounterOutput` tests are
  unaffected.

- [ ] **Step 2: `VolumeWhaleFamily` constants and profile (RED then
  implement)**

  Prove every derivation formula above by exact equality, including the
  `whaleCooldownMs -> ticks` conversion; prove `VOLUME_WHALE_PROFILE`
  passes `assertIndicatorEventProfile` with `confirmationTicks: 0`.

- [ ] **Step 3: `VolumeWhaleEncounter` (RED then implement)**

  Prove: a single qualifying `MarketSnapshot` (`whaleTier: 2` or `3`)
  produces an output on the very same tick, no confirmation delay; themed
  and valued correctly for both tiers; `null` on every non-qualifying
  tick; the anti-spam cooldown property; a forged `whaleTier` outside
  `{2, 3}` at a synthetic activation is rejected.

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
  mapping between `WHALE`/`MEGA_WHALE` reversed; `lootValue` decoupled from
  the real `whaleTier` (hardcoded instead); the cooldown-ticks conversion
  reverted to an unrelated value; the tier-guard removed.

## Acceptance Criteria

1. `LootEventEncounterOutput` validates and freezes correctly; existing
   variants are unaffected.
2. `VOLUME_WHALE_PROFILE` and every derived constant are pinned by
   exact-equality tests tracing to a real existing value
   (`VolumeAnalyzer`'s z-score tiers or `whaleCooldownMs`).
3. `VolumeWhaleEncounter` activates instantly on a single qualifying tick
   (no confirmation delay) and produces exactly one themed, valued output
   per activation, `null` otherwise, including through the cooldown's
   anti-spam property.
4. Nothing outside `game-v2/contracts/**`/`game-v2/config/**`/
   `game-v2/market/**` is touched; no wiring into any runtime or system.
5. Every Step 4 gate passes and the Step 5 mutation pass leaves no
   survivor.
