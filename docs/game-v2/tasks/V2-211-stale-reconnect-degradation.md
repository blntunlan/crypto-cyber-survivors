# V2-211 — Stale/Reconnect Degradation (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-200` (canonical market snapshot), `V2-207` (primary/support composer) — both accepted and closed
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §7.5 (Freshness and concurrency)
> Master plan "Done when": "No stale premium, missed-event replay, or reconnect burst occurs."
> Governing decisions: V2-ADR-141 through V2-ADR-145 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Design §7.5 states three properties this task must satisfy:

1. "Stale data cannot author new market events or market reward premiums."
2. "Existing market effects transition to neutral."
3. "Reconnect does not replay missed events."

No "market reward premium" concept exists anywhere in `game-v2/**` yet —
`V2-210` deliberately avoided any reward/economy wiring, and `V2-306`
(the real economy system) is MVP-3, still unbuilt. The first bullet's
"premium" half is therefore vacuously satisfied today: there is nothing
to gate. The "new market events" half is real and is what this task
gates.

`MarketSnapshot.timestamp` already exists (`V2-200`). Staleness is
judged by comparing it against a caller-supplied `nowMs` — never
`Date.now()` called internally — mirroring this project's
inject-the-time-source discipline. This is a deliberate, narrow exception
to `CLAUDE.md`'s "timers must be driven by `TimeService`, not wall-clock"
rule: staleness is inherently a real-wall-clock concern (SSE network
latency, exactly what `services/market/DataResilienceService.ts`'s own
`Date.now()`-based staleness check already measures for the legacy
pipeline), not simulation-tick gameplay timing — the rule's own stated
purpose ("timers freeze during pause/level-up") does not apply to
"how old is this network payload."

`services/market/DataResilienceService.ts`'s real
`STALE_THRESHOLD_MS = 30000` is the anchor, copied as a literal value
into a new Game V2-owned constant rather than imported cross-module —
matching `V2-205`/`V2-206`'s own "reuse the real value, not the legacy
module" precedent. `V2-ADR-085`'s exclusion is specifically about legacy
*gameplay-multiplier outputs* (`spawnRateMultiplier` and friends); a raw
data-freshness threshold is a different category, the same class of
value `V2-206`'s `whaleCooldownMs` reuse already established as fair
game.

