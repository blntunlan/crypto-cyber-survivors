# V2-112 — Repeating Level Curve (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-104` (thirteen-second card flow), `V2-109` (Convergence),
> `V2-111` (concurrent autonomous weapons) — all closed
> Blocks: `V2-110` (MVP-1 evidence gate) — see "Why this precedes V2-110"
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §5.1 (four slots, "when all four slots are occupied"), §5.2 (three tiers),
> §5.3 (six passive slots, five levels each), §5.4 (level-up offer)
> Governing decisions: V2-ADR-080, V2-ADR-081, V2-ADR-082 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Why this task exists

`ProgressionSystem.step` grants exactly one level-up per run. The branch is
literally single-shot:

```ts
if (playerLevel === PLAYER_STARTING_LEVEL && nextPlayerXp >= LEVEL_2_XP_THRESHOLD)
```

with `MVP0_MAX_PLAYER_LEVEL = 2`. There is no repeating curve, so a run ends
with at most **one** upgrade pick.

Every one of these design-contract statements is unreachable as a result:

- §5.1 "When all four slots are occupied: normal level-up offers contain
  upgrades or evolutions for the current build" — two slots is the ceiling
  today (starter plus one pick).
- §5.2 "Acquisition counts as Tier 1; two later upgrade cards complete Tier 2
  and Tier 3" — a second upgrade card never comes.
- §5.3 "A passive can reach at most five levels" and "When all six passive
  slots are occupied, new passive identities are not offered" — a passive
  never exceeds level 1, and a second passive slot is never filled.

`V2-100`'s and `V2-101`'s four-slot and five-level limits are therefore proved
only by contract tests against injected registries (V2-ADR-039), never by
gameplay. `PROGRESS.md`'s "Known MVP-0 Limitations" predicted this would
resolve when "V2-104 replaces the fixed card with the real offer flow";
`V2-104` shipped and the cap stayed at `2`, so the prediction was wrong and
the limitation is still open.

### Why this precedes V2-110

`V2-110`'s Done-When is "Build diversity, replay, lifecycle, and playable-core
evidence are committed," and MVP-1's stated goal is to "prove that constrained
builds create meaningful play." With one pick per run there is no build to
diversify. Running the evidence gate first would certify a milestone whose
central claim is unmet. `V2-110`'s "Depends on" gains `V2-112`.

## Done When

A run grants repeated level-ups on a derived XP curve, so the four-slot
ability cap, the three-tier ability path, the six-slot passive cap, and the
five-level passive path are all reachable through ordinary play rather than
only through injected-registry contract tests.

## Design: the curve derivation

> **Corrected during implementation.** This section originally derived 42
> picks / level 43 / step 2 from the slot contracts alone. Two assumptions in
> that derivation were wrong and both were caught by a failing test, not by
> review — the corrected numbers are below and the originals are recorded in
> `PROGRESS.md`.

Two independent quantities already exist in config and pin both ends of the
curve, so nothing here is chosen by feel.

**The build's total size** is fixed by what the registries can actually offer,
not by slot capacity:

```
MVP1_TOTAL_BUILD_PICKS
  = min(ABILITY_SLOT_COUNT, abilityRegistry.size) * ABILITY_MAX_TIER
  - GRANTED_STARTING_WEAPON_PICKS
  + min(PASSIVE_SLOT_COUNT, passiveRegistry.size) * PASSIVE_MAX_LEVEL
  = min(4, 8) * 3 - 1 + min(6, 1) * 5
  = 12 - 1 + 5
  = 16

MVP1_MAX_PLAYER_LEVEL = PLAYER_STARTING_LEVEL + MVP1_TOTAL_BUILD_PICKS = 17
```

Two corrections are folded into that formula:

1. **Registry size, not slot capacity.** MVP-1 registers eight abilities but
   only **one** passive identity (`MOVE_SPEED_PASSIVE`); `V2-401` authors the
   other nine in MVP-4. Six empty passive slots with one identity to fill them
   contribute one slot's worth of picks, not six. Deriving from
   `PASSIVE_SLOT_COUNT` alone overcounted by 25 picks and made
   `generateOffer` throw `no offerable candidates exist` long before the cap.
