# V2-100 — Four-Slot Ability Loadout (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-014` (accepted at `085697b5`)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md` §5.1, §5.2
> Governing decisions: V2-ADR-005, V2-ADR-006, V2-ADR-023, V2-ADR-024, V2-ADR-025
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

Active and AUTO slots add/remove/reset through one typed contract.

Concretely: four ability slots exist as authoritative run state, each slot is
either empty or holds one ability identity with an activation kind and a tier,
the occupancy rules from §5.1 are enforced at the contract boundary, the state
survives checkpoint and replay by hash, and it is fully cleared by run reset.

## Scope

In scope:

1. The typed slot contract (identity, activation kind, tier, index).
2. Authoritative storage of loadout state and its snapshot/hash coverage.
3. Add, remove, reset, and query operations with enforced preconditions.
4. One production consumer: the existing starter weapon reads its damage from
   its slot tier instead of holding an independent `weaponDamage` authority.

Out of scope — these are later LEGO blocks and must not be counterfeited here:

- Six passive slots and their five levels (`V2-101`).
- The three-tier effect schema per ability and its validation (`V2-102`).
- The HUD that renders occupied slots and `1`–`4` / `AUTO` labels (`V2-103`).
- The 13-second three-card offer flow, reroll, and banish (`V2-104`, `V2-105`).
- Additional ability identities and starting weapons (`V2-106`, `V2-107`).
- Post-boss slot replacement (`V2-310`).

## Preflight Decisions To Record

These are new authorities the task creates. Each becomes a `DECISIONS.md` row
before implementation, or is replaced by a better decision with a written
reason.

- **V2-ADR-036 (proposed): loadout state lives in `World`, indexed by the owning
  entity slot.** Two parallel stores of length `capacity * ABILITY_SLOT_COUNT`
  (`abilitySlotIdentity`, `abilitySlotTier`) are addressed as
  `slot * ABILITY_SLOT_COUNT + slotIndex`. Rationale: V2-ADR-025 forbids
  per-run state inside systems, `RuntimeCheckpoint` already carries `World`, and
  a fixed-stride array keeps slot order deterministic in a way that
  entity-per-slot allocation would not. The stride belongs to exactly one owner
  function, as V2-ADR-023 requires of the handle encoding.
- **V2-ADR-037 (proposed): ability identities hash as stable numeric codes, not
  strings.** The registry maps each `AbilityIdentityId` to a frozen numeric code
  that never changes once assigned; the empty slot is code `0`. Rationale: the
  state hash must not shift when an identity is renamed, and a string per slot
  per hash would allocate on a path V2-ADR-032 keeps allocation-light.
- **V2-ADR-038 (proposed): the starter weapon damage is derived from its slot
  tier and stops being independently writable.** `WeaponSystem.applyDamageUpgrade`
  becomes a tier advance on slot 0, and the tier-to-damage mapping lives in the
  ability registry. Rationale: V2-ADR-024 — a loadout that no production system
  reads is inert config that ships green, which is exactly the defect V2-012
  shipped before review.

## Files

- Create: `game-v2/contracts/AbilitySlot.ts`
- Create: `game-v2/config/AbilityRegistry.ts`
- Create: `game-v2/systems/AbilityLoadoutSystem.ts`
- Modify: `game-v2/world/World.ts` (two stores, reset, capacity assertions)
- Modify: `game-v2/replay/WorldSnapshotWriter.ts`, `game-v2/replay/StateHasher.ts`,
  `game-v2/replay/WorldStateValidator.ts`, `game-v2/contracts/WorldSnapshot.ts`
- Modify: `game-v2/systems/WeaponSystem.ts` (read tier, advance tier)
- Modify: `game-v2/systems/ProgressionSystem.ts` (the upgrade resolves through
  the loadout, not through a weapon-local constant)
- Test: `tests/game-v2/systems/AbilityLoadoutSystem.test.ts`
- Test: `tests/game-v2/config/AbilityRegistry.test.ts`
- Test: `tests/game-v2/world/World.test.ts`
- Test: `tests/game-v2/replay/WorldSnapshot.test.ts`
- Test: `tests/game-v2/systems/WeaponSystem.test.ts`
- Test: `tests/game-v2/integration/Mvp0Runtime.test.ts` (unchanged-behavior proof)

## Interfaces

```ts
// game-v2/contracts/AbilitySlot.ts
export const ABILITY_SLOT_COUNT = 4;
export type AbilitySlotIndex = 0 | 1 | 2 | 3;
export type AbilityActivation = 'active' | 'auto';
export type AbilityTier = 1 | 2 | 3;
export type AbilityIdentityId = 'starter-projectile';

export type AbilitySlotView = Readonly<{
  index: AbilitySlotIndex;
  identity: AbilityIdentityId | null;
  activation: AbilityActivation | null;
  tier: AbilityTier | null;
}>;
```

