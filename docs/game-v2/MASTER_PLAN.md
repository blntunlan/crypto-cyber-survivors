# Game V2 LEGO Master Plan

> Status: MVP-0 accepted and closed at `085697b5`; MVP-1 is the active milestone
> Branch: `codex/threejs-gameplay-v2`
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> Live execution state: `docs/game-v2/PROGRESS.md`

## Operating Rules

1. Tasks are completed in dependency order.
2. At most one task is `In Progress` in `PROGRESS.md`; this file keeps stable
   task definitions and acceptance criteria.
3. Every task has an acceptance test before it is marked `Done`.
4. A milestone closes only with a playable build and evidence.
5. Half-integrated behavior stays behind the Game V2 entry boundary and cannot
   alter the production demo.
6. `docs/game-v2/PROGRESS.md` is updated at every stopping point.
7. User-owned working-tree changes are never staged into Game V2 commits.
8. Production cutover is never implicit.

## Status Vocabulary

`Not Started → In Progress → Verification → Done`

`Blocked` may be used only with a concrete blocker, evidence, and next recovery
action. A task cannot be `Done` because code exists; acceptance evidence is
required.

## MVP-0 — Walking Skeleton

Goal: produce the smallest real Three.js game loop that is playable and
headlessly replayable.

Status: `Done`. Accepted 2026-08-22 at `085697b5` after review round 1 was
applied and re-verified. V2-000 through V2-014 are closed. Three review
findings were accepted as real and deferred rather than fixed; they are listed
in `PROGRESS.md` under `Deferred Review Findings` and are owned by V2-407
(cross-engine determinism), the anti-cheat replay path (`RunRecording.finalHash`),
and the boundary-guard inversion.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-000 | Game V2 package/entry boundary | — | New runtime can build without changing the production entry. |
| V2-001 | Simulation clock and fixed step | V2-000 | Equal simulation time produces equal tick count at 30/60/120 render FPS. |
| V2-002 | Seeded RNG and run identity | V2-001 | Same seed produces the same recorded sequence. |
| V2-003 | Lifecycle/reset contract | V2-001 | Start, death, disposal, and restart leave no prior-run state. |
| V2-004 | ECS entity/component storage | V2-001 | Entity create/query/remove is unit-tested and allocation-bounded. |
| V2-005 | Snapshot and replay hash | V2-002,V2-004 | Recorded input replays to the same state hash. |
| V2-006 | Three.js scene/render bridge | V2-004 | Canonical ECS position renders without Three.js state becoming authoritative. |
| V2-007 | Orthographic camera | V2-006 | Fixed top-down framing preserves the playable arena at target aspect ratios. |
| V2-008 | Desktop input and movement | V2-004 | `WASD` movement is pause-aware and deterministic. |
| V2-009 | Dash with i-frame state | V2-008 | Cooldown, charge, direction, and invulnerability are simulation-time tested. |
| V2-010 | One pooled enemy | V2-004,V2-006 | Enemy spawns, moves, renders, and returns to its pool. |
| V2-011 | Auto-target and first weapon | V2-008,V2-010 | Player acquires and damages a valid target automatically. |
| V2-012 | Collision, damage, and death | V2-009,V2-011 | Authored attacks resolve once and death closes the run. |
| V2-013 | XP pickup and one level-up | V2-012 | Kill → XP → paused card offer → upgrade → resume works end-to-end. |
| V2-014 | MVP-0 evidence gate | V2-000..V2-013 | Playable build, replay proof, focused tests, and progress checkpoint are committed. |

## MVP-1 — Combat and Build Core

Goal: prove that constrained builds create meaningful play before market
complexity is introduced.

