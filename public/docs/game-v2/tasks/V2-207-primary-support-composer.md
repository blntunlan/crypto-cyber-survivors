# V2-207 — Primary/Support Composer (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-204`, `V2-205`, `V2-206` (all three indicator-event families, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.2 (Encounter outputs), §7.5 (Freshness and concurrency)
> Governing decisions: V2-ADR-122 through V2-ADR-127 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Design §6.2: "At most one primary encounter and one compatible support
modifier may be active. Signals do not form an unbounded queue." §7.5:
"Compatible simultaneous signals may produce one primary plus one support.
Incompatible or lower-priority signals are rejected rather than banked. A
merged event consumes the cooldown/rearm state of every source profile it
uses."

This is the first task to read `priority`/`compatibleWith` — both fields
have existed on `IndicatorEventProfile` since `V2-203` with no consumer
(the same class of gap `V2-ADR-062`'s `AbilitySlot.startEligible` and
`V2-ADR-068`'s single-fixed-slot firing were before their own consuming
tasks landed). `EncounterComposer` is the mechanism only, mirroring every
prior MVP-2 task's mechanism-before-content split: it does not author new
`compatibleWith` content for the three real families, which all still
declare `compatibleWith: []`. This is a deliberate choice, not an
oversight — deciding *which* families feel thematically compatible
together (a breakout with a volatility surge? a whale event with either?)
is a real game-design judgment call with no derivable anchor, squarely the
kind of content decision this milestone's tasks have consistently deferred
rather than invented (`V2-204`'s `WORLD_EVENT`/`LOOT_EVENT` shapes,
`V2-205`'s `HYBRID`). The mechanism is proven correct with synthetic test
profiles, exactly like `V2-203`'s own precedent, and is provably correct
against the three real families too — it just currently always resolves to
primary-only, since nothing is marked compatible yet. A future
content-authoring task (no ID assigned) would set real `compatibleWith`
values once the three families are live and someone has decided which
combinations play well together.

"A merged event consumes the cooldown/rearm state of every source profile
it uses" requires no new bookkeeping: each family's `IndicatorEventStateMachine`
already transitions to `COOLDOWN` the instant it activates, entirely on its
own, regardless of whether the composer ultimately selects its output as
primary, support, or rejects it. The composer never reaches into an
encounter's internal state — it only selects among the outputs each
encounter already, independently produced this tick.

"Rejected rather than banked" means a candidate that is neither the chosen
primary nor the chosen support is simply absent from this tick's composed
result — never queued, never remembered, never revisited on a later tick.
`EncounterComposer.compose` is therefore stateless per call.

## Done When

1. `game-v2/market/EncounterComposer.ts`: a pure, stateless, per-tick
   selection function. Given the set of encounters that produced an
   output *this exact tick*, it selects at most one primary (highest
   `priority`, deterministic tie-break) and, among the rest, at most one
   support whose id appears in the primary's `compatibleWith` (highest
   `priority` among compatible candidates, same tie-break). Every other
   candidate is dropped, not queued.
2. `game-v2/market/MarketEncounterDirector.ts`: owns the three real
   encounters (`TrendBreakoutEncounter`, `VolatilitySurgeEncounter`,
   `VolumeWhaleEncounter`) and one `EncounterComposer`; `step(snapshot,
   tick)` steps all three against the same `MarketSnapshot` and returns
   this tick's composed result — the first piece of MVP-2 wiring the three
   real families together, though still not wired into `GameV2Runtime`.
