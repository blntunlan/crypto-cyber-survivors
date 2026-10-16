# V2-107 — Initial Ability Set (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-102` (three-tier ability schema, closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §5.1, §5.2, §6.1
> Governing decisions: V2-ADR-005, V2-ADR-006, V2-ADR-036…V2-ADR-039,
> V2-ADR-044, V2-ADR-062…V2-ADR-064, V2-ADR-066…V2-ADR-068 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Three scopes were possible for "the remaining five ability identities": a
narrow registry/loadout-only slice, a medium slice adding real active-ability
input plus one new AUTO mechanic, and a full slice building five distinct new
mechanics. The user selected the narrow slice. This brief is scoped to it.

## Done When

The remaining five ability identities are registered, distinct, three-tiered,
and provably combine with the existing three across all four ability slots —
matching the master plan's stated Done-When: "The remaining five ability
identities support active/AUTO four-slot combination tests."

## Scope

In scope:

1. Five new `AbilityDefinition` entries, all `activation: 'auto'`,
   `startEligible: false`, reusing `WeaponSystem`'s existing single-target
   auto-fire pipeline exactly as `heavy-projectile`/`rapid-projectile`
   already do (V2-ADR-063, extended by V2-ADR-066 below) — no new firing
   mechanics, no new `AbilityTierEffect` field set.
2. `MVP1_ABILITY_REGISTRY` grows from three identities to the full eight
   design §6.1 specifies.
