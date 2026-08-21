# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` |
| Phase | MVP-0 runtime foundation |
| Active task | `V2-012` (not started) |
| Status | `Done` — V2-011 accepted after review fix round 1 |
| Baseline commit | `12edc510` |
| Last verified design/content commit | `e0b22817` |
| Last verified implementation-plan commit | `c6228dff` |
| Production demo | Unchanged and authoritative |

## Completed This Checkpoint

- User approved the product, gameplay, market, economy, LEGO architecture, and
  incremental-delivery design in conversation.
- The isolated development branch was created from `main` at `12edc510`.
- The written design specification was created.
- The LEGO master plan and stable task IDs were created.
- The decision log and contract catalog were created.
- The written materials were checked for placeholder text, ownership conflicts,
  scope expansion, and content-count ambiguity. The eight-ability budget now
  explicitly includes the three starting weapons.
- The design and tracking checkpoint was committed as `e0b22817`.
- The user approved the written design.
- The MVP-0 implementation plan was created at
  `docs/superpowers/plans/2026-08-21-game-v2-mvp0-walking-skeleton.md`.
- Agent Orchestrator read-only mapping confirmed the V2 entry must lazy-load
  before legacy providers/singletons and the simulation must not reuse legacy
  time, pool, renderer, or replay authorities.
- The self-reviewed MVP-0 implementation plan was committed as `c6228dff`.
- The user approved `three@0.185.1`, `@types/three@0.185.1`, and
  subagent-driven Agent Orchestrator execution.
- Pre-change baseline passed 335 test files and 3165 tests.
- SDD preflight resolved fixed-step dash timing, paused upgrade-command replay,
  and combat-to-progression kill-buffer contracts before implementation.
- V2-000 added exact `three@0.185.1` and `@types/three@0.185.1` dependencies,
  a `/game-v2` lazy entry surface, and a private noindex SPA fallback without
  adding the route to public SEO paths.
- V2-000 TDD RED commands:
  `npx vitest run tests/game-v2/entry/AppSurface.test.ts tests/game-v2/architecture/GameV2Boundary.test.ts --pool=forks --maxWorkers=1`
  (missing entry module and V2 boundary), then
  `npx vitest run tests/server.test.ts --pool=forks --maxWorkers=1`
  (missing private route set).
- V2-000 GREEN verification commands:
  `npx vitest run tests/game-v2/entry/AppSurface.test.ts tests/game-v2/architecture/GameV2Boundary.test.ts tests/server.test.ts tests/App.test.tsx tests/hooks/useSurfaceState.test.ts --pool=forks --maxWorkers=1`,
  `npm run typecheck`, and `npm run build`.
- V2-000 task review found one Important architecture-guard gap. Fix round 1
  strengthened the guard; fix round 2 replaced regex parsing with TypeScript AST
  parsing and covered alias, relative, named/default, dynamic, plain and
  comment-separated side-effect imports without comment/string/template false
  positives.
- V2-000 passed scoped re-review at `7f7fb1de`; commits
  `33a7a885`, `e95b049c`, and `7f7fb1de` are the accepted task range.
- V2-001 TDD RED command:
  `npx vitest run tests/game-v2/runtime/SimulationClock.test.ts --pool=forks --maxWorkers=1`
  failed because `SimulationClock` did not exist.
- V2-001 GREEN command:
  `npx vitest run tests/game-v2/runtime/SimulationClock.test.ts --pool=forks --maxWorkers=1`
  passed all 11 focused tests; the combined V2 suite passed 19 tests.
- V2-001 `npm run typecheck`, focused lint, formatting, and hooks passed.
- V2-001 review required stronger paused-reset and 250 ms cap mutation
  coverage. Fix commit `336e9e6b` passed scoped re-review; accepted commits are
  `b434d4ff` and `336e9e6b`.
- V2-002 TDD RED command:
  `npx vitest run tests/game-v2/runtime/DeterministicRng.test.ts --pool=forks --maxWorkers=1`
  failed because the new RNG and run-identity modules did not exist.
- V2-002 GREEN command passed all 25 focused tests, including the hard-coded
  xorshift32 golden sequence, zero-seed normalization, invalid input rejection,
  immutable run identity, and snapshot/restore validation.
