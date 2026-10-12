# V2-111 — Concurrent Autonomous Weapon Slots (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-107` (initial ability set, closed), `V2-108`, `V2-109` (closed)
> Blocks: `V2-110` (MVP-1 evidence gate) — see "Why this precedes V2-110"
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §5.1 (four unified ability slots), §6.1 (eight ability identities)
> Supersedes: V2-ADR-064, V2-ADR-068 (both deferred exactly this work)
> Governing decisions: V2-ADR-076, V2-ADR-077, V2-ADR-078, V2-ADR-079 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Why this task exists

`WeaponSystem` fires exactly one ability slot — index `0`, hardcoded as
`AUTONOMOUS_WEAPON_SLOT_INDEX` — and owns exactly one cooldown counter,
`world.weaponCooldownTicksRemaining[slot]`, keyed by the player's **world**
slot rather than by ability slot.

All eight registered identities are `activation: 'auto'`
(`game-v2/config/AbilityRegistry.ts`), and
`AbilityLoadoutSystem.isOfferable` does not filter by activation: any
identity is offerable while a slot is free. `WeaponSystem.resetPlayer`
always seats `starter-projectile` in slot `0`, so every other identity a
player acquires lands in slot `1`, `2`, or `3` — where nothing reads it.

The live consequence: a player offered `heavy-projectile` at their level-up
can take it, watch it occupy a HUD slot, and it never fires. With
`MVP0_MAX_PLAYER_LEVEL = 2` there is exactly one level-up per run, so that
single pick is the player's whole build decision for the run, and seven of
the eight identities make it a no-op.

V2-ADR-068 recorded this and explicitly assigned it no task ID. This brief
is that task ID.

### Why this precedes V2-110

`V2-110`'s Done-When is "Build diversity, replay, lifecycle, and playable-core
evidence are committed." Build diversity cannot be evidenced while seven of
eight ability identities are unreachable through the live
`resetPlayer` + level-up path. Running the evidence gate first would either
fail it or force it to certify diversity that only exists in direct
system-level tests. `V2-110`'s "Depends on" gains `V2-111`.

## The masked crash (do not skip this)

Fixing the firing model alone converts a silent dead pick into an **in-frame
throw**. `MVP0_MAX_LIVE_PROJECTILES = 16` and its derivation comment

```
At most ceil(PROJECTILE_LIFETIME_TICKS / WEAPON_COOLDOWN_TICKS) projectiles
are already in flight when the next one is fired, so the concurrent bound is
that quotient plus the one being fired.
```

were written for MVP-0's single 30-tick starter weapon:
`ceil(90 / 30) + 1 = 4`, with `16` as headroom. `V2-107` then authored seven
more identities without revisiting it, and the bound is already wrong for a
**single** weapon of the right identity:

| identity | fastest authored cooldown | `ceil(90 / cd) + 1` |
|---|---|---|
| `needle-projectile` | `2` (Tier 3) | **46** |
| `flicker-projectile` | `4` (Tier 3) | **24** |
| `rapid-projectile` | `10` (Tier 3) | 10 |
| `starter-projectile` | `20` (Tier 3) | 6 |
| `lance-projectile` | `30` (Tier 3) | 4 |
| `heavy-projectile` | `40` (Tier 3) | 4 |
| `cannon-projectile` | `50` (Tier 3) | 3 |
| `siege-projectile` | `80` (Tier 3) | 3 |

`needle-projectile` at Tier **1** (cooldown `3`) already implies
`ceil(90 / 3) + 1 = 31 > 16`, and Tier 1 is exactly what one level-up buys.
`RenderSnapshotWriter` throws when `projectileCount > projectileCapacity`,
and `createMvp0Runtime` passes `MVP0_MAX_LIVE_PROJECTILES` as that capacity.
Since V2-014's review round 1 the animation loop cancels itself and surfaces
the message on a throw, so this is a hard run-ending stop, not a dropped
frame.

Today the single-slot bug is what hides this: needle can only ever sit in a
slot that never fires. **The capacity re-derivation is therefore in scope
here, not deferrable** — shipping the firing fix without it trades a dead
pick for a crash.

## Done When

Every occupied `auto` ability slot fires independently on its own authored
cadence, through the live `resetPlayer` + level-up path, without exceeding
any render or world capacity bound.

