# V2-106 — Three Starting Weapons (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-102` (three-tier ability schema, closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §5.1, §5.2, §6.1
> Governing decisions: V2-ADR-005, V2-ADR-006, V2-ADR-036…V2-ADR-039,
> V2-ADR-044…V2-ADR-046, V2-ADR-062…V2-ADR-065 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

Three of the eight ability identities are start-eligible, distinct, and have
three valid tiers: the registry carries three identities flagged
start-eligible, each with its own registered `AbilityTierEffect` shape and
three authored, schema-validated tiers, and no two of the three share an
effect shape, a code, or numeric tuning.

## Scope

The master plan's entire treatment of this feature is one line (the MVP-1
table row). Design §6.1 adds one more: "Eight total active/autonomous
ability identities, three of which are eligible as starting weapons." Design
§5.1 adds a third: "The player selects a starting weapon before the run. It
occupies the first of four unified ability slots." Everything below beyond
those three lines is this brief's own interpretation, recorded as proposed
ADRs for review rather than assumed silently — see Preflight Decisions.

Today exactly one ability identity exists, `starter-projectile`
(`game-v2/config/AbilityRegistry.ts`), and it is the only thing
`WeaponSystem` knows how to fire: `resetPlayer` hardcodes
`this.loadout.add(world, playerEntity, STARTER_PROJECTILE.id)` and
`starterSlotIndex` looks the slot up by that literal id, not by "whatever
occupies slot 0." There is no pre-run selection screen anywhere in the
codebase and no master-plan task before MVP-4 names one.

In scope:

1. `AbilityDefinition` gains `startEligible: boolean`, validated by
   `createAbilityRegistry`. `starter-projectile` becomes `startEligible:
   true` (no behavior change to it otherwise).
2. Two new AUTO-activation ability identities, each start-eligible, each with
   its own `AbilityTierEffect` discriminated-union member (V2-ADR-044) and
   three authored tiers following the same Tier 1 identity / Tier 2
   expansion / Tier 3 mastery shape design §5.2 requires, with every tuning
   constant derived from a stated property in `Mvp0Config.ts` and pinned by
   a config test — mirroring `STARTER_PROJECTILE_RADIUS_TIER_3`'s and
   `STARTER_WEAPON_DAMAGE_TIER_2`'s existing precedent, not chosen by feel.
3. `WeaponSystem` generalizes from "always fires `STARTER_PROJECTILE.id`" to
   "fires whatever identity currently occupies ability slot 0," reading the
   held identity's tier effect through the existing
   `AbilityLoadoutSystem.identityAt`/`tierEffectAt` and switching on
   `effect.ability` to select the right numeric fields — the single-target
   auto-fire pipeline (`fire`/`advanceProjectiles`) itself is unchanged and
   shared by all three identities (V2-ADR-063).
4. `MVP1_ABILITY_REGISTRY` grows from one identity to three.
5. Test coverage proving each of the three identities' full three-tier
   progression through direct system calls
   (`AbilityLoadoutSystem.add`/`advanceTier`/`tierEffectAt`) and proving
   `WeaponSystem.step` fires correctly from a world where a *non-starter*
   start-eligible identity occupies slot 0 — a real production code path
   exercised by test-constructed worlds, matching the established pattern
   `TargetingSystem`/`CombatSystem` tests already use, not a test-only mock.

Out of scope:

- A pre-run starting-weapon selection screen or any player-facing choice of
  which start-eligible identity to begin with. `resetPlayer` continues to
  assign `starter-projectile` unconditionally to slot 0 (V2-ADR-065).
- New firing mechanics (lasers, drones, orbits, salvos, piercing, multi-shot,
  or anything that would need `CombatSystem` or the collision pipeline to
  change). Both new identities reuse the existing single-target,
  single-hit, straight-line projectile mechanic exactly, varying only their
  tier-effect numbers and their own typed shape (V2-ADR-063).
- The remaining five ability identities and any active/AUTO multi-slot
  combination behavior — that is `V2-107`'s stated scope, not this task's.
- Ten passive-stat identities (`V2-401`).
- Any UI beyond what already renders a held ability slot (`V2-103`'s HUD
  already reads any identity generically through `AbilitySlotReadout`; no
  new HUD work is implied by adding registry entries).

## Preflight Decisions To Record

