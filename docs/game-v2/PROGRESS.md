# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` |
| Phase | MVP-0 runtime foundation |
| Active task | `V2-014` — implementation and evidence complete; the independent review Task 15 mandates has not run |
| Status | `Verification` — MVP-0 is playable end to end and every acceptance command passes |
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
- V2-012 was the first task delegated to the Antigravity CLI (`agy`,
  `gemini-3.7-flash-high`) instead of a Claude subagent. The orchestrator wrote
  the spec, agy wrote the code, and the orchestrator reviewed the diff and
  applied the fixes below. The wrapper run is recorded under
  `.agy-runs/1787348980031-v2-012-combat/`; it exited `ERROR` despite producing
  a complete report and all four files, so the result was treated as unverified
  until independently checked.
- Before delegating, `GEMINI.md` gained a Game V2 section. It previously
  described only the legacy runtime, so it instructed a delegate to reach for
  `PoolManager`, `SpatialGrid` and `TimeService` — all forbidden imports inside
  `game-v2/**`.
- V2-012 added `CombatSystem`, the `CombatStepResult` contract, and an injected
  `CollisionCandidateProvider` whose bounded ascending-slot default is the MVP-0
  production path. Step order is fixed: projectile-to-enemy, then
  enemy-to-player contact, then the death latch.
- Constants were derived from stated properties rather than chosen, and each
  property is asserted: `PLAYER_MAX_HEALTH = 100` survives 6 contact hits
  (inside the required 3..8 band), `ENEMY_CONTACT_COOLDOWN_SECONDS = 1.0` yields
  6.0 s to die against the required `2 * DASH_COOLDOWN_SECONDS = 5.0` s, and
  `COMBAT_KILL_BUFFER_CAPACITY = 32` exceeds the 4 physically concurrent
  projectiles. A config test also pins 0.2333 units of per-tick projectile
  travel below the 0.8-unit combined collision radius, so discrete collision
  cannot tunnel.