2. **The starting weapon is granted, not picked.** Design §5.1 gives the
   player their starting weapon before the run, and `WeaponSystem.resetPlayer`
   seats it at Tier 1. That Tier-1 acquisition costs no card, so raw capacity
   overcounts by exactly one.

Both are keyed off live values, so when `V2-401` lands the ten passives the
cap re-derives itself to 41 picks / level 42 with no edit here.

**The XP available in one cycle** is fixed by `V2-109`'s Convergence
derivation (V2-ADR-072): a baseline player reaches the Convergence threshold
with `CONVERGENCE_KILLS_TO_THRESHOLD = 480` kills worth
`CONVERGENCE_THRESHOLD = 2400` XP-equivalent points.

The curve is arithmetic, anchored on the existing first threshold:

```
levelXpThreshold(level) = LEVEL_2_XP_THRESHOLD + LEVEL_XP_STEP * (level - 1)
                        = 5 + 19 * (level - 1)
```

`LEVEL_2_XP_THRESHOLD = 5 = ENEMY_XP_VALUE` is unchanged, so the existing
"one grunt kill produces the first level-up" property and every test pinning
it survive.

`LEVEL_XP_STEP` is derived, not chosen: it is **the largest integer step for
which a fully capped build still completes inside the Convergence baseline**,
and it is *computed* rather than written down so it re-derives itself when the
registries grow.

```
step 19 -> sum of thresholds for levels 2..17 = 2360 XP = 472.0 grunt kills   (<= 2400)
step 20 -> sum of thresholds for levels 2..17 = 2480 XP = 496.0 grunt kills   (>  2400)
```

Both sums, and the overshoot that makes `19` maximal, are pinned as exact
equalities in `LevelCurve.test.ts`. The ordering this produces is the intended
one: a baseline player finishes their build at 472 of the 480 kills that reach
Convergence, so the boss threshold arrives just *after* the build is complete
rather than during it.

## Design: at most one level-up per tick

A kill batch can carry enough XP to cross two thresholds at once, especially
early where they are 5, 7 and 9. The level-up branch stays **one level per
tick** and keeps the surplus in `world.xp`: the lifecycle pauses at
`level-up`, and once `resolveUpgrade` resumes the run, the very next
`step` sees the retained XP still above the next threshold and pauses again
(V2-ADR-081). This preserves one card per pick — §5.4's whole model — instead
of silently consuming two picks for one card, and it needs no queue, no
pending-offer state, and no change to `resolveUpgrade`.

The `MVP1_MAX_PLAYER_LEVEL` guard is what keeps `generateOffer` from throwing
`no offerable candidates exist` at a capped build: the 16 picks exhaust the
offerable pool exactly, so level `17` is reached precisely when nothing is
offerable, and the branch stops before asking for an offer it cannot fill.

## Scope

In scope:

1. `game-v2/config/LevelCurve.ts` (new): `LEVEL_XP_STEP`,
   `MVP1_TOTAL_BUILD_PICKS`, `GRANTED_STARTING_WEAPON_PICKS`,
   `MVP1_MAX_PLAYER_LEVEL`, `MVP1_FULL_BUILD_XP_COST`, and a
   `levelXpThreshold(level)` helper, derived per the section above.
   `MVP0_MAX_PLAYER_LEVEL` is removed, not aliased. The curve cannot live in
   `Mvp0Config.ts`: it reads the registries, which already import from that
   module, so deriving it there would close an import cycle — the same
   constraint `ProjectileCapacity.ts` solved the same way in `V2-111`.
2. `game-v2/systems/ProgressionSystem.ts`: the single-shot branch becomes a
   repeating one gated on `levelXpThreshold(playerLevel)` and
   `MVP1_MAX_PLAYER_LEVEL`, with the one-level-per-tick rule above. The
   generate-before-mutate ordering and its atomicity comment stay exactly as
   they are.