- V2-002 `npm run typecheck`, focused ESLint, and focused Prettier checks passed.
- V2-002 review required direct proof that run identity never consumes
  `Math.random()` and failed restore cannot mutate state or subsequent output.
  Fix commit `aa7abb8e` added mutation-sensitive guards and passed scoped
  re-review; accepted commits are `a8c7328c` and `aa7abb8e`.
- V2-003 TDD RED command:
  `npx vitest run tests/game-v2/runtime/GameV2Lifecycle.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because `GameV2Lifecycle` did not exist.
- V2-003 GREEN focused verification passed 11 tests covering legal transitions,
  every illegal transition's phase/epoch preservation, exactly-once reset epoch
  increments, disposal from every live phase, and post-dispose command rejection.
- The combined Game V2 suite passed 5 files and 59 tests. V2-003 focused ESLint,
  Prettier, and `npm run typecheck` also passed.
- V2-003 review found one missing idle-phase illegal-transition test row. Fix
  commit `2ae0a48f` added pause/resume/end-run rejection coverage, preserved
  phase/epoch assertions, and passed scoped re-review. Accepted commits are
  `2efbed75` and `2ae0a48f`.
- V2-004 introduced a fixed-capacity, typed-array ECS world with world-local
  arithmetic entity handles, `Uint32Array` generations, deterministic
  preallocated free-slot storage, complete MVP-0 component stores, and
  allocation-free all-bit component queries.
- V2-004 TDD RED command:
  `npx vitest run tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1`
  failed because the ECS world and component-mask modules did not exist.
- V2-004 follow-up RED tests caught a retired-slot reset stack reconstruction
  defect, then a generation-sentinel/empty-slot reset defect. The final RED
  output had 3 expected failures: final-generation destruction incorrectly
  retained the slot, the retired sentinel could be issued, and reset aged an
  already-free generation.
- V2-004 GREEN focused verification passed 27 tests. Coverage includes stale,
  unsafe, non-finite, fractional, negative, and cross-generation handles;
  zero/unknown masks; capacity bounds; every authoritative component-store
  clear; reset invalidation; deterministic active free-stack prefix order; and
  permanent final-generation slot retirement.
- V2-004 review required mutation-sensitive proof of the valid 4,096 capacity
  boundary, empty-slot liveness masks, and exact unique component-bit positions.
  Test-only fix commit `7a7f598a` killed all three mutants and passed scoped
  re-review; accepted commits are `84c02928` and `7a7f598a`.
- V2-004 final verification passed: the Game V2 suite (6 files, 86 tests),
  `npm run typecheck`, `npm run check:architecture`, focused ESLint, and
  focused Prettier.
- V2-005 added schema-versioned canonical runtime/world checkpoints, explicit
  little-endian binary FNV-1a hashing, and the hard-coded `8c5ecef3` golden.
- Checkpoints cover the complete world capacity in ascending slot order and
  hash only the allocator's authoritative free-stack prefix. Writer and hasher
  both reject incomplete active/free/retired partitions, sentinel misuse,
  unsupported nested schemas, non-finite values, and worlds above 4,096 slots.
- The canonical mutable `PlayerIntent` and immutable `RunCommand` contracts now
  exist before first use. Input recording owns 216,000 preallocated typed-array
  frames; command recording owns 64 preallocated entries and stores frozen
  copies so caller mutation cannot rewrite history.
- V2-005 initial TDD RED command:
  `npx vitest run tests/game-v2/replay/WorldSnapshot.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because the replay modules did not exist.
- Follow-up RED tests caught six allocator-partition acceptance defects, the
  lifecycle prototype-key phase defect, and missing 4,096-slot rejection in
  both writer and hasher.
- Mutation-sensitive checks proved the command-reference test catches retained
  caller objects and independent literals catch 4,095 world capacity, reduced
  recorder budgets, config schema 2, and shifted generation sentinels.
- V2-005 review fix round 1 moved both recorder backing stores and counts into
  ECMAScript private fields. Input playback now uses allocation-free
  `read(index, callerOutput)`; command playback returns the existing frozen
  record through allocation-free `read(index)`. Public history mutation paths
  no longer exist.
