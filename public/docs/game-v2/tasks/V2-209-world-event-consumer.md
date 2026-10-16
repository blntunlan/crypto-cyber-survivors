# V2-209 — World-Event Consumer (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-207` (primary/support composer, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs: `WORLD_EVENT` — "Produce a telegraphed arena, hazard, or environment event.")
> Master plan "Done when": "Telegraph and lifecycle are simulation-time controlled."
> Governing decisions: V2-ADR-132 through V2-ADR-136 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The "Done when" property is about *when* transitions happen, not what a
hazard visually or mechanically does once active: a hazard's telegraph
countdown and its subsequent phase transitions must be driven by
simulation ticks, never wall-clock/`setTimeout` (`CLAUDE.md`'s
pause-aware-timing rule, `V2-ADR-103`'s own precedent for this market
domain). This task builds that lifecycle mechanism and proves it — not a
hazard's real gameplay effect (damage, arena-region shape), which
`V2-ADR-115` already deferred pending a real consumer, and which stays
deferred here too: no ECS `World` component, no `EnemySystem`-style damage
application, no renderer work is added.

`WorldEventEncounterOutput` (`hazardId`, `telegraphTicks`) carries no
active-duration field. Inventing one arbitrarily would be an unanchored
"felt" number this project's convention avoids wherever a real anchor
exists. Here one does: `Volatility Surge`'s own `VOLATILITY_SURGE_COOLDOWN_TICKS`
(`V2-205`) is the earliest tick a second real activation could possibly
arm. Setting `activeTicks = cooldownTicks - telegraphTicks` makes the
hazard's telegraph + active lifespan exactly span the cooldown window, so
the hazard always clears at or before the next possible activation — a
provable, zero-gap non-overlap guarantee derived from two already-real
constants (V2-ADR-134), not an independently chosen duration, and
stronger than `V2-108`/`V2-204`/`V2-205`'s own "chosen with stated
reasoning, `V2-405` tunes later" fallback (used only where no such link
exists).

Given that structural non-overlap guarantee, a second real activation
while one hazard is in flight is already believed unreachable through the
real pipeline — but `HazardLifecycle.activate()` still throws
defensively if called while not `IDLE`, mirroring
`IndicatorEventStateMachine.reset()`'s and `TrendBreakoutEncounter`'s own
"kept defensively though currently unreachable" precedent, verified by
mutation rather than assumed.