- V2-012 initial TDD RED command:
  `npx vitest run tests/game-v2/systems/CombatSystem.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution because `CombatSystem` did not exist.
- The delegated mutation pass covered six mutants: multi-enemy projectile
  damage (4 kills), skipped projectile release (6), post-destroy kill-position
  reads (3), i-frames consuming the contact cooldown (1), a latch-free
  `playerDied` (1), and reversed step order (1).
- Orchestrator review found one Critical defect. `PLAYER_MAX_HEALTH` and
  `PLAYER_RADIUS` had no writer anywhere in `game-v2/**`: only the test helper
  assigned them. In production the player would have entered every run with a
  zeroed slot, so `CombatSystem.step` would have latched `playerDied` on its
  first call and contact overlap would have been measured against a zero-radius
  player. The whole suite was green because every test supplied those values by
  hand. The fix adds `CombatSystem.resetPlayer`, mirroring
  `DashSystem.resetPlayer` and `WeaponSystem.resetPlayer`; V2-014 composition
  calls all three.
- Orchestrator review found one Important defect. Kill-buffer overflow threw
  after `world.health[enemySlot]` had already been written, leaving a damaged
  but undestroyed enemy behind. The capacity check now runs before any mutation.
  Rejection is atomic for the enemy that could not be recorded; kills already
  recorded earlier in the same tick still stand, which is accepted because the
  throw signals a broken invariant rather than a recoverable condition.
- Orchestrator review removed two dead alias constants, `PLAYER_HEALTH` and
  `KILL_BUFFER_CAPACITY`, which duplicated names for values nothing imported.
- Both orchestrator fixes are mutation-proved. A no-op `resetPlayer` fails 3 of
  the 30 focused tests; moving the capacity check back after the health write
  fails 1. Production restored to 30/30.
- `CombatSystem.step(world, playerEntity, context)` takes the player handle as
  its second argument, unlike the two-argument snippet in Task 13 of the MVP-0
  plan. The three-argument form matches `DashSystem`, `MovementSystem`, and
  `WeaponSystem`; the plan snippet is superseded on this point only.
- Known limitation carried into V2-013: no production code constructs the player
  entity yet, so the mandated real-path test still builds it through a helper
  while driving real `EnemySystem` and `WeaponSystem` behaviour. A production
  player factory arrives with V2-014 composition.
- An independent review of the uncommitted V2-012 change set confirmed both
  orchestrator fixes. `resetPlayer` is the only production writer of the player's
  health, max health and radius, and the kill-buffer capacity check provably
  precedes every world mutation. The reviewer ran 23 mutants and restored the
  file byte-identically, verified by hash and by `diff`.
- The review found no Critical defect and five Important gaps, all of them
  contracts that no test pinned. Every one is now closed in this checkpoint and
  each fix is mutation-proved.
- `CombatSystem` no longer latches player death. `playerDied` is derived from the
  player's health at step entry, so the system holds no per-run state at all and
  `reset()` was removed. This is decision V2-ADR-025: `RuntimeCheckpoint` carries
  `World` and not system fields, so a locally latched death would have been
  re-announced after a restore and ended the run twice.
- `CombatSystem.step` now requires `Body` on the player and rejects a player
  whose `maxHealth` is still zero (decision V2-ADR-026). The first prevented a
  silent zero-radius contact hitbox; the second is what keeps a missing
  `resetPlayer` loud now that death is derived from health rather than latched.
- `resolveContactDamage` validates enemy position and radius before touching the
  contact cooldown. A `NaN` coordinate previously failed both overlap
  rejections, so a corrupt enemy would have damaged the player from any
  distance while `findCollidingEnemy` threw on the same input.
- Four contracts that passed by luck are now pinned: exactly `killCapacity` kills
  in one tick must succeed (both prior overflow tests overshot the bound, so
  tightening it by one survived), the lowest-slot tie-break between co-located
  enemies (it feeds `StateHasher` and therefore the replay hash), the inclusive
  exact-touch boundary on both combat loops, and enemy contact cooldowns
  continuing to advance during dash i-frames.
- The hardening round's mutation table, focused suite of 40 tests:
  capacity bound tightened by one 1; descending collision scan 1; projectile
  exact-touch made exclusive 1; contact exact-touch made exclusive 1; i-frames
  freezing the cooldown 1; contact-loop `NaN` guard removed 1; projectile-loop
  `NaN` guard removed 1; death edge reverted to a raw health check 2;
  `resetPlayer` initialization guard removed 1. Production was restored
  byte-identically after every mutant, verified by sha256.
- One mutant exposed a test that passed for the wrong reason. The first
  projectile-loop `NaN` assertion was written against `step`, where the contact
  loop throws for the same enemy, so deleting the guard under test still passed.
  It was rewritten against `CollisionCandidateProvider.findCollidingEnemy`
  directly and now kills the mutant.
- Deferred deliberately, with reasons: `World.capacity` is private with no public
  accessor, so all five systems bound their loops with `world.masks.length`; a
  `World.slotCount` getter is a repo-wide follow-up, not a V2-012 regression.
  Kill records already written before an overflow throw are still lost rather
  than deferred, which stays accepted because the throw signals a broken
  invariant. The `health <= 0` skip in `findCollidingEnemy` is unreachable in
  production and stays as a defensive guard.
- Bookkeeping correction to the entry above: the V2-012 diff to `Mvp0Config.ts`
  adds five constants across seven lines, not seven constants. All five are read
  from production code.
- Post-hardening verification: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
  passes 16 files and 395 tests, up from 385 by the ten new CombatSystem tests
  only. `npm run typecheck`, `npm run check:architecture` (89 baseline singleton
  files) and focused ESLint all pass. No existing assertion was weakened.
- V2-013 added a state-free `ProgressionSystem` that consumes the bounded combat
  kill buffer, publishes one world-pooled XP pickup per kill, collects inclusive
  walk-over overlaps exactly once, advances level 1 to 2 with surplus XP
  retained, and pauses the lifecycle at `level-up`. `ProgressionStepResult` is
  preallocated scratch output; offer authority is derived only from
  `lifecycle.phase`, with no `pendingOffer`, paused-tick latch, or system reset.
- Kill count, Float32 buffer shape and bounds, every kill row, player state,
  every existing pickup, aggregate Float32 XP, lifecycle phase, and world
  capacity are validated before the first pickup is created or collected. A
  malformed later kill cannot publish an earlier pickup; a malformed later
  pickup or aggregate XP overflow cannot destroy an earlier collectible pickup.
  Exact-touch prediction uses the same `Math.fround(0.3)` radius written to the
  Float32 world store, avoiding a prevalidation/store boundary disagreement.
- V2-ADR-024 remains intact: `WeaponSystem.applyDamageUpgrade` is the only
  progression writer of `world.weaponDamage`; `ProgressionSystem` records the
  explicit `RunCommand` first, calls that method second, then resumes the
  lifecycle. Recorder rejection leaves weapon and lifecycle unchanged, a fresh
  system instance can resolve an already-paused lifecycle, and a second choice
  is rejected because the lifecycle is no longer `level-up`.
- The MVP-0 overlay exposes exactly one native button, calls
  `onChoose('starter-damage-2')`, displays the 10 to 15 damage change, and is a
  modal dialog named by its visible title. All new selectors are rooted under
  `.game-v2`, including visible focus styling; no three-card, timeout, reroll,
  or banish scope was introduced.
- V2-013 resume RED first reproduced the interrupted state at 2 failed / 32
  passed of 34. After replacing the obsolete reset and paused-tick tests, the
  meaningful RED was 6 failed / 32 passed of 38: stale offer output,
  malformed-later-kill partial publish, malformed-later-pickup partial
  collection, idle lifecycle mutation, fresh-system rejection, and paused-tick
  latch rejection. The semantic-dialog RED separately failed 1 of 6 overlay
  tests because no accessible dialog existed.
- Five deliberate mutants were killed by one focused test each: exclusive
  exact-touch, removed typed-buffer validation, reversed recorder/weapon order,
  removed lifecycle-playing guard, and removed Float32 representability guard.
  Each production mutation was restored before final verification.
- V2-013 verification passes focused 2 files / 41 tests and the full Game V2
  suite at 18 files / 436 tests. `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files), focused ESLint,
  focused Prettier, and `npm run check:ui-contract` all pass. The UI gate needed
  normal process permissions because its `git cat-file` child process is denied
  by the workspace sandbox; outside that sandbox the configured baseline is
  reachable and the gate reports `UI contract: passed`.
- V2-013 review fix round 1 added V2-ADR-027: a terminal player-death signal
  dominates progression in the same tick. `ProgressionSystem.step` validates
  that `playerDied` is a runtime boolean, clears every field in its reusable
  result, and returns before kill, player, pickup, XP, capacity, or level-up
  validation and mutation. It deliberately leaves lifecycle phase `playing` so
  the owning runtime can immediately perform the single `endRun()` transition.
- The terminal regression first primes all four reusable result fields with a
  level-up event, resumes and resets the player, then supplies a simultaneous
  valid kill and player death. It proves zero pickup/XP/level/offer mutation,
  unchanged world capacity/count, a cleared same result object, lifecycle still
  `playing`, and the subsequent transition to `game-over`. Separate tests prove
  terminal death ignores malformed kill storage and a forged non-boolean death
  signal rejects atomically.
- The real production-path integration now counts health loss from actual
  projectile collisions before progression can reuse the destroyed enemy slot.
  The lethal health-to-zero transition counts as a hit; the test locks tier 1
  to exactly 3 projectile hits and tier 2 to exactly 2, rather than inferring
  the upgrade only from elapsed ticks.
- Review-fix RED passed 35 and failed the three new death tests for the expected
  reasons: same-tick level-up publication, premature malformed-kill validation,
  and missing boolean rejection. Focused GREEN passes all 38 progression tests.
  Three deliberate mutants were killed and restored: removing the terminal
  early return failed 2 tests, removing the boolean guard failed 1, and omitting
  one scratch-field clear failed 1.
- Review-fix verification passes focused 1 file / 38 tests and the full Game V2
  suite at 18 files / 439 tests. Typecheck, the 89-file singleton architecture
  baseline, focused ESLint, focused Prettier, and the escalated UI contract gate
  all pass before commit.
- V2-013 review fix round 2 replaces aggregate health-loss division with
  discrete positive health-drop events in the real production integration.
  Every event must equal the active tier's exact projectile damage, including
  the lethal clear-to-zero event, before the independent event counters assert
  exactly 3 tier-1 hits and exactly 2 tier-2 hits.
- The reviewer mutant was reproduced by keeping player `weaponDamage` at 15 but
  forcing every spawned projectile to copy base damage 10. The prior aggregate
  test falsely passed because `30 / 15 = 2`; with the new event assertions the
  same mutant fails `expected 10 to be 15`. `WeaponSystem.ts` was then restored
  byte-identically to SHA-256
  `E14737F4C50921B377CE8F296B608E1EA964FB0D4D4ABE009EC0738F420F87A5`, has no
  diff, and the integration returns GREEN.
- Fix-round-2 verification passes the focused progression suite at 38/38 and
  all Game V2 tests at 18 files / 439 tests. Typecheck, focused ESLint,
  focused Prettier, and diff-check also pass; production source remains
  unchanged.
- V2-014 composed the MVP-0 runtime and closed the walking skeleton. It adds
  `GameV2Runtime` (the fixed tick order, lifecycle transitions, and render
  handoff), `createMvp0Runtime` (the single production composition, headless
  when no render target is supplied), `ReplayRunner`, the `RunRecording` and
  `GameV2Debug` contracts, and a playable `/game-v2` surface with a HUD, a
  level-up card, and a game-over restart.
- The legal tick order is: sample intent, quantise it to Float32, record it,
  spawn any due enemy, `DashSystem`, `MovementSystem`, `EnemySystem`,
  `WeaponSystem` (targeting, projectile integration, fire), `CombatSystem`,
  `ProgressionSystem`, then the terminal or level-up lifecycle transition. The
  render snapshot is written and presented once per frame, after that frame’s
  ticks.
- The spawn cadence is new authority the Task 15 step list did not name
  (V2-ADR-028). Without it the task’s own acceptance criteria are unreachable.
  `MVP0_ENEMY_SPAWN_INTERVAL_TICKS = 60` is derived: a tier-one kill costs 90
  ticks and a tier-two kill 60, so standing still loses ground until the first
  upgrade buys it back. Both properties are pinned in
  `tests/game-v2/config/Mvp0Config.test.ts`.
- V2-014 TDD RED command:
  `npx vitest run tests/game-v2/integration/Mvp0Runtime.test.ts tests/game-v2/replay/ReplayRunner.test.ts --pool=forks --maxWorkers=1`
  reported `Test Files 2 failed` with both failures in module resolution, the
  first being an unresolvable `@/game-v2/contracts/RunRecording`.
- The first GREEN attempt exposed a real determinism defect. `InputRecorder`
  stores movement as Float32 while the sampled intent is Float64, so a replay
  diverged from the run it replayed by about one ULP per tick and compounded
  into a different state hash; the reset comparison differed in `x`, `y`,
  `previousX`, `previousY`, `velocityX`, and `velocityY` while the RNG state and
  tick count matched exactly. The runtime now quantises the intent with
  `Math.fround` before recording it and before any system reads it
  (V2-ADR-030). A recording could not previously reproduce its own run.
- The scripted acceptance run is a real 789-tick game, not a two-tick stub: the
  player warms up movement, dashes into a closing enemy at tick 416, collects a
  drop into the level-up that issues the single recorded upgrade command at
  tick 421, then charges enemies until it dies at tick 789. Initial state hash
  `284ae166`, final `09fc36e7`.
- Cross-FPS replay of that recording returns `09fc36e7` at tick 789 with one
  command applied at 30, 60, and 120 render FPS, matching the hash the live run
  produced. `IntentSource.sample` returning `false` is what ends a replay on
  exactly the recorded tick at any frame rate (V2-ADR-031).
- The dash proof is an A/B on one recording rather than a single-tick
  observation: replaying the identical input with every dash press cleared
  leaves the player with strictly less health one contact cooldown after the
  dash tick. The first attempt asserted a single tick and proved nothing,
  because the enemy that had just hit the player was still on its contact
  cooldown.
- V2-014 GREEN verification commands, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (23 files, 488
  tests, up from the 18 files and 439 tests of the accepted V2-013 checkpoint),
  `npm run typecheck`, `npm run check:architecture` (89 baseline singleton
  files), `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt),
  `npm run check:ui-contract`, `npm run check:event-contract`, `npm run lint`
  (0 errors, 0 warnings), `npx prettier --check` on every changed path, and
  `npm run build`.
- `npm run test` reports 358 files and 3654 tests with one failure,
  `tests/components/landing/LandingPriceFeed.test.tsx`. That failure is
  pre-existing and unrelated: it reproduces identically with the whole V2-014
  working tree stashed. It belongs to the legacy landing surface and was left
  alone rather than fixed inside a Game V2 commit.
- Browser smoke:
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  passed 2 tests in 39.7 s. The seeded run opens
  `/game-v2?no-sw=true&seed=12345`, proves WebGL sized the real canvas backing
  store, walks with `KeyD`, produces a per-tick displacement no walk speed can
  reach plus invulnerability from `Space`, reaches the level-up card, proves
  the tick counter does not move while the card is open, takes the upgrade, and
  resumes at level 2 with tier-two damage. The second test proves `/` still
  renders the legacy landing and publishes no Game V2 debug surface.
- A fifteen-mutant deliberate pass ran against the complete Game V2 suite.
  Killed: dropping the Float32 intent quantization (2 failures), shifting the
  spawn cadence off tick 1 (1), removing the clock pause on level-up (1),
  removing the not-playing tick guard (1), ignoring an exhausted intent source
  (1), skipping the recorder reset (1), skipping the replay initial-hash check
  (1), skipping replay frame contiguity (1), ignoring the URL seed (2), never
  restoring the RNG on reset (1), presenting a frame before stepping it (1),
  dropping the camera follow (2), and skipping the progression reset (26).
- Four of those mutants survived the first pass and the tests were strengthened
  until they died: the level-up pause test now advances in half steps so a
  sweeping interpolation alpha is visible, the reset test now replays a
  completed run before resetting so the RNG restore is load-bearing, a new test
  drives past input exhaustion, a new test presents one and a half steps so a
  frame rendered before its own ticks is detectable, and every `ReplayRunner`
  rejection now asserts its own message instead of `RangeError`.
- Two mutants survive by construction and are recorded rather than hidden. The
  live-enemy cap and the world-capacity precondition in `spawnDueEnemy` cannot
  be reached at MVP-0 balance: a fleeing player peaks at six live enemies and a
  standing player dies first, so no gameplay test can drive either bound. The
  cap and the render snapshot enemy capacity are the same constant, pinned
  together by the config test; V2-108’s composition budget is what will make
  them binding. A third mutant, letting a level-up outrank terminal death, is
  semantically equivalent because `ProgressionSystem` already clears its output
  on a lethal tick (V2-ADR-027).
- Reset is a new session by contract, not a bit-identical rerun (V2-ADR-029).
  `snapshotHash()` covers `lifecycle.sessionEpoch`, and `World.reset()` retires
  the generation of every slot that was alive. The reset test replays the same
  recording after a completed run and matches the reference checkpoint on every
  field except those two.
- `MVP0_SPAWN_FREE_SLOT_RESERVE` was removed during the mutation pass. It was
  an invented policy constant that no test could reach and whose failure mode
  world exhaustion already owns; the spawner now checks exactly the documented
  precondition of `EnemySystem.spawnEnemy`.
- New decisions: V2-ADR-028 through V2-ADR-032.

## Verification Required

1. `V2-014` needs the independent review Task 15 mandates for Tasks 1, 5, 7,
   and 15 — architecture, determinism, lifecycle cleanup, and accidental legacy
   imports. It has not run. Until it does MVP-0 is `Verification`, not `Done`,
   and the `MASTER_PLAN.md` rows stay open.
2. Re-run the last GREEN commands before touching code:
   `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (expect 23 files,
   488 tests) and
   `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
   (expect 2 passed).

## Known MVP-0 Limitations

- XP pickups have no lifetime and no magnet, so they accumulate for the whole
  run. `MVP0_WORLD_CAPACITY = 512` is the only bound, and a run long enough to
  fill it throws from `ProgressionSystem`. Pickup lifetime belongs to MVP-1.
- The live-enemy cap and the spawner capacity precondition are unreachable at
  MVP-0 balance and are therefore unproved by any gameplay test.
- One runtime is one run identity, so the game-over restart replays the same
  seed. A different run needs a reload, which is correct for a `?seed=` session
  and a wart for an unseeded one.
- The `/game-v2` surface stays behind the V2 entry boundary. No production
  cutover was made and the legacy demo remains authoritative.

## Exact Next Action

Review the V2-014 checkpoint against the Task 15 acceptance criteria. If it is
accepted, record V2-000 through V2-014 as closed, close MVP-0, and generate the
`V2-100` task brief (four-slot ability loadout). Do not deploy, cut over
production, or replace the legacy demo.

## Known Pre-existing Working-tree Changes

These changes predate the Game V2 documentation commit and are user-owned. Do
not stage, edit, revert, or include them in a Game V2 commit:

- `skills-lock.json` — modified.
- `docs/design/CORE_REDESIGN_V1.md` — untracked.
- `public/sitemap.xml` — build-generated modification.
- `public/docs/**` — build-generated/untracked documentation copies.

## Resume Protocol

Any new agent or session must:

1. Read the design spec.
2. Read `MASTER_PLAN.md` and this checkpoint.
3. Inspect Git status and verify the known pre-existing changes.
4. Locate the active task ID and its acceptance criteria.
5. Run the last listed verification before modifying code.
6. Update this file before stopping.