- Review fix round 1 also consolidated capacity, typed-store, finite-value,
  allocator-partition, and generation-sentinel validation into one pure replay
  validator with an exhaustive frozen store schema. Writer and hasher retain
  only their boundary-specific schema and free-slot length checks.
- Fix-round RED proved the public recorder arrays/read API defects and the
  missing shared validator module. A validator no-op mutant caused all four
  writer/hasher forged-state parity rows to fail before the real validator was
  restored.
- V2-005 focused verification passed 2 files and 80 tests; the complete Game V2
  suite passed 7 files and 139 tests. Typecheck, architecture, focused ESLint,
  and focused Prettier also passed.
- V2-005 review fix round 1 passed scoped re-review. The accepted commits are
  `cf679aac` and `7288e45a`; no Critical, Important, or Minor findings remain.
- V2-006 added fixed-capacity render snapshots with explicit player, enemy,
  projectile, and XP-pickup counts plus ascending all-bit ECS category packing.
- The snapshot writer validates category storage, capacity, player cardinality,
  finite previous/current positions, and non-negative finite radius before
  changing any output count or typed-array byte.
- The one-way Three.js bridge maps simulation X/Y to Three X/Z, interpolates
  every active prefix, keeps one player mesh and bounded instanced category
  meshes presentation-only, and validates alpha, counts, storage, scene caps,
  and active-prefix values atomically before scene mutation.
- Moving instance buffers use `DynamicDrawUsage`; MVP-0 bounded instance pools
  disable frustum culling so moving transforms cannot inherit stale bounds.
- V2-006 owns real Three scene/math/resources while receiving a renderer port,
  constructs no WebGL renderer, allocates no sync-path scratch, and disposes the
  renderer plus every distinct geometry/material exactly once.
- V2-006 initial TDD RED command:
  `npx vitest run tests/game-v2/presentation/ThreeRenderBridge.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because `RenderSnapshot` did not exist.
- A follow-up hot-path RED test observed static-draw usage (`35044`) instead of
  `DynamicDrawUsage` (`35048`) before dynamic usage and the culling policy were
  implemented.
- V2-006 focused verification passed 38 tests. The complete Game V2 suite
  passed 8 files and 177 tests; typecheck, architecture, focused ESLint, and
  focused Prettier also passed.
- V2-006 review found duplicated typed-storage validation and missing rejection
  of internally consistent render storage above the 4,096-slot bound.
- Fix round 1 centralized typed-array kind, equal-length, and capacity checks in
  one allocation-free render snapshot validator shared by writer and bridge.
  Both boundaries now reject forged 4,097-slot storage before output or scene
  mutation.
- The fix began with two expected RED failures. A no-op validator mutant caused
  three focused failures; after restoration, focused verification passed 40/40
  and the complete Game V2 suite passed 179/179. Typecheck, architecture,
  focused ESLint/Prettier, and hooks passed.
- V2-006 fix round 1 passed scoped re-review. Accepted commits are `0fc81e67`
  and `f31d98bc`; no Critical, Important, or Minor findings remain.
- V2-007 implemented a real, owned `OrthographicCamera` with a fixed vertical
  world span, aspect-derived width, fixed top-down combat orientation, and
  direct allocation-free player X/Z follow.
- Camera construction and resize/follow boundaries reject invalid numeric input
  before mutation. Resize updates projection exactly once only after both
  dimensions validate; follow never changes Y, projection, rotation,
  quaternion, up vector, near, or far.
- V2-007 initial TDD RED command:
  `npx vitest run tests/game-v2/presentation/OrthographicCameraController.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because `OrthographicCameraController` did
  not exist.
- V2-007 focused GREEN verification passed 22 tests, including 16:9, 4:3,
  21:9, fractional viewport, orientation, projection, and atomic-invalid-input
  coverage. The complete Game V2 suite passed 9 files and 201 tests; typecheck,
  architecture, focused ESLint, and focused Prettier also passed.
- V2-007 passed independent task review on its first round. The accepted commit
  is `1bf74fdd`; no Critical, Important, or Minor findings remain.