Two-tier mechanism/content split, mirroring `V2-203`/`V2-204`+ and
`V2-208`'s own `EnemyComposer`/`SpawnEncounterConsumer` split:
`HazardLifecycle` is the generic mechanism (no family-specific constant
hardcoded — `activeTicks` is an explicit `activate()` parameter);
`WorldEventEncounterConsumer` is the real-content wrapper (resolves
`activeTicks` per known real `hazardId`, throws on an unrecognized one,
mirroring `SpawnEncounterConsumer`'s `themeId` validation).

Not wired into `GameV2Runtime` — matches `V2-203` through `V2-208`'s own
precedent.

## Done When

1. `game-v2/market/HazardLifecycle.ts`: a generic `IDLE → TELEGRAPHING →
   ACTIVE → IDLE` state machine, driven only by explicit `tick` arguments
   passed to `activate`/`step` — never wall-clock/`setTimeout`. Given a
   `WorldEventEncounterOutput` and an explicit `activeTicks`, transitions
   to `ACTIVE` exactly `telegraphTicks` ticks after `activate`, and back
   to `IDLE` exactly `activeTicks` ticks after that.
2. `game-v2/market/WorldEventEncounterConsumer.ts`: resolves the real
   `activeTicks` for a real `hazardId` (`volatility-tremor` →
   `VOLATILITY_SURGE_ACTIVE_TICKS`) and delegates to an injected
   `HazardLifecycle`. An unrecognized `hazardId` throws.
3. `VOLATILITY_SURGE_ACTIVE_TICKS` is derived, not felt:
   `VOLATILITY_SURGE_COOLDOWN_TICKS - VOLATILITY_SURGE_TELEGRAPH_TICKS`,
   pinned by an exact-equality test proving the zero-gap identity.
4. Not wired into `GameV2Runtime`; no ECS hazard entity/component is
   added.

## Scope

In scope:

1. `game-v2/config/VolatilitySurgeFamily.ts`: add and export
   `VOLATILITY_SURGE_ACTIVE_TICKS`.
2. `game-v2/market/VolatilitySurgeEncounter.ts`: export the existing
   local `HAZARD_ID` constant as `VOLATILITY_SURGE_HAZARD_ID` — no
   behavior change.
3. `game-v2/market/HazardLifecycle.ts`: `HazardLifecyclePhase`,
   `HazardLifecycleStepResult`, and the `HazardLifecycle` class
   (`activate(output, activeTicks, tick)`, `step(tick)`, `reset()`,
   `currentPhase` getter).
4. `game-v2/market/WorldEventEncounterConsumer.ts`: `WorldEventEncounterConsumer`
   class wrapping an injected `HazardLifecycle` and an injected
   `hazardId → activeTicks` map (defaulting to the one real mapping).
5. Tests: `tests/game-v2/market/HazardLifecycle.test.ts` (synthetic
   fixtures proving the generic mechanism's every transition, guard, and
   reset property); `tests/game-v2/market/WorldEventEncounterConsumer.test.ts`
   (real `volatility-tremor` output driven to both real boundary ticks,
   unrecognized-`hazardId` rejection, injected-dependency delegation);
   `tests/game-v2/config/VolatilitySurgeFamily.test.ts` gains a pinned
   exact-equality test for the new constant and its zero-gap identity.

Out of scope:

- Any hazard gameplay effect (damage, arena-region shape, telegraph
  visuals) — no ECS component or renderer work.
- Wiring `WorldEventEncounterConsumer`/`HazardLifecycle` into
  `GameV2Runtime`.
- `SPAWN`/`LOOT_EVENT` consumption (`V2-208`, done; `V2-210`, separate).

## Preflight Decisions To Record

- **V2-ADR-132 (proposed): `HazardLifecycle` is tick-driven only — never
  wall-clock/`setTimeout` — and takes `activeTicks` as an explicit
  `activate()` parameter rather than hardcoding one family's value.**
  Rationale: the literal proof of "lifecycle is simulation-time
  controlled"; mirrors `IndicatorEventStateMachine`'s own profile-driven,
  no-hardcoded-family-content design (`V2-203`).
- **V2-ADR-133 (proposed): `activate()` throws if called while a hazard
  is already in flight (not `IDLE`).** Rationale: defensive — `V2-207`'s
  composer already selects at most one primary per tick, and a real
  family's cooldown structurally prevents overlap (V2-ADR-134), but the
  guard is kept anyway, mirroring `IndicatorEventStateMachine.reset()`'s
  own "kept defensively though currently unreachable" precedent.
- **V2-ADR-134 (proposed): `VOLATILITY_SURGE_ACTIVE_TICKS =
  VOLATILITY_SURGE_COOLDOWN_TICKS - VOLATILITY_SURGE_TELEGRAPH_TICKS`.**
  Rationale: makes the hazard's telegraph + active lifespan exactly span
  the state machine's own cooldown window, so the earliest tick a second
  real activation could arm coincides with the exact tick this hazard's
  active phase ends — a provable, zero-gap non-overlap guarantee derived
  from two already-real constants, not an independently chosen duration.
- **V2-ADR-135 (proposed): `WorldEventEncounterConsumer` throws on an
  unrecognized `hazardId`.** Rationale: matches `SpawnEncounterConsumer`'s
  `themeId` validation (V2-ADR-129) and every `assertX` validator's
  fail-loud convention in this project.
- **V2-ADR-136 (proposed): `WorldEventEncounterConsumer`/`HazardLifecycle`
  are not wired into `GameV2Runtime`; no ECS hazard component or
  gameplay effect is added.** Rationale: matches `V2-203` through
  `V2-208`'s own precedent; a hazard's real gameplay effect has no
  anchored content yet (`V2-ADR-115`'s own deferral), and inventing one
  here would be scope creep beyond the "Done when" property.

## Files

- New: `game-v2/market/HazardLifecycle.ts`,
  `game-v2/market/WorldEventEncounterConsumer.ts`,
  `tests/game-v2/market/HazardLifecycle.test.ts`,
  `tests/game-v2/market/WorldEventEncounterConsumer.test.ts`
- Modify: `game-v2/config/VolatilitySurgeFamily.ts` (new derived
  constant), `game-v2/market/VolatilitySurgeEncounter.ts` (export
  rename, no logic change),
  `tests/game-v2/config/VolatilitySurgeFamily.test.ts` (new pinned test).

## Steps

- [ ] **Step 1: Derive and export `VOLATILITY_SURGE_ACTIVE_TICKS`; export `VOLATILITY_SURGE_HAZARD_ID`**

  Pin the zero-gap identity with an exact-equality test. Re-run
  `VolatilitySurgeEncounter.test.ts` unmodified to confirm no behavior
  change from the export rename.

- [ ] **Step 2: `HazardLifecycle` (RED then implement)**

  Prove with synthetic `WorldEventEncounterOutput` fixtures: starts
  `IDLE`; `TELEGRAPHING → ACTIVE` lands exactly `telegraphTicks` ticks
  after `activate`; `ACTIVE → IDLE` lands exactly `activeTicks` ticks
  after that; `activate()` while not `IDLE` throws; a non-positive or
  non-integer `activeTicks` throws; a non-increasing tick between
  `activate()`/`step()` calls throws; `reset()` returns to a fresh `IDLE`
  state and allows a new cycle restarting ticks from any value.

- [ ] **Step 3: `WorldEventEncounterConsumer` (RED then implement)**

  Prove with the real `volatility-tremor` output driven to both real
  derived boundary ticks (telegraph and telegraph+active); an
  unrecognized `hazardId` throws; an injected mock `HazardLifecycle`
  receives the exact `(output, activeTicks, tick)` call via a spy; an
  injected custom `hazardId → activeTicks` map is honoured over the
  default; `reset()` delegates to the injected lifecycle.

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

  At minimum: removing the in-flight guard in `activate()`; an
  off-by-one on either phase boundary (`>` vs `>=`); failing to clear
  `hazardId` on expiry; removing the `activeTicks` validation; the
  constructor ignoring its injected `activeTicksByHazardId` argument;
  reversing the `VOLATILITY_SURGE_ACTIVE_TICKS` subtraction.

## Acceptance Criteria

1. `HazardLifecycle` transitions phases exactly on the derived tick
   boundaries, driven only by explicit tick arguments.
2. `WorldEventEncounterConsumer` resolves the real `volatility-tremor`
   hazard's `activeTicks` correctly and throws on an unrecognized
   `hazardId`.
3. `VOLATILITY_SURGE_ACTIVE_TICKS` is derived from two already-real
   constants, pinned by an exact-equality test.
4. No ECS component, gameplay effect, or `GameV2Runtime` wiring is
   added.
5. Every Step 4 gate passes and the Step 5 mutation pass leaves no
   survivor.
