# Market-Driven System Design

> **Status** review
> Owner: Core Gameplay
> Created: 2026-07-26
> Review policy: adversarial severity gate

## Goal

Restore the defining Crypto Survivors fantasy: the player should feel that they opened and managed a real LONG or SHORT trade while playing a dense, readable, replayable survivor combat loop.

The real market remains the live Game Master, but market activity no longer owns whether the game is fun. A deterministic combat heartbeat guarantees action during live-flat, degraded, stale, and warming data modes. Market price, indicators, position alignment, leverage, and risk commitment change the meaning, behavior, event composition, and payout of that action.

The runtime must produce a compelling "one more pulse" loop without fabricating market direction, creating hidden difficulty authority, or adding an unmanageable multiplier graph.

## Product Vision

Crypto Survivors is not a survivor game with a crypto skin.

- Open a position with side, leverage, entry price, and liquidation risk.
- Read the market and battlefield as one connected system.
- Survive dense combat, develop a build, and grow a streak.
- Feel favorable movement as an offensive and reward opportunity, not an empty easy mode.
- Feel adverse movement as coordinated pressure with proportionate opportunity.
- Choose when to secure value and when to accept more risk.
- Attribute success to a good trade and good execution.
- Attribute failure to mismanaged risk, greed, positioning, or combat execution rather than arbitrary scaling.

```TERMINAL
OPEN POSITION
  -> READ MARKET + BATTLEFIELD
  -> SURVIVE THE PULSE
  -> KILL + COLLECT + BUILD
  -> GROW UNBANKED VALUE
  -> CASH OUT OR CONTINUE
  -> SETTLE + PROGRESS
  -> RE-ENTER
```

## Current-State Diagnosis

The recent difficulty redesign improved authority and determinism but weakened the felt game loop.

- The legacy path targets approximately one ordinary spawn every `800ms` at neutral difficulty, while the new threat-credit path can begin near `0.2` credits per second for enemies that cost one full credit.
- The modular path can reserve and spend fractional credits before `SpawnPlanBuilder` floors the value to a whole enemy count. Budget can disappear without producing an executable intent.
- `CoreGameplayLoop` contains a short build/release rhythm, but that rhythm mainly drives pulse, scale, shake, and presentation. Spawn, behavior, and rewards do not share it as gameplay authority.
- Long `BuildUp`, `Peak`, `PeakFade`, and `Recovery` phases can shape threat while the short loop separately shapes presentation. Two pacing clocks compete instead of forming a hierarchy.
- Market influence is forced to provide both combat tempo and market authenticity. Flat data kills tempo; stronger sensitivity creates spikes; extra smoothing makes the market cosmetic.
- Favorable, adverse, strain, macro pacing, encounter, and reward multipliers can compound without one final cap.
- Indicator levels can be interpreted repeatedly instead of becoming deduplicated, edge-triggered events with identity and lifetime.

The root problem is disconnected rhythm, overlapping authority, and an oversized tuning surface.

## Relationship To Existing Contracts

This design extends [Modular Difficulty Runtime Design](/docs/superpowers/specs/2026-07-15-modular-difficulty-runtime-design) and revises its moment-to-moment experience mapping.

It preserves the server-authoritative Greed, signed quote, settlement, and cash-out rules in [Difficulty Contract Remediation](/docs/superpowers/specs/2026-07-21-difficulty-contract-remediation-design).

- Long-horizon pacing remains macro context for run structure, encounter eligibility, Doom, and cash-out Recovery eligibility.
- The new `Heartbeat` owns moment-to-moment spawn rhythm.
- Macro pacing contributes one bounded bias before final composition; it cannot independently multiply spawn rate afterward.
- A 45-60 second commitment beat is not a cash-out quote and cannot locally increment Greed.
- Authoritative Greed changes only through the approved server-signed reject or timeout flow.
- Existing first cash-out eligibility and quote duration remain unchanged.

Neither earlier design is archived. This document supersedes only their moment-to-moment spawn pacing, behavior modulation, reward-feel mapping, and flat-market experience assumptions.

## Design Principles

