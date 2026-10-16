# V2-108 — Basic Enemy Composition (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-010` (one pooled enemy, closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.1, §6.2
> Governing decisions: V2-ADR-069, V2-ADR-070, V2-ADR-071 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The master plan's entire treatment of this feature is one line: "Multiple
archetypes spend one bounded composition budget." No further design-doc
detail exists (§6.1 only says "Six normal enemy archetypes with elite
variants" is `V2-300`'s MVP-3 content, not this task's). Two scopes were
possible: stats-only archetype variety reusing `EnemySystem`'s existing chase
behavior unchanged, or adding at least one genuinely new movement/behavior
variant. The user selected stats-only variety. This brief is scoped to it.

## Done When

Multiple enemy archetypes, varying only in tuning, spend one bounded
per-interval composition budget through the real production spawn cadence —
matching the master plan's stated Done-When.

## Scope

In scope:

1. `game-v2/contracts/EnemyArchetype.ts`: `EnemyDefinition` type and
   `assertEnemyDefinition` validator (V2-ADR-069) — no per-entity "which
   archetype" store, since nothing downstream of spawn needs to know an
   enemy's archetype once its stats are baked into the existing
   `health`/`enemySpeed`/`contactDamage`/`radius`/`xpValue` fields.
2. `game-v2/config/EnemyRegistry.ts`: three archetypes (`grunt` — the
   unchanged MVP-0 baseline; `swarmling` — half power, cheaper, faster,
   smaller; `brute` — 1.5x power, slower, bigger, at `grunt`'s own cost) and
   `createEnemyRegistry` (V2-ADR-070).
3. `EnemySystem.spawnEnemy` gains an optional `definition` parameter
   defaulting to `GRUNT_ENEMY`, so all ~27 existing call sites across
   `game-v2/**`/`tests/game-v2/**` produce byte-for-byte identical entity
   state without passing anything new.
4. `game-v2/systems/EnemyComposer.ts`: a pure, allocation-free budget-spend
   algorithm — greedily draws one affordable archetype uniformly at random
   per pick until none fits the remaining budget, writing into a
   caller-owned reused array.
5. `GameV2Runtime.spawnDueEnemy` spends `MVP0_ENEMY_SPAWN_BUDGET` through the
   composer each cadence tick instead of always spawning exactly one grunt,
   spawning every archetype in the composed batch bounded by the existing
   free-slot/live-enemy caps.
6. An integration test proving live archetype diversity through the real
   production cadence (`runtime.checkpoint()` inspection), not just the
   composer/registry in isolation.
7. Ripple fixes from `EnemyComposer` consuming the shared RNG stream every
   spawn-cadence tick (even a single-archetype outcome still consumes a draw
   to choose among the affordable set), which shifts every subsequent
   RNG-dependent outcome for the rest of a run — `SCENARIO_SEED` and the
   e2e smoke's seed both needed re-selection, following the same pattern
   V2-106/V2-107 already established for registry-growth ripples.

Out of scope:

- Any new movement/behavior variant (e.g. a ranged/kiting archetype, a
  charge-telegraph rusher). All archetypes reuse `EnemySystem.step`'s
  existing chase-and-contact behavior exactly.
- Elite variants (`V2-301`, MVP-3).
- The remaining three of "six normal enemy archetypes" (`V2-300`, MVP-3) —
  this task's three are a distinct, smaller MVP-1 foundation, not a partial
  delivery of that count.
- Market-driven composition (`V2-208`, MVP-2) — the budget is fixed and
  market-independent, matching `V2-109`'s own title
  ("Market-independent Convergence") being the next task.
- Any change to `MVP0_ENEMY_SPAWN_INTERVAL_TICKS` or overall run difficulty
  pacing beyond what composition variety itself introduces (V2-ADR-070
  explicitly bounds this).

## Preflight Decisions To Record

- **V2-ADR-069 (proposed): enemy archetype identity is not stored per-entity;
  `EnemyDefinition` stats are written directly into `EnemySystem`'s existing
  `World` fields at spawn time and never read back as "which archetype."**
  Rationale: mirrors how a fired projectile's `AbilityTierEffect` numbers are
  baked into `projectileDamage`/`radius` with no "which ability fired this"
  store (V2-ADR-044/063). No system downstream of spawn (combat, collision,
  rendering) needs archetype identity, only current stats; adding a store
  nothing reads would be exactly the "component with no reader" pattern the
  codebase already avoids (`PLAYER_ENTITY_MASK`'s own comment on `Faction`).
- **V2-ADR-070 (proposed): three archetypes — `grunt` (unchanged baseline,
  cost 2), `swarmling` (half health/damage/xp, 1.5x speed, 0.75x radius, cost
  1), `brute` (1.5x health/damage/xp, 0.6x speed, 1.25x radius, cost 2, an
  equal-cost sidegrade not a strict upgrade) — with
  `MVP0_ENEMY_SPAWN_BUDGET` fixed at `grunt`'s own cost.** Rationale: a
  budget equal to `grunt`'s cost means a composition that draws `grunt` or
  `brute` reproduces today's exact one-enemy-per-interval cadence exactly,
  and a composition that draws `swarmling` instead spends the identical
  budget on two weaker enemies whose combined health and damage equal one
  `grunt`'s. This keeps MVP-0's calibrated balance (spawn interval vs.
  weapon kill-period, pinned in `Mvp0Config.test.ts`) intact while still
  making every archetype individually reachable within a single budget
  window — a bigger `brute`-only budget would let composition escalate
  total per-interval threat power up to the largest archetype's cost, which
  this task does not attempt to re-balance.
- **V2-ADR-071 (proposed): `EnemyComposer.compose` always consumes at least
  one RNG draw per non-zero-budget call, even when the outcome is
  deterministic in substance (e.g. only one archetype is affordable).**
  Rationale: this is a real, accepted cost of the feature, not an
  optimization target — skipping the draw when there is "no real choice" at
  the moment of the call would itself be a form of state-dependent branching
  a replay would need to reproduce exactly, adding complexity for a
  saving that does not recur (the composer's own registry only has this
  property in narrow test-constructed cases, not the production three-
  archetype budget). The consequence — every downstream RNG-dependent
  outcome shifts for the rest of a run — is handled by re-selecting the
  fixed seeds that depend on it (`SCENARIO_SEED`, the e2e smoke's seed),
  matching the pattern already established when the ability registry grew.

## Files

- New: `game-v2/contracts/EnemyArchetype.ts`, `game-v2/config/EnemyRegistry.ts`,
  `game-v2/systems/EnemyComposer.ts`
- Modify: `game-v2/systems/EnemySystem.ts` (optional `definition` parameter),
  `game-v2/runtime/GameV2Runtime.ts` (`spawnDueEnemy` spends the budget),
  `game-v2/runtime/createMvp0Runtime.ts` (wires `EnemyComposer`),
  `game-v2/config/Mvp0Config.ts` (derived archetype stats, cost, budget,
  composition pick bound)
- Test: `tests/game-v2/contracts/EnemyArchetype.test.ts`,
  `tests/game-v2/config/EnemyRegistry.test.ts`,
  `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/systems/EnemySystem.test.ts`,
  `tests/game-v2/systems/EnemyComposer.test.ts`,
  `tests/game-v2/integration/EnemyComposition.test.ts` (new),
  `tests/game-v2/runtime/GameV2RuntimeBounds.test.ts`,
  `tests/game-v2/runtime/GameV2RuntimeOffer.test.ts` (both updated only to
  construct the new `enemyComposer` dependency)
- Ripple fixes: `tests/game-v2/support/scriptedRun.ts` (`SCENARIO_SEED`
  re-selected), `e2e/game-v2-walking-skeleton.spec.ts` (seeded run URL
  re-selected)

## Steps

- [x] **Step 1: Contracts and registry (RED then implement)**

  `EnemyArchetype.ts`, `EnemyRegistry.ts`, `Mvp0Config.ts`. Proved: every
  archetype's stats are derived multiples of the unchanged `ENEMY_*`
  baseline; `createEnemyRegistry` rejects empty/duplicate/malformed input;
  the three archetypes are pairwise distinct; two swarmlings sum to
  grunt-equal total health, damage, and cost.

- [x] **Step 2: EnemySystem generalization (RED then implement)**

  `EnemySystem.spawnEnemy` gains the optional `definition` parameter. Proved:
  every existing test (27 call sites) still passes unchanged with the
  default; `swarmling`/`brute` write their own distinct stats when passed
  explicitly; two different archetypes spawned side by side do not
  cross-contaminate.

- [x] **Step 3: EnemyComposer (RED then implement)**

  Proved: rejects an empty registry and a non-integer/negative budget; never
  spends more than the budget; resets its output array first; deterministic
  for a given RNG state; reaches every registered archetype across enough
  draws on one continuously-advancing stream; narrows correctly once
  remaining budget excludes the pricier archetypes.

- [x] **Step 4: Runtime wiring and ripple fixes (RED then implement)**

  `GameV2Runtime.spawnDueEnemy`, `createMvp0Runtime.ts`. Proved: a live run
  spawns more than one distinct archetype (radius-diversity check through
  `runtime.checkpoint()`); `MVP0_MAX_LIVE_ENEMIES` is never exceeded even
  under multi-archetype composition. Re-selected `SCENARIO_SEED` (RNG stream
  shift) and the e2e smoke's seeded run URL; verified empirically against
  the plain path, the passive path, the reroll+banish path, and the
  dash-prevented-damage comparison.

- [x] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [x] **Step 6: Mutation pass**

  Mutants killed: the composer's affordable-count check widened to ignore
  the budget (`EnemyComposer.test.ts`'s budget-respect and determinism
  tests fail, the corrupt-pick guard fires); `spawnDueEnemy` reverted to
  always spawn the hardcoded grunt regardless of the composed batch
  (`EnemyComposition.test.ts`'s diversity assertion fails).

## Acceptance Criteria

1. Three archetypes are registered, pairwise distinct, each a derived
   multiple of the unchanged `grunt` baseline stats — not chosen by feel.
2. Every pre-`V2-108` `EnemySystem.spawnEnemy` caller is unaffected; the
   optional `definition` parameter defaults to the exact grunt baseline.
3. `EnemyComposer` never exceeds a given budget, is deterministic, and
   reaches every registered archetype.
4. A live run through the real production spawn cadence provably spawns
   more than one distinct archetype, bounded by the existing free-slot and
   live-enemy caps.
5. Every gate in Step 5 passes and the Step 6 mutation pass leaves no
   survivor.
