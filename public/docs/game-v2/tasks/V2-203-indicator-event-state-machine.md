# V2-203 — Indicator-Event State Machine (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-200` (canonical market snapshot, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §7.4 (Indicator-event lifecycle)
> Governing decisions: V2-ADR-099 through V2-ADR-103 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Design §7.4 states each indicator-event profile "declares entry and exit
thresholds, hysteresis, confirmation time, cooldown, priority, output kind,
and primary/support compatibility," cycling through
`ARMED → CONFIRMING → ACTIVE → COOLDOWN → REARM`. No concrete indicator
family exists yet — Trend/Breakout, Volatility Surge, and Volume/Whale are
`V2-204`/`V2-205`/`V2-206`, and the primary/support composer that would
consume `priority`/`compatibility` is `V2-207`. This task builds the
**mechanism**, not authored content, mirroring this project's established
split between a generic mechanism and the LEGO blocks that later populate
it (`V2-100`'s ability-slot mechanism before `V2-102`/`V2-106`/`V2-107`
authored real abilities; `EnemyComposer`'s mechanism before
`EnemyRegistry`'s archetypes).

Unlike `V2-202`'s four placeholder fields (which needed invented numbers
because they were meant to be gameplay-affecting quantities with no system
yet to validate them against), `priority`/`outputKind`/`compatibleWith` here
need no invented values at all: they are plain carried metadata a concrete
profile's *author* will set meaningfully once `V2-204`+ exists. This task
types and validates them; it authors no real profile.

The state machine is built with real, concrete numeric threshold/hysteresis
math (not abstracted behind injected boolean predicates) because threshold
crossing is pure arithmetic on a `number` sample — there is no real
infrastructure blocker the way BTC-only scoping (`V2-200`) or single-asset
`SSEMarketService` (`V2-201`) had. This lets the state machine's own test
suite directly prove design's own worked example: an RSI-shaped test
fixture entering below 25, needing above 30 to rearm, and a
`26 → 24 → 28 → 23` sample sequence that cannot spam a second activation.

## Design: the state machine

```text
ARMED → CONFIRMING → ACTIVE → COOLDOWN → (rearm condition + cooldown ticks) → ARMED
```

Each profile declares, for one `direction` (`'below'` or `'above'`):

- `entryThreshold`: crossing this in `direction` while `ARMED` starts
  `CONFIRMING`.
- `confirmationTicks`: ticks the entry condition must hold continuously
  before promoting `CONFIRMING → ACTIVE`. If the entry condition fails at
  any point during `CONFIRMING`, the state reverts to `ARMED` immediately
  — no cooldown, because no event was ever confirmed.
- `exitThreshold`: crossing this in the *opposite* direction while `ACTIVE`
  ends the event, moving to `COOLDOWN`. (`exitThreshold` may equal
  `entryThreshold`; a profile author may also set a wider active window.)
- `cooldownTicks`: the minimum ticks `COOLDOWN` must persist.
- `hysteresis`: added to `exitThreshold` in the recovery direction to
  derive the rearm threshold. `COOLDOWN → ARMED` fires only once *both*
  `cooldownTicks` have elapsed *and* the sample has crossed the rearm
  threshold (`exitThreshold + hysteresis` for `'below'`,
  `exitThreshold - hysteresis` for `'above'`) — whichever gate is
  satisfied later is what actually unblocks the transition.

Tracing design's own worked example (`entryThreshold = 25`,
`direction = 'below'`, `exitThreshold = 25`, `hysteresis = 5`, so
`rearmThreshold = 30`) against the sample sequence `26 → 24 → 28 → 23`:
`26` stays `ARMED` (not below 25); `24` arms `CONFIRMING`; once confirmed,
`28` exits `ACTIVE` into `COOLDOWN` (28 ≥ 25) but `28 < 30` so rearm has not
fired; `23` is still inside `COOLDOWN` (not `ARMED`), so the entry condition
being true again is irrelevant — `COOLDOWN` only watches for
`cooldownTicks` elapsing and the rearm threshold, not the entry condition.
This is the literal mechanism that keeps the sequence from spamming a
second activation, proven by a property test built on exactly this fixture.

