# V2-200 — Canonical Market Snapshot (Task Brief)

> Milestone: MVP-2 — Market Vertical Slice (opening task)
> Depends on: `V2-110` (MVP-1 evidence gate, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §7.1 (Reused infrastructure), §7.2 (Assets and position)
> Governing decisions: V2-ADR-084, V2-ADR-085, V2-ADR-086, V2-ADR-087 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

The master plan's Done-When reads "BTC/ETH/SOL normalize to one finite,
versioned contract." Before writing this brief, the actual infrastructure was
checked: `services/market/SSEMarketService.ts` and every service under
`railway-market-aggregator/src/` are single-asset (BTC) with no
`asset`/`symbol` parameter anywhere — Binance/Coinbase subscriptions,
indicator calculation, and the SSE payload shape are all hardcoded to one
market. Standing up real ETH/SOL live streams is a `railway-market-aggregator`
change (new WS subscriptions, new indicator-calculation instances, a new SSE
payload shape, a separate deploy) — out of a client-side Game V2 task's
scope and much larger than this task.

This was put to the user directly. Chosen: **V2-200 normalizes BTC only**,
reusing `SSEMarketService` unchanged. ETH/SOL multi-asset support is deferred
to an unassigned follow-up task that first extends
`railway-market-aggregator`. The contract itself is not hardcoded to a single
literal in a way that would need reshaping later — `MarketAsset` is a union
type with one member today (`V2-ADR-084`) — but no multi-asset wiring is
built speculatively ahead of that infrastructure existing.

## Done When

A canonical, finite, versioned `MarketSnapshot` contract exists for BTC,
produced by a Game V2-owned adapter from the existing SSE market stream, with
no gameplay system importing the exchange client or raw indicator service
directly (design §7.1). Concretely:

1. `MarketSnapshot` is a frozen, versioned, exhaustively-typed contract —
   every field finite, every enum validated — never a partially-formed or
   `NaN`-carrying object.
2. A pure normalization function turns a raw `SSEMarketUpdate` into a
   `MarketSnapshot`, rejecting (not throwing — see V2-ADR-086) any input that
   cannot be represented finitely or validly.
3. `MarketSnapshot` deliberately excludes every field design §7.1 forbids
   reusing: the legacy gameplay-multiplier fields
   (`spawnRateMultiplier`, `enemyAggroMultiplierLong`,
   `enemyAggroMultiplierShort`) computed by the old difficulty pipeline.
4. The only file under `game-v2/**` that imports `SSEMarketService` or
   `types/crypto` is the one production wrapper this task adds; everything
   else consumes the port interface or the normalized contract.
5. Nothing in `game-v2/systems/**` or `game-v2/runtime/**` consumes
   `MarketSnapshot` yet — this task is the data contract and adapter only,
   not wiring into the Convergence/Encounter Director (`V2-207`+/`V2-212`).

## Scope

In scope:

1. `game-v2/contracts/MarketSnapshot.ts`: `MARKET_SNAPSHOT_SCHEMA_VERSION`,
   `MarketAsset` (`'BTC'` today), `RsiState`
   (`'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT'`, matching
   `railway-market-aggregator`'s `RSICalculator`), `TrendDirection`
   (`'UP' | 'DOWN' | 'NEUTRAL'`, matching `indicatorService.ts`'s own
   derivation — not the client-side synthetic-fallback's inconsistent
   `'SIDEWAYS'` spelling, see V2-ADR-087), `WhaleTier` (`0 | 1 | 2 | 3`,
   matching `VolumeAnalyzer`), and the frozen `MarketSnapshot` type itself
   (price, rsi, rsiState, atrPercent, normalizedVolume, volumePercentile,
   whaleTier, trendStrength, trendDirection, timestamp, isSynthetic).
2. `game-v2/market/MarketFeedSource.ts`: the raw `MarketFeedUpdate` shape (the
   fields `normalizeMarketUpdate` reads) and the `MarketFeedSource` port —
   `connect(onUpdate)` / `disconnect()` — mirroring the existing
   `RendererPort`/`IntentSource` injected-dependency pattern (V2-ADR-086).
3. `game-v2/market/MarketSnapshotAdapter.ts`: `normalizeMarketUpdate(update,
   asset)` (pure, returns `MarketSnapshot | null`) and the
   `MarketSnapshotAdapter` class (`start()`/`stop()`/`latest()`/`subscribe()`)
   that drives a `MarketFeedSource`, normalizes every update, and keeps the
   last known valid snapshot when a normalization rejects one (V2-ADR-086).
4. `game-v2/market/BtcMarketFeedSource.ts`: the single production wrapper —
   `createBtcMarketFeedSource(): MarketFeedSource` — translating
   `SSEMarketService`'s `connect`/`disconnect`/`onData` into the port shape.
   This is the only file under `game-v2/**` importing `services/market/*` or
   `types/crypto`.
5. Tests: `normalizeMarketUpdate` (valid input; one rejection case per
   invalid field — non-finite/out-of-range price, rsi, atrPercent,
   normalizedVolume, volumePercentile; invalid `rsiState`/`whaleTier`/
   `trendDirection`; the `'SIDEWAYS'` → `'NEUTRAL'` normalization;
   `isSynthetic` defaulting to `false` when absent); `MarketSnapshotAdapter`
   (a fake injected `MarketFeedSource` proves `start()` normalizes and
   publishes valid updates, an invalid update leaves `latest()` unchanged
   rather than throwing, `subscribe()`/unsubscribe, `stop()` delegates to the
   source's `disconnect()`); a thin `BtcMarketFeedSource` test proving the
   wrapper delegates to `SSEMarketService` correctly (not re-testing
   `SSEMarketService`'s own already-covered reconnect/fallback behavior).

Out of scope:

- ETH/SOL (deferred, no task ID — see Scope Decision above).
- Any wiring into `ExperienceDirector`, `ConvergenceSystem`,
  `GameV2Runtime`, or any other `game-v2/systems/**`/`game-v2/runtime/**`
  consumer. That is later MVP-2 work (`V2-201`+).
- Freshness/staleness *degradation* policy — `V2-211` owns "no stale premium,
  missed-event replay, or reconnect burst." This task only carries
  `timestamp`/`isSynthetic` through unmodified so a later task can build
  degradation on top; it does not decide what "stale" means for gameplay.
- Indicator-event state machines (`V2-203`+), lethality profiles (`V2-202`),
  or position locking (`V2-201`).
- Any change to `SSEMarketService`, `railway-market-aggregator/**`, or
  `railway-market-server/**`.

## Preflight Decisions To Record

- **V2-ADR-084 (proposed): `V2-200` normalizes BTC only; `MarketAsset` is a
  union with one member (`'BTC'`) rather than a hardcoded literal, but no
  ETH/SOL wiring is built ahead of the `railway-market-aggregator` multi-asset
  work it depends on.** Rationale: the real aggregator/SSE infrastructure is
  single-asset today (checked, not assumed); building a three-asset contract
  against infrastructure that cannot yet produce two of the three would be
  untestable against anything but invented fixtures. User-confirmed via
  direct question before this brief was written.
- **V2-ADR-085 (proposed): `MarketSnapshot` excludes
  `spawnRateMultiplier`/`enemyAggroMultiplierLong`/`enemyAggroMultiplierRight`
  and every other legacy gameplay-multiplier field `SSEMarketUpdate` carries,
  keeping only raw/normalized indicator data.** Rationale: design §7.1 states
  plainly that "old frontend gameplay multipliers, difficulty services, and
  Director ownership are not reused." Those fields are pre-baked outputs of
  the legacy difficulty pipeline the design explicitly excludes; Game V2's
  own (future) Encounter Director must derive its own encounter logic from
  raw indicators, not consume the old system's conclusions.
- **V2-ADR-086 (proposed): the adapter is injected via a `MarketFeedSource`
  port, and `normalizeMarketUpdate` rejects invalid input by returning
  `null` rather than throwing.** Rationale (port): mirrors `RendererPort`/
  `IntentSource`, keeps `game-v2/**` free of a direct `SSEMarketService`
  import outside one wrapper file (design §7.1's own rule — "gameplay
  systems never import exchange clients or raw indicator services" — applies
  transitively once a real consumer exists), and makes normalization
  testable without a browser `EventSource`. Rationale (reject-not-throw):
  every other Game V2 contract validator (`WorldStateValidator`,
  `assertEnemyDefinition`, `assertAbilityTierEffect`) throws, because
  invalid internal state is a defect that must not run. A live external feed
  is different — one malformed SSE payload is an expected, recoverable
  condition (matching §7.5's "stale data cannot author new market events;
  existing market effects transition to neutral" framing), not a broken
  invariant; throwing would let one bad tick from an external source crash
  an otherwise-healthy running game.
- **V2-ADR-087 (proposed): `TrendDirection` is exactly `'UP' | 'DOWN' |
  'NEUTRAL'`, matching what `indicatorService.ts` actually derives from RSI
  server-side; the client-side `SSEMarketService.emitSyntheticUpdate`
  fallback's inconsistent `'SIDEWAYS'` spelling is normalized to `'NEUTRAL'`
  rather than added as a fourth enum member.** Rationale: the two spellings
  mean the same thing (no directional trend) and exist only because the
  legacy fallback code was written independently of the real server path;
  the canonical contract should have exactly one value per concept rather
  than propagate an accidental spelling inconsistency.

## Files

- New: `game-v2/contracts/MarketSnapshot.ts`,
  `game-v2/market/MarketFeedSource.ts`,
  `game-v2/market/MarketSnapshotAdapter.ts`,
  `game-v2/market/BtcMarketFeedSource.ts`,
  `tests/game-v2/market/MarketSnapshotAdapter.test.ts`,
  `tests/game-v2/market/BtcMarketFeedSource.test.ts`
- Modify: none outside `game-v2/**`/`tests/game-v2/**`.

## Steps

- [ ] **Step 1: Contract (no RED needed — pure types)**

  Add `MarketSnapshot.ts`. No runtime logic, so no dedicated test file
  (matching `contracts/RuntimeCheckpoint.ts`/`contracts/GameV2Debug.ts`'s own
  precedent of untested pure-type contracts).

- [ ] **Step 2: Normalization (RED then implement)**

  Add `MarketFeedSource.ts` (port + raw shape) and
  `normalizeMarketUpdate` in `MarketSnapshotAdapter.ts`. Prove: a fully valid
  update normalizes correctly; each invalid field is independently rejected
  (`null`); `'SIDEWAYS'` normalizes to `'NEUTRAL'`; a missing `isSynthetic`
  defaults to `false`; the output is frozen and carries
  `MARKET_SNAPSHOT_SCHEMA_VERSION`.

- [ ] **Step 3: Adapter (RED then implement)**

  Add the `MarketSnapshotAdapter` class. Prove: `start()` subscribes to the
  injected source and normalizes/publishes valid updates through `latest()`
  and `subscribe()`; an invalid update leaves `latest()` at its last valid
  value rather than throwing or publishing `null`; `stop()` calls the
  source's `disconnect()`; unsubscribing a listener stops further
  notifications.

- [ ] **Step 4: Production wrapper (RED then implement)**

  Add `BtcMarketFeedSource.ts`. Prove the wrapper's `connect`/`disconnect`
  delegate to a mocked `SSEMarketService` correctly, without re-testing
  `SSEMarketService`'s own already-covered internal resilience behavior.

- [ ] **Step 5: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npx vitest run tests/services/market/SSEMarketService.test.ts --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 6: Mutation pass**

  At minimum: each individual field-rejection branch in
  `normalizeMarketUpdate` (must fail its own dedicated test only); the
  `MarketSnapshotAdapter`'s "keep last valid snapshot on rejection" path
  (must fail if a rejected update is published or clears `latest()`).

## Acceptance Criteria

1. `MarketSnapshot` is frozen, versioned, and every field is validated finite
   or a valid enum member before construction.
2. `normalizeMarketUpdate` rejects (returns `null`, never throws) any input
   that cannot be represented validly, proven per field.
3. `MarketSnapshot` excludes every legacy gameplay-multiplier field
   `SSEMarketUpdate` carries.
4. Exactly one file under `game-v2/**` imports `SSEMarketService`/
   `types/crypto`.
5. No `game-v2/systems/**` or `game-v2/runtime/**` file imports anything
   from `game-v2/market/**` or `game-v2/contracts/MarketSnapshot.ts` yet.
6. Every Step 5 gate passes and the Step 6 mutation pass leaves no survivor.
