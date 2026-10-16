# V2-103 — Dynamic Ability HUD (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-100` (accepted at `677e1d24`)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md` §5.1
> Governing decisions: V2-ADR-005, V2-ADR-036, V2-ADR-039, V2-ADR-047, V2-ADR-048
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

Only occupied slots display; active keys and AUTO labels are correct.

Concretely: the `/game-v2` HUD shows one entry per occupied ability slot and no
entry for an empty one; an `active` ability's entry shows its `1`–`4` binding
(its slot position); an `auto` ability's entry shows `AUTO` (design §5.1); the
displayed tier always matches what `WeaponSystem` is currently firing with, so
the HUD and the simulation cannot disagree.

## Scope

In scope:

1. Exposing the four ability slots' occupancy, activation, and tier through
   `GameV2RuntimeReadout` — the runtime's existing cheap, hash-free read.
2. Rendering that data on the `/game-v2` HUD: one visible entry per occupied
   slot, hidden for an empty one, labelled with the binding/AUTO rule.
3. Refreshing the display at the HUD's existing cadence
   (`HUD_FRAME_INTERVAL`), through the same imperative-DOM-ref pattern the
   level/health/tick fields already use — not a second, React-state-driven
   HUD subsystem.

Out of scope:

- Any change to ability occupancy, activation, or tier logic —
  `AbilityLoadoutSystem` is read-only from this task's perspective.
- Reveal/countdown/reroll/banish or the real card offer flow (`V2-104`,
  `V2-105`).
- A second or third ability identity (`V2-106`, `V2-107`) — the HUD must
  display correctly for the one registered identity today and generalize by
  construction, not by adding cases for identities that do not exist yet.
- Passive-slot display — `PassiveLoadoutSystem` already has no HUD surface and
  this task does not add one.

## Preflight Decisions To Record

- **V2-ADR-047 (proposed): `GameV2RuntimeReadout` gains
  `abilitySlots: readonly (AbilitySlotReadout | null)[]` of length
  `ABILITY_SLOT_COUNT`, and `GameV2Runtime` takes an `AbilityLoadoutSystem` as
  an explicit dependency to fill it — the same instance `createMvp0Runtime`
  already injects into `WeaponSystem`.** Rationale: `GameV2Runtime` currently
  has no path to ability-slot data at all; `WeaponSystem` holds an
  `AbilityLoadoutSystem` privately and exposes only starter-weapon-specific
  reads (`starterDamageOf`, `advanceStarterTier`). Adding slot-generic HUD
  reads to `WeaponSystem` would be scope creep onto a system whose job is
  firing, not display. Sharing the one instance (not constructing a second)
  keeps `AbilityLoadoutSystem`'s "no per-run state" property (V2-ADR-025)
  irrelevant to correctness either way, but avoids two objects that could in
  principle be handed different registries.
- **V2-ADR-048 (proposed): an `active` ability's displayed binding is derived
  from its slot index (`index + 1`) at read time, never stored.** Design §5.1
  says active abilities display their `1`–`4` binding; the binding is the slot
  position, not a separately authored fact, so storing it would create a
  second value that could disagree with `AbilityLoadoutSystem`'s own slot
  order. `AbilitySlotReadout` therefore carries `index`, `activation`, and
  `tier` — never a precomputed label string — and the HUD formats the label.

## Files

- Modify: `game-v2/contracts/GameV2Debug.ts` (`AbilitySlotReadout`,
  `GameV2RuntimeReadout.abilitySlots`)
- Modify: `game-v2/runtime/GameV2Runtime.ts` (`abilityLoadoutSystem`
  dependency; `readout()` and `EMPTY_READOUT` fill `abilitySlots`)
