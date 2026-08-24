# V2-109 — Market-Independent Convergence (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-108` (basic enemy composition, closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.3 (Convergence), design line 63 (8–12 minute first-cycle envelope)
> Governing decisions: V2-ADR-072, V2-ADR-073, V2-ADR-074, V2-ADR-075 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The design spec names three Convergence progress sources — normal combat,
elite kills, and short authored objectives — plus market-encounter bonus
progress. Only normal combat exists in `game-v2/**` today: elite variants are
`V2-301` (MVP-3), authored objectives have no task ID yet, and market
encounters are MVP-2 (`V2-200`+). No boss exists yet either (`V2-302`+,
MVP-3), so there is nothing for a "Convergence reached" signal to trigger.
Three scope questions were put to the user directly:

1. **Progress source**: kill-only (normal kills), not kill-plus-time-baseline.
   Elite/objective sources arrive with `V2-300`/`V2-301` and whatever task
   authors objectives.
2. **Threshold action**: emit a signal/flag only — `convergenceReached`
   becomes readable and a step-result edge fires once — with no run-state
   transition. The (not-yet-existing) boss consumes this signal later.
3. **Envelope enforcement**: both the minimum-time floor (blocks a premature
   signal) and the maximum-time ceiling (guarantees the signal eventually
   fires) are enforced by this task, not deferred.

This brief is scoped to exactly those three answers.

## Done When

Active combat reaches the boss threshold envelope without market input —
matching the master plan's stated Done-When. Concretely: a kill-driven
Convergence meter exists, cannot signal "reached" before the minimum-time
floor, and always signals "reached" by the maximum-time ceiling under
continued play, all without reading any market/indicator state.

## Design: the envelope derivation

The design spec (line 63) states the first boss cycle targets 8–12 minutes.
That ratio (12/8 = 1.5) is not chosen freely — it already equals the existing
Tier 1 / Tier 2 starter-weapon kill-period ratio pinned by `Mvp0Config.ts`
(`WEAPON_COOLDOWN_TICKS * ceil(ENEMY_HEALTH / PROJECTILE_DAMAGE) = 90` ticks
vs. `WEAPON_COOLDOWN_TICKS * ceil(ENEMY_HEALTH / STARTER_WEAPON_DAMAGE_TIER_2)
= 60` ticks; `90 / 60 = 1.5`). This makes a single kill-count target satisfy
both ends of the envelope exactly, with no free parameter:

```
CONVERGENCE_MIN_CYCLE_SECONDS = 480        (8 minutes, design line 63)
CONVERGENCE_MAX_CYCLE_SECONDS = 720        (12 minutes, design line 63)
CONVERGENCE_MIN_CYCLE_TICKS   = 480 * SIMULATION_HZ = 28_800
CONVERGENCE_MAX_CYCLE_TICKS   = 720 * SIMULATION_HZ = 43_200

tier2KillTicks = WEAPON_COOLDOWN_TICKS * ceil(ENEMY_HEALTH / STARTER_WEAPON_DAMAGE_TIER_2) = 60
tier1KillTicks = WEAPON_COOLDOWN_TICKS * ceil(ENEMY_HEALTH / PROJECTILE_DAMAGE)             = 90

CONVERGENCE_KILLS_TO_THRESHOLD = CONVERGENCE_MIN_CYCLE_TICKS / tier2KillTicks = 480
```

Proof of both ends from that one integer:
`480 * tier2KillTicks (60) = 28_800 = CONVERGENCE_MIN_CYCLE_TICKS` exactly, and
`480 * tier1KillTicks (90) = 43_200 = CONVERGENCE_MAX_CYCLE_TICKS` exactly. A
player sustaining the post-first-upgrade Tier 2 cadence from tick 1 reaches
480 kills at the min-bound tick; a player who never upgrades past Tier 1
reaches the same 480 kills at the max-bound tick. Both are pinned as an exact
equality in `Mvp0Config.test.ts`, matching the project's existing "derived,
not chosen by feel" bar (V2-ADR-070's own precedent).