- V2-008 added an injected-target desktop keyboard adapter that samples WASD
  and Arrow aliases into a caller-owned intent, normalizes diagonals, publishes
  one Space edge per press, and clears/removes all owned state and listeners on
  blur or idempotent disposal.
- V2-008 added the stable fixed-step context contract and an allocation-free
  movement system. It validates the complete call boundary before mutation,
  captures previous positions before integration, writes six-unit-per-second
  normalized velocity, preserves last non-zero facing while idle, and ignores
  dash input until V2-009.
- V2-008 initial TDD RED command:
  `npx vitest run tests/game-v2/input/KeyboardInput.test.ts tests/game-v2/systems/MovementSystem.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because both production modules did not
  exist.
- V2-008 focused GREEN verification passed 38 tests. The complete Game V2 suite
  passed 11 files and 239 tests; typecheck, architecture, focused ESLint, and
  focused Prettier also passed.
- A deliberate mutation pass changed Space to level-triggered, removed
  normalization, changed speed from six, captured previous position after
  integration, and retained idle velocity. Nine focused tests failed before
  the production implementation was restored and the 38-test focused suite
  returned to green.
- V2-008 review fix round 1 separated movement strength from facing direction:
  sub-unit intent now preserves its original magnitude, over-unit input clamps
  to unit speed, and facing remains unit length for every non-zero input. A
  max-axis-scaled magnitude calculation prevents huge finite axes from
  overflowing into zero or non-finite movement. Three focused RED failures
  covered the defect; the amended focused suite passes 41 tests.
- V2-008 fix round 1 passed scoped re-review. The accepted commits are
  `6dac956c` and `b3375eb5`; the complete V2 suite passed 242 tests and no
  Critical, Important, or Minor findings remain.
- V2-009 added a one-charge dash with overflow-safe current-intent/last-facing
  direction selection, exact 0.18-second partial-tick integration, 150-tick
  cooldown restoration, and an 11-collision-tick invulnerability window.
- DashSystem now resolves before MovementSystem: it owns direction, fixed-tick
  cooldown/i-frame progression, and override velocity, while MovementSystem
  remains the only position integrator and clears completed dash motion without
  leaking ordinary movement into the final partial tick.
- V2-009 extracted the allocation-free fixed-step context trust boundary for
  both systems and added atomic rejection for stale/wrong-mask targets, invalid
  contexts, and malformed non-finite dash state.
- V2-009 initial TDD RED command:
  `npx vitest run tests/game-v2/systems/DashSystem.test.ts tests/game-v2/systems/MovementSystem.test.ts --pool=forks --maxWorkers=1`
  failed because `DashSystem` did not exist and six Movement override/shared
  validation behaviors were absent. A follow-up RED test caught a boolean
  precedence defect that started a vertical dash without a press.
- V2-009 focused GREEN verification passed 59 tests. The complete Game V2 suite
  passed 12 files and 275 tests; typecheck, architecture, and focused ESLint
  also passed before the checkpoint commit.
- V2-009 passed independent task review on its first round. The accepted commit
  is `da5abd0b`; no Critical, Important, or Minor findings remain.
- V2-010 added a fully initialized ECS enemy using only the World's
  generation-safe free-slot allocator. Point spawns consume no RNG; ring spawns
  consume exactly one injected deterministic angle sample after request and
  capacity validation.
- Enemy chase scans slots in ascending order, validates the complete player and
  enemy boundary before mutation, normalizes direction without overflow, copies
  previous positions before integration, and clamps travel at the remaining
  distance so zero-distance and near-target movement remain finite.
- Enemy release requires the complete enemy component mask and delegates slot
  clearing, generation advancement, and deterministic reuse to the World. A
  dirty-slot respawn fixture proved no enemy, dash, weapon, projectile, XP, or
  cooldown state survives reuse.
- V2-010 initial TDD RED command:
  `npx vitest run tests/game-v2/systems/EnemySystem.test.ts tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because `EnemySystem` did not exist while all
  27 World tests passed.
