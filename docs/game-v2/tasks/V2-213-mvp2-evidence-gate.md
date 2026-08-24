# V2-213 — MVP-2 Evidence Gate (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-200`..`V2-212` (all accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> Live execution state: `docs/game-v2/PROGRESS.md`
> Governing decisions: V2-ADR-151 through V2-ADR-161 (this brief)

## Scope Decision (recorded, not re-litigated per task)

Unlike every MVP-2 task since `V2-203`, `V2-213` is not an isolated,
unwired mechanism — it is the master plan's own evidence gate, mirroring
`V2-110`'s role for MVP-1 ("a milestone closes only with a playable
build and evidence," Operating Rule 4). `V2-110`'s own precedent
required a *real production-path run* (`createMvp0Runtime`/`GameV2Runtime`,
not hand-assembled systems). MVP-2 diverges structurally from MVP-1
here: every MVP-1 system was wired into `GameV2Runtime` as it was built,
but every MVP-2 mechanism (`MarketEncounterDirector`, the three output
consumers, `MarketConvergenceBridge`) was deliberately left unwired.
User-confirmed via `AskUserQuestion`: this task does the real wiring
first, then gathers evidence against it — not a narrower
headless-mechanism-only scope.

**Replay determinism is the one real risk this wiring introduces, and is
resolved by injection, not by a `RunRecording` schema change.**
`PositionContext` (`V2-202`, `V2-ADR-097`) was safe to add without
touching the replay hash because it is locked once, before the runtime
exists. `MarketSnapshot` is fundamentally different: it is a
continuously updating live external feed throughout a run. Recording
the full per-tick snapshot sequence into `RunRecording` (a real schema
extension) would be the "correct for production" solution but is out of
scope here — a live SSE-backed run's replay-reproducibility is a
`§13` **production replacement gate** concern, not this milestone's own
Done-When ("golden fixtures, edge cases, playable market feel, and
performance evidence are committed"). Instead: `GameV2Runtime` accepts
an **injected** `MarketEncounterRuntime` (defaulting to a fully inert
one — no snapshot source — so every existing caller/test is
byte-for-byte unaffected). This session's own evidence uses a
**deterministic, scripted** `MarketSnapshotSource` — exactly the same
technique `V2-110`'s `Mvp1CoreLoop.test.ts` used a scripted survival
policy instead of live human input — so replay-reproducibility is
genuinely proven for the evidence run (both the live run and its replay
inject the identical scripted source). A live, SSE-backed run's
replay-reproducibility remains an honest, flagged gap for the `§13`
production gate, exactly like the ETH/SOL gap is already flagged
(V2-ADR-151).

**Death-dominance is preserved for market-driven Convergence bonuses.**
`ConvergenceSystem`'s own kill-XP accrual skips entirely on a
`playerDied` tick (`V2-ADR-027`). A market-driven bonus (hazard expiry,
loot production) is not itself combat-outcome-dependent, but for strict
consistency with that established contract, `MarketEncounterRuntime`
splits its own tick into two phases: `step` (spawn composition, hazard
lifecycle advance, snapshot sampling — always runs) and
`applyPendingConvergenceBonus` (called only after `combat.step`
resolves `playerDied`, skipped entirely on a lethal tick, mirroring
`ConvergenceSystem.step`'s own placement) (V2-ADR-155).

**`nowMs` for staleness must be real wall-clock time, not tick-derived.**
`V2-ADR-142` already established staleness measures real SSE latency,
which tick-derived time cannot correctly represent across a paused
run (a level-up pause consumes real seconds the simulation clock does
not advance through). `GameV2Runtime` therefore takes an injected
`nowMsProvider: () => number` (defaulting to `Date.now`), narrowly
scoped to this one purpose — mirroring `DeterministicRng`'s own
seed-injection pattern for testability rather than scattering
`Date.now()` calls through gameplay code (V2-ADR-156).

**A hypothetical primary+support pair both carrying the same output
`kind` is a known, currently-unreachable limitation, not solved here.**
Every real family's `compatibleWith` is still `[]` (`V2-ADR-126`), so
today's real system can never compose two same-kind outputs on one
tick — `SpawnEncounterConsumer.compose`'s internal `EnemyComposer` reset
means a second same-tick `SPAWN` call would silently overwrite the
first's composition rather than accumulate. Documented, not fixed,
matching this milestone's own "mechanism proven against today's real
content" discipline (V2-ADR-157).

## Done When

Per `MASTER_PLAN.md`: golden fixtures, edge cases, playable market feel,
and performance evidence are committed. Concretely:

1. `GameV2Runtime` accepts an injected `MarketEncounterRuntime`
   (default: fully inert — no `MarketSnapshotSource`), processed each
   tick between `spawnDueEnemy` and `dashSystem.step`, with its
   Convergence-bonus half applied after death-dominance is resolved.
   Every existing `GameV2Runtime`/`Mvp0CoreLoop`/`ReplayRunner` test
   passes completely unmodified — the default configuration is
   behaviorally identical to before this task.
2. A real production-path run (`createMvp0Runtime`), driven by a
   deterministic scripted `MarketSnapshotSource`, through ordinary
   simulated play: at least one `SPAWN` encounter produces real enemies
   in the live `World`; a `WORLD_EVENT` hazard telegraphs, activates,
   and expires; a `LOOT_EVENT` produces a loot opportunity; Convergence
   receives a market-bonus contribution distinct from and in addition
   to kill-based accrual.
3. That run's exported recording replays (via `ReplayRunner`, injecting
   the identical scripted market source through a custom runtime
   factory) to the identical final state hash the live run produced.
4. A run with the default (inert) `MarketEncounterRuntime` — the "flat
   market" case — still reaches Convergence via kills alone, unaffected,
   proving "market encounters provide bonus progress but are not
   required" end-to-end through the real runtime, not just at the
   `ConvergenceSystem`/`MarketConvergenceBridge` unit level (`V2-212`
   already proved the unit level).
5. `MASTER_PLAN.md` and `PROGRESS.md` record MVP-2 as `Done`, with the
   live-SSE replay-determinism gap explicitly flagged for the `§13`
   production gate.

## Scope

In scope:

1. `game-v2/market/MarketEncounterRuntime.ts`: the facade. Owns an
   optional `Pick<MarketSnapshotAdapter, 'latest'>` snapshot source, a
   `StaleAwareMarketEncounterDirector`, the three output consumers, and
   a `MarketConvergenceBridge`. `step(rng, tick, spawnOut)` samples the
   snapshot (no-op if no source is wired), composes this tick's primary
   and support outputs, writes any `SPAWN` composition into
   caller-owned `spawnOut`, activates or advances the hazard lifecycle,
   and records (without yet applying) any hazard-expiry/loot-opportunity
   Convergence bonus. `applyPendingConvergenceBonus(world, playerEntity,
   context)` applies whatever `step` recorded. `reset()` resets the
   wrapped director and clears pending state.
2. `game-v2/runtime/GameV2Runtime.ts`: new required
   `marketEncounterRuntime: MarketEncounterRuntime` and
   `nowMsProvider: () => number` dependencies; a new
   `countLiveEnemies()` private helper extracted from `spawnDueEnemy`
   and reused by a new `stepMarketEncounters(tick)` private method
   (spends the market spawn batch through `enemySystem.spawnEnemy` with
   the same live-enemy-cap/free-slot guards `spawnDueEnemy` already
   uses); tick order updated to call `stepMarketEncounters` right after
   `spawnDueEnemy`, and `marketEncounterRuntime.applyPendingConvergenceBonus`
   right after the `combat.playerDied` check resolves.
3. `game-v2/runtime/createMvp0Runtime.ts`: new optional
   `marketEncounterRuntime`/`nowMsProvider` fields on
   `Mvp0RuntimeOptions`, defaulting to a fully inert
   `new MarketEncounterRuntime()` and `Date.now` respectively.
4. Tests: `tests/game-v2/market/MarketEncounterRuntime.test.ts`
   (mechanism-level, synthetic sources, mirroring `V2-207`..`V2-212`'s
   own per-file style); `tests/game-v2/runtime/GameV2Runtime.test.ts`
   gains market-wiring coverage (new file if none exists yet, extending
   the existing suite otherwise) proving the tick-order integration and
   that every pre-existing behavior is unchanged with the default inert
   configuration; new `tests/game-v2/integration/Mvp2MarketEvidence.test.ts`
   — the golden-fixture/evidence deliverable: a scripted `MarketSnapshotSource`
   drives a real run through `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT` and a
   Convergence bonus, a replay proof against the identical scripted
   source, and a flat-market control run.
5. `docs/game-v2/MASTER_PLAN.md`: mark MVP-2 `Done`. `docs/game-v2/PROGRESS.md`:
   checkpoint entry recording the evidence above and flagging the
   live-SSE replay-determinism gap for `§13`.

Out of scope:

- Recording the per-tick `MarketSnapshot` sequence into `RunRecording`
  (a real schema extension, deferred to whichever task first needs a
  live-SSE run to be replay-reproducible — a `§13` production-gate
  concern, not this milestone's).
- Wiring a real, live SSE-backed `MarketSnapshotSource` into
  `GameV2App.tsx`'s production path (would cut over production
  behavior without explicit instruction).
- Solving the hypothetical same-kind primary+support composition
  overwrite (V2-ADR-157) — documented, not fixed, since no real content
  reaches it today.
- Any new gameplay balance, content, or UI. If evidence-gathering
  surfaces a real defect, it is fixed as part of closing this gate and
  recorded here, mirroring `V2-110`'s own precedent — no speculative new
  content is added.
- A visible market-encounter HUD element.

## Preflight Decisions To Record

- **V2-ADR-151 (proposed): a live, SSE-backed run's replay-reproducibility
  is not solved by this task — explicitly flagged as a `§13`
  production-replacement-gate gap, matching the ETH/SOL gap's own
  honest-deferral precedent.** Rationale: recording the full per-tick
  snapshot sequence into `RunRecording` is real, additional schema-change
  scope; MVP-2's own Done-When does not demand it.
- **V2-ADR-152 (proposed): `GameV2Runtime` accepts an injected
  `MarketEncounterRuntime`, defaulting to a fully inert instance (no
  snapshot source) so every existing caller/test is unaffected.**
  Rationale: mirrors every other optional-dependency-defaults-to-inert
  pattern already established (`CombatSystem`'s lethality profile,
  `SpawnEncounterConsumer`'s composer, etc.).
- **V2-ADR-153 (proposed): evidence uses a deterministic, scripted
  `MarketSnapshotSource`, not a live feed.** Rationale: mirrors `V2-110`'s
  own scripted-survival-policy precedent; keeps the evidence run and its
  replay genuinely, provably reproducible.
- **V2-ADR-154 (proposed): `MarketEncounterRuntime`'s hazard-lifecycle
  advance and `SPAWN` composition happen unconditionally each tick
  (mirroring `spawnDueEnemy`'s own unconditional placement), but the
  Convergence-bonus application is deferred to after death-dominance is
  known.** Rationale: see the death-dominance reasoning above
  (V2-ADR-155's own rationale duplicated for clarity at the decision
  site).
- **V2-ADR-155 (proposed): `MarketEncounterRuntime.applyPendingConvergenceBonus`
  is called only after `combat.playerDied` is known, skipped on a lethal
  tick.** Rationale: mirrors `ConvergenceSystem.step`'s own established
  death-dominance rule (`V2-ADR-027`) for strict consistency, even though
  a market bonus is not itself combat-outcome-dependent.
- **V2-ADR-156 (proposed): `GameV2Runtime` takes an injected
  `nowMsProvider: () => number` (default `Date.now`) rather than calling
  `Date.now()` internally.** Rationale: staleness must measure real
  wall-clock time (`V2-ADR-142`), which tick-derived time cannot
  correctly represent across a paused run; injection keeps this
  testable without scattering `Date.now()` through gameplay code.
- **V2-ADR-157 (proposed): a hypothetical primary+support pair of the
  same output `kind` is a known, currently-unreachable limitation
  (silent overwrite, not accumulation), documented rather than fixed.**
  Rationale: every real family's `compatibleWith` is still `[]`
  (`V2-ADR-126`), so today's real system cannot reach this path; fixing
  it now would be solving a problem with no real trigger.

## Files

- New: `game-v2/market/MarketEncounterRuntime.ts`,
  `tests/game-v2/market/MarketEncounterRuntime.test.ts`,
  `tests/game-v2/integration/Mvp2MarketEvidence.test.ts`
- Modify: `game-v2/runtime/GameV2Runtime.ts`,
  `game-v2/runtime/createMvp0Runtime.ts`,
  `tests/game-v2/runtime/GameV2Runtime.test.ts` (or created new if it
  does not exist), `docs/game-v2/MASTER_PLAN.md`, `docs/game-v2/PROGRESS.md`.

## Steps

- [ ] **Step 1: `MarketEncounterRuntime` (RED then implement)**

  Prove the facade in isolation with synthetic sources: inert by
  default; routes `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT` outputs correctly;
  advances the hazard lifecycle every tick unless one just activated;
  defers the Convergence bonus until `applyPendingConvergenceBonus` is
  called; `reset()` clears everything.

- [ ] **Step 2: `GameV2Runtime` wiring (RED then implement)**

  Add the two new dependencies with defaults preserving every existing
  test unmodified. Extract `countLiveEnemies()`. Insert
  `stepMarketEncounters`/`applyPendingConvergenceBonus` at the right
  tick-order points. Re-run every existing `GameV2Runtime`-touching test
  file unmodified to confirm zero behavior change with the default inert
  configuration.

- [ ] **Step 3: Evidence (golden fixtures)**

  Build a deterministic scripted `MarketSnapshotSource` (mirroring
  `V2-110`'s scripted-policy precedent). Drive a real run through all
  three output kinds and a Convergence bonus. Prove replay reproduces
  the identical hash via a custom `ReplayRuntimeFactory` injecting the
  same script. Prove the flat-market control case is unaffected.

- [ ] **Step 4: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 5: Mutation pass**

  At minimum: `stepMarketEncounters` not called at all; the
  Convergence-bonus application not gated behind death-dominance;
  `spawnDueEnemy`'s live-enemy-cap guard not shared/reused correctly by
  the market spawn path; the hazard lifecycle not advancing when no
  snapshot source is wired versus when one is.

- [ ] **Step 6: Documentation close-out**

  Update `MASTER_PLAN.md` (MVP-2 `Done`) and `PROGRESS.md` (checkpoint
  entry, exact next action pointing at MVP-3, live-SSE replay gap
  flagged for `§13`).

## Acceptance Criteria

1. `GameV2Runtime`'s default (inert) configuration is behaviorally
   identical to before this task — every pre-existing test passes
   unmodified.
2. A real production-path run driven by a deterministic scripted market
   source produces real `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT` effects and a
   Convergence bonus.
3. That run's replay reproduces the identical final state hash.
4. A flat-market run reaches Convergence via kills alone, unaffected.
5. The live-SSE replay-determinism gap is explicitly flagged, not
   silently left unaddressed.
6. Every Step 4 gate passes; `MASTER_PLAN.md`/`PROGRESS.md` record MVP-2
   as `Done`.