1. **One committed authority:** spawn, behavior, rewards, and presentation observe one coherent revision.
2. **Heartbeat guarantees fun:** market activity never determines whether ordinary combat exists.
3. **Market gives meaning:** real evidence determines event character, position edge, behavior, and reward opportunity.
4. **No fabricated direction:** flat, stale, and reconnect gaps cannot manufacture bullish or bearish information.
5. **Density is not danger:** a strained player can remain surrounded by readable fodder while coordination and lethality fall.
6. **Derived pressure:** combat pressure is an output, not a peer state that feeds itself.
7. **Edge-triggered indicators:** transitions create bounded events; persistent levels do not create repeated storms.
8. **Final caps apply once:** all contributions combine before one final duration, intensity, behavior, and reward cap.
9. **Executable spending:** fractional credits persist; full credits are reserved only for executable intents.
10. **Readability before surprise:** behavior changes receive telegraph and interpolation.
11. **Challenge-normalized rewards:** payout follows realized challenge, not direction alone.
12. **Adversarial review:** every material decision is reviewed for breakpoints and simplification.

## Non-Negotiable Invariants

- A simulation tick observes at most one active experience revision.
- `SpawnContract`, `BehaviorContract`, and `RewardContract` share cycle, validity, data mode, seed, and `committedRevision` metadata.
- Interpolated behavior also exposes `targetRevision` and `effectiveRevision`; rewards never price target burden before it becomes effective.
- Gameplay consumers never read raw price, indicators, PnL, leverage, or player telemetry.
- Live-flat data creates no directional bias.
- Stale and warming data create no new directional event, reward, morph, or behavior target.
- A reconnect price gap establishes a baseline; it is not a breakout.
- Ordinary combat does not remain empty for more than `1.5s` during `PLAYING`, excluding lifecycle transitions and world-capacity failure.
- High player strain may reduce all market-added density to zero; the heartbeat guarantees engagement, not a fixed entity-count floor.
- Market modulation changes final heartbeat duration by no more than `20%` and peak intensity by no more than `25%`.
- At most one primary and one support signal event influence a heartbeat cycle.
- Fractional spawn credits are never spent.
- An executed plan cannot spend the same reservation twice.
- Unexecuted event reservations cannot accumulate into a delayed flood.
- LONG and SHORT mirrored inputs produce mirrored position-edge decisions.
- Reward opportunity cannot create a dominant strategy for one side, regime, or intentional stalling.
- Presentation cannot imply directional evidence that gameplay authority does not possess.
- No new allocation, React state update, or raw event calculation is added to the RAF path.

## Canonical Runtime Model

The runtime exposes one model with six fields that have explicit roles, not six peer multipliers.

| Field | Type | Owner | Meaning |
|---|---|---|---|
| `dataMode` | `fresh \| degraded \| stale \| warming` | Market boundary | Whether market evidence may author gameplay |
| `heartbeat` | phase, progress, cycle ID, macro context, seed | Heartbeat manager | Deterministic moment-to-moment rhythm |
| `positionEdge` | `-1..1` | Position-edge manager | Position-relative favorable or adverse effect |
| `compression` | `0..1` | Compression manager | Non-directional energy from live-flat evidence |
| `playerStrain` | `0..1` | Player-strain manager | Damage, escape capacity, crowd pressure, and recovery need |
| `riskCommitment` | `0..1` | Risk manager | Leverage, authoritative Greed, unbanked value, streak, and continue history |

`combatPressure` is not canonical state. The composer derives final density, cadence, threat, behavior, and reward opportunity once.

Raw price direction remains internal event metadata for thematic selection. Consumers receive only `positionEdge` and authored contracts.

Authoritative `greedLevel` remains a discrete input. It is never inferred or mutated by the client. `riskCommitment` combines it with current run exposure.

### Market-To-Edge Contract

| Step | Normative rule |
|---|---|
| Source pair | Bucket source timestamps onto the immutable `1000ms` canonical source grid and use adjacent accepted buckets. The latest valid sequence wins within a bucket; a missing bucket produces no synthetic sample or edge. Authority ticks never stand in for source samples. |
| Position sign | LONG is `+1`; SHORT is `-1`. |
| ATR normalization | `atrRatio = max(ATR / currentPrice, immutableAtrFloor)`. The floor is an `immutable-safety` manifest value. |
| Raw edge | `rawEdge = clamp(positionSign * ln(currentPrice / previousPrice) / atrRatio, -1, 1)`. |
| Applied edge | `appliedEdgeTarget = rawEdge * authorityConfidence`. Commit that target; the shared `BoundedTransition` applies it. No second EMA or hidden smoothing stage exists. |
| Flat handling | A zero source-price delta produces zero directional edge. Fresh low-edge evidence may fill non-directional compression through control 8 only. |