- V2-010 focused GREEN verification passed 60 tests. A deliberate mutation pass
  changed all-bit matching to any-bit, changed enemy speed, skipped the ring RNG
  sample, broke previous-position ordering and zero-distance handling, and
  disabled release; 12 of 33 enemy tests failed before production restoration.
- The complete Game V2 suite passed 13 files and 308 tests. Typecheck,
  architecture (89 baseline singleton files), focused ESLint, and focused
  Prettier also passed.
- V2-010 fix round 1 closed an unobserved RNG-consumption defect. A well-formed
  ring request whose geometry cannot survive Float32 storage
  (`{ type: 'ring', centerX: 3e38, centerY: 0, radius: 3e38 }`) passed
  `assertSpawnRequest`, consumed one `rng.nextFloat()` sample, and only then
  threw from the post-sample `assertFiniteCoordinate` calls. The existing
  `'rejects coordinates that cannot remain finite in ECS storage'` test asserted
  the throw but never the sample count, so the consumption was unlocked.
- Fix-round RED command:
  `npx vitest run tests/game-v2/systems/EnemySystem.test.ts --pool=forks --maxWorkers=1`
  failed 1 of 33 enemy tests after the test was extended with an injected
  sample-counting `nextFloat` stub. The ring row reported
  `AssertionError: expected 1 to be +0` at `expect(samples).toBe(0)`; the point
  row already consumed no sample.
- The ring branch of `assertSpawnRequest` now validates the four worst-case
  reachable coordinates (`centerX ± radius`, `centerY ± radius`) with the
  existing `assertFiniteCoordinate` helper before any RNG sample is drawn.
  Because `cos`/`sin` stay in `[-1, 1]`, every reachable spawn coordinate lies
  inside those bounds. The post-sample `assertFiniteCoordinate(spawnX)` and
  `assertFiniteCoordinate(spawnY)` calls remain as defence in depth.
- Mutation proof: temporarily removing the four pre-sample assertions returned
  the focused pair to 1 failed / 59 passed of 60; restoring them returned it to
  60 passed of 60.