- Modify: `game-v2/runtime/createMvp0Runtime.ts` (pass the existing
  `abilityLoadout` instance into `GameV2Runtime`'s dependencies)
- Create: `game-v2/ui/AbilitySlotLabel.ts` (pure `index`/`activation`/`tier` →
  display-string formatting, unit-testable without React)
- Modify: `game-v2/GameV2App.tsx` (four ability-slot HUD spans, refreshed by
  `syncHud()` via refs, hidden when their slot is empty)
- Modify: `game-v2/game-v2.css` (ability-slot HUD field styling, rooted under
  `.game-v2`)
- Modify: `e2e/game-v2-walking-skeleton.spec.ts` (assert the starter weapon's
  `AUTO` label is visible during the scripted run)
- Test: `tests/game-v2/integration/Mvp0Runtime.test.ts` (readout coverage),
  `tests/game-v2/runtime/GameV2RuntimeBounds.test.ts` if `EMPTY_READOUT`
  shape assertions live there, `tests/game-v2/ui/AbilitySlotLabel.test.ts`
  (new), `tests/game-v2/entry/GameV2App.test.tsx`

## Interfaces

```ts
// game-v2/contracts/GameV2Debug.ts
export type AbilitySlotReadout = Readonly<{
  index: AbilitySlotIndex;
  activation: AbilityActivation;
  tier: AbilityTier;
}>;

export type GameV2RuntimeReadout = Readonly<{
  // ...existing fields unchanged...
  /** Length `ABILITY_SLOT_COUNT`; `null` at an empty slot index. */
  abilitySlots: readonly (AbilitySlotReadout | null)[];
}>;
```

```ts
// game-v2/ui/AbilitySlotLabel.ts
export const formatAbilitySlotBinding = (slot: AbilitySlotReadout): string =>
  slot.activation === 'auto' ? 'AUTO' : String(slot.index + 1);
```

## Steps

- [x] **Step 1: Record the decisions and write failing readout tests (RED)**

Proved: a fresh player's `readout().abilitySlots` has length
`ABILITY_SLOT_COUNT` with the starter weapon occupying index `0` (`auto`,
tier `1`) and every other index `null`; advancing the starter tier through the
real level-up path changes only that slot's `tier`; `abilitySlots` is all
`null` before `start()` and after `dispose()`.

- [x] **Step 2: Write the failing pure-formatter test (RED)**

Proved: `formatAbilitySlotBinding` returns `'AUTO'` for an `auto` slot
regardless of index, and the 1-based index string (`'1'`…`'4'`) for an
`active` slot at each index.

- [x] **Step 3: Write the failing `GameV2App` HUD test (RED)**

Proved: on mount, exactly one ability-slot HUD entry is visible and shows
`AUTO`; the other three are hidden (`.not.toBeVisible()`, not a text-content
check).

- [x] **Step 4: Implement**

`GameV2Debug.ts` type, `GameV2Runtime` dependency and `readout()`/
`EMPTY_READOUT` fill, `createMvp0Runtime.ts` wiring, `AbilitySlotLabel.ts`,
then the `GameV2App.tsx` HUD spans and their `syncHud()` update.

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

Five mutants ran, each restored byte-identically (sha256-verified) before the
next. Three died: `readAbilitySlots` always reporting a slot empty; an
`active` binding computed from a constant instead of its own index; an `auto`
slot showing its index instead of `AUTO`. Two survive by construction, not
strengthened into false coverage; see Outcome.

## Acceptance Criteria

1. `readout().abilitySlots` is the single source the HUD reads; no ability
   slot fact is duplicated into a second HUD-only store.
2. An empty slot renders nothing visible; an occupied one renders its correct
   binding (`1`–`4` or `AUTO`) and current tier.
3. The displayed tier always matches `WeaponSystem.starterDamageOf`'s tier —
   proven by advancing a tier and observing both change together.
4. The e2e run visibly shows `AUTO` for the starter weapon during a real
   browser session, not only in a unit test.
5. Every gate in Step 5 passes and the mutation pass leaves no survivor.

## Outcome (2026-08-23)

Delivered and verified; awaiting acceptance.

Deviations from the brief above, each deliberate:

- Two of the six named mutants in Step 6 (the brief listed five distinct
  mutations, one covering two named failure modes — "an occupied slot reported
  as `null` or vice versa" — as one) survive by construction rather than dying,
  and are not hidden:
  - The HUD failing to hide an empty slot is unobservable by any reachable
    state. No production path (`AbilityLoadoutSystem.remove` included) ever
    empties an occupied ability slot in MVP-1 — the same fact `V2-101` found
    true of passives — so a slot the HUD must hide is always already hidden by
    its JSX default, before `syncHud()` ever runs. The defensive
    `el.hidden = true` write stays in place for when `V2-310` (boss slot
    replacement) makes occupancy loss real, but no test today can distinguish
    its presence from its absence.
  - Constructing a second `AbilityLoadoutSystem` in `createMvp0Runtime.ts`
    instead of sharing the one given to `WeaponSystem` is semantically
    equivalent, not merely unreached. `AbilityLoadoutSystem` holds no per-run
    state (V2-ADR-025) and both constructions use the same default registry,
    so two instances read the same `World` identically. The brief's
    V2-ADR-047 rationale overstated this as a possible behavioral divergence;
    it is a single-authority style preference, and V2-ADR-047's wording in
    `DECISIONS.md` was corrected to say so during this task rather than left
    to mislead a future reader.
- `tests/game-v2/runtime/GameV2RuntimeBounds.test.ts`'s hand-composed runtime
  needed a new explicit `AbilityLoadoutSystem`, shared with its `WeaponSystem`,
  that the brief's Files list did not name — a direct consequence of
  `GameV2RuntimeDependencies` gaining a required field.