3. Tests: config derivation equalities; `ProgressionSystem` repeated level-ups,
   surplus retention, the two-thresholds-in-one-tick case, the max-level stop,
   and no-offer-at-cap; a real production-path integration proving a run
   reaches a **fully capped build** — every ability slot the registry can fill
   at Tier 3 and every fillable passive slot at level 5 — and that the level-up
   branch then stops without throwing.
4. Ripple: every test pinning `MVP0_MAX_PLAYER_LEVEL` or assuming one
   level-up per run — `Mvp0Runtime.test.ts`, `ProgressionSystem.test.ts`,
   `ReplayRunner.test.ts`, `Mvp0Config.test.ts`, and
   `e2e/game-v2-walking-skeleton.spec.ts`'s level-2 assertion.
5. `PROGRESS.md`'s "Known MVP-0 Limitations" entry for the one-level-up cap is
   removed, since it stops being true.

Out of scope:

- Any change to what the offer *contains* or how candidates are drawn. The
  offer pool, reroll, and banish are `V2-104`/`V2-105` and stay untouched;
  this task only changes how often an offer is generated.
- Rebalancing ability or passive numbers now that a full build is reachable.
  Balance is `V2-405`'s lethality audit (MVP-4); if a capped build turns out
  to trivialize the cycle, that is a finding for the `V2-110` evidence gate to
  record, not something to tune here by feel.
- Raising `CONVERGENCE_THRESHOLD` or touching `V2-109`'s envelope. The curve is
  derived *from* that envelope; changing both together would leave neither
  anchored.
- A visible level/XP HUD element beyond the `playerLevel` field the readout
  already exposes.

## Preflight Decisions To Record

- **V2-ADR-080: `MVP1_MAX_PLAYER_LEVEL` is derived from what the registries
  can actually offer — capped by registry size, minus the granted starting
  weapon — not from slot capacity.** Rationale: the picks and the level cap
  must coincide exactly, so the cap is reached precisely when nothing is
  offerable and `generateOffer`'s `no offerable candidates exist` throw stays
  unreachable through ordinary play. Deriving from slot capacity alone
  overcounted by 26 (25 phantom passive picks plus the granted starting
  weapon) and made that throw fire mid-run. Keying off live registry sizes
  also means `V2-401` raises the cap without an edit here.
- **V2-ADR-081 (proposed): at most one level-up resolves per tick; surplus XP
  is retained and the next tick pauses again.** Rationale: §5.4 gives one card
  per pick. A kill batch crossing two thresholds must not consume two picks for
  one card. Retaining surplus and re-entering the branch after `resolveUpgrade`
  needs no queue and no new state, so `RuntimeCheckpoint` and the replay hash
  are unaffected.
- **V2-ADR-082: `LEVEL_XP_STEP` is computed as the largest integer step for
  which a fully capped build completes inside `CONVERGENCE_THRESHOLD`.**
  Rationale: at today's 16 picks, `step 19` costs 2360 XP and `step 20` costs
  2480 against a 2400 baseline, so the choice is forced rather than tuned. It
  produces the intended ordering — the build finishes at 472 of the 480 kills
  that reach Convergence — and keeps `LEVEL_2_XP_THRESHOLD = ENEMY_XP_VALUE`
  so the existing "first kill, first level" property is preserved. Computing
  it rather than writing it down means it re-derives itself as the registries
  grow.
- **V2-ADR-083: XP pickups expire after `XP_PICKUP_LIFETIME_TICKS`, derived as
  the time to cross the visible arena at base move speed (`18 / 6 = 3`
  seconds, 180 ticks). A pickup collected on the same tick it expires counts
  as collected, and is recorded for destruction exactly once.** Rationale:
  pickups previously had no lifetime, bounded only by `MVP0_WORLD_CAPACITY`
  — already recorded in `PROGRESS.md` as MVP-1 work. The repeating curve is
  what made runs long and lethal enough to actually reach that bound, at
  which point `WeaponSystem` threw `entity capacity exhausted` mid-frame and
  the run ended. A pickup older than one arena crossing was already
  unreachable from where the player stood when it dropped, so expiring it
  removes nothing a player could have collected.

