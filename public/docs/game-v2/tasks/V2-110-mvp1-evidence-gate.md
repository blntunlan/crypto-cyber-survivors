# V2-110 — MVP-1 Evidence Gate (Task Brief)

> Milestone: MVP-1 — Combat and Build Core
> Depends on: `V2-100`..`V2-109`, `V2-111`, `V2-112` (all accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Every MVP-1 LEGO block already exists and is individually proven: ability/
passive loadout (`V2-100`/`V2-101`), three-tier ability schema (`V2-102`),
HUD (`V2-103`), the 13-second card flow (`V2-104`), reroll/banish (`V2-105`),
eight ability identities (`V2-106`/`V2-107`), enemy composition (`V2-108`),
market-independent Convergence (`V2-109`), concurrent AUTO weapons
(`V2-111`), and the repeating level curve (`V2-112`). `V2-110` is not new
gameplay — it is the master plan's own evidence gate, mirroring `V2-014`'s
role for MVP-0: "a milestone closes only with a playable build and evidence"
(Operating Rule 4).

Two real gaps exist in what has actually been proven, both surfaced while
scoping this task:

1. **Build diversity has been proven only through hand-assembled systems, not
   the real production tick order.** `tests/game-v2/integration/FullBuild.test.ts`
   (`V2-112`'s own evidence) drives `ProgressionSystem` directly with
   synthetic kill batches; `tests/game-v2/integration/ConcurrentWeapons.test.ts`
   (`V2-111`'s own evidence) hand-composes `CombatSystem`/`WeaponSystem`/
   `ProgressionSystem` in a bespoke loop. Neither drives `GameV2Runtime`
   itself. MVP-1's stated goal is "constrained builds create meaningful
   play" — that claim is unevidenced until a single real run, through
   `createMvp0Runtime`'s actual fixed tick order (enemy spawn, dash,
   movement, enemy AI, weapons, combat, progression, Convergence,
   lifecycle), reaches a fully capped build.
2. **The browser proves only the first level-up.** `e2e/game-v2-walking-skeleton.spec.ts`
   stops right after the first card resolves. `V2-112` made the curve
   repeat, so a second HUD ability slot becoming visible in the real browser
   is currently unproven outside headless tests.

Replay determinism and reset/lifecycle correctness are already exercised by
`Mvp0Runtime.test.ts` and `ReplayRunner.test.ts`, but only against short
scripted runs with at most a handful of held slots. This task re-proves both
specifically at the higher-entity-count, many-slot-occupied full-build state,
since that is the state the master plan's Done-When actually asks about.

## Done When

Per `MASTER_PLAN.md`: build diversity, replay, lifecycle, and playable-core
evidence are committed. Concretely:

1. A real production-path run (`createMvp0Runtime`/`GameV2Runtime`, not
   hand-assembled systems) reaches a fully capped build — every registry-
   fillable ability slot at max tier, every registry-fillable passive slot at
   max level — through ordinary simulated play, and more than one occupied
   AUTO slot is observed firing concurrently within that same run.
2. The recording that run exports replays (via `ReplayRunner`) to the
   identical final state hash the live run produced, at the full-build
   entity/slot count.
3. After that run, `runtime.reset()` (or a fresh runtime) leaves no residual
   ability, passive, offer, or Convergence state — a newly reset player
   starts exactly like a first run, proven by direct inspection, not
   assumed from earlier tasks' narrower reset tests.
4. A real browser session reaches a second level-up and shows a second
   occupied HUD ability slot, extending the existing e2e spec rather than
   replacing it.
5. `MASTER_PLAN.md` and `PROGRESS.md` record MVP-1 as `Done`.

## Scope

In scope:

1. New `tests/game-v2/integration/Mvp1CoreLoop.test.ts`: a scripted survival
   policy (nearest-XP-pickup seeking, with a drift-and-defensive-dash
   fallback mirroring `ConvergenceEnvelope.test.ts`'s already-proven survival
   policy) drives `createMvp0Runtime` until `playerLevel === MVP1_MAX_PLAYER_LEVEL`
   or the run ends. Assertions: every reachable ability slot is at
   `ABILITY_MAX_TIER`; every reachable passive slot is at `PASSIVE_MAX_LEVEL`;
   at least two distinct AUTO identities' projectile damage signatures are
   observed live in the same window (mirroring `ConcurrentWeapons.test.ts`'s
   attribution technique, applied to the real runtime instead of a hand-built
   one); `convergenceProgress` is greater than zero; the exported recording's
   command count equals `run.readout-derived upgradesResolved`.
2. Same file, a replay describe block: `ReplayRunner.run(recording, 60)`
   against the full-build recording's `finalHash` equals `runtime.snapshotHash()`
   from the live run.
3. Same file, a reset describe block: after the full-build run, call
   `runtime.reset()` (or construct a fresh runtime with the same identity)
   and assert `abilitySlots` are empty past index 0, `moveSpeedLevel === 0`,
   `convergenceProgress === 0`, and `playerLevel === 1` — i.e. a clean
   session, not partial carryover.
4. `e2e/game-v2-walking-skeleton.spec.ts`: extend the existing seeded-run
   test (or add one) to resolve a second level-up card and assert a second
   `game-v2-hud-ability-*` slot becomes visible. Reuse the existing
   `playUntilLevelUp`/`readSnapshot` helpers; do not fork a second seed
   unless the existing one cannot reach a second level-up within budget.
5. `docs/game-v2/MASTER_PLAN.md`: mark MVP-1 `Done` with the accepted commit.
   `docs/game-v2/PROGRESS.md`: checkpoint entry recording the evidence above.

Out of scope:

- Any new gameplay system, balance change, or production runtime behavior.
  If the new evidence-gathering surfaces a real defect (as `V2-109`'s and
  `V2-111`'s own evidence gates did), it is fixed as part of closing this
  gate and recorded here, mirroring precedent — but no speculative new
  content is added.
- MVP-2 market work, MVP-3 boss/cash-out work, or MVP-4 balance/asset work.
- A visible Convergence HUD element (still out of scope per `V2-109`).

## Files

- New: `tests/game-v2/integration/Mvp1CoreLoop.test.ts`
- Modify: `e2e/game-v2-walking-skeleton.spec.ts`, `docs/game-v2/MASTER_PLAN.md`,
  `docs/game-v2/PROGRESS.md`
- Possible (only if evidence surfaces a real defect): any `game-v2/**`
  production file the defect lives in, following the same fix-and-record
  pattern as every prior task's review-fix rounds.

## Steps

- [ ] **Step 1: Full-build-through-real-play (RED then GREEN)**

  Write the scripted survival/collection policy and the full-build
  assertions against `createMvp0Runtime`. Iterate the policy empirically
  (matching `V2-108`/`V2-109`'s own precedent for policy tuning) until the
  run reliably reaches `MVP1_MAX_PLAYER_LEVEL` without dying, inside a
  generous, explicitly-justified frame bound.

- [ ] **Step 2: Replay proof at full-build state**

  Export the recording from Step 1's run and prove `ReplayRunner` reproduces
  the identical final hash.

- [ ] **Step 3: Reset/lifecycle proof**

  Prove a reset after the full-build run leaves no residual MVP-1 state.

- [ ] **Step 4: Browser second-level-up evidence**

  Extend the e2e spec. Run it against the real dev build.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list
  ```

- [ ] **Step 6: Documentation close-out**

  Update `MASTER_PLAN.md` (MVP-1 `Done`) and `PROGRESS.md` (checkpoint entry,
  exact next action pointing at MVP-2).

## Acceptance Criteria

1. A real `GameV2Runtime` run reaches a fully capped build through play, not
   only through injected-registry contract tests.
2. Two or more distinct AUTO identities are proven firing concurrently
   within that same real run.
3. The full-build run's recording replays to the identical final state hash.
4. A reset after a full-build run leaves no residual ability, passive,
   offer, or Convergence state.
5. A real browser session reaches a second level-up and a second HUD ability
   slot becomes visible.
6. Every Step 5 gate passes; `MASTER_PLAN.md`/`PROGRESS.md` record MVP-1 as
   `Done`.