Status: `Done`. `V2-100` is accepted and closed at `677e1d24`. `V2-101`
is accepted and closed at `b7a5c07a`. `V2-102` is accepted and closed at
`22a00d14`. `V2-103` is accepted and closed at `357ef443`. `V2-104` is
accepted and closed at `7116c729`. `V2-105` is accepted and closed at
`841160a2`. `V2-106` is accepted and closed at `ecd2f13f`. `V2-107` is
accepted and closed at `a43d8c1c`. `V2-108` is accepted and closed at
`94a48e7a`; briefs and outcomes are in `docs/game-v2/tasks/`. `V2-109`
(market-independent Convergence) is accepted and closed at `3dfd5f06`; its
post-acceptance code-review cleanup is committed at `374cec0e`. `V2-111`
(concurrent autonomous weapon slots, `e26dc604`) closed the V2-ADR-068
deferral that left seven of the eight ability identities unable to fire.
`V2-112` (repeating level curve, `a5ae6d60`) closed the single-level-up-per-run
defect that made design §5.1/§5.2/§5.3's slot, tier, and passive-level limits
unreachable through play. `V2-111` and `V2-112` are numbered after `V2-110`
because task IDs are stable identifiers, not an ordering — the dependency
column governs execution order (Operating Rule 1). `V2-110` (MVP-1 evidence
gate) is accepted and closed: see `docs/game-v2/tasks/V2-110-mvp1-evidence-gate.md`
and `PROGRESS.md` for the evidence.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-100 | Four-slot ability loadout | V2-014 | Active and AUTO slots add/remove/reset through one typed contract. |
| V2-101 | Six-slot passive loadout | V2-100 | Six identities and five levels per identity enforce offer limits. |
| V2-102 | Three-tier ability schema | V2-100 | Acquisition, Tier 2, and Tier 3 effects validate for every registered ability. |
| V2-103 | Dynamic ability HUD | V2-100 | Only occupied slots display; active keys and AUTO labels are correct. |
| V2-104 | Thirteen-second card flow | V2-102 | Reveal, countdown, input, timeout choice, pause, and resume are deterministic. |
| V2-105 | Reroll and banish | V2-104 | One use of each obeys offer and replay contracts. |
| V2-106 | Three starting weapons | V2-102 | Three of the eight ability identities are start-eligible, distinct, and have three valid tiers. |
| V2-107 | Initial ability set | V2-102 | The remaining five ability identities support active/AUTO four-slot combination tests. |
| V2-108 | Basic enemy composition | V2-010 | Multiple archetypes spend one bounded composition budget. |
| V2-109 | Market-independent Convergence | V2-108 | Active combat reaches the boss threshold envelope without market input. |
| V2-111 | Concurrent autonomous weapon slots | V2-107 | Every occupied AUTO slot fires on its own authored cadence through the live level-up path. |
| V2-112 | Repeating level curve | V2-104,V2-109,V2-111 | A run reaches a fully capped build through ordinary play, not only through injected-registry contract tests. |
| V2-110 | MVP-1 evidence gate | V2-100..V2-109, V2-111, V2-112 | Build diversity, replay, lifecycle, and playable-core evidence are committed. |

## MVP-2 — Market Vertical Slice

Goal: prove that real market evidence changes gameplay identity without becoming
an uncontrolled difficulty multiplier.