```ts
// game-v2/systems/AbilityLoadoutSystem.ts — stateless; World is authoritative
add(world, owner, identity): AbilitySlotIndex   // throws when full or duplicate
remove(world, owner, index): void               // throws when already empty
advanceTier(world, owner, index): AbilityTier   // throws past tier 3
resetOwner(world, owner): void                  // clears all four slots
readSlot(world, owner, index): AbilitySlotView  // allocation-free read path
occupiedCount(world, owner): number
```

- Consumes: `World`, the owning `EntityId`, and the registry.
- Produces: slot occupancy, activation kind, tier, and the derived weapon damage
  the existing starter weapon fires with.
- Never consumes: RNG, wall-clock time, or lifecycle phase.

## Steps

- [x] **Step 1: Write failing contract tests (RED)**

Prove: four slots start empty; `add` fills the lowest free index and returns it;
a fifth `add` throws instead of replacing; adding a held identity throws;
`remove` frees exactly one index and leaves the others untouched; `advanceTier`
walks 1 to 2 to 3 and throws at 4; `resetOwner` clears every slot; every
operation rejects an out-of-range index, a retired handle, and a non-owner
entity.

- [x] **Step 2: Write failing persistence tests (RED)**

Prove: loadout state is part of `snapshotHash()` — two worlds differing only in
one slot identity, activation, or tier hash differently; a checkpoint restore
reproduces the loadout exactly; `World.reset()` clears both stores; the
`WorldStateValidator` rejects an out-of-range identity code, a tier outside
1–3, and a tier on an empty slot.

- [x] **Step 3: Run RED**

```powershell
npx vitest run tests/game-v2/systems/AbilityLoadoutSystem.test.ts tests/game-v2/config/AbilityRegistry.test.ts tests/game-v2/replay/WorldSnapshot.test.ts --pool=forks --maxWorkers=1
```

- [x] **Step 4: Implement**

Contract, registry, stores, validator, snapshot/hash coverage, then the system.
Keep every read allocation-free: `readSlot` returns a reused view or plain
numbers, never a fresh object per call on a 60 Hz path.

- [x] **Step 5: Migrate the starter weapon (V2-ADR-038)**

The MVP-0 run must stay behaviorally identical: slot 0 holds
`starter-projectile` at tier 1 with `PROJECTILE_DAMAGE`, the single level-up
advances it to tier 2 with `STARTER_WEAPON_DAMAGE_TIER_2`, and the recorded
acceptance run final state hash is expected to change only because the world now
carries loadout bytes. Re-record and re-pin the hash in the same commit that
changes it, and state the old and new value in `PROGRESS.md`.

- [x] **Step 6: Verify (GREEN)**

```powershell
npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
npm run typecheck
npm run lint
npm run check:architecture
npm run check:reset-coverage
npm run build
npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
```

- [x] **Step 7: Mutation pass**

Deliberate mutants that must be killed: returning the highest free index instead
of the lowest; allowing a duplicate identity; skipping the full-loadout throw;
dropping the tier ceiling; omitting either store from the reset; omitting either
store from the hash; hashing identity as a string; reading the slot 0 tier as a
constant in `WeaponSystem`. Any survivor is fixed by strengthening the test, and
any mutant that is unreachable by construction is recorded in `PROGRESS.md`
rather than hidden.

## Acceptance Criteria

1. Occupancy, activation kind, and tier move only through
   `AbilityLoadoutSystem`; no other module writes the stores.
2. The four-slot cap, the no-silent-replacement rule, and the three-tier ceiling
   are enforced by throws, not by convention.
3. Loadout state is covered by the state hash and cleared by reset, proven by
   test.
4. The `/game-v2` run still plays identically end to end, with the state-hash
   change explained and re-pinned.
5. `npm run check:architecture`, `check:reset-coverage`, `lint`, `typecheck`,
   `build`, the full `tests/game-v2` suite, and the e2e smoke all pass.

## Outcome (2026-08-22)

Delivered and verified; awaiting acceptance.

Deviations from the brief above, each deliberate:

- The read path is `identityAt` / `activationAt` / `tierAt` / `indexOf` rather
  than an `AbilitySlotView` object. A view object per read would allocate on a
  60 Hz path, and the HUD that would consume one belongs to V2-103.
- The registry is injected into `AbilityLoadoutSystem` rather than imported
  (V2-ADR-039). Four-slot occupancy is untestable with the single identity
  MVP-1 starts with, and inventing placeholder identities in production config
  is the failure `MVP0_SPAWN_FREE_SLOT_RESERVE` already cost once.
- The tier ceiling is the identity's `authoredTiers`, not the universal
  maximum, so `starter-projectile` stops at tier 2 until V2-102 authors tier 3.
  The alternative was inventing an unreachable tier-3 damage constant.
- `World.weaponDamage` was removed rather than left in place, so the derived
  tier damage is the only weapon-damage authority (V2-ADR-038).