## Done When

Per `MASTER_PLAN.md`: "Confirm, hysteresis, cooldown, rearm, and reset pass
property tests." Concretely:

1. `IndicatorEventProfile` is a frozen, validated contract covering every
   design-listed field.
2. `IndicatorEventStateMachine` implements the five-stage cycle exactly as
   derived above, with an edge-flag step result (mirroring
   `ProgressionStepResult`'s shape) rather than a system that must be
   polled for its current state.
3. Property tests prove: confirmation reverts to `ARMED` on failure with no
   cooldown; a noisy sample sequence that dips-recovers-dips again cannot
   trigger a second activation before rearming (design's own worked
   example); cooldown blocks `ARMED` even after the rearm threshold is
   crossed, until `cooldownTicks` elapse; the mirrored `'above'` direction
   behaves symmetrically; `reset()` returns to `ARMED` and clears all
   counters.
4. Not wired into `GameV2Runtime` or any concrete indicator family — this
   is the mechanism only, matching `V2-200`'s own precedent for
   `MarketSnapshotAdapter`.

## Scope

In scope:

1. `game-v2/contracts/IndicatorEventProfile.ts`: `IndicatorEventDirection`
   (`'below' | 'above'`), the frozen `IndicatorEventProfile` type
   (`id`, `direction`, `entryThreshold`, `exitThreshold`, `hysteresis`,
   `confirmationTicks`, `cooldownTicks`, `priority`, `outputKind`,
   `compatibleWith`), and `assertIndicatorEventProfile` (validates
   field ranges and the `entryThreshold`/`exitThreshold`/`direction`
   relationship).
2. `game-v2/market/IndicatorEventStateMachine.ts`: `IndicatorEventState`
   (`'ARMED' | 'CONFIRMING' | 'ACTIVE' | 'COOLDOWN'`),
   `IndicatorEventStepResult` (`{ state, activatedThisTick, endedThisTick,
   rearmedThisTick }`), and the `IndicatorEventStateMachine` class:
   `step(sample, tick)`, `reset()`.
3. Tests: `IndicatorEventProfile.ts` validation (valid input; one rejection
   per invalid field, including the entry/exit/direction relationship);
   `IndicatorEventStateMachine.test.ts` covering every property named in
   the Done-When, for both directions, plus malformed-input rejection and
   monotonic-tick validation.

Out of scope:

- Any concrete indicator family (`V2-204`/`V2-205`/`V2-206`) or the
  primary/support composer (`V2-207`) that would give `priority`/
  `outputKind`/`compatibleWith` a real reader.
- Any wiring into `GameV2Runtime`, `MarketSnapshotAdapter`, or any other
  `game-v2/systems/**`/`game-v2/runtime/**` consumer.
- Reading a real `MarketSnapshot` field as the sample — the state machine
  takes a raw `number`; what indicator value feeds it is a `V2-204`+
  concern.

## Preflight Decisions To Record

- **V2-ADR-099 (proposed): the state machine is built with concrete numeric
  threshold/hysteresis fields, not injected boolean-predicate callbacks.**
  Rationale: threshold crossing is pure arithmetic on a `number`; unlike
  `V2-200`/`V2-201`'s real infrastructure blockers, there is no reason to
  abstract this away, and design explicitly frames these as declared data
  fields, not behavior.
- **V2-ADR-100 (proposed): `CONFIRMING` failing its entry condition reverts
  directly to `ARMED`, with no cooldown.** Rationale: no event was ever
  confirmed, so there is nothing to protect against re-triggering; only a
  real `ACTIVE` event (design's own anti-spam concern) needs the
  cooldown/rearm gate.
- **V2-ADR-101 (proposed): `COOLDOWN → ARMED` requires both `cooldownTicks`
  to have elapsed and the sample to have crossed the rearm threshold
  (`exitThreshold ± hysteresis`), whichever gate resolves later.**
  Rationale: design names "cooldown" and "rearm" as two distinct diagram
  stages; a value recovering instantly should still wait out the minimum
  cooldown, and a value that never recovers should never rearm regardless
  of elapsed time — either omission would defeat one of the two protections
  design describes.
- **V2-ADR-102 (proposed): `priority`, `outputKind`, and `compatibleWith`
  are typed and validated but carry no derived value — a concrete profile
  author (V2-204+) sets them meaningfully; this task authors no concrete
  profile.** Rationale: unlike `V2-202`'s placeholder fields, there is no
  "real existing constant" these could alias, because no concrete indicator
  family or output system exists yet to anchor a value to. Typing them now
  (per design's own explicit field list) avoids reshaping the contract when
  `V2-204`+ starts authoring real profiles.
- **V2-ADR-103 (proposed): `step` takes `(sample: number, tick: number)`
  directly, not the ECS `StepContext`.** Rationale: `StepContext` carries
  `intent: PlayerIntent`, which has no meaning for a market-domain state
  machine with no player/World dependency; reusing it would imply a false
  dependency. `assertStepContext`/`StepContextValidator` are ECS-specific
  and not reused here for the same reason.

## Files

- New: `game-v2/contracts/IndicatorEventProfile.ts`,
  `game-v2/market/IndicatorEventStateMachine.ts`,
  `tests/game-v2/contracts/IndicatorEventProfile.test.ts`,
  `tests/game-v2/market/IndicatorEventStateMachine.test.ts`
- Modify: none outside `game-v2/**`/`tests/game-v2/**`.

## Steps

- [ ] **Step 1: Contract (RED then implement)**

  `IndicatorEventProfile.ts`. Prove: valid input validates for both
  directions; each invalid field is independently rejected; the
  `entryThreshold`/`exitThreshold`/`direction` relationship is enforced
  (e.g. `'below'` requires `exitThreshold >= entryThreshold`).

- [ ] **Step 2: State machine (RED then implement)**

  `IndicatorEventStateMachine.ts`. Prove every property named in the
  Done-When, for both directions:
  - `ARMED → CONFIRMING` on crossing `entryThreshold`.
  - `CONFIRMING → ARMED` immediately if the entry condition fails before
    `confirmationTicks` elapses (no cooldown).
  - `CONFIRMING → ACTIVE` after `confirmationTicks` of continuous entry
    condition.
  - `ACTIVE → COOLDOWN` on crossing `exitThreshold`.
  - design's exact `26 → 24 → 28 → 23` sequence: a second entry-condition
    dip while still in `COOLDOWN` produces no second activation.
  - `COOLDOWN → ARMED` fires only once both `cooldownTicks` have elapsed
    and the rearm threshold is crossed — proven with cases where each gate
    resolves first.
  - `reset()` returns to `ARMED` and re-arms exactly like a fresh instance.
  - malformed `sample`/non-monotonic `tick` are rejected.

- [ ] **Step 3: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 4: Mutation pass**

  At minimum: `CONFIRMING` failure entering `COOLDOWN` instead of `ARMED`;
  `COOLDOWN → ARMED` firing on the timer alone (rearm condition dropped);
  `COOLDOWN → ARMED` firing on the rearm condition alone (timer dropped);
  the entry condition being checked while in `COOLDOWN` (spam-prevention
  removed); `reset()` not clearing the confirmation/cooldown counters.

## Acceptance Criteria

1. `IndicatorEventProfile` validates every design-listed field and the
   threshold/direction relationship.
2. The five-stage cycle is implemented exactly as derived, with both gates
   (timer and rearm) independently required to leave `COOLDOWN`.
3. Design's own worked example (`26 → 24 → 28 → 23` cannot spam) is proven
   by a property test.
4. `reset()` returns the machine to a state indistinguishable from fresh.
5. Nothing outside `game-v2/contracts/**`/`game-v2/market/**` is touched;
   no wiring into any runtime or system.
6. Every Step 3 gate passes and the Step 4 mutation pass leaves no
   survivor.