Status: `In Progress`. `V2-200` is accepted and closed, scoped to BTC only
after checking the real infrastructure:
`SSEMarketService` and every `railway-market-aggregator` service are
single-asset today, with no `asset`/`symbol` parameter anywhere. ETH/SOL
multi-asset support (this row's original Done-When) is deferred to an
unassigned follow-up task that first extends `railway-market-aggregator`;
see `docs/game-v2/tasks/V2-200-canonical-market-snapshot.md` for the
user-confirmed scope decision. `V2-201` is accepted and closed: `/game-v2`
now shows a real pre-run position-select screen (BTC, LONG/SHORT, one of
five leverage modes, live price) before any run starts; see
`docs/game-v2/tasks/V2-201-locked-position-context.md`. `V2-202` is
accepted and closed: leverage now has a real gameplay effect — five
`CombatLethalityProfile`s (`playerMaxHealth`, `playerArmor`,
`enemyDamageMultiplier`, plus four documented placeholder fields pending
future systems) resolve through one composer, `CombatSystem` consumes it,
and `RunRecording` now carries `positionContext` (schema version `1 → 2`)
so replay reconstructs the exact locked position instead of defaulting to
leverage `1` — closing the `V2-ADR-089` deferral without a `World`/
`WorldSnapshot` schema bump; see
`docs/game-v2/tasks/V2-202-five-lethality-profiles.md`. `V2-203` is
accepted and closed: the generic `ARMED → CONFIRMING → ACTIVE → COOLDOWN`
mechanism (`IndicatorEventStateMachine`) exists, mechanism only — no
concrete indicator family or wiring into any runtime; see
`docs/game-v2/tasks/V2-203-indicator-event-state-machine.md`. `V2-204` is
accepted and closed: the first concrete indicator family, `Trend/Breakout`,
authors a real `IndicatorEventProfile` sampling `MarketSnapshot.trendStrength`
and produces a bounded, themed `SpawnEncounterOutput` on activation; also
defines the shared `EncounterOutput` contract `V2-205`/`V2-206` will extend
with their own variant; not wired into any runtime yet; see
`docs/game-v2/tasks/V2-204-trend-breakout-family.md`. `V2-205` is accepted
and closed: the second concrete indicator family, `Volatility Surge`,
samples `MarketSnapshot.atrPercent` and produces a bounded
`WorldEventEncounterOutput` on activation, anchored to
`ATRCalculator`'s own real, already-calibrated tier boundaries
(`0.03`/`0.015`) rather than an invented threshold; adds
`WorldEventEncounterOutput` to `EncounterOutput`; not wired into any
runtime yet; see `docs/game-v2/tasks/V2-205-volatility-surge-family.md`.
`V2-206` is accepted and closed: the third and last concrete indicator
family, `Volume/Whale`, samples `MarketSnapshot.whaleTier` — already a
server-classified discrete tier, so no continuous threshold was needed —
and produces a bounded, tier-valued `LootEventEncounterOutput` on
instant activation (no confirmation delay, unlike the other two
families), with its cooldown reused directly from `VolumeAnalyzer`'s own
real `whaleCooldownMs`; completes the `SPAWN`/`WORLD_EVENT`/`LOOT_EVENT`
taxonomy across the three families (only `HYBRID` remains unauthored, with
no owning task yet); not wired into any runtime yet; see
`docs/game-v2/tasks/V2-206-volume-whale-family.md`.
`V2-207` is accepted and closed: `EncounterComposer` selects at most one
primary (highest `priority`, deterministic ascending-id tie-break) and one
compatible support per tick, first giving `IndicatorEventProfile`'s
`priority`/`compatibleWith` fields a reader since `V2-203`; and
`MarketEncounterDirector` steps all three real families
(Trend/Breakout, Volatility/Surge, Volume/Whale) against one
`MarketSnapshot` and composes their outputs — the three families' own
`compatibleWith` stay `[]` (a deferred content decision, not authored
here), so today's real behavior always resolves primary-only; not wired
into `GameV2Runtime` yet; see
`docs/game-v2/tasks/V2-207-primary-support-composer.md`.
`V2-208` is accepted and closed: `SpawnEncounterConsumer` turns a
`SpawnEncounterOutput` into an enemy composition by delegating
`enemyBudget` to the existing, unmodified `EnemyComposer` — its only
input is the already-composed output, never `MarketSnapshot` or a raw
indicator value, proving "market intent selects composition without raw
indicator reads in enemies" by construction; an unrecognized `themeId`
throws, giving that field a real reader for the first time since
`V2-204`. Both known theme ids (`bullish-breakout`/`bearish-breakout`)
resolve to the same `MVP1_ENEMY_REGISTRY` — no themeId-differentiated
registry exists yet, deferred to `V2-300`+ once themed archetype content
is authored; not wired into `GameV2Runtime` yet; see
`docs/game-v2/tasks/V2-208-spawn-encounter-consumer.md`.
`V2-209` is accepted and closed: `HazardLifecycle` is a generic, tick-driven
`IDLE → TELEGRAPHING → ACTIVE → IDLE` state machine (never wall-clock),
proving "telegraph and lifecycle are simulation-time controlled";
`WorldEventEncounterConsumer` resolves the real `volatility-tremor`
hazard's `activeTicks`
(`VOLATILITY_SURGE_COOLDOWN_TICKS - VOLATILITY_SURGE_TELEGRAPH_TICKS`, a
provable zero-gap non-overlap derivation) and throws on an unrecognized
`hazardId`. No ECS hazard component, gameplay effect, or `GameV2Runtime`
wiring was added — this task proves the lifecycle timing mechanism only;
see `docs/game-v2/tasks/V2-209-world-event-consumer.md`.
`V2-210` is accepted and closed: `LootEventEncounterConsumer` validates a
`LootEventEncounterOutput`'s `lootTierId` against the real known set and
cross-checks `lootValue` against that tier's own fixed value, then
returns a bounded, inert, frozen `LootOpportunity` record — no currency,
coin, wallet, or reward service is imported or called anywhere, proven
both structurally and by a source-scan test with a verified positive
control, per `CLAUDE.md`'s anti-cheat guardrail against new optimistic
credit paths; not wired into `GameV2Runtime` yet; see
`docs/game-v2/tasks/V2-210-loot-event-consumer.md`.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-200 | Canonical market snapshot | V2-110 | BTC normalizes to one finite, versioned contract. (Amended from BTC/ETH/SOL — see Status above.) |
| V2-201 | Locked position context | V2-200 | Asset, side, entry, and leverage cannot mutate during a run. |
| V2-202 | Five lethality profiles | V2-201 | 1×/5×/10×/25×/50× resolve through one composer with no double scaling. |
| V2-203 | Indicator-event state machine | V2-200 | Confirm, hysteresis, cooldown, rearm, and reset pass property tests. |
| V2-204 | Trend/Breakout family | V2-203 | Profile produces a bounded typed encounter output. |
| V2-205 | Volatility Surge family | V2-203 | Profile produces a bounded typed encounter output. |
| V2-206 | Volume/Whale family | V2-203 | Profile produces a bounded typed encounter output. |
| V2-207 | Primary/support composer | V2-204..V2-206 | At most one primary and one compatible support become active. |
| V2-208 | Spawn output | V2-207 | Market intent selects composition without raw indicator reads in enemies. |
| V2-209 | World-event output | V2-207 | Telegraph and lifecycle are simulation-time controlled. |
| V2-210 | Loot-event output | V2-207 | Lootbox opportunity is bounded and cannot mint settlement value. |
| V2-211 | Stale/reconnect degradation | V2-200,V2-207 | No stale premium, missed-event replay, or reconnect burst occurs. |
| V2-212 | Market Convergence contribution | V2-207,V2-109 | Completed encounters add bonus progress without blocking a flat run. |
| V2-213 | MVP-2 evidence gate | V2-200..V2-212 | Golden fixtures, edge cases, playable market feel, and performance evidence are committed. |

## MVP-3 — Complete Risk Loop

Goal: complete the authored boss, cash-out, and continued-cycle loop.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-300 | Six enemy archetypes | V2-213 | Each has an authored cost, behavior, damage, telegraph, pool, and tests. |
| V2-301 | Elite modifiers | V2-300 | Compatible elite variants remain inside threat and render caps. |
| V2-302 | Boss runtime boundary | V2-213 | Boss AI owns phases without importing ordinary encounter internals. |
| V2-303 | Boss attack/telegraph library | V2-302 | Every attack exposes anticipation, threat, and punish windows. |
| V2-304 | Boss phases and completion | V2-303 | Full fight is learnable, deterministic, and ends exactly once. |
| V2-305 | Boss market affix adapter | V2-304 | Only authored bounded variants are selected; no hidden AI counter exists. |
| V2-306 | Unbanked run-point ledger | V2-213 | Points accrue once and wipe fully on death/liquidation. |
| V2-307 | Cash-out decision | V2-304,V2-306 | Boss defeat offers settle or continue with one terminal transition. |
| V2-308 | Server verification/idempotency | V2-307 | Retry cannot double-credit or erase a pending settlement. |
| V2-309 | Second-cycle escalation | V2-307 | Continued cycle uses the 6–9 minute envelope and preserves full run risk. |
| V2-310 | Boss slot replacement | V2-100,V2-304 | Exactly one optional replacement removes the old slot progression. |
| V2-311 | MVP-3 evidence gate | V2-300..V2-310 | Boss, cash-out, continue, failure, tampering, and lifecycle evidence are committed. |

## MVP-4 — Locked Vertical Slice and Replacement Audit

Goal: complete the agreed content and prove readiness without authorizing
deployment.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-400 | Eight ability identities complete | V2-311 | All eight identities, including three starting weapons, validate and play distinctly across their three-tier paths. |
| V2-401 | Ten passives complete | V2-311 | Offer distribution and five-level paths are balanced and tested. |
| V2-402 | Stylized 3D asset pass | V2-400,V2-300 | Character, enemies, boss, pickups, and telegraphs meet readability rules. |
| V2-403 | VFX/audio/feedback pass | V2-402 | Combat hierarchy, reduced motion, and audio priority pass review. |
| V2-404 | Headless population simulation | V2-400,V2-401 | Novice/average/expert/greedy/survival/exploit profiles produce reports. |
| V2-405 | Lethality balance audit | V2-404 | Every leverage mode is difficult but has no unavoidable-death fixture. |
| V2-406 | 100–180 enemy performance gate | V2-402,V2-403 | Target-device profiler evidence meets the frame budget. |
| V2-407 | Full deterministic replay gate | V2-406 | Equal-time state hashes match across 30/60/120 FPS. |
| V2-408 | Economy/security audit | V2-308 | Tampering, settlement, cosmetic-spend, and retry cases pass. |
| V2-409 | Replacement audit | V2-400..V2-408 | All gates are reported; production remains unchanged pending user approval. |

## Deferred Work

- Mobile adaptation.
- Wallet and token conversion.
- Additional characters, bosses, arenas, and market encounter families.
- Multiplayer/PvP.
- Seasons and monetization.
- Production cutover.