The formula is side-mirrored by construction. Near-zero ATR remains finite through `immutableAtrFloor`; stale or warming data bypasses the formula and commits no directional target.

## Input And Commit Flow

The input boundary accepts ordered `CanonicalMarketFrame` values, real player telemetry, locked run constants, authoritative Greed, unbanked run value, and world pressure.

```TERMINAL
INPUT INBOX
  -> DATA MODE + SIGNAL EVENTS
  -> HEARTBEAT + POSITION EDGE + COMPRESSION + STRAIN + RISK
  -> EXPERIENCE COMPOSER
  -> SPAWN + BEHAVIOR + REWARD CONTRACTS
  -> SPAWN / AI / COLLECTION / PRESENTATION CONSUMERS
```

Authority commits at `5Hz` and explicit urgent boundaries such as lifecycle reset, data-mode transition, liquidation transition, or accepted signal event.

`BehaviorContract` carries targets and interpolation duration. RAF consumers interpolate toward committed targets and never integrate raw market values.

## Data Freshness Lifecycle

| Mode | Market behavior | Compression | Queued signals | Directional presentation |
|---|---|---|---|---|
| `fresh` | Full bounded authority | May fill or release | Eligible | Allowed from committed evidence |
| `degraded` | Confidence-reduced authority | Fills slowly; cannot force maximum release | High-confidence only | Reduced |
| `stale` | No new market-authored gameplay | Decays toward zero | Expired | Forbidden |
| `warming` | Baseline collection only | Held at zero | Rejected | Forbidden |

The beta `DataValidityPolicy` is normative: a complete finite source frame with age `<= 2500ms` is `fresh`; age `> 2500ms` and `<= 6000ms` is `degraded`; age `> 6000ms` is `stale`. Authority confidence is `1` in fresh, decreases linearly from `1` to `0` across the degraded window, and is `0` in stale or warming. These thresholds are `immutable-safety` manifest values, not tuning controls.

A reconnect or stale-to-valid transition enters `warming`. The first unique, strictly monotonic, source-timestamp-monotonic frame whose arrival age is `<= 2500ms` establishes a new baseline. Market authority resumes only after three consecutive frames satisfying the same rule and uninterrupted heartbeat continuity. Replayed authority ticks do not count. An invalid frame resets the consecutive count but does not replace the baseline. The gap creates no impulse, indicator edge, release, event, morph, or premium.

## Signal Event Model

RSI, MACD, normalized volume, ATR regime, whale tier, and confirmed market transitions produce internal `SignalEvent` records.

Every event contains identity, source sequence, source revision, family, optional raw direction, confidence, bounded intensity, creation tick, eligible tick, expiry tick, heartbeat cycle, telegraph key, and creation data mode.

- Events are edge-triggered, debounced, deduplicated, and TTL-bound.
- A persistent level cannot retrigger until it exits and re-enters through hysteresis.
- During `PULL`, an accepted event telegraphs and targets the next `SNAP`.
- During `SNAP`, a compatible event may strengthen the active event within the final cap.
- During `PAYOFF` or `RELOAD`, an event may occupy the next-cycle queue.
- One fixed-capacity scored queue owns event arbitration.
- Score ties resolve by confidence, oldest eligible source sequence, then stable event identity.
- The strongest event selects the primary family; at most one compatible event becomes support. An event can defer for at most one heartbeat before it is explicitly marked `SUPERSEDED` or expires.
- Remaining signals add only bounded confidence, never independent multipliers.
- Stale, warming, duplicate, expired, out-of-order, and cooldown-blocked events are rejected with reason codes.

The signal mapper selects named tuples only:

| Indicator edge | Primary profile | Telegraph intent | Deterministic fallback | Policy tuple ID |
|---|---|---|---|---|
| RSI threshold exit and re-entry | `OVEREXTENSION_SKIRMISH` | Arc pressure and reversal window | `FODDER_ARC` | `rsi_overextension_v1` |
| Confirmed MACD crossover | `MOMENTUM_LANE` | Fresh-only directional lane cue | `PURSUER_LANE` | `macd_momentum_v1` |
| Normalized-volume threshold crossing | `SURGE_PACK` | Short dense arrival burst | `FODDER_PACK` | `volume_surge_v1` |
| ATR regime transition | `VOLATILITY_SCATTER` | Spacing and cadence warning | `SKIRMISHER_SCATTER` | `atr_regime_v1` |
| Whale-tier transition | `WHALE_ELITE` | One elite telegraph plus support | `HEAVY_SUPPORT` | `whale_tier_v1` |
| Confirmed market-regime transition | `BREAKOUT_RELEASE` | Next-Snap release cue | `BASELINE_SNAP` | `market_transition_v1` |

Profiles map to existing registry and pool families. They may choose authored tuples but cannot introduce new scalar multipliers. Directional telegraph variants are forbidden outside fresh committed evidence.

## Nested Core Loops

| Loop | Duration | Player experience |
|---|---:|---|
| Micro execution | `1-3s` | Move or dodge, kill, collect, grow streak |
| Combat heartbeat | `8-12s` | Pull, Snap, Payoff, Reload |


Commitment is not a third scheduler or loop. The existing macro pacing authority owns a `45-60s` eligibility cooldown and may consume it only after a resolved Payoff. The opportunity is non-blocking and cannot settle the run, mint value, request an unauthorized quote, or increment Greed.

The commitment adapter emits at most one UI opportunity for `(runId, heartbeatCycleId, payoffRevision)`. A cash-out request uses a separate idempotency key and can change Greed or settlement state only from a valid server-signed response. Duplicate responses are ignored; reject and timeout outcomes follow the existing server contract. Local opportunity, animation, or timeout code cannot mutate Greed, mint value, or infer settlement.

## Combat Heartbeat

| Phase | Typical share | Responsibility |
|---|---:|---|
| `PULL` | `35-45%` | Raise density, narrow safe space, build anticipation |
| `SNAP` | `20-30%` | Short conflict peak and market-event release |
| `PAYOFF` | `20-30%` | Chain kills, collection burst, reward recognition |
| `RELOAD` | `10-20%` | Preserve targets while preparing the next Pull |

- Reload never intentionally empties the field.
- Market evidence changes final phase duration by at most `20%` and final Snap intensity by at most `25%`.
- Macro pacing, risk, strain, market evidence, and signals combine before the final cap.
- High strain shifts composition toward fodder, adds vulnerability, widens telegraphs, lowers coordination, and limits attack overlap.
- High risk can raise the heartbeat target and reward curve, but strain may reduce all market-added density to zero and risk cannot bypass hard caps or relief.
- Macro pacing selects a bounded envelope; it does not run a second spawn-rate multiplier pipeline.

## Spawn Contract

`SpawnContract` contains shared metadata, heartbeat state, density floor/target/ceiling, spawn window, final intensity, bounded fractional bank, full-cost reservation, primary/support identities, deterministic family profiles, intent weights, telegraph key, and expiry.

An intent is executable only when full threat cost is available, world capacity exists, the pooled family or deterministic fallback is available, a valid position can be produced, and the revision has not executed.

Fractional credits remain in the generic bank. The planner first validates complete executable intents against capacity, pool availability, deterministic fallback, geometry, and revision. It then atomically debits exactly their full cost. No pre-validation reservation can drain the bank. The maximum bank is derived from one heartbeat target budget; overflow decays instead of creating a later burst. A post-commit world change may discard an unexecuted full reservation exactly once and must report the loss. Integer flooring never discards fractional value.

Each intent represents one pooled entity; authored groups compile to independent intents before validation.

| Transaction state | Bank effect | Allowed next state |
|---|---:|---|
| `PLANNED` | None | `VALIDATED` or `CANCELLED` |
| `VALIDATED` | None; capacity, pool/fallback, geometry, cost, and revision are proven | `DEBITED` or `CANCELLED` |
| `DEBITED` | Full cost removed atomically once under `(runId, revision, intentId)` | `EXECUTED` or `DISCARDED` |
| `EXECUTED` | None | Terminal |
| `DISCARDED` | No refund and no retry | Terminal |
| `CANCELLED` | None | Terminal |