- Fix-round verification passed
  `npx vitest run tests/game-v2/systems/EnemySystem.test.ts tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1`
  (2 files, 60 tests) and `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
  (13 files, 308 tests). `npm run typecheck`, focused ESLint on
  `game-v2/systems/EnemySystem.ts` and
  `tests/game-v2/systems/EnemySystem.test.ts`, and focused Prettier on the same
  two files also passed. No other spawn path changed and no existing assertion
  was weakened.

- V2-011 added `TargetingSystem` (deterministic nearest-target selection) and
  `WeaponSystem` (fixed-tick auto-fire, pooled projectile spawn, projectile
  integration, lifetime countdown, and pool return). `Mvp0Config.ts` gained
  `WEAPON_RANGE = 12`, `WEAPON_COOLDOWN_SECONDS = 0.5`,
  `WEAPON_COOLDOWN_TICKS = Math.ceil(0.5 * SIMULATION_HZ) = 30`,
  `PROJECTILE_SPEED = 14`, `PROJECTILE_DAMAGE = 10`, `PROJECTILE_RADIUS = 0.2`,
  `PROJECTILE_LIFETIME_SECONDS = 1.5`, and
  `PROJECTILE_LIFETIME_TICKS = Math.ceil(1.5 * SIMULATION_HZ) = 90`.
  `contracts/EntityId.ts` gained `NO_ENTITY = -1`; `0` is a valid handle
  (generation 0, slot 0) and cannot serve as a sentinel.
- `PROJECTILE_RADIUS = 0.2` is one third of `ENEMY_RADIUS = 0.6`, so a
  projectile never reads as an enemy, and its 0.4-unit diameter is 2.2 percent
  of `TOP_DOWN_CAMERA_VISIBLE_HEIGHT = 18`. Per-tick travel at
  `PROJECTILE_SPEED = 14` is 0.2333 units, well under the 1.6-unit combined
  projectile/enemy diameter, so V2-012 can use a discrete overlap test without
  tunnelling. A config test locks that inequality.
- Targeting scans slots ascending, requires the all-bit candidate mask
  `Transform | Enemy | Health`, gates on `health > 0`, validates the player
  boundary and every scanned enemy before returning, and never mutates the
  World. The `WEAPON_RANGE` boundary is inclusive: an enemy at exactly 12 units
  is a valid target, and both the exact boundary and the next representable
  distance beyond it are tested. Overflow safety rejects any candidate whose
  larger axis exceeds `WEAPON_RANGE` before squaring, so the squared term stays
  bounded by `2 * WEAPON_RANGE^2` even at the Float32 coordinate limit.
- `WeaponSystem.step` decrements the cooldown before the fire test, producing
  fires at ticks 0, 30, 60 and 90 across 120 ticks rather than 0, 31, 62.
  A tick with no target creates no projectile and does not re-arm the cooldown,
  so the weapon fires on the first tick a target exists. Firing is refused
  atomically when `world.freeSlotCount` is zero — the guard runs before the
  projectile-advance pass, so no live projectile is partially advanced on the
  rejection path.
- Projectiles spawn at the player position with `x`, `y`, `previousX`,
  `previousY`, `velocityX`, `velocityY`, `radius`, `projectileDamage`, and
  `projectileLifetimeTicksRemaining` all written. Damage is copied from the
  player's `weaponDamage`, which `resetPlayer` initializes to
  `PROJECTILE_DAMAGE`, so V2-013 upgrades need no new store. Zero-distance
  targets fall back to normalized `lastFacingX/lastFacingY` and then to a fixed
  positive-X axis, so a NaN or Infinity velocity component is impossible.
  Integration captures `previousX/previousY` before moving.
- V2-011 TDD RED command:
  `npx vitest run tests/game-v2/systems/TargetingSystem.test.ts tests/game-v2/systems/WeaponSystem.test.ts --pool=forks --maxWorkers=1`
  failed both files during module resolution with
  `Failed to resolve import "@/game-v2/systems/TargetingSystem"` and
  `Failed to resolve import "@/game-v2/systems/WeaponSystem"`, reporting
  `Test Files 2 failed (2)` and `Tests no tests`.
- A nine-mutant deliberate pass ran against the 35 focused tests. Failures per
  mutant: targeting all-bit mask to any-bit 15; projectile all-bit mask to
  any-bit 12; tie-break `<` to `<=` 2; inverted decrement/fire order 1; removed
  capacity guard 1; previous-position captured after integration 1; inclusive
  range boundary made exclusive 1; lifetime countdown and pool return removed 3;
  zero-distance direction fallback removed 3. Two fixtures were strengthened
  because they first killed too little: test players now own `Health` with
  positive health and the mask decoys carry positive health (the any-bit mutant
  went from 1 kill to 15), and the capacity-refusal fixture now holds a live
  projectile so the guard's atomicity is observable (that mutant went from 0
  kills to 1). The production implementation was restored and re-verified green
  after every mutant.
- V2-011 deviates from two lines of the plan's Task 12 by orchestrator decision,
  recorded as `V2-ADR-021` and `V2-ADR-022`: the "RNG only for exact-distance
  tie resolution" interface line is superseded by zero-RNG ascending-slot
  tie-breaking, and projectile integration, lifetime countdown, and pool return
  are owned by V2-011 instead of being left unowned. Collision, damage, and
  death remain V2-012 scope.
- V2-011 focused GREEN verification passed 2 files and 35 tests. The complete
  Game V2 suite passed 15 files and 343 tests, up from the 13 files and 308
  tests of the accepted V2-010 checkpoint. `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files), focused ESLint,
  and focused Prettier on all six changed files also passed. No production
  `services/**` file, legacy demo file, `EnemySystem`, `DashSystem`,
  `MovementSystem`, `World`, or `RenderSnapshotWriter` was modified.
- V2-011 review fix round 1 removed a duplicated entity-handle encoding. The
  rule `generation * capacity + slot` is `World`'s contract, but V2-011
  re-derived it in `TargetingSystem.entityIdOfSlot` and an identical
  `WeaponSystem.entityIdOfSlot`, both substituting `world.masks.length` for the
  private `capacity`. `WeaponSystem` fed that re-derived id straight into
  `world.destroyEntity(...)` on the projectile-expiry path, so any change to the
  encoding or store layout would have silently destroyed the wrong slot instead
  of failing loudly.