## Design

### Per-ability-slot cooldown storage

`weaponCooldownTicksRemaining` moves from `Uint16Array(capacity)` to
`Uint16Array(capacity * ABILITY_SLOT_COUNT)`, addressed by the existing
`abilityStoreIndex(slot, index)` stride helper that
`abilitySlotIdentity`/`abilitySlotTier` already share (V2-ADR-036). No new
stride rule is introduced and `AbilitySlot.ts` stays its single owner.

This is a `WorldSnapshot` store-length change, so
`WORLD_SNAPSHOT_SCHEMA_VERSION` goes `6 → 7`, the shared replay validator's
length assertion for this field moves to the `capacity * ABILITY_SLOT_COUNT`
group, `StateHasher.hashWorld` replaces its single `hash.u16` with an
`ABILITY_SLOT_COUNT` loop, and every golden hash ripples — the same path
`V2-105` and `V2-109` already established.

### Firing order and targeting

`WeaponSystem.step` iterates ability slots `0..ABILITY_SLOT_COUNT` in
ascending index order. A slot participates only if it is occupied **and** its
registered `activation` is `'auto'`; `'active'` slots are untouched, so the
`active` activation path stays reserved for whatever task authors manual
abilities.

The target is resolved **once per tick, lazily**, on the first slot that
finds itself ready. `TargetingSystem.findNearestTarget` is pure, reads only
enemy transform/health, and `WeaponSystem.step` mutates no enemy — so every
ready slot in a given tick would independently compute the identical answer,
including the ascending-slot tie-break. One resolution is therefore
behavior-identical to N and strictly cheaper (V2-ADR-077).

### Whole-tick capacity guard

Today's guard is per-fire: `if (target !== NO_ENTITY && world.freeSlotCount
=== 0) throw`. With up to `ABILITY_SLOT_COUNT` fires in one tick it must
become a whole-tick precondition — count the ready-and-firing slots first,
require `world.freeSlotCount >= readyCount`, and throw **before** the first
`fire()` (V2-ADR-079). This preserves the codebase's standing
"validate everything before mutating anything" bar and matches the atomicity
`CombatSystem`'s kill-buffer capacity check already enforces.

`advanceProjectiles` keeps its current position — after target acquisition,
before the fire loop — so a projectile is never advanced on its own spawn
tick.

### Re-derived projectile capacity

```
concurrentFor(cooldownTicks) = ceil(PROJECTILE_LIFETIME_TICKS / cooldownTicks) + 1

MVP0_MAX_LIVE_PROJECTILES
  = sum of concurrentFor(minimum authored cooldown) over the
    ABILITY_SLOT_COUNT identities with the fastest authored cooldowns
  = 46 (needle T3) + 24 (flicker T3) + 10 (rapid T3) + 6 (starter T3)
  = 86
