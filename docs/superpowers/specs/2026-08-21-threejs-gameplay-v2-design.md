# Crypto Survivors 2.0 — Three.js Gameplay Redesign

> Status: Approved design, awaiting written-spec review
> Date: 2026-08-21
> Branch: `codex/threejs-gameplay-v2`
> Canonical execution tracker: `docs/game-v2/MASTER_PLAN.md`
> Current checkpoint: `docs/game-v2/PROGRESS.md`

## 1. Decision

Crypto Survivors keeps its brand, live-market premise, Railway market pipeline,
and server-authoritative economy boundaries. Its existing gameplay runtime is not
the foundation for the new game. A clean Three.js gameplay runtime will be built
in isolated, contract-driven LEGO blocks and will replace the current production
demo only after explicit replacement gates pass.

The current demo remains playable on `main` while development proceeds on
`codex/threejs-gameplay-v2`. No production deployment is authorized by this
design.

## 2. Product Promise

Crypto Survivors 2.0 is a top-down action-survivors game in which the player:

1. Selects BTC, ETH, or SOL.
2. Locks LONG or SHORT and a leverage risk mode for the run.
3. Builds a constrained weapon and ability loadout.
4. Reads market-driven encounters without surrendering agency to raw market
   noise.
5. Defeats an authored Soulslike boss.
6. Cashes out or risks the entire unbanked run balance in a harder cycle.

The game must remain combat-complete when the market is flat, stale, or
temporarily disconnected. Market data changes encounter identity, opportunity,
and bounded pressure; it does not own the existence of fun.

## 3. Core Loops

### 3.1 Thirty-second combat loop

```text
Move
  → auto-target and auto-fire
  → read threats and telegraphs
  → time dash and active abilities
  → break the enemy formation
  → collect XP and run coin points
  → strengthen the build
  → repeat
```

### 3.2 Run loop

```text
Select asset + side + leverage
  → build through combat and cards
  → complete market encounters and short objectives
  → fill Convergence
  → defeat the cycle boss
  → cash out OR continue with all unbanked points at risk
```

The first boss cycle targets 8–12 minutes. Later cycles target 6–9 minutes.
These are bounded timing envelopes, not exact kill timers.

### 3.3 Risk loop

- Cash-out settles and banks the whole verified run-point balance.
- Continuing preserves no protected portion of the current run balance.
- Death or liquidation before a later cash-out removes all unbanked points
  earned since the run began.
- Points banked in earlier completed runs are never exposed to a new run.
- Each continued cycle increases authored composition complexity, reduces
  recovery tolerance, and may select a more demanding boss variation.

## 4. Player, Camera, and Controls

### 4.1 Camera and visual direction

- Fixed top-down orthographic camera at approximately 90 degrees.
- No combat camera rotation.
- Bounded zoom or pulse is allowed for boss introduction, phase change, and
  cash-out recognition; it cannot hide combat information.
- Stylized high-contrast 3D art with strong silhouettes, selective neon, and
  disciplined VFX.
- Three.js is the presentation layer; the ECS world is canonical gameplay
  state.

### 4.2 Desktop controls

| Action | Input |
|---|---|
| Movement | `WASD` |
| Base attack | Automatic target selection and firing |
| Dash | `Space` |
| Active ability | Dynamic keys `1` through `4` |
| HUD/menu | Mouse |

The dash is charge/cooldown-based and provides a short invulnerability window.
Initial prototype tuning seeds are one charge, a 2.5-second cooldown, and a
180-millisecond invulnerability window. These values are balance data, not
architectural invariants.

Mobile control and performance adaptation are explicitly deferred until the
desktop vertical slice is complete. The intended later mapping uses one hand for
movement, a second touch on the combat surface outside the movement control for
dash, and HUD buttons for active abilities.

## 5. Build and Progression

### 5.1 Unified ability capacity

The player selects a starting weapon before the run. It occupies the first of
four unified ability slots. The other slots may contain:

- A manually activated ability.
- An autonomous weapon such as a laser, drone, orbit, or salvo system.

Active abilities display their `1`–`4` binding. Autonomous weapons display
`AUTO`. A weapon or ability upgrade never consumes another slot.

When all four slots are occupied:

- Normal level-up offers contain upgrades or evolutions for the current build.
- A new ability does not silently replace an occupied slot.
- After every defeated boss, exactly one optional slot replacement is offered.
- Replacing a slot removes the old ability and all progression invested in it.

### 5.2 Three-tier ability progression

Every weapon and ability has exactly three total tiers:

1. **Tier 1 — Identity:** the low-power base behavior obtained with the slot.
2. **Tier 2 — Expansion:** an ability-specific damage and area/coverage
   improvement.
3. **Tier 3 — Mastery:** a stronger area/coverage behavior plus a modest cadence
   improvement such as shorter cooldown, shorter firing interval, longer beam
   uptime, or faster salvo recovery.

Acquisition counts as Tier 1; two later upgrade cards complete Tier 2 and Tier
3. Each ability defines its own typed tier effects. There is no universal
"damage and radius" multiplier pipeline.

### 5.3 Passive-stat capacity

- Six passive-stat slots exist separately from the four ability slots.
- A passive can reach at most five levels.
- Examples include movement speed, crit, armor, cooldown, and range.
- When all six passive slots are occupied, new passive identities are not
  offered; upgrades to held passives may still appear.

### 5.4 Level-up offer

- Gameplay simulation pauses.
- Three visible cards are offered.
- The entire sequence lasts 13 real seconds.
- The first 3–4 seconds contain the slot/reveal animation.
- The last 5 seconds contain a clear countdown.
- If no input is received, seeded RNG selects one of the three visible cards.
- One reroll and one banish are available per run in the vertical slice.
- Market data may continue arriving during the pause, but missed gameplay events
  are not queued and replayed after resume.
- Reduced-motion mode replaces the slot animation with a short fade/reveal while
  preserving the same decision deadline.

## 6. Enemies, Encounters, and Bosses

### 6.1 Vertical-slice content

- One playable character.
- Eight total active/autonomous ability identities, three of which are eligible
  as starting weapons.
- Ten passive-stat identities.
- Six normal enemy archetypes with elite variants.
- Three market encounter families.
- One authored Soulslike boss.

### 6.2 Encounter outputs

Every market encounter declares one typed output:

| Output | Purpose |
|---|---|
| `SPAWN` | Produce a bounded, themed enemy composition. |
| `WORLD_EVENT` | Produce a telegraphed arena, hazard, or environment event. |
| `LOOT_EVENT` | Produce a lootbox or opportunity event. |
| `HYBRID` | Combine bounded outputs under one final encounter budget. |

At most one primary encounter and one compatible support modifier may be active.
Signals do not form an unbounded queue.

### 6.3 Convergence

Convergence progresses through:

- Normal combat participation.
- Elite kills and short authored objectives.
- Completion of market encounters.

Market encounters provide bonus progress but are not required. A minimum cycle
time prevents a premature boss, and a maximum cycle time guarantees boss access
in a flat market. AFK movement or avoidance without combat participation does
not generate meaningful Convergence.

### 6.4 Boss contract

- Boss AI is independent from the ordinary Encounter Director.
- Every boss is authored, learnable, and phase-based.
- Attacks use anticipation, telegraph, active threat, and punish-window rhythm.
- Boss difficulty is solved through movement, dash timing, active abilities,
  and build quality rather than hidden counters.
- Market inputs may choose bounded authored affixes or pattern variants. They do
  not rewrite the boss AI or inflate all stats.
- New primary market encounters cannot begin during a boss fight.
- Boss defeat leads to the slot-replacement opportunity and cash-out decision.

## 7. Market and Leverage

### 7.1 Reused infrastructure

