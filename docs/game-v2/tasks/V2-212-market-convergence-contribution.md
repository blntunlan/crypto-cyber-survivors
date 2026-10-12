# V2-212 — Market Convergence Contribution (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-207` (primary/support composer), `V2-109` (market-independent Convergence) — both accepted and closed
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.3 (Convergence: "Market encounters provide bonus progress but are not required.")
> Master plan "Done when": "Completed encounters add bonus progress without blocking a flat run."
> Governing decisions: V2-ADR-146 through V2-ADR-150 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

`ConvergenceSystem` (`V2-109`) already accrues XP-equivalent kill points
and latches a "reached" edge, entirely independent of the market — its
own doc comment says so. This task adds a second, additive accrual path
for completed market encounters, without changing the first: `step()`'s
own kill-accrual behavior must be provably unchanged (existing
`ConvergenceSystem.test.ts` re-run unmodified and green), which is what
makes "without blocking a flat run" true — a run with zero market
encounters never calls the new path at all, so nothing about its
existing, already-tested kill-only behavior changes.

The accrual + latch-check logic in `step()`'s tail (validate finite
convergence, add the amount, check the Float32 rounding bound, check the
min-floor/threshold/max-ceiling latch condition) is extracted into a
private helper and reused by a new `applyMarketBonus` method — not
duplicated — so there is exactly one implementation of "how convergence
accrues and latches" to keep correct (V2-ADR-146).

Three encounter output kinds exist (`V2-208`/`V2-209`/`V2-210`), but only
two have a real, already-existing "this encounter is complete" signal to
hook a bonus to:

- `WORLD_EVENT`: `HazardLifecycle`'s `ACTIVE → IDLE` transition
  (`expiredThisTick`, `V2-209`) is a well-defined completion instant.
- `LOOT_EVENT`: `LootEventEncounterConsumer.consume()` (`V2-210`)
  produces its `LootOpportunity` instantly, with no further lifecycle —
  production is its own completion.
- `SPAWN`: **out of scope.** No batch-lifecycle tracking exists — neither
  `EnemyComposer` (`V2-108`) nor `SpawnEncounterConsumer` (`V2-208`) tags
  which spawned entities belong to which encounter, so there is no
  observable "this encounter's spawned enemies are all dealt with"
  signal to hook a bonus to. Building that tracking would be real scope
  expansion into `EnemySystem`/`World`, which `V2-208` explicitly avoided
  touching. This is an honest, documented deferral (V2-ADR-149), the same
  class of deferral `V2-205`/`V2-206` made for content with no anchor —
  here the gap is a missing observable signal, not missing numeric
  content, but the discipline is the same: do not invent one.

The bonus amount is derived, not felt: `MARKET_CONVERGENCE_BONUS_XP_PER_UNIT`
reuses `ENEMY_XP_VALUE` — the exact same real anchor `CONVERGENCE_THRESHOLD`
itself is built from (`Mvp0Config.ts`), not an independently invented
bonus rate (V2-ADR-147). `LootEventEncounterOutput` already carries a
real, bounded numeric value (`lootValue`, the whale tier, `V2-206`) to
scale the bonus by directly. `WorldEventEncounterOutput` carries no such
field, so a completed hazard counts as a flat `1` unit — chosen with
stated reasoning, matching `V2-108`/`V2-204`/`V2-205`'s own precedent for
an irreducible judgment call where no per-unit anchor exists
(V2-ADR-148); `V2-405` tunes final balance later, same as every other
first-pass authored constant in this milestone.

A new `MarketConvergenceBridge` class connects the two real completion
signals to `ConvergenceSystem.applyMarketBonus` (V2-ADR-149) — proven
end-to-end by tests, not wired into `GameV2Runtime` (V2-ADR-150),
matching `V2-203` through `V2-211`'s own precedent.

## Done When

1. `ConvergenceSystem.applyMarketBonus(world, playerEntity, bonusXp,
   context)` accrues a positive bonus using the exact same accrual/latch
   logic `step()`'s kill path uses, reused via a shared private helper.
2. `step()`'s own existing behavior is provably unchanged (its existing
   test file re-run unmodified and green).
3. `MarketConvergenceBridge` converts a real hazard-expiry signal and a
   real loot-opportunity production into a derived bonus via
   `applyMarketBonus`.
4. A flat run (no market bonus calls at all) reaches Convergence via
   kills alone exactly as `V2-109` already proved, unaffected by this
   task's addition.
5. Not wired into `GameV2Runtime`; `SPAWN` completion is explicitly
   deferred, not silently skipped.

## Scope

In scope:

1. `game-v2/config/MarketConvergenceBonus.ts`:
   `MARKET_CONVERGENCE_BONUS_XP_PER_UNIT`, `WORLD_EVENT_CONVERGENCE_BONUS_UNITS`.
2. `game-v2/systems/ConvergenceSystem.ts`: extract the private
   `accrueAndCheckLatch` helper from `step()`'s tail; add
   `applyMarketBonus(world, playerEntity, bonusXp, context)`.
3. `game-v2/market/MarketConvergenceBridge.ts`: `MarketConvergenceBridge`
   class wrapping an injected `ConvergenceSystem`, with
   `onHazardExpired(world, playerEntity, hazardResult, context)` and
   `onLootOpportunity(world, playerEntity, opportunity, context)`.
4. Tests: `tests/game-v2/config/MarketConvergenceBonus.test.ts` (pinned
   constants); `tests/game-v2/systems/ConvergenceSystem.test.ts` gains
   coverage for `applyMarketBonus` (accrues, latches, rejects an
   invalid entity/amount) while its existing tests stay untouched and
   green; `tests/game-v2/market/MarketConvergenceBridge.test.ts` (a real
   hazard expiry and a real loot opportunity each accrue the correct
   derived bonus; a non-expiry hazard result is a no-op; the flat-run
   no-bonus-calls property).

