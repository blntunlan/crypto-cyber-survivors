# V2-101 — Six-Slot Passive Loadout (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-100` (accepted at `677e1d24`)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md` §5.3
> Governing decisions: V2-ADR-005, V2-ADR-024, V2-ADR-025, V2-ADR-036…V2-ADR-039
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

Six identities and five levels per identity enforce offer limits.

Concretely: six passive-stat slots exist separately from the four ability slots,
a passive reaches at most five levels, a seventh identity is refused rather than
replacing a held one, an upgrade past the authored ceiling is refused, the state
is hashed and cleared with the rest of the world, and one passive changes real
gameplay through a production path.

## Scope

In scope:

1. The typed passive contract (identity, level, slot index) and its registry.
2. Authoritative storage with snapshot, hash, validator, and reset coverage.
3. Add / level-up / reset / query with enforced occupancy and level limits.
4. `move-speed` as the first passive identity, with authored per-level speed.
5. One production path: the existing paused level-up offers the passive as a
   second choice, so the loadout is reachable in a real run.

Out of scope:

- The nine remaining passive identities and offer-distribution balance
  (`V2-401`).
- The 13-second three-card reveal, countdown, timeout choice, reroll, and banish
  (`V2-104`, `V2-105`). The card stays the MVP-0 card: paused, no timer, fixed
  choices.
- Passive interaction with abilities beyond move speed (crit, armor, cooldown,
  range) — those need the stat pipeline `V2-102` defines.

## Preflight Decisions To Record

- **V2-ADR-040 (proposed): passives get their own stores, mask bit, and system
  rather than sharing the ability slots.** `passiveSlotIdentity` and
  `passiveSlotLevel` are `Uint8Array`s of length `capacity * PASSIVE_SLOT_COUNT`,
  addressed through `passiveStoreIndex`, and `ComponentMask.PassiveLoadout` is
  required by every reader. Rationale: §5.3 makes the six passive slots a
  separate capacity from the four ability slots; sharing storage would let a
  passive consume an ability slot, which is the exact failure §5.1 forbids.
- **V2-ADR-041 (proposed): `World.moveSpeed` is removed and player speed is
  derived from the `move-speed` passive level.** Rationale: `moveSpeed` is
  already a dead store — no system reads or writes it, `MovementSystem` uses the
  `PLAYER_MOVE_SPEED` constant directly — so keeping it would leave two
  candidate authorities for one fact the moment a passive changes speed. This is
  V2-ADR-038 applied to the second stat.
- **V2-ADR-042 (proposed): the MVP-0 level-up card gains a second fixed choice
  rather than waiting for V2-104.** Rationale: V2-ADR-024 — a passive loadout no
  production path can reach is inert config that ships green. The card stays
  paused with no timer, no reveal, and no reroll, so it does not counterfeit the
  V2-104 contract; it only stops being single-option.

## Files

- Create: `game-v2/contracts/PassiveSlot.ts`
- Create: `game-v2/config/PassiveRegistry.ts`
- Create: `game-v2/systems/PassiveLoadoutSystem.ts`
- Modify: `game-v2/world/World.ts`, `game-v2/world/ComponentMask.ts`
- Modify: `game-v2/contracts/WorldSnapshot.ts`, `game-v2/replay/StateHasher.ts`,
  `game-v2/replay/WorldSnapshotWriter.ts`, `game-v2/replay/WorldStateValidator.ts`
- Modify: `game-v2/systems/MovementSystem.ts` (derive speed from the passive)
- Modify: `game-v2/contracts/RunCommand.ts`, `game-v2/replay/CommandRecorder.ts`,
  `game-v2/systems/ProgressionSystem.ts`, `game-v2/runtime/GameV2Runtime.ts`,
  `game-v2/runtime/createMvp0Runtime.ts`, `game-v2/contracts/GameV2Debug.ts`
- Modify: `game-v2/ui/LevelUpOverlay.tsx`, `game-v2/GameV2App.tsx`
- Test: `tests/game-v2/systems/PassiveLoadoutSystem.test.ts`,
  `tests/game-v2/config/PassiveRegistry.test.ts`, plus updates to the world,
  snapshot, movement, progression, overlay, and runtime suites

