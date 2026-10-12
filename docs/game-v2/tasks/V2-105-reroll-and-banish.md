# V2-105 — Reroll and Banish (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-104` (accepted at `7116c729`)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md` §5.4
> Governing decisions: V2-ADR-007, V2-ADR-025, V2-ADR-039, V2-ADR-049…V2-ADR-055,
> V2-ADR-056…V2-ADR-061 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Done When

One use of each obeys offer and replay contracts: a player may reroll the
current offer exactly once per run, and banish exactly one specific candidate
exactly once per run; both actions are recorded `RunCommand`s that replay
byte-identically; neither action is available before the reveal window ends,
after its own charge is spent, or outside the `level-up` phase; neither action
changes the 13-second real-time deadline.

## Scope

The design spec's entire treatment of this feature is one line (§5.4): "One
reroll and one banish are available per run in the vertical slice." Everything
below beyond that line is this brief's own interpretation, recorded as
proposed ADRs for review rather than assumed silently — see Preflight
Decisions.

In scope:

1. Two new per-run charges, `rerollCharges` and `banishCharges` (0 or 1 each),
   persisted in `World` and initialized by `resetPlayer` — independent of the
   *transient* offer state V2-104 added, since a charge stays spent even after
   the offer that consumed it resolves and clears.
2. `reroll`: spends the reroll charge, then regenerates the *entire* offer
   (fresh three-candidate draw and a fresh default index) through the same
   RNG-consuming step `generateOffer` already uses, honoring the ban list.
3. `banish`: spends the banish charge, permanently excludes one specific
   *identity* (not just the currently-shown candidate) from ever being
   offered again this run, and replaces only the banished candidate's own
   slot with a fresh draw from the remaining offerable pool — the other two
   candidates and the default index are untouched unless the default pointed
   at the banished slot, in which case a new default is drawn from the
   surviving occupied slots only.
4. Two new `RunCommand` variants (`reroll-offer`, `banish-offer`), validated
   by `CommandRecorder`, replayed by `ReplayRunner` exactly like
   `choose-upgrade`.
5. Two new card-level controls in `LevelUpOverlay.tsx`: a single "Reroll"
   control and a per-card "Banish" control, both inert during the reveal
   window, both hidden or disabled once their charge is spent, neither
   resetting or pausing the countdown.
6. Readout additions (`GameV2Debug.ts`) so the HUD/e2e can observe remaining
   charges.

Out of scope:

- Any keyboard shortcut for reroll/banish (click only, matching the two
  controls' visual affordance; `1`/`2`/`3` stay reserved for choosing).
- Increasing either charge count above one, or granting more at any point in
  a run (mid-run charge grants, if ever added, are later scope).
- The three starting weapons and remaining ability/passive identities
  (`V2-106`, `V2-107`, `V2-401`) — MVP-1 still has exactly one ability and one
  passive identity, so banishing either can legally empty a card slot; the
  mechanism must be correct for that today, mirroring V2-104's own
  two-real-identity precedent.
- Any UI polish beyond functional controls (icons, animation, tooltips).

## Preflight Decisions To Record

- **V2-ADR-056 (proposed): `rerollCharges`/`banishCharges` are persistent
  per-run `Uint8Array` stores gated by the existing `ComponentMask.LevelUpOffer`
  bit, not cleared when an offer resolves or is cleared — only by
  `resetPlayer`/slot reuse.** Rationale: a spent charge must stay spent for
  the rest of the run even though the *offer* itself is transient
  (V2-ADR-049); reusing the existing component bit avoids introducing a new
  one for two bytes that are conceptually part of the same level-up feature
  and already live on the same always-present player entity.
- **V2-ADR-057 (proposed): `reroll` regenerates the complete offer — all
  three candidate slots and the default index — via the same
  `generateOffer` RNG-consuming step, without excluding the currently-shown
  candidates from the redraw.** Rationale: a partial-slot reroll would need a
  second, different RNG-consumption shape from initial generation; reusing
  `generateOffer` verbatim (now filtering the ban list) keeps exactly one
  code path responsible for "what does a fresh offer look like," which
  `V2-104`'s determinism proof already covers. A drawn candidate reappearing
  by chance is accepted, not deduplicated against the pre-reroll offer.
- **V2-ADR-058 (proposed): `banish` bans one *identity*, not one *card* —
  the ban persists even if that identity would have been redrawn into a
  later, unrelated offer this run — and replaces only the banished
  candidate's own slot, redrawing a default index only if the old default
  pointed at that slot.** Rationale: this matches the roguelite genre
  convention the design line gestures at ("banish this option") more closely
  than a full reroll would, and is the more surgical, less disruptive
  interpretation — the other two cards and the deadline the player was
  already evaluating do not change out from under them.
- **V2-ADR-059 (proposed): both actions consume RNG at the tick they are
  invoked, exactly like `choose-upgrade` already does, which does not
  weaken V2-ADR-050.** Rationale: V2-ADR-050 forbids RNG consumption at a
  *real-time-driven* resolution (the timeout, which fires at a wall-clock
  instant no replay reproduces) — it says nothing about an explicit,
  player-driven action that is itself recorded as a `RunCommand` with its own
  tick. A reroll or banish click is exactly as replayable as a manual choice:
  the recorded tick anchors it, and a replay applies the identical command at
  the identical tick, so live and replayed RNG state stay identical by the
  same mechanism `choose-upgrade` already relies on.
- **V2-ADR-060 (proposed): reroll/banish controls share the existing reveal
  gate and never touch the 13-second deadline.** Rationale: `LevelUpOverlay`
  already computes one `revealing` boolean gating the three offer cards
  (V2-ADR-054); the new controls read the same boolean rather than
  introducing a second timing rule, and neither action's handler touches
  `elapsedMs`/`TOTAL_MS`, so the real-time deadline this task must not
  disturb is untouched by construction.
- **V2-ADR-061 (proposed): a banish that empties its slot (no remaining
  offerable candidate to redraw into) is legal, not an error.** Rationale:
  MVP-1's real offerable pool is one ability and one passive identity;
  banishing either can leave only one or zero candidates. `generateOffer`
  already tolerates and is tested against a smaller-than-three pool
  (V2-104); `banish` must tolerate the same rather than throw, since throwing
  would make the feature unusable in the very milestone that ships it.

## Files

- Modify: `game-v2/contracts/RunCommand.ts`, `game-v2/contracts/GameV2Debug.ts`,
  `game-v2/contracts/WorldSnapshot.ts` (schema version 4 → 5)
- Modify: `game-v2/world/World.ts` (new stores + `clearSlot`/`reset` wiring;
  no new `ComponentMask` bit per V2-ADR-056)
- Modify: `game-v2/replay/WorldStateValidator.ts`, `game-v2/replay/StateHasher.ts`,
  `game-v2/replay/WorldSnapshotWriter.ts`, `game-v2/replay/CommandRecorder.ts`,
  `game-v2/replay/ReplayRunner.ts`
- Modify: `game-v2/systems/LevelUpOfferSystem.ts` (`reroll`, `banish`,
  `rerollChargesOf`, `banishChargesOf`; ban-list filtering inside the existing
  enumeration loop)
- Modify: `game-v2/systems/ProgressionSystem.ts` (`rerollOffer`,
  `banishOffer` entry points; `resetPlayer` initializes both charges to 1)
- Modify: `game-v2/runtime/GameV2Runtime.ts` (`rerollOffer()`,
  `banishOffer(choiceIndex)` public methods; `readout()` charge fields)
- Modify: `game-v2/ui/LevelUpOverlay.tsx`, `game-v2/GameV2App.tsx`,
  `game-v2/game-v2.css`
- Test: every file above with an existing or new sibling test; extend
  `tests/game-v2/support/scriptedRun.ts` only if a scripted acceptance run
  needs to exercise reroll/banish (see Step 3).

## Interfaces

```ts
// game-v2/contracts/RunCommand.ts
export type RunCommand =
  | Readonly<{ tick: number; type: 'choose-upgrade'; choiceIndex: OfferCandidateIndex }>
  | Readonly<{ tick: number; type: 'reroll-offer' }>
  | Readonly<{ tick: number; type: 'banish-offer'; choiceIndex: OfferCandidateIndex }>;
```

```ts
// game-v2/systems/LevelUpOfferSystem.ts — additions
rerollChargesOf(world, owner): 0 | 1
banishChargesOf(world, owner): 0 | 1
reroll(world, rng, owner): void   // throws if no charge or no offer open
banish(world, rng, owner, index): void // throws if no charge, no offer open, or index empty
```

```ts
// game-v2/systems/ProgressionSystem.ts — additions
rerollOffer(world, playerEntity, command: RunCommand & { type: 'reroll-offer' }): void
banishOffer(world, playerEntity, command: RunCommand & { type: 'banish-offer' }): void
```

## Steps

- [ ] **Step 1: World/replay layer (RED then implement)**

`RunCommand.ts`, `World.ts` stores (`rerollCharges`, `banishCharges`,
`bannedCandidateKind`, `bannedCandidateCode` — single-slot, since only one
banish is ever possible per run) + `clearSlot`/`reset` wiring,
`WorldSnapshot.ts` (schema 5), `WorldStateValidator.ts`, `StateHasher.ts`,
`WorldSnapshotWriter.ts`, `CommandRecorder.ts`. Prove: new stores clear on
destroy/reset; the validator rejects an out-of-range charge value and a
banned-kind/code mismatch; the hash changes when any new byte changes;
`CommandRecorder` accepts `reroll-offer` (no `choiceIndex`) and
`banish-offer` (validated `choiceIndex`) and rejects malformed variants of
both.

- [ ] **Step 2: Offer mutation and resolution (RED then implement)**

`LevelUpOfferSystem.reroll`/`banish`/`rerollChargesOf`/`banishChargesOf`,
`ProgressionSystem.rerollOffer`/`banishOffer`/`resetPlayer`. Prove: reroll
without a charge throws and mutates nothing; reroll with a charge spends it
exactly once, redraws all three slots and the default from the run's RNG,
and never offers a banned identity; banish without a charge, on an empty
index, or with an out-of-range index throws and mutates nothing; banish with
a charge spends it exactly once, permanently excludes the identity from a
later `generateOffer`/`reroll` call this run (including after the offer
closes and a *later* level-up would otherwise re-offer it — MVP-1 balance
makes a later level-up unreachable per `MVP0_MAX_PLAYER_LEVEL`, so this proof
uses direct system calls, not a full second level-up), replaces only the
targeted slot, and redraws the default index only when it pointed at that
slot.

- [ ] **Step 3: Runtime wiring (RED then implement)**

`GameV2Runtime.rerollOffer()`/`banishOffer(choiceIndex)`, `readout()` charge
fields, `ReplayRunner.ts`. Prove: a recording containing a `reroll-offer` or
`banish-offer` command replays to the same offer, the same resolved choice,
and the same post-resolution RNG state at 30/60/120 FPS; a second reroll or
banish attempt after the charge is spent throws through the runtime exactly
like the system-level throw.

- [ ] **Step 4: Presentation (RED then implement)**

`LevelUpOverlay.tsx` additions, `GameV2App.tsx`, `game-v2.css`. Prove (fake
timers): both controls are inert during the reveal window; a spent reroll
charge hides or disables the reroll control without affecting the offer
cards; a spent banish charge does the same for every remaining banish
control; clicking reroll/banish does not reset `elapsedMs` or move the
countdown threshold.

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

Mutants that must die: reroll/banish spending the charge before validating
the phase/charge/index (should be after, mirroring V2-104's
validate-before-mutate order); a banished identity still appearing in a
later `generateOffer`/`reroll` call; the reveal window accepting a
reroll/banish click; a reroll or banish click advancing or resetting
`elapsedMs`; `CommandRecorder` accepting a `banish-offer` with an
out-of-range `choiceIndex` or a `reroll-offer` carrying a stray
`choiceIndex` field.

## Acceptance Criteria

1. A player may reroll the offer exactly once per run and banish exactly one
   candidate exactly once per run; a further attempt at either throws and
   mutates nothing.
2. A recorded `reroll-offer`/`banish-offer` command replays to the same
   resulting offer and the same post-resolution RNG state across independent
   live and replayed runs, at 30/60/120 FPS.
3. Neither control is usable during the reveal window; neither changes the
   13-second deadline.
4. A banished identity is never offered again this run, including by a
   subsequent reroll.
5. Every gate in Step 5 passes and the mutation pass leaves no survivor.
