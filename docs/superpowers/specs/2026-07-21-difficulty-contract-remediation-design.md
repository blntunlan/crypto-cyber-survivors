# Difficulty Contract Remediation

> **Status** approved
> Owner: Gameplay Runtime
> Source of truth: [Core Loop & Dynamic Difficulty — Final Design Contract v1.0](https://app.notion.com/p/39baa0be337b81ca87cbdd29d4c8d627)

## Goal

Bring the production difficulty, cash-out, Greed, pacing, Doom, Advantage, threat-budget, stale-market, leverage, and market-normalization paths into explicit agreement with the Final Design Contract v1.0.

The remediation must preserve the current renderer, pooling, combat, canonical market feed, Railway settlement, and rollback capabilities. It must remove duplicate decision authority rather than add another compatibility layer.

## Approved Direction

Three approaches were considered:

| Approach | Result | Decision |
|---|---|---|
| Patch the paused five-minute cycle screen | Smallest change, but preserves the wrong quote, pause, Greed, and pacing model | Rejected |
| Keep the cycle UI while adding server reject calls | Improves settlement bookkeeping but leaves gameplay and server state split | Rejected |
| Replace the cycle gate with a live 15-second authoritative offer | Matches the Final Design Contract and removes the root ownership conflict | Approved |

The production authority remains `ExperienceDirector`. The modular difficulty runtime remains available as shadow telemetry and rollback support until parity is demonstrated; it does not become a second gameplay authority.

## Non-Negotiable Invariants

- Pair, side, leverage, entry price, liquidation price, run ID, and encounter seed lock at run start.
- Public leverage tiers are exactly `1`, `2`, `5`, `10`, and `20`.
- Token and PvP runs never use hidden player-specific mercy or punishment.
- A market event cannot become mechanically active before at least two real gameplay seconds of telegraph.
- At most one primary and one support encounter are active; at most one market event waits in the queue.
- Greed increases on explicit reject and timeout, never decreases during a run, and resets only when the run ends.
- Cash-out quotes are server-signed before the offer is shown and remain fixed for 15 real seconds.
- The game continues while a cash-out offer is visible.
- Threat credits are reserved once and cannot authorize repeated spawn plans.
- Stale market data disables new market events and market reward accrual but does not stop the survival curve or ordinary spawning.
- Advantage can activate at most one mechanical opportunity and never mints a token directly.
- Doom increases through recovery, area, support, and encounter complexity pressure without bypassing enemy stat caps.
- Spawn execution accepts only an authorized `SpawnPlan`, world state, and seeded RNG outcomes.

## Authority Model

| Decision | Owner |
|---|---|
| Canonical price and indicators | Market runtime snapshot |
| Regime, normalized pressure, confirmed market event | `MarketRegimeEngine` |
| Alignment, Advantage, Headwind, liquidation proximity | `PositionRiskModel` |
| BuildUp, Peak, PeakFade, Recovery, MarketSurge, Doom | `PacingStateMachine` |
| Survival pressure and Doom Stack count | `SurvivalCurve` |
| Persistent reject state | Server escrow plus runtime Greed mirror |
| Threat credits and reservation | `ThreatBudgetAllocator` through `ExperienceDirector` |
| Advantage selection and activation | `AdvantageAllocator` through `ExperienceDirector` |
| Encounter selection | `EncounterPlanner` |
| Spawn authorization | `SpawnPlanBuilder` |
| Spawn side effects | `SpawnExecutor` |
| Quote, reward points, escrow, shard settlement | Railway economy services |
| Visual and audio cues | `PresentationDirector` |

No consumer may recompute a value owned by another row in this table.

## Cash-Out And Greed Flow

The paused `CYCLE_COMPLETE` state is removed from the competitive cash-out flow. Five-minute timing remains the first eligibility boundary, not a forced gameplay pause.

The client watches the committed Director snapshot. When server eligibility is due and the Director enters `RECOVERY`, the client requests a quote. The quote endpoint uses persisted session start, last decision, Greed, canonical market age, and verified session metrics; it does not trust a client-declared `RECOVERY` value for economic authority.

The server returns a signed quote, expiry, Safe Exit state, and authoritative Greed level. Only then does the client display the offer. The overlay uses wall-clock expiry while gameplay and `TimeService` continue normally.

The three terminal paths are:

| Player outcome | Server action | Runtime action |
|---|---|---|
| Accept | Settle signed quote idempotently | End run after settlement succeeds |
| Reject | Close quote and increment Greed | Emit authoritative Greed update; continue same run |
| Timeout | Close quote as expired and increment Greed | Emit the same Greed update as reject |

Reject and timeout never reset Director state, threat credits, market regime, run seed, survival elapsed time, or player build. They do not heal the player. The next eligibility interval is `240 + 30 * min(greedLevel, 4)` seconds.

After eligibility, if no Recovery occurs within 45 seconds, the policy requests a deterministic `PeakFade -> Recovery` transition. This request changes pacing only; it cannot create or settle a quote by itself.

When the market is stale, new ordinary quotes are disabled. After 60 seconds, the server may return a Safe Exit quote based on the last verified escrow without increasing Greed.

## Runtime Greed Synchronization

Railway escrow is the persistent authority for `greedLevel`. The client keeps a runtime mirror solely so `ExperienceDirector` can calculate pressure without an API call in the RAF loop.

An authoritative quote decision emits one typed gameplay event containing the session ID, quote ID, decision, and resulting Greed level. `DifficultyEventBridge` records that value into `DifficultyInputInbox` for the next simulation tick. `DifficultyPhase` reads the tick-boundary value; it never hardcodes or locally increments Greed.

Duplicate or out-of-order decision events are ignored by quote ID and server sequence. A client reconnect refreshes Greed from escrow before requesting another quote.

## Pacing And Telegraph

`PacingStateMachine` owns all pacing transitions. `DirectorSpawnOrchestrator` no longer derives pacing with a local modulo helper.

Normal phase durations use seeded deterministic values inside the configured ranges:

| State | Duration | Threat multiplier |
|---|---:|---:|
| BuildUp | 45–70 seconds | 0.75 |
| Peak | 20–35 seconds | 1.25 |
| PeakFade | 8–12 seconds | 0.85 |
| Recovery | 25–40 seconds | 0.35 |
| MarketSurge | Maximum 20 seconds | 1.40 |

`MarketRegimeEngine.update` receives run elapsed time. A confirmed event records `telegraphEndsAtElapsedSeconds = elapsed + 2`. `EncounterPlanner` remains in `TELEGRAPH` until that boundary and may become `ACTIVE` only afterward.

Events during Peak occupy the single queued slot. Further events are rejected until the slot clears. An event family observes its 75-second gameplay cooldown; Whale events observe 120 seconds. No queued event is replayed after stale-market reconnect.

## Doom

`SurvivalCurve` computes a Doom Stack every five minutes after minute 25. The stack count enters the committed Director input and snapshot instead of remaining a constant.

Each stack applies the following bounded effects:

- Reduce Recovery maximum by two seconds, never below eight seconds.
- Increase area-hazard uptime intent.
- Add higher-complexity encounter cards to the eligible deck.
- Add one encounter-complexity slot every two stacks.
- Reduce support efficiency, never below 40 percent.
- Leave normal enemy health, damage, and speed caps unchanged.

Doom state and stack count are exposed to HUD and presentation snapshots. Doom does not reset at cash-out rejection or at a five-minute boundary.

## Threat Reservation

`ThreatBudgetAllocator` continues to accrue a bounded eight-second bank. Before building a plan, `ExperienceDirector` reserves at most the credits required by current world capacity. `SpawnPlanBuilder` receives the reserved amount, not the unspent bank snapshot.

Reservation immediately removes credits from the bank, making plan authorization idempotent. `SpawnExecutor` cannot authorize a second plan and cannot read the allocator. A plan carries revision, tick, seed, and reserved threat; replaying the same plan is rejected by revision tracking.

If world capacity shrinks between planning and execution, the unexecuted reservation is conservatively discarded for v1. It is never refunded twice or reused by a later revision.

## Advantage Activation

`AdvantageAllocator` accrues credits from favorable alignment, market regime confidence, and delta time. When no mechanic is active, the Director calls `planNext` and atomically activates the returned seeded plan.

The committed snapshot contains the mechanic ID, start and end time, movement multiplier, dash cooldown multiplier, and a deterministic activation ID. `AdvantageEffectAdapter` applies each activation once:

| Mechanic | Gameplay effect |
|---|---|
| Momentum Window | Eight seconds of 1.10 movement and 0.90 dash cooldown |
| Liquidity Drop | One deterministic fixed-value health or utility pickup |
| Green Lane | Six seconds in which a seeded spawn corridor remains clear |
| Alpha Encounter | Optional higher-cost encounter with a verified reward-point intent |

The adapter does not mint tokens. Alpha completion becomes a verified session metric and is recalculated by the server reward ledger.

## Stale Market

A stale frame preserves the last semantic regime for presentation but clears the active event and starts market-pressure decay toward zero. It never returns an empty plan solely because data is stale.

The Director still evaluates survival pressure, pacing, Greed, Doom, and existing encounter recovery. Advantage accrual and market-derived reward accrual freeze. Ordinary spawn plans continue from the remaining non-market pressure components.

Reconnect consumes only the new canonical frame. Missed market events are not synthesized or replayed.

## Leverage And Volatility

`LeverageOption`, menu choices, Director config, runtime contracts, API validation, and tests use exactly `1 | 2 | 5 | 10 | 20`. Historical sessions with retired leverage values remain readable but cannot start a new run.

Volatility uses a preallocated 60-minute rolling ATR-percent ring. A canonical market sequence is inserted at most once. Percentile rank is deterministic and allocation-free in the simulation path. Before enough history exists, rank is computed over available samples; one sample resolves to the neutral midpoint.

Market pressure remains:

```typescript
0.35 * volatilityPercentile +
0.25 * normalizedVolume +
0.20 * trendStrength +
0.10 * rsiExtremity +
0.10 * whaleScore
```

## Presentation And Telemetry

`PresentationDirector` consumes the active authority snapshot in both current and modular modes. Current mode can no longer expose a null presentation snapshot while still controlling spawn.

The content manifest hash is generated from Director config, enemy-cost catalog, encounter catalog, Advantage catalog, and public leverage tiers. CI fails if the generated artifact is stale.

Every run records director version, config version, content manifest hash, market sequence range, encounter seed, economy version, mode, and difficulty feature mode. Required lifecycle telemetry includes regime changes, encounter phases, quote outcomes, Greed changes, stale/reconnect, Safe Exit, guardrail clamps, and replay mismatches.

## Legacy Removal

After the new regression suite passes, production ownership of `SpawnSystem`, `DifficultyManager`, `UnifiedDirector`, direct difficulty rules, and old cycle-factor continuation is removed.

`DifficultyContext` may remain as a compatibility observation surface while consumers migrate, but no production gameplay value may be calculated through its legacy outputs. `CoreGameplayLoop` may retain presentation pulse behavior only after difficulty multipliers are removed from its public contract.

Legacy golden fixtures remain only when they prove rollback compatibility. Fixtures that encode retired gameplay behavior are archived rather than used as release truth.

## Error Handling

- Quote request failure leaves the run active and does not open an unsigned offer.
- Settlement failure keeps the signed offer visible until expiry or explicit retry.
- Duplicate decisions return the existing idempotent result.
- Invalid or unsupported leverage fails before run creation.
- Out-of-order market frames do not mutate percentile history, regime, or pacing.
- A failed manager update uses the last safe snapshot for the configured grace window and then a neutral bounded fallback.
- Unknown Advantage or encounter IDs are rejected before execution.
- Snapshot revision mismatch prevents spawn and effect execution.

## Testing Strategy

Every behavior change follows red-green-refactor. Tests must first fail against the current implementation for the observed contract violation.

Required suites:

- Cash-out integration: offer timing, live gameplay, accept, reject, timeout, reconnect, Safe Exit, idempotency.
- Greed integration: server result to next-tick Director pressure, monotonicity, no reset/heal on continue.
- Pacing determinism: 30, 60, and 120 FPS parity; seeded duration parity; forced Recovery; queue capacity.
- Telegraph: confirmed event remains non-mechanical for at least two seconds.
- Doom: stack timing, Recovery floor, support floor, complexity slots, HUD snapshot.
- Threat budget: one reservation, no repeated spend, capacity loss behavior, replay rejection.
- Advantage: one active mechanic, seeded selection, one-shot execution, expiry, no token mint.
- Stale market: survival spawn continues, market events stop, reward accrual freezes, reconnect does not replay.
- Leverage: exact public tiers across frontend, runtime, API, and reward risk normalization.
- Volatility: rolling percentile, duplicate sequence, ring rollover, allocation audit.
- Ownership audit: no production import or call path to retired authorities.
- Economy security: client pacing tampering cannot bypass eligibility or change reward points.

Final verification order:

```TERMINAL
npx vitest run <changed-test-files> --pool=forks --maxWorkers=1
npm run test:director-release
cd railway-market-server && npm run validate
cd railway-market-server && npm test
npm run check:baseline
```

## Rollout

The work lands in the same order as the confirmed defects:

1. Cash-out and Greed lifecycle.
2. Telegraph and pacing ownership.
3. Doom integration.
4. Advantage activation and threat reservation.
5. Stale-market survival behavior.
6. Leverage and volatility normalization.
7. Presentation, telemetry, manifest, and legacy removal.

Each stage is independently testable and keeps the current rollback mode available. Production authority changes only after the stage-specific integration tests pass.

## Non-Goals

- Redesigning combat, weapons, cards, renderer, or pool architecture.
- Adding new token economics beyond the approved reward-point contract.
- Enabling hidden adaptive difficulty in Token or PvP modes.
- Replacing Railway Postgres or the canonical market aggregator.
- Refreshing unrelated UI themes or visual baselines.