`V2-108` composition means not every kill is a `grunt`. Convergence therefore
accrues **XP-equivalent points, not a flat per-kill count** — reusing
`combatResult.killXp`, the same Float32 values `ProgressionSystem` already
reads for player XP. `CONVERGENCE_THRESHOLD = CONVERGENCE_KILLS_TO_THRESHOLD *
ENEMY_XP_VALUE = 480 * 5 = 2400`. Because `swarmling`'s XP is exactly half
`grunt`'s and `brute`'s is 1.5x at equal composition cost (V2-ADR-070), two
`swarmling` kills contribute the same Convergence as one `grunt` kill, and a
`brute`-heavy run converges faster than the derivation's baseline, never
slower — the envelope's maximum bound stays a guarantee under composition
variance, it does not weaken it.

## Scope

In scope:

1. `game-v2/config/Mvp0Config.ts`: `CONVERGENCE_MIN_CYCLE_TICKS`,
   `CONVERGENCE_MAX_CYCLE_TICKS`, `CONVERGENCE_KILLS_TO_THRESHOLD`,
   `CONVERGENCE_THRESHOLD` as derived constants per the section above, each
   proved by an exact-equality config test (V2-ADR-072).
2. `World.ts` / `WorldSnapshot.ts` (schema version 5 → 6): two new per-player
   fields — `convergence: Float32Array` (accumulated XP-equivalent points,
   clamped display-wise but not accumulation-wise) and `convergenceReached:
   Uint8Array` (the latched edge flag; V2-ADR-073) — cleared by
   `World.reset()` alongside the other per-run player fields.