The Railway market aggregator, live price feeds, and existing indicator
calculation infrastructure may be reused. Old frontend gameplay multipliers,
difficulty services, and Director ownership are not reused.

```text
Railway market feed
  → canonical indicator snapshot
  → Game V2 market adapter
  → indicator event profiles
  → encounter intents
  → encounter outputs
```

Gameplay systems never import exchange clients or raw indicator services.

### 7.2 Assets and position

- BTC/USD, ETH/USD, and SOL/USD are supported in the first vertical slice.
- Asset, LONG/SHORT side, and leverage lock at run start.
- Each asset uses a volatility-normalized context; identical raw percentages do
  not imply identical gameplay intensity across assets.

### 7.3 Leverage risk modes

The five displayed leverage modes are `1×`, `5×`, `10×`, `25×`, and `50×`.
Each selects one versioned `CombatLethalityProfile` containing:

- Player base-health stat budget.
- Player armor stat budget.
- Incoming-damage envelope.
- Enemy authored-damage profile.
- Recovery tolerance.
- Encounter pressure and complexity limits.
- Liquidation distance and reward ceiling.

The example tuning seeds are deliberately non-binding:

- `1×`: HP stat 20 may resolve to 100 max HP, with armor stat 20.
- `50×`: HP stat and armor stat may begin near 5.

Enemy archetypes and individual attacks retain variable authored damage. A
single lethality composer resolves mode input, attack damage, player armor, and
final safety caps. Enemy damage and reduced player defense cannot enter two
independent multiplier pipelines.

### 7.4 Indicator-event lifecycle

The first three event families are:

1. Trend/Breakout.
2. Volatility Surge.
3. Volume/Whale.

The registry supports later indicator profiles such as RSI, MACD, ATR,
Bollinger, or order-flow evidence without changing enemy internals.

Each profile owns this state machine:

```text
ARMED → CONFIRMING → ACTIVE → COOLDOWN → REARM
```

Each profile declares entry and exit thresholds, hysteresis, confirmation time,
cooldown, priority, output kind, and primary/support compatibility. For example,
an RSI event entering below 25 may require RSI above 30 before rearming. A
`26 → 24 → 28 → 23` sequence cannot spam encounters.

### 7.5 Freshness and concurrency

- Stale data cannot author new market events or market reward premiums.
- Existing market effects transition to neutral.
- Reconnect does not replay missed events.
- Compatible simultaneous signals may produce one primary plus one support.
- Incompatible or lower-priority signals are rejected rather than banked.
- A merged event consumes the cooldown/rearm state of every source profile it
  uses.

## 8. Economy

### 8.1 Two-layer currency model

1. **Run Coin Points:** earned during a run, unbanked, and fully lost on death or
   liquidation.
2. **Banked Points:** created only by server-verified cash-out and usable for
   cosmetics.

The client is never authoritative for settlement value. Lootboxes do not mint
tokens; they provide run content or server-verifiable point opportunities.

### 8.2 Deferred crypto conversion

Direct conversion of banked points to the project's crypto token is outside the
first vertical slice. It requires a separate design and release gate covering:

- Wallet and claim flow.
- Epoch conversion rate and budget.
- Anti-abuse and idempotency.
- Security review.
- Legal and regulatory review.

No future token amount or conversion entitlement is promised by the vertical
slice.

### 8.3 Failure behavior

- Settlement failure leaves the request pending; it does not erase a verified
  run locally or double-credit on retry.
- Idempotency keys protect cash-out and cosmetic-spend operations.
- Rendering or presentation failures cannot change run or settlement state.

## 9. LEGO Architecture

The new runtime is a dependency DAG of small contracts:

1. Runtime Core: time, fixed step, RNG, lifecycle.
2. ECS World: entities, components, queries, pools, snapshot.
3. Player: input, movement, dash, health, armor, death.
4. Combat: targeting, projectile, collision, damage, status.
5. Build: weapon, ability, tier, passive, loadout.
6. Progression: XP, offers, reveal, timeout, reroll, banish.
7. Enemies: archetype, behavior, spawn intent, elite, drops.
8. Market: feed adapter, indicator profiles, event lifecycle.
9. Run Director: threat, encounters, Convergence, cycles, lethality.
10. Boss: AI runtime, attacks, phases, telegraphs, completion.
11. Economy: run points, wipe, cash-out, verification, banked points.
12. Presentation: Three.js bridge, instancing, animation, VFX, audio, HUD.
13. Verification: replay, headless simulation, performance, balance reports.

Every block must have one responsibility, typed inputs and outputs, isolated
tests, explicit lifecycle behavior, and no access to another block's private
state. A new indicator or enemy is registration and content, not a new authority
path.

## 10. Three.js and Performance Contract

- Desktop target: stable 60 FPS.
- Active-enemy target: 100–180 in the vertical slice.
- No per-frame React state for simulation data.
- No allocations, unbounded collections, `map`, or `filter` in RAF paths.
- Enemy, projectile, pickup, and transient VFX pooling.
- Instanced rendering for repeated geometry/material families.
- Fixed-step simulation is independent from render cadence.
- Market and Director decisions run at bounded low cadence, not every frame.
- Boss models may receive a larger render budget under a reduced ordinary-enemy
  ceiling.
- Post-processing is selective and must preserve telegraph readability and
  reduced-motion behavior.

## 11. Agent Orchestrator

The Agent Orchestrator is a development control plane, not a shipped game
dependency. It may coordinate:

- Bounded implementation tasks and dependencies.
- Three.js specialist skills.
- Test, review, and adversarial agents.
- Headless simulation batches.
- Balance and performance regression reports.
- Documentation and checkpoint verification.

It may not deploy, switch production authority, modify live economy values, or
approve its own release gate without explicit user authorization.

The orchestrator resumes work from repository state, task IDs, contracts,
evidence, and Git checkpoints—not from chat memory.

## 12. Incremental Delivery

Work follows the LEGO milestones defined in `docs/game-v2/MASTER_PLAN.md`:

1. MVP-0 walking skeleton.
2. MVP-1 combat and build core.
3. MVP-2 market vertical slice.
4. MVP-3 complete risk loop.
5. MVP-4 locked vertical-slice content and replacement audit.

Every milestone ends with a playable build, focused tests, an evidence bundle,
an updated progress checkpoint, and one conventional checkpoint commit.

## 13. Production Replacement Gates

The current demo remains authoritative until all applicable gates pass:

- Complete start → build → market encounter → boss → cash-out path.
- Complete continue → second cycle → failure and second cash-out paths.
- Equivalent deterministic state at equal simulation times across 30, 60, and
  120 FPS replays.
- Target-device p95 frame time at or below 16.7 ms.
- Profiler evidence for the 100–180 active-enemy budget.
- Zero RAF allocation regression.
- Stale and reconnect scenario coverage.
- Cash-out idempotency and client-tampering coverage.
- No unavoidable-death fixture across all leverage lethality profiles.
- Boss telegraph and dodge-window playtest approval.
- Explicit user authorization for production cutover.

## 14. Explicitly Out of Scope

- Mobile controls and mobile performance adaptation.
- Direct wallet/token conversion.
- Multiplayer and PvP.
- Live ML-controlled gameplay.
- Self-learning or player-countering boss AI.
- More than three market encounter families.
- More than one character, boss, or arena/biome.
- Seasons, battle pass, final monetization, or production deployment.

## 15. Completion Definition

The design is implemented only when MVP-0 through MVP-4 are individually closed,
their evidence is recorded, the locked vertical-slice content exists, all
replacement gates pass, no unresolved critical contract conflict remains, and
the user explicitly approves cutover. A large quantity of code is not progress;
completed, composable, verified LEGO blocks are progress.
