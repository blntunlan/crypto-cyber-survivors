# Game V2 LEGO Master Plan

> Status: Design-approved; implementation plan not yet approved
> Branch: `codex/threejs-gameplay-v2`
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`

## Operating Rules

1. Tasks are completed in dependency order.
2. At most one task is `In Progress` in the canonical tracker.
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
| V2-110 | MVP-1 evidence gate | V2-100..V2-109 | Build diversity, replay, lifecycle, and playable-core evidence are committed. |

## MVP-2 — Market Vertical Slice

Goal: prove that real market evidence changes gameplay identity without becoming
an uncontrolled difficulty multiplier.

| ID | LEGO block | Depends on | Done when |
|---|---|---|---|
| V2-200 | Canonical market snapshot | V2-110 | BTC/ETH/SOL normalize to one finite, versioned contract. |
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