There is no partial transaction, reverse transition, or post-debit refund. A world change after debit produces one `DISCARDED` receipt; its cost cannot re-enter the bank and create a delayed flood. The transaction key makes duplicate debit and execution impossible.

## Behavior Contract

`BehaviorContract` contains shared metadata, interpolation duration, coordination, formation tightness, pursuit, flank intent, attack cadence, minimum anticipation, bounded speed, vulnerability, stagger opportunity, maximum attack overlap, and intent weights.

- Favorable `positionEdge` preserves density while increasing vulnerability, formation breaks, reckless movement, and reward opportunity.
- Adverse `positionEdge` increases pursuit, flank, and coordination only within the final cap and with proportionate opportunity.
- High strain guarantees behavioral relief by widening anticipation, limiting attack overlap, lowering coordination, and adding vulnerability.
- Live-flat compression may tighten neutral formations and atmosphere but cannot imply LONG or SHORT direction.
- Targets change only from committed revisions and transition over `0.5-1.5s`.
- One simulation-time `BoundedTransition` primitive owns gameplay interpolation. It reports the actual applied behavior burden and advances `effectiveRevision` only when the target becomes effective.

### Strain Guardrail

`playerStrain` samples at the `5Hz` authority cadence over a trailing `3s` window. Crowd pressure, attack overlap, and absence of a reachable safe route are the required pressure evidence. Recent damage contributes at most `25%` of the composite and cannot activate relief without at least one required pressure signal. Relief engages at `>= 0.70` for three consecutive commits and remains until strain is `< 0.45` for `1.5s`.

Safe-route pressure subtracts static geometry and player-chosen dead ends; it can rise only from committed enemy occupancy and attack zones. These values form one versioned `StrainSafetyProfile` tuple and are classified as `profile-selected`, not primary controls. Relief changes composition and effective behavior only; it never adds budget, premium, or payout. Because rewards use actual applied burden, intentionally taking damage or cornering cannot preserve the unreduced challenge reward.

## Reward Contract

`RewardContract` contains shared metadata, authorized challenge budget, XP/gem opportunity, loot-cache opportunity, Market Edge opportunity, Payoff burst profile, streak opportunity, and risk premium.

- Direction alone never grants a premium.
- One auditable `realizedChallengeScore` derives from executed threat units and actual applied behavior burden.
- Reward opportunity combines that score with explicit risk and capped performance terms. Successful kills cannot independently recount the same challenge.
- Favorable movement pays through vulnerability and harvest opportunity.
- Adverse movement pays through survived behavior burden and event challenge.
- Stale and warming modes grant no market-authored premium.
- Presentation cannot mint coins, tokens, or settlement value.
- Existing server verification remains terminal reward authority.
- LONG and SHORT expected reward per realized challenge bucket remains within `5%` on paired market replays, including tail buckets.

### Reward Ledger

One ledger opens with a frozen cycle risk snapshot and closes exactly once at Payoff under `(runId, heartbeatCycleId)`. `committedRevision` is retained only as `finalizationRevision` metadata:

- `executedThreatUnits` is the sum of threat cost from `EXECUTED` transaction receipts first authored in that cycle. Transaction keys prevent recounting.
- For each targetable enemy and effective revision, normalize actual effective coordination, pursuit, cadence pressure, and overlap pressure to `0..1`; their equal-weight mean minus that family's neutral mean, clamped to `0..1`, is `excessBehaviorBurden`.
- `appliedBehaviorUnits` is the time-weighted sum of `threatCost * exposureFraction * excessBehaviorBurden` during the cycle. It uses effective values only and is capped by the cycle's exposed active-threat capacity.
- `realizedChallengeScore = min(authorizedChallengeBudget, executedThreatUnits + appliedBehaviorUnits)`.
- `rewardOpportunity = baseRewardCurve(realizedChallengeScore) * clamp(1 + riskPremium + cappedPerformanceTerm, 1, totalRewardCap)`.