```

Derived from the authored registry, not chosen: the worst case is a player
holding the four fastest identities simultaneously, each at its fastest
authored tier. The brief deliberately does not hand-write `86` — the config
computes it from the registry so a future identity with a faster cooldown
cannot silently invalidate the bound, and a config test pins the resulting
value plus the "no authored cooldown implies more concurrent projectiles
than this bound allows" property (V2-ADR-078).

`MVP0_WORLD_CAPACITY = 512` must still hold the worst case simultaneously:
`86` projectiles + `MVP0_MAX_LIVE_ENEMIES` (`32`) + `1` player + accumulated
XP pickups. Pin the headroom as a config assertion rather than assuming it;
if it does not hold, raise capacity in this task rather than discovering it
in `V2-110`.

## Scope

In scope:

1. `game-v2/world/World.ts`: `weaponCooldownTicksRemaining` reallocated to
   `capacity * ABILITY_SLOT_COUNT`; `clearSlot` clears all
   `ABILITY_SLOT_COUNT` entries instead of one.
2. `game-v2/contracts/WorldSnapshot.ts`: `WORLD_SNAPSHOT_SCHEMA_VERSION`
   `6 → 7`; the field's documented length changes group.
3. `game-v2/systems/WeaponSystem.ts`: multi-slot firing per the Design
   section. `AUTONOMOUS_WEAPON_SLOT_INDEX` is deleted, not retained as a
   default. `resetPlayer` zeroes all four cooldown entries.
4. `game-v2/config/Mvp0Config.ts`: `MVP0_MAX_LIVE_PROJECTILES` re-derived
   from the registry per the Design section, with the stale single-weapon
   derivation comment replaced.
5. `game-v2/replay/WorldStateValidator.ts`, `game-v2/replay/StateHasher.ts`,
   `game-v2/replay/WorldSnapshotWriter.ts`: the store-length/stride ripple.
6. Tests: `WeaponSystem` multi-slot cadence, per-slot cooldown independence,
   `active`-slot exclusion, whole-tick capacity atomicity, the re-derived
   capacity bound, `World`/`WorldSnapshot` round-trip and reset at the new
   length, and one real production-path integration proving a run that takes
   a second `auto` identity at its level-up sees **both** weapons firing.
7. Golden-hash ripple in `WorldSnapshot.test.ts`, `Mvp0Runtime.test.ts`,
   `ReplayRunner.test.ts`.

Out of scope:

- `active`-activation abilities actually doing anything on their `1`–`4`
  binding. No identity is `active` today; this task only makes sure the
  firing loop skips them rather than firing them as autonomous weapons.
- Any offer-side change. `isOfferable` deliberately keeps offering a second
  `auto` identity — this task is what makes that offer honest, so narrowing
  it would be the wrong half of the fix.
- Raising `MVP0_MAX_PLAYER_LEVEL`. Two concurrent weapons is what one
  level-up can reach; the four-slot case stays proved by direct system tests,
  matching V2-ADR-039's existing precedent.
- `starterDamageOf`/`advanceStarterTier`'s slot-`0` framing. Both name the
  *starter* specifically; `starterDamageOf` feeds one debug readout field and
  `GameV2Debug.abilitySlots` already exposes per-slot state. Note in
  `PROGRESS.md` that `advanceStarterTier` has had no production caller since
  V2-ADR-053; do not remove it here.
- `AbilitySlot.startEligible` still having no reader (V2-ADR-062) and
  `LevelUpOverlay`'s wall-clock timer (V2-ADR-050/V2-ADR-054). Both were
  reviewed alongside this finding and deliberately left: the first is
  correct data waiting on an MVP-4 UI, the second is a determinism guarantee
  that moving into simulation time would break.

## Preflight Decisions To Record

- **V2-ADR-076 (proposed): `weaponCooldownTicksRemaining` becomes
  per-ability-slot, `capacity * ABILITY_SLOT_COUNT`, addressed through the
  existing `abilityStoreIndex` stride; schema `6 → 7`.** Rationale: a
  cooldown is a property of the weapon in a slot, not of the entity holding
  it. Reusing the stride `abilitySlotIdentity`/`abilitySlotTier` already
  share keeps `AbilitySlot.ts` the single owner of the rule (V2-ADR-036) and
  keeps checkpoint/replay/hash coverage automatic through the existing
  `WorldSnapshot` pipeline.
- **V2-ADR-077 (proposed): every occupied `auto` slot fires independently in
  ascending slot-index order, against one target resolved lazily once per
  tick.** Rationale: `findNearestTarget` is pure and `WeaponSystem.step`
  mutates no enemy, so per-slot resolution is provably identical to one
  shared resolution including the tie-break; ascending order matches the
  ascending-slot determinism convention every other system already uses.
- **V2-ADR-078 (proposed): `MVP0_MAX_LIVE_PROJECTILES` is derived from the
  registry as the summed concurrent bound of the `ABILITY_SLOT_COUNT`
  fastest authored cooldowns, not hand-written.** Rationale: the existing
  `16` was derived for one 30-tick weapon and `V2-107` invalidated it without
  noticing, because the single-slot firing bug made the fast identities
  unreachable. Computing it from the registry makes a future fast identity
  update the bound instead of silently exceeding it, and
  `RenderSnapshotWriter`'s throw makes exceeding it run-ending rather than
  cosmetic.
- **V2-ADR-079 (proposed): the projectile-capacity precondition is
  whole-tick — `freeSlotCount >= readyFireCount`, checked before the first
  `fire()`.** Rationale: with up to four fires per tick a per-fire check
  could partially fire, leaving the tick half-applied; this matches the
  atomicity `CombatSystem`'s kill-buffer capacity check already enforces.

## Files

- Modify: `game-v2/world/World.ts`, `game-v2/contracts/WorldSnapshot.ts`,
  `game-v2/systems/WeaponSystem.ts`, `game-v2/config/Mvp0Config.ts`,
  `game-v2/replay/WorldStateValidator.ts`, `game-v2/replay/StateHasher.ts`,
  `game-v2/replay/WorldSnapshotWriter.ts`
- Test: `tests/game-v2/systems/WeaponSystem.test.ts`,
  `tests/game-v2/world/World.test.ts`,
  `tests/game-v2/replay/WorldSnapshot.test.ts`,
  `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/integration/Mvp0Runtime.test.ts`,
  `tests/game-v2/replay/ReplayRunner.test.ts`
- New: `tests/game-v2/integration/ConcurrentWeapons.test.ts`

## Steps

- [ ] **Step 1: Re-derived projectile capacity (RED then implement)**

  Add the registry-derived `MVP0_MAX_LIVE_PROJECTILES` computation to
  `Mvp0Config.ts`. Prove in `Mvp0Config.test.ts`: the derived value equals
  the summed bound over the four fastest authored cooldowns; **no** authored
  `(identity, tier)` pair implies a concurrent count the bound cannot hold;
  and `MVP0_WORLD_CAPACITY` holds the worst case simultaneously with
  `MVP0_MAX_LIVE_ENEMIES` and the player. Write these RED against the
  current `16` first — they must fail before the derivation lands.

- [ ] **Step 2: Per-slot cooldown storage (RED then implement)**

  Reallocate the store in `World.ts`, clear all four entries in `clearSlot`,
  bump the schema to `7`, and thread the new length through the validator,
  the writer, and `StateHasher`'s per-slot loop. Prove: the store round-trips
  at the new length; `World.reset()` clears every ability-slot entry, not
  just index `0`; the validator rejects a snapshot carrying the **old**
  `capacity`-length store; the schema bump is asserted; golden hashes are
  re-selected deliberately, not left stale.

- [ ] **Step 3: Multi-slot firing (RED then implement)**

  Prove: two occupied `auto` slots with different authored cooldowns each
  fire on their own cadence and neither resets the other's counter; a slot
  holding an `active` identity never fires; four occupied `auto` slots fire
  in ascending index order within one tick; the whole-tick capacity guard
  throws before **any** fire when `freeSlotCount < readyCount` (assert zero
  projectiles were created on the throwing tick); an empty slot is skipped
  without consuming a cooldown; `resetPlayer` zeroes all four entries.

- [ ] **Step 4: Production-path integration (RED then implement)**

  A scripted run that reaches its level-up, takes a second `auto` identity,
  and then observes projectiles attributable to **both** slots — assert
  discrete per-fire damage values matching each slot's authored tier effect,
  the same technique V2-013's review fix round 2 established, rather than an
  aggregate count that a single-weapon mutant could satisfy.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:event-contract
  npm run check:ui-contract
  npm run lint
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 6: Mutation pass**

  At minimum, each must be killed by a named test: fire only slot `0` (the
  original bug); share one cooldown counter across slots; fire `active`
  slots too; move the capacity guard after the first `fire()`; iterate slots
  descending; clear only entry `0` in `clearSlot`; revert
  `MVP0_MAX_LIVE_PROJECTILES` to `16`; drop the `+ 1` from `concurrentFor`.

## Acceptance Criteria

1. Every occupied `auto` slot fires on its own authored cadence, with
   per-slot cooldown state, proved through the live `resetPlayer` +
   level-up path and not only by direct system tests.
2. `MVP0_MAX_LIVE_PROJECTILES` is derived from the registry, holds for every
   authored `(identity, tier)` pair, and fits inside `MVP0_WORLD_CAPACITY`
   alongside the enemy cap — each pinned by a test.
3. The projectile-capacity precondition is whole-tick and atomic: a refused
   tick creates no projectile.
4. `World`/`WorldSnapshot`/checkpoint/replay/hash correctly carry the
   re-shaped store at schema `7`; no existing replay or determinism
   assertion is weakened to accommodate it.
5. Every gate in Step 5 passes and the Step 6 mutation pass leaves no
   survivor.