3. Property tests prove: a single activation is always primary-only;
   two simultaneous, mutually-marked-compatible activations produce
   primary+support; two simultaneous, incompatible activations (matching
   today's real families' `compatibleWith: []`) produce primary-only,
   silently dropping the lower-priority one; three simultaneous
   activations with only one compatible pair still yield at most one
   primary and one support; tie-breaking is deterministic when priorities
   are equal (the real families' current shared state).
4. Not wired into `GameV2Runtime` — matches `V2-203`/`V2-204`/`V2-205`/
   `V2-206`'s own precedent; the real spawn/hazard/loot consumption tasks
   are separate (`V2-208`/`V2-209`, and an unassigned `LOOT_EVENT`
   consumption task).

## Scope

In scope:

1. `game-v2/market/EncounterComposer.ts`: `EncounterCandidate`
   (`{ profile: IndicatorEventProfile; output: EncounterOutput }`),
   `ComposedEncounter` (mutable, caller-owned:
   `{ primary: EncounterOutput | null; support: EncounterOutput | null }`),
   and the `EncounterComposer` class with `compose(candidates, out)`,
   writing into `out` rather than allocating, mirroring `EnemyComposer`'s
   own precedent.
2. `game-v2/market/MarketEncounterDirector.ts`: `MarketEncounterDirector`
   wrapping the three real encounters plus one `EncounterComposer`,
   exposing `step(snapshot, tick): ComposedEncounter` (a fresh readout
   object per call — this is a ~1 Hz market-tick-rate path, not the 60 Hz
   RAF loop `EnemyComposer`'s own allocation discipline targets) and
   `reset()`.
3. Tests: `EncounterComposer.test.ts` (synthetic profiles proving every
   property above, including the priority-direction convention pinned
   explicitly); `MarketEncounterDirector.test.ts` (drives real synthetic
   `MarketSnapshot` sequences through all three real encounters
   simultaneously, proving: one family alone yields primary-only; two
   real families activating on the same tick — currently always
   incompatible — yield primary-only with the loser silently dropped;
   `reset()` clears all three encounters).

Out of scope:

- Authoring real `compatibleWith` content for the three families (a
  content-authoring decision with no derivable anchor, deferred).
- Any real spawn/hazard/loot-system consumption of a composed result
  (`V2-208`, `V2-209`, and an unassigned `LOOT_EVENT` consumption task).
- Wiring `MarketEncounterDirector` into `GameV2Runtime`.
- `HYBRID` output composition (design line 187 — no owning task yet, and
  this composer selects between existing outputs rather than merging
  their contents).

## Preflight Decisions To Record

- **V2-ADR-122 (proposed): `EncounterComposer.compose` is stateless per
  call — no cross-tick memory, no queue.** Rationale: design's own
  "signals do not form an unbounded queue" / "rejected rather than
  banked" language.
- **V2-ADR-123 (proposed): a merged event's cooldown/rearm consumption
  requires no new bookkeeping in the composer.** Rationale: each family's
  `IndicatorEventStateMachine` already transitions to `COOLDOWN` on its
  own activation regardless of the composer's selection; the composer
  only chooses among already-independently-produced outputs, never
  reaches into an encounter's internal state.
- **V2-ADR-124 (proposed): higher `priority` number wins; ties break by
  ascending `profile.id` (lexicographic string order).** Rationale: no
  existing convention establishes a direction (`priority` has had no
  reader until this task); ascending-id tie-breaking mirrors this
  project's established deterministic tie-break pattern
  (`V2-ADR-021`'s ascending-slot precedent for `TargetingSystem`). All
  three real families currently share `priority: 1`, so the tie-break
  rule — not the priority ordering itself — governs today's real
  behavior; both are pinned by tests regardless.
- **V2-ADR-125 (proposed): support compatibility is checked directionally
  against the *primary's* `compatibleWith` list only, not
  bidirectionally.** Rationale: `compatibleWith` is naturally read as "ids
  this profile may combine with," a profile-owned outgoing declaration;
  requiring the candidate to also list the primary back would be a second,
  unstated symmetry requirement design does not mention.
- **V2-ADR-126 (proposed): the three real families' `compatibleWith`
  arrays stay `[]` — this task authors no new compatibility content.**
  Rationale: see Scope Decision above; a real game-design judgment call
  with no derivable anchor, deferred to an explicit future decision rather
  than invented.
- **V2-ADR-127 (proposed): `MarketEncounterDirector.step` allocates a
  fresh `ComposedEncounter` per call rather than writing into a
  caller-owned scratch object.** Rationale: unlike `EnemyComposer`'s 60 Hz
  RAF-loop-adjacent spawn cadence, market encounters step at the ~1 Hz
  `MarketSnapshot` update cadence (`V2-200`/`V2-201`'s own SSE cadence
  reasoning) — the project's allocation-discipline rule specifically
  targets `components/GameEngine.tsx`'s 60 Hz loop, not every system.
  `EncounterComposer.compose` itself still writes into a caller-owned
  `out` object, preserving the option for a future caller that does step
  at 60 Hz to avoid allocating.

## Files

- New: `game-v2/market/EncounterComposer.ts`,
  `game-v2/market/MarketEncounterDirector.ts`,
  `tests/game-v2/market/EncounterComposer.test.ts`,
  `tests/game-v2/market/MarketEncounterDirector.test.ts`
- Modify: none outside `game-v2/**`/`tests/game-v2/**`.

## Steps

- [ ] **Step 1: `EncounterComposer` (RED then implement)**

  Prove with synthetic `IndicatorEventProfile`/`EncounterOutput` fixtures:
  zero candidates yields `{ primary: null, support: null }`; one candidate
  yields primary-only; two compatible candidates yield primary+support;
  two incompatible candidates yield primary-only, the loser dropped; three
  candidates with only one compatible pair yield at most primary+support,
  never three; equal-priority tie-breaking is deterministic and matches
  the documented ascending-id rule; higher-priority-wins is proven with
  distinct priority values.

- [ ] **Step 2: `MarketEncounterDirector` (RED then implement)**

  Prove with real synthetic `MarketSnapshot` sequences driving the three
  real encounters: a single qualifying family yields primary-only with
  the correct real output; two simultaneously qualifying real families
  yield primary-only (today's real `compatibleWith: []`), with the lower-
  priority (tie-broken) one silently dropped, not erroring; `reset()`
  clears all three underlying encounters, proven by a fresh activation
  cycle taking the full duration again.

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

  At minimum: selecting more than one primary; selecting a support that
  is not in the primary's `compatibleWith`; the tie-break direction
  reversed; a rejected candidate leaking into the result; `reset()` not
  clearing one of the three encounters.

## Acceptance Criteria

1. `EncounterComposer.compose` selects at most one primary and one
   compatible support, deterministically, statelessly, with every other
   candidate dropped rather than queued.
2. `MarketEncounterDirector` drives all three real families together and
   composes their outputs correctly, including today's real
   always-incompatible case.
3. `priority`/`compatibleWith` are read by real logic for the first time,
   closing the gap those fields left open since `V2-203`.
4. Nothing outside `game-v2/market/**` is touched; no wiring into
   `GameV2Runtime`.
5. Every Step 3 gate passes and the Step 4 mutation pass leaves no
   survivor.