Order is fixed: realize challenge, cap to authorization, apply the frozen cycle risk snapshot and performance once, then apply the total reward cap. Direction, target burden, raw kills, and presentation are not inputs to `realizedChallengeScore`. Kills and near misses may affect only `cappedPerformanceTerm`; they cannot recount spawn or behavior challenge. Every receipt is bound to the source cycle derived from simulation time. A late record for a closed cycle is quarantined and reported; it cannot move to another cycle, change risk pricing, or reopen a ledger.

## Conflict Priority

1. Data validity and lifecycle reset.
2. Input validity, finite-value, schema, and immutable safety bounds; this stage rejects invalid input but does not clamp composed output.
3. Heartbeat engagement target.
4. Player-strain behavioral relief.
5. Authoritative risk commitment.
6. Position-relative edge and compression.
7. Primary and support event composition.
8. The single composer-final duration, intensity, behavior, density, and reward output cap.
9. Read-only presentation derivation.

The heartbeat guarantees reachable targets, not a fixed count. Player strain may reduce market-added density to zero. Risk cannot override hard caps. Events cannot bypass heartbeat phase or final caps. Presentation cannot change gameplay authority.

## Juice And Presentation Profile

A read-only `PresentationProfile` derives from the same revision and heartbeat phase. It adds no gameplay authority.

- **Snap Crescendo:** bounded audio layers, pitch progression, squash/stretch, and budgeted hit-stop.
- **Payout Vacuum:** arcing gem collection, chunked XP recognition, and synchronized payout feedback.
- **Wick Dodge:** near-miss recognition, short focus cue, distinct audio, and bounded Market Edge opportunity.
- **Enemy Market Morph:** anticipation, silhouette, aura, stance, and formation cues before behavior activates.
- **Compression Atmosphere:** non-directional grid pulse, ambience, low-frequency tension, and release recognition.
- **Adaptive Market Mix:** heartbeat-synchronized stems without invented directional polarity.

Player SFX outrank enemy SFX, music, and ambience. Shake and hit-stop use existing governors. Reduced-motion mode preserves telegraph through shape, timing, and audio. Compression presentation never implies direction without fresh evidence.

## Primary Tuning Surface

The runtime exposes at most twelve primary controls:

1. Base spawn throughput.
2. Minimum engagement target.
3. Density ceiling.
4. Heartbeat cycle duration.
5. Heartbeat phase ratios.
6. Final market duration cap.
7. Final market peak-intensity cap.
8. Compression fill/release curve.
9. Signal-event cooldown policy.
10. Behavior interpolation duration.
11. Player-strain relief curve.
12. Risk-to-reward curve.

A versioned control manifest classifies every value as `primary`, `derived`, `profile-selected`, or `immutable-safety`. Enemy-family and indicator profiles select named tuples only; they cannot add free scalar multipliers or chained scaling. `combatPressure` remains derived and non-configurable. Every scalar affecting cadence, density, lethality, or payout appears in the manifest and resolves through these controls or an existing hard safety cap.

The typed manifest is the single source used to generate runtime validation, documentation, simulator fixtures, and test assertions. Separate handwritten scalar lists are forbidden.

## Deterministic Scenario Matrix

| Scenario | Required assertion |
|---|---|
| Ten-minute fresh-flat run | No directional bias, no empty combat, bounded compression |
| Fresh-flat to real breakout | One telegraphed release with correct position-relative edge |
| Stale during each heartbeat phase | No new market Snap, morph, reward, or directional cue |
| Reconnect with large price gap | Warming establishes baseline; no synthetic breakout |
| LONG and SHORT mirrors | Mirrored edge, behavior, and reward decisions |
| Conflicting indicators | One primary and at most one support event |
| Duplicate and expired indicators | No replay or repeated reservation |
| Near-zero ATR | Finite bounded edge and behavior targets |
| Out-of-order revisions | Older evidence cannot overwrite newer state |
| Maximum adversity plus high strain | Density persists without unavoidable coordination death spiral |
| High risk plus event peak | Final duration, intensity, behavior, and stat caps hold |
| Pool exhaustion or blocked geometry | No pre-validation debit, fractional loss, double spend, or delayed flood |
| Intentional stalling | No dominant compression or reward exploit |
| Intentional crowding or cornering | Relief cannot increase survival-adjusted reward or progression over the paired neutral-control replay |
| Reward side/regime sweep | Reward per realized challenge remains balanced |
| 30, 60, and 120 FPS replay | Equivalent contract hashes at equal simulation times |