## Interfaces

```ts
// game-v2/contracts/PassiveSlot.ts
export const PASSIVE_SLOT_COUNT = 6;
export const PASSIVE_MAX_LEVEL = 5;
export type PassiveSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type PassiveLevel = 1 | 2 | 3 | 4 | 5;
export type PassiveIdentityId = 'move-speed';
export type PassiveDefinition = Readonly<{
  id: PassiveIdentityId;
  code: number;
  authoredLevels: PassiveLevel;
}>;
```

```ts
// game-v2/systems/PassiveLoadoutSystem.ts — stateless; World is authoritative
addOrLevelUp(world, owner, identity): PassiveLevel  // throws when full or capped
levelOf(world, owner, identity): PassiveLevel | null
isOfferable(world, owner, identity): boolean
identityAt(world, owner, index): PassiveIdentityId | null
levelAt(world, owner, index): PassiveLevel | null
occupiedCount(world, owner): number
resetOwner(world, owner): void
```

## Steps

- [x] **Step 1: Record the decisions and write failing contract tests (RED)**

Prove: six slots start empty; the first `addOrLevelUp` fills the lowest free
slot at level 1; a repeat call levels the held identity in place without
consuming a second slot; a seventh identity throws instead of replacing;
levelling past `authoredLevels` throws; `isOfferable` is false for a new
identity when all six slots are full and false for a held identity at its
ceiling; `resetOwner` clears all six; index, handle, and component preconditions
are rejected with their own messages.

- [x] **Step 2: Write failing persistence tests (RED)**

Prove: passive state changes the state hash by identity, by level, and by slot
position; a checkpoint restore reproduces it; `World.reset()` and slot recycling
clear both stores; the validator rejects a level above `PASSIVE_MAX_LEVEL`, an
identity without a level, a level without an identity, and passive bytes on an
entity without the component.

- [x] **Step 3: Write the failing movement and level-up tests (RED)**

Prove: player speed at passive level 0 is `PLAYER_MOVE_SPEED`; each authored
level moves it to its authored value; the level-up card offers the passive and
`chooseUpgrade('passive-move-speed')` records the command, raises the level, and
resumes; the recorded command replays to the same state hash.

- [x] **Step 4: Implement**

Contract, registry, stores, validator, hash, system, then the movement
derivation, the command path, and the overlay button.

- [x] **Step 5: Verify (GREEN)**

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

- [x] **Step 6: Mutation pass**

Mutants that must die: filling the highest free slot; consuming a second slot for
a held identity; dropping the seventh-identity throw; dropping the level ceiling;
omitting either store from `clearSlot`, `reset`, or the hash; ignoring the
passive level in `MovementSystem`; accepting an unknown `choiceId` in
`CommandRecorder`; resolving the passive command as a weapon upgrade.

## Acceptance Criteria

1. Occupancy and level move only through `PassiveLoadoutSystem`.
2. Six slots and five levels are enforced by throws, not convention.
3. Passive state is hashed, checkpointed, and cleared by reset, proven by test.
4. A real `/game-v2` run can take the passive and move measurably faster.
5. Every gate in Step 5 passes and the mutation pass leaves no survivor.

## Outcome (2026-08-22)

Delivered and verified; awaiting acceptance.

Deviations from the brief above, each deliberate:

- `MovementSystem.resetPlayer` was written, then removed. The mutation pass
  proved no test could kill its deletion, and the reason is that it was
  redundant: `World.clearSlot` and `World.reset` already guarantee a fresh slot
  carries no passive bytes, so the method was ceremony that only looked like a
  guarantee. `WeaponSystem.resetPlayer` survives because it *installs* the
  starter ability rather than clearing state.
- `remove` has no passive equivalent. Nothing in §5.3 removes a passive, and an
  API no production path calls is the defect V2-ADR-024 exists to prevent.
- The overlay hides the passive choice rather than disabling it, and the hidden
  case is proven for both reasons it can occur (ceiling reached, no free slot).