3. Test coverage proving all eight identities combine across the four
   ability slots through the real production registry (not the local
   synthetic fixtures `AbilityLoadoutSystem.test.ts` already used for
   V2-100's generic combination proof) — add, advance, mix, and reach the
   four-slot ceiling.
4. Test coverage proving `WeaponSystem` fires each of the five new
   identities correctly when directly constructed in ability slot 0,
   mirroring V2-106's non-starter firing tests.
5. Ripple fixes in tests that assumed a small offerable-ability pool
   (`ProgressionSystem.test.ts`, `tests/game-v2/support/scriptedRun.ts`),
   matching the pattern V2-106 already established.

Out of scope:

- Any `activation: 'active'` content. No active-ability input system exists
  in `game-v2/**` today (no key-1..4 execution pipeline; `activation` is
  display-only metadata per V2-ADR-048). Inventing an `AbilityTierEffect`
  shape for a mechanic with no consumer would be speculative design work
  this brief's narrow scope explicitly excludes (V2-ADR-067).
- Generalizing `WeaponSystem`/`World.weaponCooldownTicksRemaining` to fire
  from more than one occupied `auto` slot concurrently. This remains
  deferred exactly as V2-ADR-064 already stated, with no task ID assigned.
  The five new identities carry the identical limitation
  `heavy-projectile`/`rapid-projectile` already carry today: only whichever
  identity occupies slot 0 (always `starter-projectile` today, per
  V2-ADR-065) actually fires; the other seven registered identities are
  reachable and individually provable through direct system-level tests
  (matching V2-106's own precedent) but not live-fireable through the
  unmodified `resetPlayer` path this task leaves unchanged (V2-ADR-068).
- New firing mechanics (lasers, drones, orbits, salvos, piercing,
  multi-shot). All five reuse the exact mechanic V2-ADR-063 already proved.
- A starting-weapon selection screen (V2-ADR-065, still deferred).
- Ten passive-stat identities (`V2-401`).
- Any UI beyond what already renders a held ability slot generically.

## Preflight Decisions To Record

- **V2-ADR-066 (proposed): the five new identities extend V2-ADR-063's
  precedent — same single-target auto-fire pipeline, same three-field
  `AbilityTierEffect` shape (`damage`, `projectileRadius`,
  `cooldownTicks`), tuned as a multiple `N` of `starter-projectile`'s own
  Tier 1 damage and cooldown (`damage = 10N`, `cooldownTicks = 30N`), so
  every projectile-family identity — all eight — opens at the identical
  Tier 1 damage-per-tick baseline (`10/30`) by construction and differs
  only in burst/cadence/coverage shape.** Rationale: a single documented
  formula, tested once, is a stronger and cheaper proof than five
  independently-justified numbers, and keeps the "derived, not felt"
  requirement airtight (mirrors `STARTER_PROJECTILE_RADIUS_TIER_3`'s
  precedent). `N` values (`1/10`, `1/5`, `3/2`, `5/2`, `4`) are chosen only
  for `30N` and `20N` (the Tier 3 cooldown, `30N * 2/3`) to stay integers,
  and to be pairwise distinct from `1`, `2`, `0.5` (starter/heavy/rapid).
- **V2-ADR-067 (proposed): no `activation: 'active'` identity is registered
  this task.** Rationale: design §5.1 names two categories ("a manually
  activated ability" and "an autonomous weapon"), but only the autonomous
  category has a real, tested execution path today. Registering an active
  identity with an invented effect shape before any system can read it
  would be exactly the "second copy of a fact" and "inert config" pattern
  V2-ADR-024/038/042/064 already rejected once each — except worse, because
  there would be no way to prove the shape is even right without a
  consumer to validate against. The gap (zero `active`-category content in
  the vertical slice) is real and explicitly deferred, not hidden.
- **V2-ADR-068 (proposed): `resetPlayer` is unchanged by this task; slot 0
  stays hardcoded to `starter-projectile`.** Rationale: this task's Done-When
  is registry content and slot-combination proof, not live-fire reachability
  for every identity — that already carries a known, accepted, undated
  deferral (V2-ADR-064) this task does not need to resolve. Proof that each
  of the eight identities is individually correct and fireable is delivered
  by direct system-level tests exactly as V2-106 already established
  (`WeaponSystem.test.ts` constructing a world with the identity in slot 0),
  not by making every identity reachable through the live `resetPlayer` +
  level-up path.

## Files

- Modify: `game-v2/contracts/AbilitySlot.ts` (`AbilityIdentityId` union grows
  to eight members)
- Modify: `game-v2/contracts/AbilityTierEffect.ts` (five new discriminated
  union members and their `assertAbilityTierEffect` switch cases)
- Modify: `game-v2/config/AbilityRegistry.ts` (author the five new
  `AbilityDefinition` consts, all `startEligible: false`;
  `MVP1_ABILITY_REGISTRY` includes all eight)
- Modify: `game-v2/config/Mvp0Config.ts` (derived tier-tuning constants for
  the five new identities, following V2-ADR-066's single formula)
- Test: `tests/game-v2/config/AbilityRegistry.test.ts`,
  `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/systems/WeaponSystem.test.ts`,
  `tests/game-v2/systems/AbilityLoadoutSystem.test.ts` — extend existing
  files.
- Ripple fixes (matching V2-106's precedent): `tests/game-v2/support/scriptedRun.ts`
  (`SCENARIO_SEED` may need re-selection now that the offerable ability pool
  grows from three to eight), `tests/game-v2/systems/ProgressionSystem.test.ts`
  (`excludeNonStarterAbilitiesFromOffer` extends to all seven non-starter
  identities; any pool-size-dependent assertion re-checked).

## Steps

- [ ] **Step 1: Registry content (RED then implement)**

  `AbilitySlot.ts`, `AbilityTierEffect.ts`, `Mvp0Config.ts`,
  `AbilityRegistry.ts`. Prove: `createAbilityRegistry` accepts all eight
  identities with no duplicate code/id; each new identity's `tierEffects`
  has length 3 and every tier passes `assertAbilityTierEffect`; all eight
  are pairwise distinct by code, by `ability` tag, and by at least one
  numeric tuning value per tier; every identity's Tier 1 `damage /
  cooldownTicks` ratio equals `starter-projectile`'s (pinned in
  `Mvp0Config.test.ts`); every Tier 3 cooldown is a positive integer.

- [ ] **Step 2: Four-slot combination reachability (RED then implement)**

  No production code change beyond Step 1 is anticipated here — proof only.
  Through the real `MVP1_ABILITY_REGISTRY`-backed `AbilityLoadoutSystem`:
  fill all four slots with four distinct identities drawn from the full
  eight (including at least one of the five new ones), advance each through
  its authored tiers independently, remove and refill, and confirm a ninth
  distinct identity is refused once all four slots are occupied — proving
  real eight-identity combination, not the synthetic five-identity fixture
  `AbilityLoadoutSystem.test.ts` already used for V2-100.

- [ ] **Step 3: WeaponSystem firing proof for the five new identities (RED
  then implement)**

  No `WeaponSystem.ts` change is anticipated (V2-ADR-068). Mirror V2-106's
  non-starter firing tests: for each of the five new identities, construct a
  world with it directly placed in ability slot 0 and prove `WeaponSystem.step`
  fires the correct damage, radius, and cooldown at each of its three tiers.

- [ ] **Step 4: Ripple fixes (RED then implement)**

  Re-run `tests/game-v2` and fix any test whose assumptions break now that
  the offerable ability pool is eight instead of three, following the exact
  pattern V2-106 already used: extend `excludeNonStarterAbilitiesFromOffer`
  to all seven non-starter identities; re-probe `SCENARIO_SEED` if the
  default scripted run's first offer no longer includes `starter-projectile`
  naturally (recording the reasoning in a code comment as V2-106 did).

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

  Mutants that must die: a duplicate code or `ability` tag among the five
  new identities silently accepted; a Tier 3 cooldown that is not an
  integer; the four-slot combination test passing with only three real
  identities instead of a genuine fourth; a WeaponSystem firing test for a
  new identity passing with the wrong tier's numbers (mutate the tier index
  read).

## Acceptance Criteria

1. `MVP1_ABILITY_REGISTRY` contains exactly eight identities: three
   `startEligible: true` (unchanged from V2-106) and five `startEligible:
   false`, pairwise distinct by code and by `AbilityTierEffect` shape, each
   with exactly three authored, schema-valid tiers.
2. All four ability slots can be filled with four distinct identities drawn
   from the full eight, each independently advanced through its tiers,
   proved through the real production registry.
3. `WeaponSystem` fires correctly, with the correct per-identity numbers, for
   each of the five new identities when constructed in ability slot 0.
4. No regression: every currently-passing test from V2-106 and earlier
   remains green.
5. Every gate in Step 5 passes and the Step 6 mutation pass leaves no
   survivor.