## Required Metrics

- Enemies spawned and executed per minute.
- Empty-combat duration and longest no-target interval.
- Active-enemy percentiles by heartbeat phase.
- Credits accrued, reserved, executed, and discarded.
- Phase duration and variance.
- Signal accepted, merged, queued, expired, and rejected counts.
- Position edge and stale directional influence.
- Behavior target changes, `committedRevision`, `targetRevision`, `effectiveRevision`, and interpolation completion.
- Damage, attack overlap, and death by phase, regime, side, strain, and risk.
- `realizedChallengeScore`, capped performance term, XP, gem, loot, and Market Edge opportunity by challenge bucket.
- Snap and payout recognition time.
- Cash-out acceptance, rejection, timeout, and continue regret.
- Build diversity and run-duration distribution.
- RAF allocations, frame-time percentiles, pool failures, and commit cost.

## Acceptance And Rollout Gates

| Gate | Required threshold |
|---|---|
| Direction integrity | Exactly zero directional influence in stale and warming; paired LONG/SHORT contract hashes mirror at equal simulation times. |
| Engagement | After the initial `2s` run warm-up, longest no-reachable-target interval is `<= 1.5s` whenever world capacity and valid geometry exist. |
| Spawn transaction | Zero duplicate debit, retry, refund, fractional loss, or non-terminal receipt; `>= 95%` of validated executable intents execute when capacity remains available. |
| Fairness | Attack overlap never exceeds contract cap; intentional-damage and intentional-crowding fixtures cannot increase survival-adjusted reward or progression; the upper 95% confidence bound for paired side death-rate difference is `<= 5%`. |
| Reward | Side/regime expected reward per realized-challenge bucket differs by `<= 5%`; no local settlement or premium occurs in stale/warming. |
| Recognition | Snap cue begins within `250ms` of Snap commit and payout recognition within `500ms` of Payoff commit at p95. |
| Determinism | Contract hashes match at equal simulation times across `30`, `60`, and `120` FPS replays. |
| Performance | Zero RAF allocations; target-device p95 frame time `<= 16.7ms`, p99 `<= 25ms`, and decision-commit p99 `<= 1ms`, with no regression beyond `0.5ms` from approved baseline. |
| Economy | Server verification remains terminal authority and economy simulation stays inside the approved reward envelope. |

Authority rollout remains in shadow or dual mode until every applicable threshold passes. A threshold change requires a manifest version, replay evidence, adversarial review, and explicit user approval.

The versioned `EvaluationProtocol` requires at least 30 paired deterministic seeds per side and regime, reports 95% bootstrap confidence intervals for fairness and reward gates, and runs three ten-minute samples on each named low-, mid-, and high-tier target device for performance gates. Device identities, seed set, runtime build, market fixture hash, and protocol version are part of the evidence bundle.

## Error Handling And Degradation

- Non-finite input is rejected at the boundary with reason codes.
- A failed manager uses last-known-good state only within a grace window, then degrades to neutral.
- A failed signal mapper rejects the signal; it cannot bypass the composer.
- A failed reservation produces no spend.
- Partial execution records executed and discarded amounts exactly once.
- A failed behavior consumer holds the prior target until expiry, then returns neutral.
- A failed presentation consumer cannot affect gameplay.
- Reset behavior follows this single lifecycle matrix:

| Boundary | Heartbeat | Signals and transactions | Behavior | Compression and strain | Risk and Greed |
|---|---|---|---|---|---|
| Game over or cash-out settlement | Clear | Cancel non-debited; terminally discard debited; clear queue and bank | Clear immediately | Clear | Drop local risk; preserve server authority |
| Continue | Start a new seeded cycle | Same terminal cleanup; reset bank | Reset neutral immediately | Clear | Recompute from signed Greed and continue history |
| Reconnect or stale transition | Continue deterministic phase | Clear signals; cancel non-debited; discard debited; clamp generic bank to minimum-engagement budget | Transition to neutral through `BoundedTransition` | Compression clears; real strain remains | Recompute without local Greed mutation |
| Disposal or full runtime reset | Clear | Clear all receipts, queues, and bank | Clear immediately | Clear | Clear local cache only |