`MarketEncounterDirector` (`V2-207`) is not modified — its contract and
existing tests stay untouched. A new wrapper,
`StaleAwareMarketEncounterDirector`, composes it: when the snapshot is
stale, the wrapper calls the wrapped director's own `reset()` (forcing
every real family's `IndicatorEventStateMachine` back to `ARMED` — the
one state in `IndicatorEventState` that represents "no effect," the most
literal available mapping to design's "transition to neutral" in this
codebase's real vocabulary) and returns `{ primary: null, support: null
}` for that tick, without ever calling the wrapped director's `step`
(so a stale snapshot's indicator values can never advance any family's
`ARMED → CONFIRMING` transition — the literal proof of "stale data
cannot author new market events"). When fresh, it delegates to `step`
unchanged.

"Reconnect does not replay missed events" is proven structurally, not by
building new anti-replay logic: no snapshot queue or buffer exists
anywhere in `game-v2/market/**` — every `step` call only ever evaluates
the one snapshot passed to it for that one tick. A test drives many
consecutive stale ticks (simulating an extended outage) followed by one
fresh snapshot and confirms exactly the same single-activation behavior
a fresh-from-the-start call would produce — no catch-up burst.

Not wired into `GameV2Runtime` — matches `V2-203` through `V2-210`'s own
precedent.

## Done When

1. `game-v2/market/MarketFreshness.ts`: `isMarketSnapshotStale(snapshot,
   nowMs, staleThresholdMs?)` — pure, real-anchored, no internal
   `Date.now()` call.
2. `game-v2/market/StaleAwareMarketEncounterDirector.ts`: wraps an
   injected `MarketEncounterDirector` unmodified. Stale ticks reset the
   wrapped director and report no encounter; fresh ticks delegate
   normally.
3. A test proves a long stale period followed by resumption produces no
   replay burst — the exact same single-activation behavior a
   fresh-start call would produce.
4. `MarketEncounterDirector`/`EncounterComposer` (`V2-207`) are
   unmodified.
5. Not wired into `GameV2Runtime`.

## Scope

In scope:

1. `game-v2/config/MarketFreshness.ts`: `MARKET_STALE_THRESHOLD_MS =
   30_000`, copied from `DataResilienceService`'s real value.
2. `game-v2/market/MarketFreshness.ts`: `isMarketSnapshotStale`.
3. `game-v2/market/StaleAwareMarketEncounterDirector.ts`:
   `StaleAwareMarketEncounterDirector` class, `step(snapshot, tick,
   nowMs)`, `reset()`.
4. Tests: `tests/game-v2/config/MarketFreshness.test.ts` (pinned
   constant), `tests/game-v2/market/MarketFreshness.test.ts` (boundary
   behavior of `isMarketSnapshotStale`), `tests/game-v2/market/StaleAwareMarketEncounterDirector.test.ts`
   (fresh delegates normally; stale reports no encounter and resets the
   wrapped director — proven by confirming a fresh cycle after
   staleness needs the full confirmation duration again; the
   long-stale-then-resume no-replay-burst property using a real family).

Out of scope:

- Any "market reward premium" gating (no such concept exists in
  `game-v2/**` yet).
- Modifying `MarketEncounterDirector`, `EncounterComposer`, or any of
  the three encounter families.
- Wiring `StaleAwareMarketEncounterDirector` into `GameV2Runtime` or
  `MarketSnapshotAdapter`.
- `isSynthetic` handling (a separate `V2-200` concern, not addressed
  here).

## Preflight Decisions To Record

- **V2-ADR-141 (proposed): `MARKET_STALE_THRESHOLD_MS` copies
  `services/market/DataResilienceService.ts`'s real `STALE_THRESHOLD_MS`
  (30000ms) as a literal value, not a cross-module import.** Rationale:
  matches `V2-205`/`V2-206`'s own "reuse the real value, not the legacy
  module" precedent; `V2-ADR-085`'s exclusion covers legacy
  gameplay-multiplier *outputs*, not a raw data-freshness threshold.
- **V2-ADR-142 (proposed): `isMarketSnapshotStale` takes `nowMs` as an
  explicit caller-supplied parameter, never `Date.now()` internally.**
  Rationale: staleness is inherently a real-wall-clock concern (SSE
  network latency), unlike simulation-tick gameplay timing that
  `TimeService`'s pause-aware rule governs; the function itself stays
  pure and injectable for testability regardless.
- **V2-ADR-143 (proposed): `StaleAwareMarketEncounterDirector` wraps
  `MarketEncounterDirector` rather than modifying it; a stale tick calls
  the wrapped director's `reset()` and reports no encounter.**
  Rationale: preserves `V2-207`'s already-shipped, tested contract
  unmodified; `ARMED` is the one state in `IndicatorEventState`
  representing "no effect," the most literal mapping available to
  design's "transition to neutral."
- **V2-ADR-144 (proposed): "Reconnect does not replay missed events" is
  proven structurally (no queue/buffer exists), not by new anti-replay
  bookkeeping.** Rationale: every `step` call already only evaluates the
  one snapshot passed to it; adding explicit anti-replay logic would be
  solving a problem the architecture doesn't have.
- **V2-ADR-145 (proposed): `StaleAwareMarketEncounterDirector` is not
  wired into `GameV2Runtime` or `MarketSnapshotAdapter`.** Rationale:
  matches `V2-203` through `V2-210`'s own precedent.

## Files

- New: `game-v2/config/MarketFreshness.ts`,
  `game-v2/market/MarketFreshness.ts`,
  `game-v2/market/StaleAwareMarketEncounterDirector.ts`,
  `tests/game-v2/config/MarketFreshness.test.ts`,
  `tests/game-v2/market/MarketFreshness.test.ts`,
  `tests/game-v2/market/StaleAwareMarketEncounterDirector.test.ts`
- Modify: none outside `game-v2/**`/`tests/game-v2/**`.

## Steps

- [ ] **Step 1: `MarketFreshness` config + mechanism (RED then implement)**

  Pin `MARKET_STALE_THRESHOLD_MS`. Prove `isMarketSnapshotStale`: exactly
  at the threshold is not stale, one unit past is stale, a snapshot from
  the "future" (`nowMs < timestamp`) is not stale, a custom
  `staleThresholdMs` overrides the default, invalid `nowMs`/`staleThresholdMs`
  throw.

- [ ] **Step 2: `StaleAwareMarketEncounterDirector` (RED then implement)**

  Prove: a fresh snapshot delegates to the wrapped director's real
  `step` unchanged (same result a bare `MarketEncounterDirector` would
  produce); a stale snapshot returns `{ primary: null, support: null }`
  and resets the wrapped director (proven by a fresh confirmation cycle
  needing the full duration again after staleness clears, exactly like
  `MarketEncounterDirector.test.ts`'s own `reset()` test); many
  consecutive stale ticks followed by one fresh real-family activation
  sequence produce no catch-up burst — only the same single activation a
  fresh-start sequence would produce.

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

  At minimum: the staleness boundary comparison off-by-one; skipping the
  `reset()` call on a stale tick; calling the wrapped director's `step`
  anyway while stale; the constructor ignoring its injected
  `MarketEncounterDirector`.

## Acceptance Criteria

1. `isMarketSnapshotStale` correctly classifies freshness at and around
   the real threshold, injectable and pure.
2. `StaleAwareMarketEncounterDirector` reports no encounter and resets
   every wrapped family to neutral while stale, and delegates normally
   while fresh.
3. A long stale period followed by resumption produces no replay burst.
4. `MarketEncounterDirector`/`EncounterComposer` are unmodified; nothing
   is wired into `GameV2Runtime`.
5. Every Step 3 gate passes and the Step 4 mutation pass leaves no
   survivor.