- `World` now owns the encoding in one public validating method,
  `entityIdOf(slot)`. `createEntity` returns `this.entityIdOf(slot)`, so exactly
  one expression of the rule exists; the change is behaviour-preserving because
  `createEntity` already read `generation` from `this.generations[slot]` and
  never mutated it before returning. `capacity` stays private, so the contract
  cannot be bypassed. Both systems deleted their private helper and the
  accompanying `masks.length` comment and now call `world.entityIdOf(slot)`.
  `WorldSnapshotWriter.ts:90` was left alone: it reads a length for iteration
  bounds and does not re-derive the encoding.
- The documented rule for invalid input: a `slot` that is not an integer inside
  `[0, capacity)` throws `RangeError` (non-finite and fractional slots fail the
  same check); a slot whose generation is `RETIRED_ENTITY_GENERATION` throws
  `RangeError`, because a retired slot can never be allocated again and owns no
  issuable handle, so returning the sentinel-encoded number would hand the
  caller a value that only looks like an entity. A currently-free but reusable
  slot does encode: the returned id carries that slot's live generation and,
  because the slot mask is zero, `isAlive` reports it as dead, so it can never
  be mistaken for a live entity. The method allocates nothing on the success
  path and is safe inside the per-tick projectile loop.
- Fix-round RED command:
  `npx vitest run tests/game-v2/world/World.test.ts --pool=forks --maxWorkers=1`
  reported `Tests 12 failed | 27 passed (39)`, every failure being
  `TypeError: world.entityIdOf is not a function`.
- A three-mutant deliberate pass ran against the complete 355-test Game V2
  suite. Failures per mutant: dropping the generation term (`return slot`) 12;
  using `capacity + 1` 11; dropping the slot term
  (`generation * this.capacity`) 39. The round-trip test first killed nothing,
  so it was strengthened to seed generations 3 and 5 before allocation and to
  assert the independent literals 24 and 41; it then killed all three mutants.
  Every one of the five new World tests now kills at least one mutant. The
  production implementation was restored and re-verified green after each.
- Fix-round verification passed
  `npx vitest run tests/game-v2/world/World.test.ts tests/game-v2/systems/TargetingSystem.test.ts tests/game-v2/systems/WeaponSystem.test.ts tests/game-v2/replay/WorldSnapshot.test.ts --pool=forks --maxWorkers=1`
  (4 files, 127 tests) and
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (15 files,
  355 tests, up from 343 by the twelve new World tests only). `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files), focused ESLint, and
  focused Prettier on the four changed files also passed. The `8c5ecef3`
  world-snapshot golden is unaffected: a method was added, no data layout
  changed, and the replay suite stays green. No targeting, cadence,
  projectile-integration, lifetime, or capacity-guard assertion was weakened.
- V2-011 is accepted. The accepted commit range is `f76377e4` plus the fix
  commit carrying this checkpoint,
  `refactor(game-v2): centralize entity handle encoding in World`, whose SHA is
  recorded in the next checkpoint because a commit cannot contain its own hash.

## Verification Required

1. Implement V2-012 collision, damage, and death: exactly-once projectile
   damage, contact damage at its authored cadence, dash i-frame rejection,
   entity destruction, the game-over signal, and the preallocated kill-event
   buffer.

## Exact Next Action

Generate the V2-012 task brief (collision, damage, and death) and dispatch its
implementer from the accepted V2-011 checkpoint.

## Known Pre-existing Working-tree Changes

These changes predate the Game V2 documentation commit and are user-owned. Do
not stage, edit, revert, or include them in a Game V2 commit:

- `skills-lock.json` — modified.
- `docs/design/CORE_REDESIGN_V1.md` — untracked.

## Resume Protocol

Any new agent or session must:

1. Read the design spec.
2. Read `MASTER_PLAN.md` and this checkpoint.
3. Inspect Git status and verify the known pre-existing changes.
4. Locate the active task ID and its acceptance criteria.
5. Run the last listed verification before modifying code.
6. Update this file before stopping.