No lifecycle boundary can revive a terminal transaction or queued signal. Signed Greed and settlement state live outside this runtime and are never cleared or synthesized by the client.

## Performance Contract

- Managers run at decision cadence, not every RAF frame.
- Hot-path consumers use pre-allocated mutable views or read-only references.
- No `map`, `filter`, object creation, React state update, EventBus calculation, or unbounded collection enters RAF.
- Spawn plans use pools and deterministic bounded intent arrays.
- Behavior updates enemy fields in place.
- Presentation uses existing hit-stop, shake, audio, and particle governors.
- Timers use simulation time and pause-aware services.

## Migration And Rollout

1. Add simulator metrics and reproduce current credit and pacing failures.
2. Add executable-intent validation and atomic full-cost debit without changing authority.
3. Introduce canonical model and heartbeat in shadow mode.
4. Emit shadow spawn, behavior, and reward contracts from one revision.
5. Compare current and proposed paths across the scenario matrix.
6. Migrate spawn authority behind the existing mode selector.
7. Migrate behavior targets and remove raw market reads from enemy consumers.
8. Migrate reward opportunity and verify economy invariants.
9. Add the approved presentation profile.
10. Enable authority only after adversarial review, deterministic gates, performance gates, and explicit user approval.

Rollback is an explicit mode transition. No consumer silently falls back to a second authority within the same run.

## Adversarial Severity Review Gate

Every material design decision, implementation task, tuning batch, bug fix, migration step, and rollout decision receives an independent read-only review.

The reviewer answers:

- Where will this break?
- Which authority, state, multiplier, or lifecycle rule overlaps?
- Which feedback loop can run away or oscillate?
- Which market claim can become false during flat, stale, or reconnect data?
- Which part can be removed, combined, or derived?
- Which deterministic scenario proves the concern?

| Severity | Meaning | Progress rule |
|---|---|---|
| `Critical` | Vision violation, data fabrication, double authority, economy exploit, deterministic failure, death spiral, or 60 FPS regression | Resolve before progression |
| `Important` | Hidden multiplier, lifecycle ambiguity, missing test, migration risk, or avoidable complexity | Resolve or receive explicit user deferral |
| `Minor` | Naming, documentation, local simplification, or non-blocking polish | May be scheduled later |

Each issue includes evidence, break scenario, why it matters, the smallest correction, and a simplification option. The main agent verifies reviewer claims against code and tests instead of accepting them blindly.

No phase completes with an unresolved Critical issue. Important issues require resolution or an explicit recorded user decision.

## Definition Of Done

1. Flat live data remains combat-complete and directionally neutral.
2. Stale and warming modes produce zero directional influence.
3. One heartbeat owns moment-to-moment spawn rhythm.
4. Macro pacing no longer runs an independent spawn multiplier pipeline.
5. Fractional credits persist; only prevalidated executable full-cost intents debit budget atomically.
6. Spawn, behavior, rewards, and presentation share one revision.
7. Existing enemies visibly and smoothly react to position-relative real price evidence.
8. Indicator transitions create bounded, telegraphed, deterministic spawn events.
9. Player strain prevents behavior death spirals without emptying combat.
10. Reward opportunity is challenge-normalized and side-neutral.
11. The approved combat heartbeat and juice package is measurable in playtests and simulation.
12. The primary tuning surface contains no more than twelve controls, and every effective scalar appears in the control manifest.
13. Scenario, replay, integration, performance, and economy gates pass.
14. No unresolved Critical or Important review issue remains without explicit user deferral.
15. Market-to-edge, data validity, spawn transaction, reward ledger, strain, and lifecycle rules match their normative tables.

## Approved Design Decision

Use one market-authentic experience authority with a deterministic combat heartbeat, position-relative market edge, live-flat compression, bounded indicator events, strain-aware behavior relief, challenge-normalized rewards, and a read-only juice profile.

Complexity remains in content and market interpretation. Control remains in one canonical model, three gameplay contracts, twelve primary tuning controls, deterministic simulation, and an adversarial severity review gate.