3. `game-v2/systems/ConvergenceSystem.ts`: a new, state-free system mirroring
   `ProgressionSystem`'s validate-then-mutate shape. `step(world,
   playerEntity, combatResult, context)` sums `killXp[0..killCount)` into
   `world.convergence[slot]`, then sets `world.convergenceReached[slot] = 1`
   when `(tick >= CONVERGENCE_MIN_CYCLE_TICKS) && (world.convergence[slot] >=
   CONVERGENCE_THRESHOLD || tick >= CONVERGENCE_MAX_CYCLE_TICKS)` and it was
   not already `1` (V2-ADR-074 — the min/max gate composition). Terminal
   player death dominates the tick exactly as `ProgressionSystem` already
   does (V2-ADR-027 precedent): no Convergence mutation on a lethal tick.
4. `game-v2/contracts/ConvergenceStepResult.ts`: `{ convergenceReachedThisTick:
   boolean }` — an edge flag, `true` only on the tick the latch flips,
   mirroring `ProgressionStepResult.leveledUp`'s shape.
5. `GameV2Runtime`: wires `ConvergenceSystem.step` into the fixed tick order
   immediately after `ProgressionSystem.step` (reads the same `combat` result
   both already consume; ordering after progression means a level-up offer
   pause on this tick does not block Convergence from recording the kill that
   caused it). `resetPlayer` gains a `ConvergenceSystem.resetPlayer` call
   alongside the other four. `GameV2RuntimeReadout` gains `convergenceProgress:
   number` (0..1, `Math.min(1, convergence / CONVERGENCE_THRESHOLD)`) and
   `convergenceReached: boolean`.
6. Tests: unit tests for the new config constants, `ConvergenceSystem`
   (validation, accumulation, min-gate, max-gate, composition-XP equivalence,
   terminal-death exemption, latch idempotency, capacity/type guards mirroring
   `ProgressionSystem.test.ts`'s own defensive coverage), a `World`/
   `WorldSnapshot` round-trip test for the two new fields, and one real
   production-path integration test proving a scripted run's Convergence
   signal fires no earlier than the min tick and no later than the max tick.
7. Ripple: `WorldSnapshotWriter.ts`, the shared replay validator, `StateHasher`
   field coverage, and the `8c5ecef3`-successor golden hash values in
   `WorldSnapshot.test.ts`/`Mvp0Runtime.test.ts`/`ReplayRunner.test.ts` all
   need updating for the two new fields, mirroring the ripple V2-105 already
   established when it added `rerollCharges`/`banishCharges`.

Out of scope:

- Any boss trigger, cycle transition, or run-state change on `convergenceReached`
  — there is no boss to hand off to yet (`V2-302`+, MVP-3). The runtime only
  exposes the flag; nothing consumes it into a transition.
- Elite kills and authored objectives as progress sources (`V2-301` and an
  unassigned objectives task).
- Market encounter bonus progress (`V2-212`, MVP-2) and any market/indicator
  read inside `ConvergenceSystem` — the system takes no market input at all,
  matching this task's own title.
- Second-cycle escalation timing (`V2-309`'s 6–9 minute envelope, MVP-3) —
  this task derives only the first-cycle 8–12 minute envelope design line 63
  states explicitly.
- A visible Convergence HUD element. `convergenceProgress`/`convergenceReached`
  land on the debug readout (already consumed by `GameV2Debug`/tests) but no
  new player-facing UI is added — no design-doc HUD content exists for it yet
  and the master plan's Done-When is about the signal reaching combat, not
  about presentation.

## Preflight Decisions To Record

- **V2-ADR-072 (proposed): the 8–12 minute first-cycle envelope (design line
  63) and the existing Tier 1/Tier 2 starter-weapon kill-period ratio both
  equal 1.5, so one derived kill-count target (`CONVERGENCE_KILLS_TO_THRESHOLD
  = 480`) satisfies both envelope bounds exactly with no free parameter.**
  Rationale: see the Design section above; pinned as an exact-equality config
  test rather than an approximate/rounded balance number, matching V2-ADR-070's
  "derived, not chosen by feel" bar.
- **V2-ADR-073 (proposed): Convergence per-player state (`convergence`,
  `convergenceReached`) lives in `World` as two new typed-array fields, not
  as a separate non-ECS scalar or a new component mask bit.** Rationale:
  mirrors `xp`/`level`/`rerollCharges` — existing per-player progression state
  that already lives directly on the player's `World` row with no separate
  component gate, since every player entity always has it. This keeps
  `RuntimeCheckpoint`/replay/hash coverage automatic through the existing
  `WorldSnapshot` pipeline instead of requiring a second checkpoint-adjacent
  authority.
- **V2-ADR-074 (proposed): the "reached" signal is `(tick >=
  CONVERGENCE_MIN_CYCLE_TICKS) && (convergence >= CONVERGENCE_THRESHOLD ||
  tick >= CONVERGENCE_MAX_CYCLE_TICKS)`, latched once true.** Rationale:
  resolves an apparent tension between "progress source is kill-only" and
  "the maximum-time bound is enforced" — the displayed meter never accrues
  from anything but kill XP (staying honest with "AFK... does not generate
  meaningful Convergence," design §6.3), but the *gate* itself is allowed a
  one-shot ceiling override at the max tick so "guarantees boss access" is
  literally true regardless of kill pace. The min-tick floor is a separate,
  independent AND-condition so an unusually fast kill pace still cannot
  signal before the floor.
- **V2-ADR-075 (proposed): Convergence accrues from `combatResult.killXp`
  (the same XP-equivalent value `ProgressionSystem` already reads), not a
  flat per-kill increment.** Rationale: `V2-108` composition means kills are
  not uniform; XP is already the codebase's established per-archetype
  power-cost proxy (V2-ADR-070's own "combined XP equals one grunt's"
  reasoning), so reusing it makes the derived envelope hold under composition
  variance instead of only for an all-`grunt` run.

## Files

- New: `game-v2/systems/ConvergenceSystem.ts`,
  `game-v2/contracts/ConvergenceStepResult.ts`,
  `tests/game-v2/systems/ConvergenceSystem.test.ts`,
  `tests/game-v2/integration/ConvergenceEnvelope.test.ts`
- Modify: `game-v2/config/Mvp0Config.ts` (new constants),
  `game-v2/world/World.ts` (two new fields, reset clearing),
  `game-v2/contracts/WorldSnapshot.ts` (schema version 6, two new fields),
  `game-v2/presentation/RenderSnapshotWriter.ts` (none expected — Convergence
  is not rendered geometry; confirm no touch needed rather than assume),
  `game-v2/replay/WorldSnapshotWriter.ts`, the shared replay validator,
  `game-v2/replay/StateHasher.ts`, `game-v2/runtime/GameV2Runtime.ts`
  (wiring, `resetPlayer`, readout fields), `game-v2/runtime/createMvp0Runtime.ts`
  (constructs `ConvergenceSystem`), `game-v2/contracts/GameV2Debug.ts`
  (readout field types)
- Test: `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/world/World.test.ts`, `tests/game-v2/replay/WorldSnapshot.test.ts`,
  `tests/game-v2/integration/Mvp0Runtime.test.ts`,
  `tests/game-v2/replay/ReplayRunner.test.ts` (golden-hash ripple)

## Steps

- [ ] **Step 1: Config constants (RED then implement)**

  Add the four derived constants to `Mvp0Config.ts`. Prove the exact-equality
  identity from the Design section (`480 * 60 === CONVERGENCE_MIN_CYCLE_TICKS`,
  `480 * 90 === CONVERGENCE_MAX_CYCLE_TICKS`) and `CONVERGENCE_THRESHOLD ===
  CONVERGENCE_KILLS_TO_THRESHOLD * ENEMY_XP_VALUE` in `Mvp0Config.test.ts`.

- [ ] **Step 2: World/WorldSnapshot fields (RED then implement)**

  Add `convergence`/`convergenceReached` to `World.ts`, bump
  `WORLD_SNAPSHOT_SCHEMA_VERSION` to 6, thread the fields through the writer,
  the shared replay validator, and `StateHasher`. Prove: both fields
  round-trip through a checkpoint write/read; `World.reset()` clears both;
  the schema-version bump is asserted; existing golden-hash tests are
  re-selected deliberately (not silently left stale), following the V2-105
  ripple pattern.

- [ ] **Step 3: ConvergenceSystem (RED then implement)**

  Prove: rejects malformed `combatResult`/context inputs mirroring
  `ProgressionSystem`'s own guard set; accumulates exactly `sum(killXp[0..
  killCount))` per tick; never mutates on a lethal (`playerDied`) tick; the
  latch only flips `0 -> 1`, never resets by itself; flips only once both
  gate conditions are satisfied and stays unflipped when only one is; the
  ceiling override fires at exactly `CONVERGENCE_MAX_CYCLE_TICKS` even with
  `convergence` far below threshold; the floor blocks flipping at exactly
  `CONVERGENCE_MIN_CYCLE_TICKS - 1` even with `convergence` far above
  threshold.

- [ ] **Step 4: Runtime wiring (RED then implement)**

  Wire `ConvergenceSystem` into `GameV2Runtime`'s tick order and
  `createMvp0Runtime.ts`; add `resetPlayer`; add the two new readout fields.
  Prove via a real production-path scripted run (mirroring
  `tests/game-v2/support/scriptedRun.ts`'s pattern) that continuous combat
  reaches `convergenceReached === true` at a tick inside
  `[CONVERGENCE_MIN_CYCLE_TICKS, CONVERGENCE_MAX_CYCLE_TICKS]`, and that the
  flag is readable through `readout()` without requiring a full checkpoint
  hash.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 6: Mutation pass**

  At minimum: drop the min-tick AND-condition (must fail the floor test),
  drop the max-tick OR-condition (must fail the ceiling test), replace
  `killXp` summation with a flat per-kill increment (must fail the
  composition-equivalence test), remove the lethal-tick early return (must
  fail the terminal-death exemption test), allow the latch to reset (must
  fail the idempotency test).

## Acceptance Criteria

1. `CONVERGENCE_MIN_CYCLE_TICKS`/`CONVERGENCE_MAX_CYCLE_TICKS`/
   `CONVERGENCE_KILLS_TO_THRESHOLD`/`CONVERGENCE_THRESHOLD` are derived, not
   chosen by feel, and the derivation's exact-equality identities are pinned
   by a test.
2. `ConvergenceSystem` never signals "reached" before the min-tick floor and
   always signals "reached" by the max-tick ceiling under a real production
   scripted run, with no market/indicator input anywhere in the system.
3. Convergence accrual is XP-equivalent, not flat-per-kill, and is proven
   invariant under `V2-108` archetype composition.
4. `World`/`WorldSnapshot`/checkpoint/replay/hash all correctly carry the two
   new fields; no existing replay or determinism test is weakened to
   accommodate the schema change.
5. Every gate in Step 5 passes and the Step 6 mutation pass leaves no
   survivor.