- **V2-ADR-062 (proposed): `AbilityDefinition` gains `startEligible:
  boolean`, validated as a real boolean by `createAbilityRegistry`; nothing
  currently reads it.** Rationale: the registry is the single source of
  truth for identity metadata (V2-ADR-039); a start-eligibility flag
  belongs there rather than in a second list a caller could drift out of
  sync with the registry itself. No reader existing yet is accepted the
  same way `V2-ADR-039` accepted an uninstantiated registry shape before
  `V2-106`/`V2-107` populated it — because no pre-run selection UI exists
  yet (this brief's own out-of-scope item), the flag is truthful content
  with no consumer today, not a second copy of a fact something else
  already asserts.
- **V2-ADR-063 (proposed): the two new start-eligible identities reuse
  `WeaponSystem`'s existing single-target auto-fire projectile pipeline
  unchanged, varying only their `AbilityTierEffect` shape and tuning — not
  new firing mechanics.** Rationale: design's own examples of "an autonomous
  weapon such as a laser, drone, orbit, or salvo system" describe mechanics
  this brief does not build; each would need its own simulation and
  collision behavior comparable in size to the original `V2-011`/`V2-012`
  work. `V2-107`'s own Done-When ("the remaining five ability identities
  support active/AUTO four-slot combination tests") is where genuinely new
  mechanics and multi-slot combination belong. Reusing the proven pipeline
  keeps this task bounded to registry content plus one generalization,
  while still being real, distinct, separately-typed identities per
  V2-ADR-044 — not three copies of one struct.
- **V2-ADR-064 (proposed): `WeaponSystem` fires whatever identity occupies
  ability slot 0, not a hardcoded `STARTER_PROJECTILE.id` lookup; MVP-1's
  single autonomous firing slot stays fixed at index 0, and one shared
  `weaponCooldownTicksRemaining` store stays sufficient.** Rationale: three
  start-eligible identities that only one hardcoded lookup can ever fire
  would be the same "inert config" failure class V2-ADR-024/038/042 already
  closed once each — a registry entry a production path cannot reach.
  Generalizing the lookup (not the pipeline itself, per V2-ADR-063) is the
  minimum that makes "three start-eligible weapons" a true statement about
  live combat, not only about registry data. Because MVP-1 never holds two
  autonomous weapons at once (out of scope per this brief and per
  V2-107's combination-testing charter), one cooldown store and one fixed
  slot index remain correct; per-slot cooldown storage is deferred to
  whichever task first makes two autonomous weapons concurrently live.
- **V2-ADR-065 (proposed): `resetPlayer` keeps assigning `starter-projectile`
  unconditionally to slot 0; a starting-weapon selection screen is out of
  scope and deferred with no task ID yet.** Rationale: no master-plan task
  before MVP-4 names a title or character-select screen, and V2-106's own
  Done-When requires only that three identities be start-eligible, distinct,
  and three-tiered — not that a player currently choose between them. The
  two new identities are proven live by (a) direct system-level tests that
  construct a world with one of them in slot 0 and drive `WeaponSystem.step`
  against it, exercising the real generalized production path from
  V2-ADR-064, and (b) their generic reachability through the existing
  level-up offer system (`V2-105`): because `LevelUpOfferSystem` already
  enumerates every registered identity, both new identities become real
  mid-run pickup options into any of the other three ability slots the
  moment they exist in the registry, with no offer-system change required.

## Files

- Modify: `game-v2/contracts/AbilitySlot.ts` (`AbilityIdentityId` union
  grows to three members; `AbilityDefinition` gains `startEligible`)
- Modify: `game-v2/contracts/AbilityTierEffect.ts` (two new discriminated
  union members and their `assertAbilityTierEffect` switch cases)
- Modify: `game-v2/config/AbilityRegistry.ts` (author the two new
  `AbilityDefinition` consts; mark all three `startEligible: true`;
  `MVP1_ABILITY_REGISTRY` includes all three)
- Modify: `game-v2/config/Mvp0Config.ts` (derived tier-tuning constants for
  the two new identities, mirroring `STARTER_WEAPON_DAMAGE_TIER_2` /
  `STARTER_PROJECTILE_RADIUS_TIER_3` / `STARTER_WEAPON_COOLDOWN_TICKS_TIER_3`)
- Modify: `game-v2/systems/WeaponSystem.ts` (`starterSlotIndex` →
  slot-0-by-position instead of by-id; `fire`/tier-effect read switches on
  `effect.ability`)
- Test: `tests/game-v2/config/AbilityRegistry.test.ts`,
  `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/systems/WeaponSystem.test.ts`,
  `tests/game-v2/systems/AbilityLoadoutSystem.test.ts` — extend existing
  files; no new test files are anticipated but add one
  (`tests/game-v2/contracts/AbilityTierEffect.test.ts`) if the two new
  `assertAbilityTierEffect` branches cannot be reached indirectly through
  the registry tests alone.

## Interfaces

```ts
// game-v2/contracts/AbilitySlot.ts
export type AbilityIdentityId =
  | 'starter-projectile'
  | '<new-identity-a>'
  | '<new-identity-b>';

export type AbilityDefinition = Readonly<{
  id: AbilityIdentityId;
  code: number;
  activation: AbilityActivation;
  authoredTiers: AbilityTier;
  tierEffects: readonly AbilityTierEffect[];
  startEligible: boolean;
}>;
```

```ts
// game-v2/contracts/AbilityTierEffect.ts — additions
export type <NewIdentityA>TierEffect = Readonly<{
  ability: '<new-identity-a>';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type <NewIdentityB>TierEffect = Readonly<{
  ability: '<new-identity-b>';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

export type AbilityTierEffect =
  | StarterProjectileTierEffect
  | <NewIdentityA>TierEffect
  | <NewIdentityB>TierEffect;
```

Field names may stay identical to `StarterProjectileTierEffect`'s three
fields — the union member's `ability` tag, code, and numeric tuning are what
must differ, not necessarily the field set, since all three share the same
firing pipeline per V2-ADR-063.

```ts
// game-v2/systems/WeaponSystem.ts — behavior change, no new public method
private starterSlotIndex(world: World, playerEntity: EntityId): AbilitySlotIndex {
  // was: this.loadout.indexOf(world, playerEntity, STARTER_PROJECTILE.id)
  // becomes: the fixed autonomous slot index (0), asserted occupied
}
```

## Steps

- [ ] **Step 1: Registry content (RED then implement)**

  `AbilitySlot.ts` (`startEligible` field, widened `AbilityIdentityId`),
  `AbilityTierEffect.ts` (two new union members + switch cases),
  `Mvp0Config.ts` (derived tuning constants for both new identities),
  `AbilityRegistry.ts` (two new `AbilityDefinition` consts, all three
  `startEligible: true`, `MVP1_ABILITY_REGISTRY` grows to three). Prove:
  `createAbilityRegistry` accepts all three identities with no duplicate
  code/id; each of the two new identities' `tierEffects` has length 3 and
  every tier passes `assertAbilityTierEffect`; a malformed `startEligible`
  (non-boolean) is rejected; the three identities are pairwise distinct by
  code, by `ability` tag, and by at least one numeric tuning value per tier;
  each new identity's derived constants satisfy the same kind of provable
  property `STARTER_PROJECTILE_RADIUS_TIER_3`/`STARTER_WEAPON_DAMAGE_TIER_2`
  already pin (e.g. a kill-period or DPS relationship between tiers), tested
  in `Mvp0Config.test.ts`.

- [ ] **Step 2: Loadout reachability (RED then implement)**

  No production code change beyond Step 1 is anticipated here — this step is
  proof, not implementation. Prove through `AbilityLoadoutSystem`: `add`,
  `advanceTier` to tier 2 and 3, `tierEffectAt`, and `isOfferable` all
  behave correctly for both new identities exactly as they already do for
  `starter-projectile`; `occupiedCount`/`indexOf` treat all three
  identically; a slot cannot exceed a new identity's `authoredTiers` any
  more than the starter's can.

- [ ] **Step 3: WeaponSystem generalization (RED then implement)**

  `WeaponSystem.ts` (`starterSlotIndex` → fixed slot-0 lookup;
  `fire`/effect-read dispatch switches on `effect.ability`). Prove: a world
  where `resetPlayer` still assigns `starter-projectile` behaves exactly as
  before (no regression — same damage/radius/cooldown/cadence as the
  existing `WeaponSystem.test.ts` suite already pins); a *directly
  constructed* world where either new identity occupies slot 0 fires
  correct damage, projectile radius, and cooldown cadence for its own tier;
  firing from an empty slot 0 or a slot 0 holding an unknown code still
  throws exactly as the current empty/unknown-slot guards do.

- [ ] **Step 4: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 5: Mutation pass**

  Mutants that must die: `startEligible` accepted as a non-boolean; a
  duplicate code or `ability` tag between the two new identities silently
  accepted; `WeaponSystem` still reading `STARTER_PROJECTILE.id` instead of
  slot position (would make a non-starter slot-0 identity fire with the
  wrong or the starter's numbers); a tier effect read past a new identity's
  `authoredTiers`; the shared pipeline's existing exact-touch, capacity, or
  zero-distance-fallback guards (proven once already in `V2-011`/`V2-012`)
  regressing for a non-starter firer.

## Acceptance Criteria

1. `MVP1_ABILITY_REGISTRY` contains exactly three identities, all
   `startEligible: true`, pairwise distinct by code and by `AbilityTierEffect`
   shape (`ability` tag), each with exactly three authored, schema-valid
   tiers.
2. Each of the two new identities' three-tier progression is provable
   end-to-end through `AbilityLoadoutSystem` exactly like `starter-projectile`
   already is.
3. `WeaponSystem` fires correctly, with the correct per-identity numbers,
   from any of the three identities when constructed in ability slot 0 — not
   only from `starter-projectile`.
4. No regression: the existing `starter-projectile` behavior, its live
   `resetPlayer` assignment, and every currently-passing `WeaponSystem`,
   `AbilityLoadoutSystem`, and MVP-0 walking-skeleton e2e assertion are
   unchanged.
5. Every gate in Step 4 passes and the Step 5 mutation pass leaves no
   survivor.
