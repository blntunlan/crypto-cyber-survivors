# V2-102 — Three-Tier Ability Schema (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-100` (accepted at `677e1d24`)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md` §5.2
> Governing decisions: V2-ADR-006, V2-ADR-024, V2-ADR-036…V2-ADR-039, V2-ADR-044…V2-ADR-046
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

Acquisition, Tier 2, and Tier 3 effects validate for every registered ability.

Concretely: every entry in the ability registry carries a typed, ability-specific
Tier 1/Tier 2/Tier 3 effect table that the registry validates at construction;
`starter-projectile` — the only identity `V2-100`/`V2-101` registered — has all
three tiers authored, so `authoredTiers` no longer withholds its third tier; and
`WeaponSystem` fires with the damage, projectile radius, and cooldown the held
tier's effect table specifies, with no shared numeric multiplier that every
ability's tiers reuse.

## Scope

In scope:

1. A typed per-identity tier-effect contract (§5.2: "each ability defines its
   own typed tier effects; there is no universal damage/radius multiplier
   pipeline").
2. Registry-level validation that an identity's `tierEffects` table has exactly
   `authoredTiers` entries, in tier order, each matching that identity's own
   effect shape.
3. `starter-projectile` authored to `authoredTiers = 3` with real Tier 3
   numbers: a wider projectile radius (coverage) and a shorter cooldown
   (cadence), per §5.2's Tier 3 definition.
4. `WeaponSystem` reading damage, projectile radius, and cooldown from the held
   tier's effect table instead of the separate `STARTER_PROJECTILE_DAMAGE_BY_TIER`
   array and the flat `WEAPON_COOLDOWN_TICKS`/`PROJECTILE_RADIUS` globals.
5. Config-level tunnel-safety proof for the new, larger Tier 3 projectile
   radius, mirroring the existing Tier 1/2 proof.

Out of scope:

- The seven remaining ability identities (`V2-106`, `V2-107`) — the schema must
  only be *general enough* for them, not populated for them.
- The dynamic HUD (`V2-103`), the 13-second card flow, reroll, and banish
  (`V2-104`, `V2-105`) — the level-up card stays the MVP-0 fixed two-choice
  card; a Tier 2/Tier 3 offer path through it is not part of this task.
- Passive-stat tier effects — `PassiveLoadoutSystem` (`V2-101`) is untouched.
- Any change to `ABILITY_MAX_TIER`, the loadout occupancy rules, or the
  four-slot cap.

## Preflight Decisions To Record

- **V2-ADR-044 (proposed): each ability identity's tier effects are a typed,
  ability-specific shape discriminated by identity id, not a shared numeric
  struct.** `game-v2/contracts/AbilityTierEffect.ts` defines one effect type per
  identity (today, only `StarterProjectileTierEffect`) and a union
  `AbilityTierEffect` over all of them. `AbilityDefinition.tierEffects` is
  `readonly AbilityTierEffect[]`, index `tier - 1`. Rationale: §5.2 explicitly
  forbids "a universal damage and radius multiplier pipeline"; a shared struct
  would be exactly that pipeline with the ban worked around by giving every
  field a generic name. A discriminated union means adding `V2-106`'s laser
  requires its own effect type and an exhaustive switch at every reader, so a
  reader that forgets a new ability's shape fails to compile instead of
  silently reading `undefined`.
- **V2-ADR-045 (proposed): `starter-projectile`'s Tier 3 is a wider projectile
  radius plus a shorter cooldown; damage does not increase past Tier 2.**
  Design §5.2 assigns Tier 2 "damage and area/coverage" and Tier 3 "a stronger
  area/coverage behavior plus a modest cadence improvement" — Tier 3 is not
  specified to raise damage again. Proposed numbers, derived rather than
  chosen: `STARTER_PROJECTILE_RADIUS_TIER_3 = 0.3` (half of `ENEMY_RADIUS =
  0.6`, still leaving the combined collision radius at `0.9`, well above the
  `0.2333`-unit per-tick travel the existing tunnel-safety proof already pins,
  so discrete collision stays sound) and `STARTER_WEAPON_COOLDOWN_TICKS_TIER_3
  = 20` (two thirds of the base `WEAPON_COOLDOWN_TICKS = 30`, i.e. `0.333`s).
  Worked kill-period comparison at unchanged Tier 2 damage (`ceil(ENEMY_HEALTH /
  15) = 2` hits): Tier 1 is `30 * 3 = 90` ticks, Tier 2 is `30 * 2 = 60` ticks,
  Tier 3 is `20 * 2 = 40` ticks — a real, measurable improvement in the same
  units `V2-014`'s and `V2-100`'s worked examples already use. These numbers
  are proposed, not final; the implementer must re-derive and pin them in
  `Mvp0Config.ts` with the same reasoning `STARTER_WEAPON_DAMAGE_TIER_2` uses,
  and a config test must lock the tunnel-safety inequality the way the existing
  one does for Tier 1/2.
- **V2-ADR-046 (proposed): `AbilityLoadoutSystem` is the single lookup path
  from a held slot to its tier effect, not a second registry read inside
  `WeaponSystem`.** `AbilityLoadoutSystem.tierEffectAt(world, owner, index):
  AbilityTierEffect | null` resolves identity and tier together and returns the
  matching table entry (or `null` for an empty slot), mirroring `tierAt` and
  `identityAt`. `WeaponSystem` calls it instead of importing `STARTER_PROJECTILE`
  and a flat damage array directly. Rationale: `WeaponSystem` already takes an
  injected `AbilityLoadoutSystem` (`V2-ADR-039`'s injected-registry pattern);
  giving it a second, independent path to the registry (a bare module import)
  would let the two paths disagree about what a tier means, which is the same
  failure class `V2-ADR-038` closed for damage alone.

## Files

- Create: `game-v2/contracts/AbilityTierEffect.ts`
- Modify: `game-v2/contracts/AbilitySlot.ts` (`AbilityDefinition.tierEffects`)
- Modify: `game-v2/config/AbilityRegistry.ts` (tier-effect validation;
  `STARTER_PROJECTILE.authoredTiers = 3` with all three tiers authored)
- Modify: `game-v2/config/Mvp0Config.ts` (Tier 3 radius/cooldown constants,
  tunnel-safety derivation comment and test-locked inequality)
- Modify: `game-v2/systems/AbilityLoadoutSystem.ts` (`tierEffectAt`)
- Modify: `game-v2/systems/WeaponSystem.ts` (fire with the held tier's damage,
  radius, and cooldown instead of the flat arrays/constants)
- Test: `tests/game-v2/config/AbilityRegistry.test.ts`,
  `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/systems/AbilityLoadoutSystem.test.ts`,
  `tests/game-v2/systems/WeaponSystem.test.ts`

## Interfaces

```ts
// game-v2/contracts/AbilityTierEffect.ts
export type StarterProjectileTierEffect = Readonly<{
  ability: 'starter-projectile';
  damage: number;
  projectileRadius: number;
  cooldownTicks: number;
}>;

// The union grows by one member per new identity (V2-106, V2-107); every
// reader must switch on `ability` exhaustively.
export type AbilityTierEffect = StarterProjectileTierEffect;
```

```ts
// game-v2/contracts/AbilitySlot.ts — AbilityDefinition gains one field
export type AbilityDefinition = Readonly<{
  id: AbilityIdentityId;
  code: number;
  activation: AbilityActivation;
  authoredTiers: AbilityTier;
  /** Index `tier - 1`; length must equal `authoredTiers` (registry-enforced). */
  tierEffects: readonly AbilityTierEffect[];
}>;
```

```ts
// game-v2/systems/AbilityLoadoutSystem.ts — new read
tierEffectAt(world, owner, index): AbilityTierEffect | null
```

## Steps

- [ ] **Step 1: Record the decisions and write failing registry tests (RED)**

Prove: a definition whose `tierEffects.length` does not equal `authoredTiers`
is rejected; a definition whose effect discriminant does not match its own `id`
is rejected; a non-finite or negative damage/radius/cooldown field is rejected;
`starter-projectile` resolves three ordered tier effects from the registry.

- [ ] **Step 2: Write failing `WeaponSystem`/`AbilityLoadoutSystem` tests (RED)**

Prove: `tierEffectAt` returns `null` for an empty slot and the correct effect
for each of the three starter tiers; `WeaponSystem` fires Tier 1/2/3 with the
tier's own damage, radius, and cooldown; advancing to Tier 3 no longer throws
(`authoredTiers` ceiling now `3`); a projectile's stored radius at Tier 3 is the
wider value; cooldown cadence at Tier 3 measurably shortens the tick gap between
fires versus Tier 2, on the same fixture `V2-011`'s cadence test already uses.

- [ ] **Step 3: Write the failing config invariant test (RED)**

Prove: `STARTER_PROJECTILE_RADIUS_TIER_3 + ENEMY_RADIUS` stays above one tick of
projectile travel at `PROJECTILE_SPEED`, the same inequality shape
`tests/game-v2/config/Mvp0Config.test.ts` already pins for the Tier 1/2 radius.

- [ ] **Step 4: Implement**

Contract, registry validation, `Mvp0Config` constants and derivation comment,
`AbilityLoadoutSystem.tierEffectAt`, then `WeaponSystem`'s fire path.

- [ ] **Step 5: Verify (GREEN)**

```powershell
npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
npm run typecheck
npm run lint
npm run check:architecture
npm run check:reset-coverage
npm run check:ui-contract
npm run build
npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
```

- [ ] **Step 6: Mutation pass**

Mutants that must die: accepting a `tierEffects` length that does not match
`authoredTiers`; accepting a mismatched discriminant; reading Tier 1's effect
regardless of held tier; ignoring the Tier 3 radius when spawning a projectile;
ignoring the Tier 3 cooldown when re-arming; a config test that cannot detect
the tunnel-safety inequality flipping.

## Acceptance Criteria

1. Every ability definition's tier effects validate at registry construction,
   not by convention at the call site.
2. `starter-projectile.authoredTiers === 3` and all three tiers have real,
   derived numbers with a written justification, matching the rigor of the
   existing Tier 1/2 numbers.
3. `WeaponSystem` reads damage, projectile radius, and cooldown from exactly
   one place — the held tier's effect table via `AbilityLoadoutSystem` — with
   no second, independently-maintained value for any of the three.
4. No shared multiplier/percentage field exists on `AbilityTierEffect` that a
   future ability's effect type could reuse without its own typed shape.
5. Every gate in Step 5 passes and the mutation pass leaves no survivor.