## Files

- Modify: `game-v2/config/Mvp0Config.ts`,
  `game-v2/systems/ProgressionSystem.ts`
- Test: `tests/game-v2/config/Mvp0Config.test.ts`,
  `tests/game-v2/systems/ProgressionSystem.test.ts`,
  `tests/game-v2/integration/Mvp0Runtime.test.ts`,
  `tests/game-v2/replay/ReplayRunner.test.ts`,
  `e2e/game-v2-walking-skeleton.spec.ts`
- New: `tests/game-v2/integration/FullBuild.test.ts`

## Steps

- [ ] **Step 1: Curve constants (RED then implement)**

  Add `LEVEL_XP_STEP`, `MVP1_TOTAL_BUILD_PICKS`, `MVP1_MAX_PLAYER_LEVEL`, and
  `levelXpThreshold`. Prove the exact equalities: the pick count from the
  registries and slot contracts together;
  `levelXpThreshold(1) === LEVEL_2_XP_THRESHOLD === ENEMY_XP_VALUE`;
  cumulative cost to `MVP1_MAX_PLAYER_LEVEL` is `2360`; the same sum at
  `LEVEL_XP_STEP + 1` is `2480` and exceeds `CONVERGENCE_THRESHOLD`, so the
  step is maximal.

- [ ] **Step 2: Repeating level-up (RED then implement)**

  Prove: a second kill after the first upgrade produces a second level-up; XP
  surplus carries rather than being discarded; a single tick carrying two
  thresholds' worth of XP advances exactly one level and leaves the rest; the
  branch stops at `MVP1_MAX_PLAYER_LEVEL` and generates no offer there;
  `resolveUpgrade` still resumes to `playing` and the next `step` re-pauses
  when the retained XP already clears the next threshold.

- [ ] **Step 3: Full-build integration (RED then implement)**

  Drive the real systems until the player reaches `MVP1_MAX_PLAYER_LEVEL`.
  Assert the build is genuinely capped — every ability slot occupied at
  `ABILITY_MAX_TIER` and every passive slot at `PASSIVE_MAX_LEVEL` — and that
  a further kill produces no level-up and no offer. This is the test that
  makes §5.1/§5.2/§5.3 reachable by play rather than by injected registries.

- [ ] **Step 4: Ripple (RED then implement)**

  Update every test and the e2e spec that assumed one level-up per run. Each
  must be re-pointed at the new contract, never weakened: an assertion that
  read "level is 2 at the end" becomes an assertion about the level the run
  actually reaches, not a removed assertion.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:event-contract
  npm run check:ui-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 6: Mutation pass**

  At minimum, each killed by a named test: revert to the single-shot
  `playerLevel === PLAYER_STARTING_LEVEL` branch; drop the
  `MVP1_MAX_PLAYER_LEVEL` guard (must fail with `no offerable candidates
  exist` at the cap); discard surplus XP instead of retaining it; resolve two
  levels in one tick; make the threshold flat (`LEVEL_2_XP_THRESHOLD` for
  every level); change `LEVEL_XP_STEP` to 1 and to 3.

## Acceptance Criteria

1. A run grants repeated level-ups, and a fully capped build — every ability
   slot the registry can fill at Tier 3, every fillable passive slot at level
   5 — is reachable through ordinary play, proved by a real production-path
   integration test.
2. `MVP1_MAX_PLAYER_LEVEL` and `LEVEL_XP_STEP` are derived from existing slot
   contracts and `V2-109`'s Convergence baseline, with the derivation pinned
   as exact equalities including the maximality of the step.
3. Exactly one level-up resolves per tick, surplus XP is retained, and the
   level-up branch generates no offer at the cap.
4. No existing replay, determinism, or lifecycle assertion is weakened to
   accommodate the change; every ripple is re-pointed at the new contract.
5. Every gate in Step 5 passes and the Step 6 mutation pass leaves no
   survivor.