Out of scope:

- `SPAWN` encounter completion (no observable signal exists yet).
- Any change to `EnemySystem`, `EnemyComposer`, `SpawnEncounterConsumer`,
  `HazardLifecycle`, or `LootEventEncounterConsumer`'s own logic.
- Wiring `MarketConvergenceBridge` into `GameV2Runtime`.
- Player-death dominance interaction for `applyMarketBonus` (a future
  runtime-wiring decision, not this mechanism's job — `step()`'s own
  dominance handling is untouched).

## Preflight Decisions To Record

- **V2-ADR-146 (proposed): the accrual + latch-check logic is extracted
  into a shared private helper, reused by both `step()` and the new
  `applyMarketBonus`, not duplicated.** Rationale: exactly one
  implementation of "how Convergence accrues and latches" stays correct;
  `step()`'s own behavior is provably unchanged by re-running its
  existing tests unmodified.
- **V2-ADR-147 (proposed): `MARKET_CONVERGENCE_BONUS_XP_PER_UNIT` reuses
  `ENEMY_XP_VALUE`.** Rationale: the same real anchor `CONVERGENCE_THRESHOLD`
  itself is already built from (`Mvp0Config.ts`), not an independently
  invented bonus rate.
- **V2-ADR-148 (proposed): `WORLD_EVENT_CONVERGENCE_BONUS_UNITS = 1`
  (flat); `LOOT_EVENT`'s bonus scales directly by the real `lootValue`.**
  Rationale: `WorldEventEncounterOutput` carries no numeric field to
  scale by, unlike `LootEventEncounterOutput`'s real `lootValue`; the
  flat unit is a first-pass authored value with stated reasoning,
  matching `V2-108`/`V2-204`/`V2-205`'s own precedent, `V2-405` tunes
  later.
- **V2-ADR-149 (proposed): `MarketConvergenceBridge` connects
  `HazardLifecycle`'s expiry and `LootEventEncounterConsumer`'s
  production to `ConvergenceSystem.applyMarketBonus`; `SPAWN` completion
  is explicitly deferred.** Rationale: no observable "this encounter's
  spawned enemies are dealt with" signal exists (`EnemyComposer`/
  `SpawnEncounterConsumer` don't tag entity-to-encounter ownership);
  inventing one would be real scope expansion into `EnemySystem`/`World`,
  out of this task's scope, matching `V2-205`/`V2-206`'s own honest
  deferral discipline applied to a missing signal rather than missing
  content.
- **V2-ADR-150 (proposed): `MarketConvergenceBridge` is not wired into
  `GameV2Runtime`.** Rationale: matches `V2-203` through `V2-211`'s own
  precedent.

## Files

- New: `game-v2/config/MarketConvergenceBonus.ts`,
  `game-v2/market/MarketConvergenceBridge.ts`,
  `tests/game-v2/config/MarketConvergenceBonus.test.ts`,
  `tests/game-v2/market/MarketConvergenceBridge.test.ts`
- Modify: `game-v2/systems/ConvergenceSystem.ts` (extract helper, add
  `applyMarketBonus` — `step()`'s own logic path unchanged),
  `tests/game-v2/systems/ConvergenceSystem.test.ts` (new coverage
  added, nothing existing removed or altered).

## Steps

- [ ] **Step 1: `MarketConvergenceBonus` config**

  Pin both constants.

- [ ] **Step 2: `ConvergenceSystem.applyMarketBonus` (RED then implement)**

  Extract `accrueAndCheckLatch`; re-run the existing
  `ConvergenceSystem.test.ts` unmodified to confirm zero behavior
  change to `step()`. Add and prove `applyMarketBonus`: accrues a
  positive bonus onto `world.convergence`; can flip the latch exactly
  like a kill would (min-floor/threshold, min-floor/max-ceiling); a
  non-positive or non-finite `bonusXp` throws; a malformed player entity
  throws; an invalid `StepContext` throws.

- [ ] **Step 3: `MarketConvergenceBridge` (RED then implement)**

  Prove: a real hazard `expiredThisTick: true` result accrues
  `WORLD_EVENT_CONVERGENCE_BONUS_UNITS * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT`;
  a hazard result with `expiredThisTick: false` is a no-op (no accrual
  call); a real `LootOpportunity` accrues
  `opportunity.lootValue * MARKET_CONVERGENCE_BONUS_XP_PER_UNIT`; a run
  that never calls either bridge method reaches Convergence via kills
  alone exactly as `V2-109`'s own tests already prove (re-run
  unmodified).

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

  At minimum: `applyMarketBonus` not actually adding to
  `world.convergence`; the latch condition reversed or dropped; the
  bridge calling the bonus even when `expiredThisTick` is `false`;
  `MarketConvergenceBridge`'s loot bonus not scaling by `lootValue`.

## Acceptance Criteria

1. `applyMarketBonus` accrues and latches identically to `step()`'s own
   logic, via one shared implementation.
2. `step()`'s own existing behavior is provably unchanged.
3. `MarketConvergenceBridge` correctly derives and applies a bonus for
   real hazard-expiry and loot-opportunity signals, and is a no-op for a
   non-expiry hazard result.
4. `SPAWN` completion is explicitly deferred, not silently skipped;
   nothing outside the documented files is touched; no wiring into
   `GameV2Runtime`.
5. Every Step 4 gate passes and the Step 5 mutation pass leaves no
   survivor.
