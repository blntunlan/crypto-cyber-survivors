# V2-201 — Locked Position Context (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice
> Depends on: `V2-200` (canonical market snapshot, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §2 (Product Promise, steps 1-2), §3.2 (Run loop), §7.2-7.3
> Governing decisions: V2-ADR-088 through V2-ADR-091 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The master plan's Done-When reads "Asset, side, entry, and leverage cannot
mutate during a run." Design §2/§3.2 describe a real pre-run selection step
("Select asset + side + leverage") the legacy game already has
(`components/screens/MainMenu.tsx`: `CryptoSelector`, LONG/SHORT buttons,
`LEVERAGE_OPTIONS`, a live `price` prop). `/game-v2` has no equivalent today
— a run starts immediately on mount. Put to the user directly: build a real
Game V2-owned selection screen now (not a copy of the legacy component,
which is tied to legacy state/singletons `game-v2/**` may not import) rather
than deferring it again behind an invisible URL-param contract. Confirmed.

Two further scope boundaries, decided while writing this brief:

1. **BTC only**, matching `V2-200`'s own scope (`V2-ADR-084`). The selector
   shows one asset; no ETH/SOL UI is built.
2. **`PositionContext` is not threaded into `RuntimeCheckpoint`/replay
   hash in this task** (`V2-ADR-089`). Nothing yet reads it for a gameplay
   effect — that is `V2-202`'s job (the lethality composer). Hashing it now
   would ripple every existing golden hash across the whole Game V2 suite
   (mirroring the `WORLD_SNAPSHOT_SCHEMA_VERSION` ripple `V2-109`/`V2-111`
   caused) for a field nothing yet consumes. `V2-202` picks this up
   alongside its own hash ripple, when the field starts to matter for
   deterministic replay and anti-cheat — the same class of gap the MVP-0
   checkpoint already recorded for `RunRecording.finalHash`.

## Done When

A real pre-run selection screen locks `asset`/`side`/`leverage`/`entryPrice`
into an immutable `PositionContext` before a run's runtime is constructed,
and nothing in `GameV2Runtime` can mutate it afterward. Concretely:

1. `/game-v2` shows a selection screen before any run starts: BTC (fixed),
   LONG/SHORT, one of the five leverage modes (`1×`/`5×`/`10×`/`25×`/`50×`),
   and the live price from `V2-200`'s `MarketSnapshotAdapter`.
2. Clicking Start locks a validated, frozen `PositionContext` (including the
   entry price at that moment) and only then constructs and starts the
   runtime.
3. `GameV2Runtime` exposes `positionContext` as a read-only getter
   (mirroring `runIdentity`); no method exists anywhere that can change it
   once the runtime is constructed.
4. A restart after game-over returns to the selection screen rather than
   silently reusing the previous position — each run is a new position,
   matching "a reset run is a new session" (`V2-ADR-029`) applied to
   position too (`V2-ADR-088`).
5. Every existing MVP-0/MVP-1 test, e2e spec, and integration test that
   constructs a runtime headlessly keeps working unmodified — the new field
   is required only where a real position is meaningful (`GameV2App`), and
   optional with a clearly-labeled non-gameplay placeholder everywhere else.

## Scope

In scope:

1. `game-v2/contracts/PositionContext.ts`: `PositionSide`
   (`'LONG' | 'SHORT'`), `LeverageMode` (`1 | 5 | 10 | 25 | 50`,
   `LEVERAGE_MODES` as the ordered tuple), `PositionContext` (frozen:
   `asset`, `side`, `leverage`, `entryPrice`, `lockedAtTick`),
   `createPositionContext(input)` (validates and freezes — throws on
   invalid input, unlike `V2-200`'s `normalizeMarketUpdate`: this is an
   internal contract fed by validated UI state, not a live external feed,
   so `V2-ADR-086`'s reject-not-throw rationale does not apply here), and
   `UNSPECIFIED_POSITION_CONTEXT` (the documented, clearly-non-real
   placeholder every headless/test composition site defaults to until a
   real screen locks one — `V2-ADR-089`).
2. `game-v2/runtime/GameV2Runtime.ts`: `GameV2RuntimeDependencies` gains a
   required `positionContext: PositionContext`; `GameV2Runtime` exposes
   `public get positionContext()`, mirroring the existing `runIdentity`
   getter exactly (not part of `GameV2RuntimeReadout`/`checkpoint()` — see
   Scope Decision above).
3. `game-v2/runtime/createMvp0Runtime.ts`: `Mvp0RuntimeOptions.positionContext`
   becomes optional, defaulting to `UNSPECIFIED_POSITION_CONTEXT` — this is
   the one place the default is applied, keeping every existing headless/test
   call site (`ReplayRunner.ts`'s default factory, every integration test)
   unmodified while `GameV2RuntimeDependencies` itself stays non-optional.
4. `game-v2/ui/PositionSelectScreen.tsx`: the new screen. BTC-fixed asset
   display, LONG/SHORT toggle, five leverage buttons, live price display,
   a disabled-until-priced Start button. Mirrors `LevelUpOverlay.tsx`'s
   conventions (`data-testid` everywhere, `role="dialog"`/`aria-*`, plain
   semantic HTML, no new abstraction layer).
5. `game-v2/GameV2App.tsx`: restructured into two stages — `'select'`
   (renders `PositionSelectScreen`, drives a `MarketSnapshotAdapter` for
   live price, no runtime exists yet) and `'run'` (today's existing
   canvas/HUD/level-up/game-over tree, now receiving a locked
   `PositionContext`). Restart-after-death disposes the runtime and returns
   to `'select'`. Gains an overridable `createMarketFeedSource` prop
   (mirroring the existing `createRenderer` prop) so tests inject a fake
   feed instead of a real `EventSource`. A `?entryPrice=<number>` URL
   override (mirroring `?seed=`) unblocks Start without a live connection,
   for dev/e2e use — the Vite-only dev/e2e harness this project's e2e
   conventions already establish cannot reach a real SSE stream
   (`V2-ADR-090`).
6. `game-v2.css`: new `position-select-*` classes for the screen.
7. Tests: `PositionContext.ts` validation (valid input; one rejection per
   invalid field; `UNSPECIFIED_POSITION_CONTEXT` itself validates);
   `GameV2Runtime`'s `positionContext` getter returns exactly what was
   constructed and has no setter; `PositionSelectScreen` (renders BTC,
   LONG/SHORT toggle, five leverage options, Start disabled until a price
   arrives, calls `onStart` with the locked selection); `GameV2App`'s
   existing four tests updated to interact with the selection screen first,
   plus new tests for the `?entryPrice=` override and the
   restart-returns-to-selection flow.
8. `e2e/game-v2-walking-skeleton.spec.ts`: `openSeededRun` clicks through
   the selection screen (LONG, `1×`, Start) before the existing assertions.

Out of scope:

- Any gameplay effect from `side`/`leverage` (`V2-202`'s lethality composer).
- `RuntimeCheckpoint`/replay-hash/anti-cheat coverage of `PositionContext`
  (`V2-ADR-089`, deferred to `V2-202`).
- ETH/SOL selection (deferred with `V2-200`, `V2-ADR-084`).
- A live, running market connection *during* gameplay (the feed is stopped
  once Start locks the position; no PnL/live-price HUD element exists yet).

## Preflight Decisions To Record

- **V2-ADR-088 (proposed): `PositionContext` is constructed before
  `GameV2Runtime` exists (owned by `GameV2App`'s pre-run React state, not
  simulation state), and a restart after game-over returns to the selection
  screen rather than reusing the previous position.** Rationale: mirrors
  "a reset run is a new session" (`V2-ADR-029`) applied to position —
  thematically each run opens a new trade, and technically a locked value
  that outlived its run would be a second candidate authority the moment a
  later task made a mid-run mutation attempt meaningful to reject.
- **V2-ADR-089 (proposed): `PositionContext` is not threaded into
  `RuntimeCheckpoint`, the replay hash, or `RunRecording` in this task.**
  Rationale: see Scope Decision above.
- **V2-ADR-090 (proposed): the entry price is the live `V2-200`
  `MarketSnapshot` price at the moment Start is clicked, with a
  `?entryPrice=<number>` URL override for dev/e2e.** Rationale: the
  project's own e2e conventions run `npx vite` only (no full Express/SSE
  server), so a real `SSEMarketService` connection cannot succeed inside
  that harness — confirmed by reading `SSEMarketService.getMarketBaseUrl()`,
  which resolves to the same origin in dev mode. Mirrors `?seed=`'s existing
  precedent for deterministic dev/test control over something a real player
  never needs to override.
- **V2-ADR-091 (proposed): `createPositionContext` throws on invalid input,
  unlike `V2-200`'s `normalizeMarketUpdate`, which returns `null`.**
  Rationale: `V2-ADR-086`'s reject-not-throw choice was specifically about a
  *live external feed*, where one bad tick is an expected, recoverable
  condition. `PositionContext` is fed by already-validated UI selection
  state (a closed set of buttons, not parsed external bytes), so invalid
  input here means a real internal defect — the same class every other
  Game V2 contract validator throws on.

## Files

- New: `game-v2/contracts/PositionContext.ts`, `game-v2/ui/PositionSelectScreen.tsx`,
  `tests/game-v2/contracts/PositionContext.test.ts`,
  `tests/game-v2/ui/PositionSelectScreen.test.tsx`
- Modify: `game-v2/runtime/GameV2Runtime.ts`, `game-v2/runtime/createMvp0Runtime.ts`,
  `game-v2/GameV2App.tsx`, `game-v2/game-v2.css`,
  `tests/game-v2/entry/GameV2App.test.tsx`,
  `e2e/game-v2-walking-skeleton.spec.ts`

## Steps

- [ ] **Step 1: Contract (RED then implement)**

  `PositionContext.ts`. Prove: valid input freezes and round-trips; each
  invalid field (`side` outside the union, `leverage` outside
  `LEVERAGE_MODES`, non-finite/non-positive `entryPrice`,
  non-integer/negative `lockedAtTick`) throws; `UNSPECIFIED_POSITION_CONTEXT`
  itself passes `createPositionContext`'s own validation (constructed
  through it, not a separately hand-written literal).

- [ ] **Step 2: Runtime wiring (RED then implement)**

  Add the dependency and getter to `GameV2Runtime`; the optional-with-default
  in `createMvp0Runtime`. Prove: the getter returns exactly the constructed
  value; no existing headless test needed a change (verified by running the
  full suite unmodified after this step, before touching any UI file).

- [ ] **Step 3: `PositionSelectScreen` (RED then implement)**

  Prove: BTC is shown; LONG/SHORT toggle and five leverage buttons render
  and select; Start is disabled with `livePrice === null` and enabled once
  one arrives; clicking Start calls `onStart(side, leverage)` with the
  currently selected values.

- [ ] **Step 4: `GameV2App` integration (RED then implement)**

  Restructure into `'select'`/`'run'` stages; wire the injectable market
  feed; the `?entryPrice=` override; restart returns to `'select'`. Update
  the four existing tests to click through selection first; add tests for
  the override and the restart flow.

- [ ] **Step 5: e2e (RED then implement)**

  Update `openSeededRun` to click through the selection screen.

- [ ] **Step 6: Verify (GREEN)**

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

- [ ] **Step 7: Mutation pass**

  At minimum: each `createPositionContext` rejection branch; the Start-button
  disabled-until-priced gate; the restart-returns-to-selection path (must
  fail if restart silently reuses the old runtime/position instead).

## Acceptance Criteria

1. A real selection screen locks asset/side/leverage/entry price before any
   run starts, and `GameV2Runtime` exposes it read-only with no mutator.
2. Restart after game-over returns to the selection screen; each run locks
   its own fresh position.
3. Every pre-existing headless/test runtime-construction call site keeps
   working unmodified via the documented placeholder default.
4. `PositionContext` is deliberately not part of the replay hash yet, and
   this is recorded as owed to `V2-202`, not silently dropped.
5. A real browser session can select LONG or SHORT and a leverage mode and
   start a run.
6. Every Step 6 gate passes and the Step 7 mutation pass leaves no survivor.
