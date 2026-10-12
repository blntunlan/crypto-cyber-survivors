# V2-300 — Six Enemy Archetypes (Task Brief)

> Milestone: MVP-3 — Complete Risk Loop
> Depends on: `V2-213` (MVP-2 evidence gate, accepted and closed)
> Design contract: `docs/superpowers/specs/2026-08-21-threejs-gameplay-v2-design.md`
> §6.1 ("Six normal enemy archetypes with elite variants"), §6.4 (boss
> attack rhythm language — "anticipation, telegraph, active threat, and
> punish-window" — extended down to normal enemies for the first time)
> Master plan "Done when": "Each has an authored cost, behavior, damage,
> telegraph, pool, and tests."
> Governing decisions: V2-ADR-158 through V2-ADR-166 (this brief)
> Live execution state: `docs/game-v2/PROGRESS.md`

## Scope Decision (recorded, not re-litigated per task)

Unlike every prior task this session, the design spec names only "six
normal enemy archetypes" with no concrete behaviors, damage numbers, or
telegraph mechanics specified — there is no real external anchor to
derive this content from, the way market thresholds derived from
`railway-market-aggregator`'s real indicator math. This is genuine
creative content authoring. The roster and mechanism below were proposed
to and approved by the user via `AskUserQuestion` before any code was
written.

Today's three archetypes (`grunt`/`swarmling`/`brute`, `V2-108`) are
kept unmodified and reused as three of the six — they are already built,
tested, and balanced, and nothing in their own design conflicts with the
new roster. This task adds three new archetypes, each authoring a
genuinely distinct telegraphed behavior:

- **Charger**: approaches slowly, telegraphs (a visible pause), then
  bursts to a high-speed dash toward the player's current position,
  dealing its own (moderately elevated) contact damage if it connects,
  then recovers. No new damage-resolution path is needed — the dash is
  a `MovementSystem`/`EnemySystem`-level speed-multiplier state machine;
  the strike itself is ordinary, already-existing contact-damage
  resolution (`CombatSystem.resolveContactDamage`, unmodified), made
  dangerous by the sudden closing speed rather than a special damage
  path (V2-ADR-159).
- **Bloater**: chases like a grunt (softer, since it is meant to be
  poppable at range), and on reaching contact range arms a fuse
  (telegraph), then detonates once in an area burst — larger than its
  own contact radius — and is destroyed. One-shot: no cooldown/re-arm
  cycle exists for it at all (V2-ADR-160).
- **Sniper**: holds at a preferred engage distance rather than closing
  to contact, telegraphs (an aim tell), then resolves a directional
  line-check hit toward the player's position at that instant if the
  player is still within a narrow perpendicular tolerance of the aim
  ray — a new, small resolution path, since a line check is not a
  radius-overlap the existing contact system already performs
  (V2-ADR-161).

All three aim/resolve against the player's **current** position at the
exact moment the telegraph resolves, not a position captured at
telegraph-start — the player can keep dodging until the last instant,
matching design §6.4's "punish-window" framing more faithfully than a
locked target would (V2-ADR-162).

`EnemyDefinition.telegraph` is a discriminated union keyed by
`behavior` (`'none' | 'charger' | 'bloater' | 'sniper'`), each variant
carrying only the fields its own behavior uses — `CLAUDE.md`'s own
"use discriminated unions for narrowing" convention, and the same
discipline `EncounterOutput` already established (V2-ADR-163). At spawn,
`EnemySystem.spawnEnemy` flattens whichever variant into a fixed set of
`World` columns shared by every archetype (mirroring `V2-ADR-069`'s own
"no per-entity archetype store, stats are baked in at spawn" precedent)
— irrelevant fields for a given behavior are simply left at their
default `0`/`'none'`/`0` (V2-ADR-164).

Every new numeric constant (telegraph/active/cooldown durations, burst
radius/damage, line range/tolerance/damage, dash speed multiplier) is a
first-pass authored value derived from the existing `grunt` baseline
with stated reasoning, matching `V2-108`/`V2-204`/`V2-205`'s own
established fallback for irreducible judgment calls where no external
anchor exists — explicitly flagged for `V2-405` (balance pass) to tune
later, not claimed as final (V2-ADR-165).

Adding new `World` columns bumps `WORLD_SNAPSHOT_SCHEMA_VERSION`
(`7 → 8`) — a known, mechanical ripple this project has absorbed before
(`V2-109`/`V2-111`); no test hardcodes a literal hash string, only the
version number itself, confirmed before starting (V2-ADR-166).

## Done When

1. Six archetypes exist in `MVP1_ENEMY_REGISTRY` — the three existing
   ones unmodified, three new ones (`charger`/`bloater`/`sniper`) each
   with an authored `cost`, distinct `behavior`, `damage` (contact
   and/or telegraphed-effect), `telegraph` timing, and coverage under
   the existing object-pooling discipline (`World`'s fixed-capacity slot
   reuse — no new pool structure, `V2-ADR-069`'s "no per-entity
   archetype store" already makes every archetype pool-neutral).
2. A new `EnemyAttackSystem` (or equivalent) drives the
   `READY → TELEGRAPHING → ACTIVE → (COOLDOWN →) READY` per-enemy state
   machine, tick-driven only (never wall-clock), mirroring
   `HazardLifecycle`'s own established tick-driven pattern.
3. Charger's dash is proven through the existing, unmodified
   `CombatSystem.resolveContactDamage`; bloater's burst and sniper's
   line-check each have their own new, tested resolution path.
4. `World`/`WorldSnapshot`/`StateHasher`/`WorldSnapshotWriter` carry the
   new columns consistently; the schema-version bump is proven, replay
   determinism is unaffected (a scripted run still replays to the
   identical hash).
5. Not wired into `GameV2Runtime`'s spawn cadence content mix beyond
   registry membership — `EnemyComposer`'s existing budget-spending logic
   automatically includes the three new archetypes once they are in
   `MVP1_ENEMY_REGISTRY`, requiring no `EnemyComposer`/`GameV2Runtime`
   changes; the new `EnemyAttackSystem` **is** wired into
   `GameV2Runtime`'s tick order, since an archetype with a telegraph that
   never ticks can never attack.

## Scope

In scope:

1. `game-v2/contracts/EnemyArchetype.ts`: `EnemyTelegraphProfile`
   discriminated union; `EnemyDefinition.telegraph` field;
   `assertEnemyDefinition` validates each variant's own fields.
2. `game-v2/config/Mvp0Config.ts`: derived constants for all three new
   archetypes (health/moveSpeed/contactDamage/radius/xpValue/cost, and
   each one's telegraph-specific timing/effect constants).
3. `game-v2/config/EnemyRegistry.ts`: `CHARGER_ENEMY`, `BLOATER_ENEMY`,
   `SNIPER_ENEMY` added to `MVP1_ENEMY_REGISTRY`.
4. `game-v2/world/World.ts`: ten new columns (`enemyTelegraphBehavior`,
   `enemyTelegraphPhase`, `enemyTelegraphTicksRemaining`,
   `enemyTelegraphDurationTicks`, `enemyTelegraphActiveDurationTicks`,
   `enemyTelegraphCooldownTicks`, `enemyTelegraphEffectDamage`,
   `enemyTelegraphEffectRadius`, `enemyTelegraphEffectRange`,
   `enemyTelegraphDashSpeedMultiplier`), reset on entity destroy.
5. `game-v2/contracts/WorldSnapshot.ts`,
   `game-v2/replay/WorldSnapshotWriter.ts`,
   `game-v2/replay/StateHasher.ts`: carry the ten new columns;
   `WORLD_SNAPSHOT_SCHEMA_VERSION` `7 → 8`.
6. `game-v2/systems/EnemySystem.ts`: `spawnEnemy` flattens
   `definition.telegraph` into the new columns; sniper's chase behavior
   holds at its engage distance rather than closing to contact.
7. `game-v2/systems/EnemyAttackSystem.ts` (new): drives the per-enemy
   telegraph phase machine each tick; on entering `ACTIVE`, resolves the
   archetype-specific effect (charger: speed burst only, contact damage
   is the existing system's job; bloater: apply burst damage via a
   radius check, then destroy the entity; sniper: apply line-check
   damage).
8. `game-v2/runtime/GameV2Runtime.ts`: wire `EnemyAttackSystem.step`
   into the tick order.
9. Tests: `tests/game-v2/contracts/EnemyArchetype.test.ts` extensions,
   `tests/game-v2/config/Mvp0Config.test.ts` extensions (pinned
   constants), `tests/game-v2/config/EnemyRegistry.test.ts` extensions,
   `tests/game-v2/systems/EnemyAttackSystem.test.ts` (new),
   `tests/game-v2/systems/EnemySystem.test.ts` extensions (sniper engage
   distance, telegraph column flattening), `tests/game-v2/replay/*`
   extensions for the schema bump, and an integration test proving all
   three new archetypes' behaviors fire through the real
   `GameV2Runtime` tick order at least once.

Out of scope:

- Elite variants (`V2-301`).
- Visual/audio telegraph presentation (no renderer work this milestone
  needs yet, matching every prior "mechanism only" precedent).
- `EnemyComposer`/`GameV2Runtime` spawn-cadence changes beyond registry
  membership — the existing budget-spending composer already handles an
  arbitrary registry.
- Any change to `grunt`/`swarmling`/`brute`'s own stats or behavior.

## Preflight Decisions To Record

- **V2-ADR-158 (proposed): the six-archetype roster and telegraph
  mechanism concept are user-approved via `AskUserQuestion` before
  implementation, not unilaterally invented.** Rationale: no external
  anchor exists for this content, unlike every market-mechanism task
  this session; the roster is a real creative commitment worth aligning
  on before investing in six archetypes' worth of stats/behavior/tests.
- **V2-ADR-159 (proposed): Charger's dash strike reuses
  `CombatSystem.resolveContactDamage` unmodified — no new
  damage-resolution path.** Rationale: the archetype's threat is
  behavioral (a fast, telegraphed lunge that closes distance suddenly),
  not a special damage multiplier; simpler and avoids a second contact-
  damage code path to keep correct.
- **V2-ADR-160 (proposed): Bloater is one-shot — no cooldown/re-arm
  cycle.** Rationale: a "poppable" area-denial threat that detonates
  once and is destroyed reads more clearly than a repeating one, and
  removes two otherwise-unused fields from its own profile variant.
- **V2-ADR-161 (proposed): Sniper's line-check is a new, small
  resolution path — not modeled as radius-overlap.** Rationale: a
  directional line hit is a genuinely different geometric check than
  contact overlap; forcing it through the existing radius-overlap
  system would either be inaccurate or require an unintuitive hack.
- **V2-ADR-162 (proposed): all three archetypes resolve against the
  player's current position at the exact telegraph-resolution tick, not
  a position locked at telegraph-start.** Rationale: matches design
  §6.4's "punish-window" framing — the player can keep dodging until the
  last instant, more skill-rewarding than a locked target.
- **V2-ADR-163 (proposed): `EnemyDefinition.telegraph` is a
  discriminated union keyed by `behavior`, not one flat object with
  behavior-conditional zero-fields.** Rationale: `CLAUDE.md`'s own
  "use discriminated unions for narrowing" convention; each behavior
  variant carries only the fields it actually uses, preventing
  nonsensical field combinations at the type level.
- **V2-ADR-164 (proposed): at spawn, the discriminated union is
  flattened into a fixed set of shared `World` columns, mirroring
  `V2-ADR-069`'s "no per-entity archetype store, stats baked in at
  spawn" precedent.** Rationale: keeps `World` fully self-contained
  data with no registry lookup at runtime, consistent with every
  existing archetype stat field.
- **V2-ADR-165 (proposed): every new numeric constant is a first-pass
  authored value with stated reasoning, derived from the `grunt`
  baseline where possible, explicitly flagged for `V2-405` to tune.**
  Rationale: matches `V2-108`/`V2-204`/`V2-205`'s own established
  fallback for irreducible judgment calls where no external anchor
  exists.
- **V2-ADR-166 (proposed): the new `World` columns bump
  `WORLD_SNAPSHOT_SCHEMA_VERSION` `7 → 8`, a known mechanical ripple.**
  Rationale: matches `V2-109`/`V2-111`'s own precedent; no test
  hardcodes a literal hash string, only the version number, confirmed
  before starting.

## Files

- New: `game-v2/systems/EnemyAttackSystem.ts`,
  `tests/game-v2/systems/EnemyAttackSystem.test.ts`,
  `tests/game-v2/integration/EnemyArchetypeEvidence.test.ts`
- Modify: `game-v2/contracts/EnemyArchetype.ts`,
  `game-v2/config/Mvp0Config.ts`, `game-v2/config/EnemyRegistry.ts`,
  `game-v2/world/World.ts`, `game-v2/contracts/WorldSnapshot.ts`,
  `game-v2/replay/WorldSnapshotWriter.ts`, `game-v2/replay/StateHasher.ts`,
  `game-v2/systems/EnemySystem.ts`, `game-v2/runtime/GameV2Runtime.ts`,
  `game-v2/runtime/createMvp0Runtime.ts`, plus their existing test files.

## Steps

- [ ] **Step 1: Contract + config (RED then implement)**

  `EnemyTelegraphProfile` discriminated union and validator extension;
  derived constants for all three archetypes.

- [ ] **Step 2: `World`/replay plumbing (RED then implement)**

  Ten new columns; schema bump; snapshot/hash/writer updates. Re-run
  every existing replay/hash test unmodified to confirm the version
  bump alone does not break determinism proofs.

- [ ] **Step 3: `EnemySystem` spawn flattening + sniper chase behavior**

- [ ] **Step 4: `EnemyAttackSystem` (RED then implement)**

  Prove the phase machine and all three resolution behaviors in
  isolation with synthetic `World` fixtures, mirroring
  `HazardLifecycle.test.ts`'s own synthetic-fixture style.

- [ ] **Step 5: `GameV2Runtime` wiring + integration evidence**

- [ ] **Step 6: Verify (GREEN)**

  ```powershell
  npx vitest run tests/game-v2 --pool=forks --maxWorkers=1
  npm run typecheck
  npm run check:architecture
  npm run check:reset-coverage
  npm run check:ui-contract
  npm run check:event-contract
  npm run build
  ```

- [ ] **Step 7: Mutation pass**

  At minimum: each phase transition's boundary tick; charger's contact
  damage firing during the wrong phase; bloater's burst radius or
  one-shot destruction; sniper's line-tolerance check reversed; the
  `EnemyAttackSystem` not wired into the tick order at all.

## Acceptance Criteria

1. Six archetypes, each with an authored cost/behavior/damage/telegraph,
   exist in `MVP1_ENEMY_REGISTRY`.
2. The telegraph phase machine is tick-driven only, proven with
   synthetic fixtures for all three new behaviors.
3. Replay determinism holds across the schema bump.
4. `EnemyAttackSystem` is wired into `GameV2Runtime`'s real tick order,
   proven by an integration test observing all three new behaviors fire
   through a real run.
5. Every Step 6 gate passes and the Step 7 mutation pass leaves no
   survivor.
