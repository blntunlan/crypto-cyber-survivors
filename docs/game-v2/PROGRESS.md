# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` (local `HEAD`, not yet pushed) |
| Phase | MVP-1 `Done`; MVP-2 (Market Vertical Slice) `In Progress` |
| Active task | None. `V2-207` (primary/support composer) is accepted and closed — all three indicator families now compose together, though not yet wired into `GameV2Runtime`. The next reachable tasks are `V2-208` (Spawn output) and `V2-209` (World-event output), both now unblocked. |
| Status | MVP-1 fully closed (`V2-100`..`V2-112`). MVP-2: `V2-200`..`V2-207` accepted; `V2-208`..`V2-213` not started. |
| Closed | `V2-207` accepted (this checkpoint); `V2-206` accepted at `039a6402`; `V2-205` accepted at `478035a8`; `V2-204` accepted at `055c3ae3`; `V2-203` accepted at `fedbf7e9`; `V2-202` accepted at `a1609b2b`; `V2-201` accepted at `4119e380`; `V2-200` accepted at `246733ce` (BTC-only scope); `V2-110` accepted at `fa52e413`; `V2-112` accepted at `a5ae6d60`; `V2-111` accepted at `e26dc604`; `V2-109` accepted at `3dfd5f06` (cleanup committed `374cec0e`); `V2-108` accepted at `94a48e7a` |
| MVP-0 | `Done` — accepted 2026-08-22 at `085697b5`; V2-000 through V2-014 closed |
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
- That last claim was itself wrong when first written: two rejections still
  asserted the bare type. Review round 1 caught it and it is now true.
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

### Review round 1

- An independent reviewer examined `a42f2dfd..0326855d` against the Task 15
  acceptance criteria and its four mandated focus areas. It returned no
  Critical finding, five Important, and ten Minor, with the verdict "with
  fixes". It reproduced every claimed verification number itself, verified
  the accumulator arithmetic at 30/60/120 FPS in exact doubles, independently
  swept for the Float32/Float64 defect class and confirmed the intent was the
  only instance, and enumerated every import under `game-v2/**` rather than
  trusting the boundary guard.
- I1 was a real shipped bug, not a contract nit. `reset()` restored everything
  the runtime owns but nothing the injected `IntentSource` owns, and a source
  is not sampled at all while the run is over. A `Space` pressed on the
  game-over screen therefore sat in `KeyboardInput.pendingDash` and fired a
  dash on tick 1 of the restarted run — which also broke the reproducibility a
  `?seed=` session promises, because the restart reuses the identity.
  `IntentSource.reset?()` and `KeyboardInput.clear()` close it (V2-ADR-034),
  and every replay harness lost its undocumented obligation to reset its own
  cursor by hand.
- I2 overturned this checkpoint’s own reasoning, correctly. The claim that the
  live-enemy cap and the world-capacity precondition were unreachable was true
  only of gameplay tests: `GameV2Runtime` takes `world` injected, so both
  bounds are reachable by composing the runtime directly.
  `tests/game-v2/runtime/GameV2RuntimeBounds.test.ts` now drives them with a
  two-slot world and with a world pre-populated to the cap. The enemy cap is
  load-bearing rather than decorative: exceeding it makes
  `RenderSnapshotWriter` throw inside the frame.
- I3: the animation frame loop scheduled the next frame before running its
  body, so a throw repeated at 60 Hz forever instead of stopping. The loop now
  cancels itself and surfaces the message (V2-ADR-035).
- I4: `SimulationClock.tick` had become a second tick authority with no
  production reader, counting steps a refusing runtime discarded. It is now
  `stepsAttempted`, and the clock stops driving steps once a step pauses it
  (V2-ADR-033).
- I5: the unmount test only covered a single mount while the shipped entry is
  `StrictMode`-wrapped. The double mount is now tested and passes with two
  renderers created, the first disposed, and one live debug surface. Minor 8
  came with it: `ThreeScene.dispose()` released each mesh’s geometry and
  material but never the `InstancedMesh` itself, leaving its instance matrix
  buffers allocated — reachable precisely because of the remount.
- Minor findings 1, 2, 3, 5, 8 and the config/e2e items of 10 are applied. The
  reset test no longer substitutes `world.generations` wholesale, which would
  have hidden a generation bug; it now pins the exact arithmetic, `2b + alive`
  per slot after two runs and one reset. The first attempt at that assertion
  was wrong and the test caught it.
- The mutation runner had a defect of its own and it cost a stalled session.
  It captured vitest through a pipe with no timeout and restored the mutant
  outside a `finally`, so a hung run left a mutant applied in the working tree.
  It now restores in a `finally`, writes to a file, and times out per mutant.
- That hang was itself a finding. Removing the `reset()` delegation made the
  replay harness loop forever instead of failing, because a runtime that stops
  accepting ticks never satisfies a `while (tick < frames.length)` condition.
  Every replay helper now runs under a frame budget and fails loudly.
- Review-round mutation pass: eight mutants, all killed. Not resetting the
  input source (2 failures), a no-op `KeyboardInput.clear` (1), a clock that
  keeps draining after a step pauses it (1), an uncontained frame throw (1),
  undisposed instanced meshes (1), dropping the unconsumed-command guard (1),
  ignoring the world capacity precondition (1), and ignoring the live-enemy
  cap (2). The instanced-mesh mutant survived the first attempt and the
  existing dispose test was extended until it died.
- Review-round verification, each command run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (24 files, 498
  tests), `npm run typecheck`, `npm run lint` (0 errors, 0 warnings),
  `npx prettier --check` on every changed path, `npm run check:architecture`,
  `npm run check:reset-coverage`, `npm run check:ui-contract`,
  `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed). `npm run test` reports 359 files and 3664 tests with the same
  single pre-existing `LandingPriceFeed` failure.
- New decisions: V2-ADR-033 through V2-ADR-035.

### MVP-0 acceptance (2026-08-22)

- The V2-014 checkpoint was re-verified from a clean session before acceptance,
  as the resume protocol requires. `npx vitest run tests/game-v2 --pool=forks
  --maxWorkers=1` reported 24 files and 498 tests passed in 52.5 s, matching the
  recorded expectation exactly, and `npx playwright test
  e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1
  --reporter=list` reported 2 passed in 1.3 m.
- The user accepted the checkpoint. `V2-000` through `V2-014` are closed and
  MVP-0 is `Done` at `085697b5`. `MASTER_PLAN.md` records the milestone status
  and the three deferred review findings against their owning later blocks.
- Nothing about the acceptance changes production: `/game-v2` remains behind the
  V2 entry boundary, the legacy demo stays authoritative, and no cutover or
  deploy was performed.
- The three findings under `Deferred Review Findings` stay open by design and
  are now owned by later blocks: `RunRecording.finalHash` by the anti-cheat
  replay path, the boundary denylist inversion by the architecture guard, and
  cross-engine `Math.hypot`/`Math.cos`/`Math.sin` determinism by `V2-407`.
- The `V2-100` task brief was generated at
  `docs/game-v2/tasks/V2-100-ability-loadout.md`. It scopes the four-slot
  contract, its authoritative storage in `World`, hash and reset coverage, and
  the starter-weapon migration that gives the loadout a real production reader,
  and it explicitly excludes the passive slots, the tier-effect schema, the HUD,
  the card flow, and the later ability identities. It proposes V2-ADR-036
  through V2-ADR-038, which are recorded in `DECISIONS.md` when the task starts
  rather than now.

### V2-100 — four-slot ability loadout (2026-08-22)

- Four ability slots are now authoritative run state. `game-v2/contracts/AbilitySlot.ts`
  holds the typed contract (`ABILITY_SLOT_COUNT`, `AbilitySlotIndex`,
  `AbilityActivation`, `AbilityTier`, `AbilityDefinition`) and the single owner
  of the store stride, `abilityStoreIndex`. `World.abilitySlotIndexOf` is its
  validating wrapper for live worlds; the validator and hasher call the bare
  function because they hold no `World`.
- State lives in two `Uint8Array` stores of length `capacity * ABILITY_SLOT_COUNT`
  and a new `ComponentMask.AbilityLoadout` bit that every reader demands
  (V2-ADR-036, V2-ADR-026). `World.clearSlot` and `World.reset` clear them, so a
  recycled slot never inherits a build.
- `AbilityLoadoutSystem` is the only writer: `add` fills the lowest free slot and
  refuses both a fifth ability and a duplicate identity, `remove` frees exactly
  one, `advanceTier` stops at the identity's `authoredTiers`, and `resetOwner`
  clears all four. It holds no per-run state (V2-ADR-025).
- The registry is a validated value built by `createAbilityRegistry` and injected
  into the system (V2-ADR-039). Four-slot occupancy is untestable with the single
  identity MVP-1 starts with, and the alternative — placeholder identities in
  production config — is the `MVP0_SPAWN_FREE_SLOT_RESERVE` mistake again.
- Identities hash as stable numeric codes in `1..255`, never strings; the empty
  slot is code `0` (V2-ADR-037). `WORLD_SNAPSHOT_SCHEMA_VERSION` moved from `1`
  to `2`.
- The starter weapon now derives its damage from the tier in its slot, and
  `World.weaponDamage` was deleted (V2-ADR-038). `applyDamageUpgrade` became
  `advanceStarterTier`, and `starterDamageOf` is the read the HUD readout uses,
  so the HUD and the simulation cannot disagree. A second upgrade throws because
  `starter-projectile.authoredTiers` is `2` until V2-102 authors tier 3, rather
  than because a weapon-local guard says so.
- The validator gained structural loadout invariants that need no registry: a
  tier above `ABILITY_MAX_TIER`, an identity without a tier, a tier without an
  identity, and loadout bytes on a slot without the component are all rejected.
  A checkpoint therefore stays readable when V2-106 and V2-107 add identities.
- The scripted acceptance run is byte-for-byte the same game — still 789 ticks,
  still one recorded upgrade command — but its hashes moved because the world
  now carries loadout bytes: initial `284ae166` → `8272f478`, final
  `09fc36e7` → `b09663a6`. No test pins those values; `Mvp0Runtime` and
  `ReplayRunner` compare hashes to each other, which is why cross-FPS replay
  still holds without a re-pin.
- V2-100 RED command:
  `npx vitest run tests/game-v2/config/AbilityRegistry.test.ts tests/game-v2/systems/AbilityLoadoutSystem.test.ts --pool=forks --maxWorkers=1`
  reported `Test Files 2 failed` with both failures in module resolution.
- V2-100 GREEN verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (26 files, 533
  tests, up from 24 files and 498 tests at the MVP-0 gate), `npm run typecheck`,
  `npm run lint` (0 errors, 0 warnings), `npx prettier --check` on every changed
  path, `npm run check:architecture` (89 baseline singleton files),
  `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt),
  `npm run check:ui-contract`, `npm run check:event-contract`, `npm run build`,
  and `npx playwright test e2e/game-v2-walking-skeleton.spec.ts
  --project=chromium --workers=1 --reporter=list` (2 passed).
- `npm run test` reported 361 files and 3699 tests with zero failures. The
  `LandingPriceFeed` failure recorded at the MVP-0 gate did not reproduce, so it
  is flaky rather than permanently broken; it was not touched either way.
- A twelve-mutant deliberate pass ran against the loadout work and every mutant
  died: `add` picking the highest free slot, allowing a duplicate identity,
  replacing slot 0 when full, using the universal ceiling instead of
  `authoredTiers`, skipping the identity clear in `clearSlot`, omitting the tier
  from the hash, hashing the identity as a string, reading a constant tier in
  `WeaponSystem`, skipping `resetOwner` in `resetPlayer`, dropping the
  identity/tier pairing rule, dropping the component requirement, and skipping
  ability-index validation in the stride. No survivors, so no test needed
  strengthening this round.
- New decisions: V2-ADR-036 through V2-ADR-039.

### V2-101 — six-slot passive loadout (2026-08-22)

- The user accepted `V2-100`; it is closed at `677e1d24`.
- Six passive slots now exist as authoritative run state, separate from the four
  ability slots (V2-ADR-040). `game-v2/contracts/PassiveSlot.ts` holds
  `PASSIVE_SLOT_COUNT = 6`, `PASSIVE_MAX_LEVEL = 5`, the authored speed table,
  and `passiveStoreIndex`; `World.passiveSlotIndexOf` is its validating wrapper,
  mirroring the ability pair exactly.
- `PassiveLoadoutSystem` is the only writer. `addOrLevelUp` levels a held
  identity in place — never consuming a second slot — places a new one in the
  lowest free slot at level 1, refuses a seventh identity, and refuses to pass
  the identity's `authoredLevels`. `isOfferable` answers §5.3's offer rule: a
  held passive is offerable below its ceiling, a new one only while a slot is
  free.
- `move-speed` is the first identity, and all five of its levels are authored:
  `PASSIVE_MOVE_SPEED_BY_LEVEL` adds one twelfth of the 6.0 base per level, so
  level 5 is 8.5 and the escape margin over `ENEMY_MOVE_SPEED` widens from 3.8
  to 6.3. Every entry is exactly representable in Float32, so the derived speed
  adds no rounding to replay.
- `World.moveSpeed` was deleted (V2-ADR-041). It was already a dead store —
  nothing read or wrote it and `MovementSystem` used the constant directly — and
  speed is now derived from the passive level, so there is exactly one authority
  for it. `WORLD_SNAPSHOT_SCHEMA_VERSION` moved from `2` to `3`.
- The level-up card gained a second fixed choice (V2-ADR-042) so the passive has
  a real production path. It is still the MVP-0 card: paused, no reveal, no
  countdown, no timeout choice, no reroll or banish. `RunCommand.choiceId` is now
  a two-value union validated by `CommandRecorder`, so a replay cannot carry a
  choice the runtime cannot apply.
- The two choices produce genuinely different runs at MVP-0 balance, which is the
  clearest evidence the passive is live: the same scripted input dies at tick 789
  after taking the weapon tier and at tick 731 after taking the speed passive,
  because MVP-0's spawn cadence is tuned against the tier-2 kill period and
  speed alone cannot buy that back.
- State hashes moved again, as expected for a schema change: initial
  `8272f478` → `5e6a93e5`, weapon-choice run `b09663a6` → `5450dfff` at the same
  tick 789, and the new passive-choice run hashes `8bf087bf` at tick 731. No test
  pins these; they are compared against each other.
- V2-101 RED command:
  `npx vitest run tests/game-v2/config/PassiveRegistry.test.ts tests/game-v2/systems/PassiveLoadoutSystem.test.ts --pool=forks --maxWorkers=1`
  reported `Test Files 2 failed` with both failures in module resolution.
- V2-101 GREEN verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (28 files, 571
  tests, up from 26 files and 533 tests at V2-100), `npm run typecheck`,
  `npm run lint` (0 errors, 0 warnings), `npx prettier --write` over
  `game-v2`, `tests/game-v2`, and `docs/game-v2`, `npm run check:architecture`,
  `npm run check:reset-coverage`, `npm run check:ui-contract`, `npm run build`,
  `npm run test` (363 files, 3737 tests, zero failures), and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed). The e2e now also asserts the passive choice is offered.
- A fourteen-mutant deliberate pass ran. Twelve died immediately: highest-free
  slot, a held identity consuming a second slot, dropping the seventh-identity
  throw, dropping the level ceiling, `isOfferable` ignoring the ceiling, skipping
  the passive clear in `clearSlot`, omitting the level from the hash, ignoring
  the level in `MovementSystem`, accepting any `choiceId`, resolving the passive
  command as a weapon upgrade, and dropping either validator rule.
- Two mutants survived and both were fixed at the source rather than by adding a
  test that pins ceremony:
  - Deleting `MovementSystem.resetPlayer` changed nothing, because
    `World.clearSlot` and `World.reset` already guarantee a fresh slot carries no
    passive bytes. The method and its runtime call were removed; it looked like a
    guarantee while guaranteeing nothing. `WeaponSystem.resetPlayer` stays
    because it installs the starter ability rather than clearing state.
  - The overlay's `moveSpeedUpgradable && nextMoveSpeed !== undefined` guard
    could be weakened to `||` undetected, because the only tested hidden case was
    the ceiling, where both halves are false. A second case now covers the other
    reason the passive can be unofferable — no free slot — and both mutants die.
- New decisions: V2-ADR-040 through V2-ADR-042.

### Screen orientation fix (2026-08-22)

- The user ran the game and reported that `W` moved the player down. It did:
  `ThreeRenderBridge` wrote simulation `Y` straight into Three `Z`, while the
  top-down camera's `up = (0, 0, -1)` — which is what keeps `+X` on the right —
  puts `-Z` at the top of the screen. Simulation `+Y` therefore rendered
  downwards for every entity, not only the player.
- Fixed in presentation only, through one owner: `sceneZOf` in
  `game-v2/presentation/WorldToScene.ts` (V2-ADR-043). No authoritative value
  moved, so no state hash, recording, or replay changed — the suite's hash
  comparisons all still hold.
- The bug survived the whole MVP-0 gate because every presentation test asserted
  the mapping it was written against (`worldY === sceneZ`) rather than what a
  player sees. The regression test now projects two entities through the real
  camera and asserts the one at `+Y` lands higher on screen, which is a claim the
  old mapping cannot satisfy. A second camera test pins `+Y` up and `+X` right
  independently of the bridge.
- Verified: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (28 files,
  574 tests), `npm run typecheck`, `npm run lint` (0/0), `npm run build`,
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium`
  (2 passed), and a live check against the dev server: holding `W` for 800 ms
  moved the player `+4.9` on Y and holding `D` moved it `+3.7` on X.
- New decision: V2-ADR-043.

### V2-101 acceptance and branch push (2026-08-23)

- This branch had never been pushed to `origin`. Before resuming, two test files
  that the accepted V2-006/V2-008/V2-009 production code already imports —
  `tests/game-v2/presentation/RenderSnapshotValidator.test.ts` and
  `tests/game-v2/systems/StepContextValidator.test.ts` — were found untracked
  and never committed. They were staged alone (nothing else in the dirty working
  tree, including the unrelated delegate-orchestrator work and the known
  pre-existing files below) and committed as `64931408`.
- Re-verification: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
  passed 30 files and 606 tests, up from 28 files and 574 tests only by the two
  restored files; no regression.
- `codex/threejs-gameplay-v2` was pushed to `origin` for the first time and now
  tracks `origin/codex/threejs-gameplay-v2`.
- The user accepted `V2-101`; it is closed at `b7a5c07a`. The screen-orientation
  fix at `346c28b6` (V2-ADR-043) is independent presentation-only work, already
  closed, and not part of V2-101's scope.
- The `V2-102` task brief (three-tier ability schema) was generated at
  `docs/game-v2/tasks/V2-102-three-tier-ability-schema.md` per the `V2-101`
  Exact Next Action. It scopes typed per-identity Tier 2/Tier 3 effects,
  including the starter projectile's tier 3 that `authoredTiers` currently
  withholds, and explicitly excludes a universal damage/radius multiplier
  pipeline and the seven identities `V2-106`/`V2-107` still own. It proposes
  V2-ADR-044 through V2-ADR-046, recorded in `DECISIONS.md` when the task
  starts rather than now. Implementation has not started.

### V2-102 — three-tier ability schema (2026-08-23)

- V2-ADR-044 through V2-ADR-046 were recorded in `DECISIONS.md` as the task
  started. V2-ADR-044 was tightened while writing tests: the registry validates
  a `tierEffects` entry's own shape but does not cross-check its `ability` tag
  against the owning identity's id, because several existing test fixtures
  (`AbilityLoadoutSystem.test.ts`) hold local test identities that are not
  members of the real `AbilityIdentityId` union and would have no way to
  produce a matching tag.
- `game-v2/contracts/AbilityTierEffect.ts` is new: `AbilityTierEffect` is a
  discriminated union (today one member, `StarterProjectileTierEffect`) and
  `assertAbilityTierEffect` validates one entry through an exhaustive `switch`
  on its own `ability` tag. `AbilityDefinition.tierEffects` (`AbilitySlot.ts`)
  is `readonly AbilityTierEffect[]`, index `tier - 1`.
- `createAbilityRegistry` (`AbilityRegistry.ts`) now rejects a `tierEffects`
  array whose length does not equal `authoredTiers`, then validates and
  deep-freezes every entry through `assertAbilityTierEffect`.
  `STARTER_PROJECTILE.authoredTiers` moved from `2` to `3`; all three tiers are
  authored from `Mvp0Config.ts` constants (V2-ADR-045): Tier 2 raises damage to
  `STARTER_WEAPON_DAMAGE_TIER_2 = 15`, Tier 3 holds that damage and instead
  raises `projectileRadius` to `STARTER_PROJECTILE_RADIUS_TIER_3 = 0.3` (half
  of `ENEMY_RADIUS`) and lowers `cooldownTicks` to
  `STARTER_WEAPON_COOLDOWN_TICKS_TIER_3 = 20` (two thirds of
  `WEAPON_COOLDOWN_TICKS`). Worked kill periods are pinned at 90/60/40 ticks
  across the three tiers.
- `AbilityLoadoutSystem.tierEffectAt(world, owner, index)` is the new single
  lookup path from a held slot to its tier effect (V2-ADR-046): `null` for an
  empty slot, the matching `tierEffects` entry for a held one, and a thrown
  `'ability slot tier has no authored effect'` for a tier byte beyond what the
  identity authored — reachable only from a corrupted or hand-written
  checkpoint, since `advanceTier` never writes past `authoredTiers`.
- `WeaponSystem` no longer imports `PROJECTILE_RADIUS`, `WEAPON_COOLDOWN_TICKS`,
  or the deleted `STARTER_PROJECTILE_DAMAGE_BY_TIER` array. `step` and `fire`
  read damage, projectile radius, and cooldown from one
  `starterTierEffect(world, playerEntity)` call per tick, so the three values
  can never independently drift. The old `starter weapon tier has no authored
  damage` message is gone; the generic `AbilityLoadoutSystem` message replaces
  it, and the test that forged an out-of-range tier now forges `4` instead of
  `3`, since `3` is a legitimate tier today.
- Two existing tests assumed the old two-tier ceiling and needed updating for
  reality, not for V2-102's contract: `WeaponSystem.test.ts`'s
  `'advances the starter weapon exactly once and then refuses'` now advances
  twice before the expected throw, and
  `ProgressionSystem.test.ts`'s `'rejects a second upgrade application with
  RangeError'` (renamed `'rejects an upgrade application past the authored
  tier ceiling'`) now calls `advanceStarterTier` twice before the throw.
- V2-102 RED command:
  `npx vitest run tests/game-v2/config/AbilityRegistry.test.ts tests/game-v2/config/Mvp0Config.test.ts tests/game-v2/systems/AbilityLoadoutSystem.test.ts tests/game-v2/systems/WeaponSystem.test.ts --pool=forks --maxWorkers=1`
  failed on the two tier-ceiling tests above before the config/registry/system
  changes landed together (this task's contract and its production change were
  written as one pass rather than contract-then-implementation, since the
  registry validator, the new lookup method, and `WeaponSystem`'s read path are
  small enough to co-locate without an intermediate stub state).
- V2-102 GREEN verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (30 files, 619
  tests, up from 30 files and 606 tests at the V2-101 checkpoint — 13 net new
  tests after two existing tests were fixed for the new tier ceiling),
  `npm run typecheck`, focused ESLint and focused Prettier on every changed
  file (full `npm run lint` is blocked by unrelated parsing errors in the
  untracked `.delegate/runs/**` orchestrator artifacts, not part of this
  branch's Game V2 work), `npm run check:architecture` (89 baseline singleton
  files), `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt),
  `npm run check:ui-contract`, `npm run build`, `npm run test` (372 files, 3890
  tests, one pre-existing unrelated `LandingPriceFeed` flake — the same failure
  documented at the MVP-0 gate), and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed).
- A six-mutant deliberate pass ran against exactly the mutants the task brief's
  Step 6 named, each applied, run against its focused test file, and restored;
  sha256 confirmed byte-identical restoration of all five touched production
  files afterward. All six died: a weakened `tierEffects.length` check (1
  focused failure), an unrecognized tier-effect shape accepted instead of
  rejected (1), `tierEffectAt` always reading Tier 1 regardless of the held
  tier (6, across both `AbilityLoadoutSystem.test.ts` and
  `WeaponSystem.test.ts`), `fire` ignoring the held tier's projectile radius
  (1, caught by the new Tier 3 test), `step` ignoring the held tier's cooldown
  when re-arming (1, same test), and drifting either Tier 3 constant away from
  its derivation (1 each, caught by `Mvp0Config.test.ts`'s dedicated derivation
  and kill-period tests). No test needed strengthening.
- New decisions: V2-ADR-044 through V2-ADR-046.

### V2-102 acceptance (2026-08-23)

- The user accepted `V2-102`; it is closed at `22a00d14`.
- The `V2-103` task brief (dynamic ability HUD) was generated at
  `docs/game-v2/tasks/V2-103-dynamic-ability-hud.md` per `MASTER_PLAN.md`. It
  scopes exposing the four ability slots through `GameV2RuntimeReadout` and
  rendering them on the `/game-v2` HUD (occupied slots only, `1`–`4` binding
  or `AUTO`), explicitly through the existing imperative-DOM-ref HUD pattern
  rather than a second React-state-driven HUD subsystem, and excludes any
  change to loadout logic itself, the real card offer flow, and passive-slot
  display. It proposes V2-ADR-047 and V2-ADR-048, recorded in `DECISIONS.md`
  when the task starts rather than now. Implementation has not started.

### V2-103 — dynamic ability HUD (2026-08-23)

- V2-ADR-047 and V2-ADR-048 were recorded in `DECISIONS.md` as the task
  started.
- `GameV2RuntimeReadout` gains `abilitySlots: readonly (AbilitySlotReadout |
  null)[]` (`GameV2Debug.ts`), length `ABILITY_SLOT_COUNT`, `null` at an empty
  index. `GameV2Runtime` takes an `abilityLoadoutSystem` dependency and fills
  the array in `readout()` from `activationAt`/`tierAt`; `EMPTY_READOUT` gets a
  frozen all-`null` array. `createMvp0Runtime.ts` passes the exact
  `AbilityLoadoutSystem` instance already given to `WeaponSystem` (V2-ADR-047)
  — not a second one.
- `game-v2/ui/AbilitySlotLabel.ts` is new: `formatAbilitySlotBinding` derives
  `AUTO` or the `1`-based slot position from `activation`/`index` alone
  (V2-ADR-048), so the binding can never disagree with
  `AbilityLoadoutSystem`'s own slot order.
- `GameV2App.tsx` renders four fixed ability-slot `<span>`s (`hidden` by
  default in JSX) inside the existing `.game-v2-hud`, refreshed by the same
  `syncHud()` imperative-DOM-ref pass that already drives level/health/tick —
  no second, React-state-driven HUD subsystem. `syncHud()` sets `el.hidden`
  and `textContent` from `readout.abilitySlots[index]` each call.
- `tests/game-v2/runtime/GameV2RuntimeBounds.test.ts`'s hand-composed runtime
  needed an explicit `AbilityLoadoutSystem`, shared with its `WeaponSystem`,
  to satisfy the new required dependency — it previously relied on
  `WeaponSystem`'s private default instance, which the HUD reads have no path
  to.
- V2-103 RED command:
  `npx vitest run tests/game-v2/ui/AbilitySlotLabel.test.ts --pool=forks --maxWorkers=1`
  failed during module resolution before `AbilitySlotLabel.ts` existed; the
  three new readout tests in `Mvp0Runtime.test.ts` and the HUD assertions
  added to `GameV2App.test.tsx` were written and implementation landed
  together, mirroring V2-102's reasoning that this task's pieces (contract
  field, runtime dependency, composition wiring, pure formatter, HUD spans)
  are small enough to co-locate without an intermediate stub state.
- V2-103 GREEN verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (31 files, 624
  tests, up from 30 files and 619 tests at the V2-102 checkpoint), `npm run
  typecheck`, focused ESLint and focused Prettier on every changed file (full
  `npm run lint` is still blocked by the unrelated untracked
  `.delegate/runs/**` orchestrator artifacts), `npm run check:architecture`
  (89 baseline singleton files), `npm run check:reset-coverage` (89
  singletons: 29 wired, 60 exempt), `npm run check:ui-contract`, `npm run
  build`, `npm run test` (373 files, 3895 tests, the same pre-existing
  unrelated `LandingPriceFeed` flake documented at the MVP-0 gate), and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed) — the e2e spec now also asserts the starter weapon's `AUTO` label
  is visible and the other three slots hidden in a real browser session.
- A five-mutant deliberate pass ran against the task brief's Step 6 list, each
  applied, run against its focused test file, and restored; sha256 confirmed
  byte-identical restoration of all four touched production files afterward.
  Three died outright: `readAbilitySlots` always reporting a slot empty (3
  focused failures), an `active` binding computed from a constant instead of
  its own index (1), and an `auto` slot showing its index instead of `AUTO`
  (2, across the unit test and `GameV2App.test.tsx`).
- Two mutants survive by construction, recorded rather than hidden, matching
  the class of survivor V2-014 documented for the live-enemy cap. Neither
  `AbilityLoadoutSystem.remove` nor any other production path ever empties an
  occupied ability slot in MVP-1 — `V2-101`'s own finding that "nothing in
  §5.3 removes a passive" is equally true of §5.1's abilities today — so a
  slot the HUD is asked to hide is always already hidden by its JSX default,
  and removing the imperative `el.hidden = true` re-hide is unobservable by
  any reachable state. The fifth mutant, constructing a second
  `AbilityLoadoutSystem` in `createMvp0Runtime.ts` instead of sharing the one
  given to `WeaponSystem`, is semantically equivalent rather than merely
  unreached: the system holds no per-run state (V2-ADR-025) and both
  constructions use the same default registry, so two instances read the same
  `World` identically by construction — the brief's V2-ADR-047 rationale
  overstated this as a possible behavioral divergence when it is actually a
  single-authority style preference. Both stay in place: the re-hide as
  correct defense once `V2-310` (boss slot replacement) makes occupancy loss
  real, the shared instance as the simpler and still-correct choice.
- New decisions: V2-ADR-047 and V2-ADR-048.

### V2-104 — thirteen-second card flow (2026-08-23)

- V2-104 replaces the fixed two-hardcoded-choice level-up card with a real,
  RNG-selected offer of up to three candidates (ability tier-ups and passive
  level-ups), a real 13-second wall-clock card (4 s non-interactive reveal,
  8 s interactive choosing, last 5 s a visible countdown), and a real-time
  timeout that resolves through the same runtime path as a manual choice.
- `LevelUpOffer.ts` is new: `OFFER_CANDIDATE_COUNT = 3`, `OfferCandidateIndex`,
  and the `OfferCandidate` discriminated union. The offer is authoritative
  `World` state (V2-ADR-049) — two strided `Uint8Array` stores
  (`offerCandidateKind`, `offerCandidateCode`) plus one `offerDefaultIndex`,
  gated by a new `ComponentMask.LevelUpOffer` bit — so it survives a
  checkpoint restore and hashes identically between a live run and its replay.
- `LevelUpOfferSystem` is new and holds no per-run state (V2-ADR-025):
  `generateOffer` enumerates every offerable ability/passive identity via the
  registries' new `ids` getter and `AbilityLoadoutSystem.isOfferable` /
  `PassiveLoadoutSystem.isOfferable`, Fisher-Yates shuffles the pool with the
  run's `DeterministicRng`, and draws the RNG-seeded default index in the same
  call (V2-ADR-050) — resolution (`resolveIndex`, by click or by timeout)
  never consumes RNG again. `candidatesAt`, `defaultIndexOf`, and `clearOwner`
  round out the read/clear surface.
- `RunCommand.choiceId: RunUpgradeChoiceId` became
  `choiceIndex: 0 | 1 | 2` (V2-ADR-051); `CommandRecorder` validates only that
  it is one of those three integers via `isOfferCandidateIndex`.
- `ProgressionSystem.resolveUpgrade` validates the index against the current
  offer (`offerSystem.resolveIndex`, throws for empty/invalid) before
  recording the command, so an invalid choice can never reach the recorder or
  mutate the world. It applies an ability candidate through
  `AbilityLoadoutSystem.addOrAdvanceTier` or a passive candidate through
  `PassiveLoadoutSystem.addOrLevelUp`, then clears the offer and resumes the
  lifecycle. `ProgressionSystem` no longer depends on `WeaponSystem`
  (V2-ADR-053); its only prior use (`advanceStarterTier`) is now the generic
  `AbilityLoadoutSystem.addOrAdvanceTier` call.
- `GameV2Runtime.chooseUpgrade(choiceIndex)` threads the run's `rng` into
  `progressionSystem.step` for offer generation and exposes
  `readout().levelUpOffer`; `ReplayRunner` replays the recorded
  `choose-upgrade` command unchanged. `createMvp0Runtime.ts` wires the new
  `LevelUpOfferSystem` dependency.
- `LevelUpOverlay.tsx` was rewritten: a real interval (independent of the
  simulation clock, V2-ADR-054) drives reveal → choosing → countdown →
  timeout; click and `1`/`2`/`3` keys resolve through the same `onChoose`
  path a timeout uses; a manual choice cancels the pending timeout via a
  `resolvedRef` latch. `LevelUpOfferLabel.ts` renders a generic
  "kind: identity" label (V2-ADR-055) — `formatOfferCandidateLabel` — rather
  than per-ability effect copy.
- GREEN verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (32 files, 654
  tests, up from 31 files and 624 tests at the V2-103 checkpoint), `npm run
  typecheck`, `npm run check:architecture` (89 baseline singleton files),
  `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt), `npm
  run check:ui-contract`, `npm run build`, and focused ESLint/Prettier on
  every changed and new file (full `npm run lint` is still blocked by the
  same unrelated untracked `.delegate/runs/**` orchestrator artifacts
  documented at the V2-102/V2-103 checkpoints).
- The committed e2e spec (`e2e/game-v2-walking-skeleton.spec.ts`) still
  asserted the retired hardcoded "increase move speed" / "increase damage"
  button labels and failed on first run against the rewritten card. It was
  updated to assert the real offer's two MVP-1 candidates by their generic
  label (`/ability: starter-projectile/i`, `/passive: move-speed/i`) and to
  resolve by clicking the ability candidate, keeping the existing
  post-resolution assertions (`playerLevel === 2`,
  `weaponDamage === STARTER_WEAPON_DAMAGE_TIER_2`) meaningful. Re-run after
  the fix: `npx playwright test e2e/game-v2-walking-skeleton.spec.ts
  --project=chromium --workers=1 --reporter=list` (2 passed).
- A six-mutant deliberate pass ran against exactly the mutants the task
  brief's Step 6 named, each applied, run against its focused test file, and
  restored to its exact prior source afterward. Five died: `resolveUpgrade`
  recording before validating the index (1 focused failure, and with a less
  specific error message than the real validation path produces);
  `CommandRecorder` accepting an out-of-range `choiceIndex` (1, caught by
  `WorldSnapshot.test.ts`'s `'rejects wrong choice atomically'` row); the
  reveal window accepting keyboard input (1, the click path is separately
  blocked by the native `disabled` attribute so only the keydown assertion
  reaches the mutated branch); the countdown never becoming visible (1); and
  the real-time timeout both never firing (1) and firing more than once (1,
  a second mutant on the same guard, also caught).
- The sixth named mutant — offer generation consuming RNG at timeout instead
  of at generation time — survives by construction, not by an unreached
  branch: `GameV2Runtime.chooseUpgrade`, `ProgressionSystem.resolveUpgrade`,
  and `LevelUpOfferSystem.resolveIndex` take no `rng` parameter anywhere on
  the resolution path, so the mutation cannot be expressed without first
  changing a method signature. This is the structural guarantee V2-ADR-050
  describes, not an untested behavior.
- New decisions: V2-ADR-049 through V2-ADR-055 (recorded in `DECISIONS.md`).

### V2-104 review round 1

- An independent reviewer examined the uncommitted diff against HEAD
  (`357ef443`, the accepted `V2-103`) and the task brief's invariants. It
  returned "important findings" (high confidence): the core determinism
  mechanism (single RNG draw at generation, offer-as-`World`-state, dirty-slot
  reuse) was sound, but one real ordering bug and one real test-coverage gap
  existed, plus several Minor items.
- **Important, fixed:** `ProgressionSystem.step`'s level-up branch wrote
  `world.level`/`world.xp` *before* calling `this.offerSystem.generateOffer`,
  which throws when nothing is offerable. A throw there would have left the
  player's level and XP already advanced with no open offer, the lifecycle
  never paused, and `leveledUp` still `false` — a half-transitioned state the
  level-up branch could never retrigger, since the level check that guards it
  had already been satisfied and consumed. Unreachable at MVP-1 balance (only
  two identities, neither near its ceiling) but a live regression waiting for
  `V2-106`/`V2-107`/`V2-401`. Fixed by generating the offer first: `game-v2/systems/ProgressionSystem.ts`'s
  level-up branch now calls `generateOffer` before touching `world.level` or
  `world.xp`, so a throw leaves both fields at their pre-level-up values. A
  new regression test, `'leaves level and xp unchanged when nothing is
  offerable and the level-up throws'`, exhausts the real MVP-1 ability (to its
  tier ceiling) and passive (to its level ceiling) through `createHarness`'s
  actual loadout systems, then proves the thrown `step` leaves `level`, `xp`,
  and the lifecycle phase untouched.
- **Important, fixed:** the task brief's own Step 1 required proving "the
  validator rejects a kind/code mismatch and an out-of-range kind; the hash
  changes when any offer byte changes," but no such test existed — the
  offer-touching change in `WorldSnapshot.test.ts` was only the updated golden
  hash constant and the `CommandRecorder.choiceIndex` cases. The underlying
  `WorldStateValidator.validateLevelUpOffer` and `StateHasher.hashWorld` code
  was independently confirmed correct on inspection, but unguarded by
  regression tests, so a later silent removal of either check would not have
  been caught. `ALL_FIXTURE_COMPONENTS` gained `ComponentMask.LevelUpOffer`
  and both `writeComponentFixtureForward`/`Reverse` gained matching offer
  candidates (mirroring the existing ability/passive fixture fields); the
  hard-coded FNV-1a golden moved from `ac6979b1` to `e8776b68` as a direct,
  expected consequence (order-independence between the forward/reverse
  fixtures still holds — both produce the new value). New cases: `'offer
  kind'`, `'offer code'`, and `'offer default index'` in the "changes for
  generation, mask, cooldown, and every component-store family" hash test,
  and a new `'rejects level-up offer state that breaks its structural
  invariants'` test covering an unsupported kind, a kind without a code, a
  code without a kind, an offer candidate on an entity missing the
  `LevelUpOffer` component, and an offer on an empty world slot.
- **Minor, fixed defensively (not currently reachable):** `validateLevelUpOffer`
  and `LevelUpOfferSystem.defaultIndexOf` both checked only that
  `offerDefaultIndex` was inside `[0, OFFER_CANDIDATE_COUNT)`, never that the
  candidate at that specific index was occupied — a corrupted or hand-edited
  state with, say, only index 0 filled and `offerDefaultIndex = 2` would have
  passed validation and then thrown uncaught from `resolveIndex` at
  resolution time instead of failing at the validation boundary. No current
  code path can produce this divergence (`generateOffer` always writes a
  default inside its own occupied range; `clearOwner`/`clearSlot` reset both
  together), so this closes the gap defensively ahead of any future
  checkpoint-restore feature. `WorldStateValidator.validateLevelUpOffer` now
  tracks whether any candidate is occupied per slot and, if so, requires the
  stored default to point at an occupied one; `LevelUpOfferSystem.defaultIndexOf`
  gained the identical check. New tests: the two structural-invariant cases
  above (`'default index outside the offer'`, `'default index pointing at an
  empty candidate'`) and `LevelUpOfferSystem.test.ts`'s `'throws when the
  stored default index points at an empty candidate'`.
- **Minor, fixed:** `DECISIONS.md`'s V2-ADR-055 row stated the card shows
  "kind + identity + next tier/level," but the shipped
  `formatOfferCandidateLabel` only ever renders "kind: identity" —
  `OfferCandidate` carries no tier/level field, and `PROGRESS.md`'s own
  narrative and the `LevelUpOverlay.test.tsx` assertions already only checked
  kind+identity. Only the decision-log wording was wrong; corrected to match
  what shipped.
- **Minor, deliberately deferred:** `ProgressionSystem.step`'s `rng` parameter
  defaults to a disconnected fixed-seed `DeterministicRng(1)` rather than
  being required. The only production call site (`GameV2Runtime.ts`) always
  threads the real run RNG, so this isn't live, but a future second call site
  that forgot to pass `rng` would silently draw offers from the wrong stream
  instead of failing loudly. Not fixed this round: making it required would
  touch roughly 34 existing call sites in `ProgressionSystem.test.ts` for a
  defect with no current trigger; left as a follow-up rather than churn.
- **Minor, deliberately deferred:** `LevelUpOverlay`'s keydown-listener
  `useEffect` has no dependency array, so it tears down and re-registers on
  every render, including every 100 ms countdown tick while the card is open.
  Not a correctness issue — the closure is always fresh — just avoidable
  churn; left alone rather than restructuring the component's state around a
  ref for a non-functional nit.
- Review-fix verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (32 files, 657
  tests, up from 654 by the three new regression tests), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files), `npm run
  check:reset-coverage` (89 singletons: 29 wired, 60 exempt), `npm run
  check:ui-contract`, `npm run build`, focused ESLint/Prettier on every
  touched file, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed).
### V2-104 acceptance (2026-08-24)

- The user accepted `V2-104`; it is closed at `7116c729`. Staged and committed
  only the V2-104 changeset (40 files: the `game-v2/**`, `tests/game-v2/**`,
  `e2e/game-v2-walking-skeleton.spec.ts`, and `docs/game-v2/**` paths listed
  under Files in the task brief plus this checkpoint's own edits);
  the pre-existing unrelated working-tree changes listed under "Known
  Pre-existing Working-tree Changes" below were left untouched and remain
  uncommitted.
- `docs/game-v2/MASTER_PLAN.md`'s MVP-1 status line was updated to record
  `V2-103` accepted at `357ef443` and `V2-104` accepted at `7116c729`.
- The branch is not pushed past this commit; `origin/codex/threejs-gameplay-v2`
  is behind local `HEAD` by this commit until an explicit push.
- The `V2-105` task brief (reroll and banish) was generated at
  `docs/game-v2/tasks/V2-105-reroll-and-banish.md` per `MASTER_PLAN.md`. The
  design spec's entire treatment of the feature is one line (§5.4: "One
  reroll and one banish are available per run in the vertical slice."), so
  the brief's mechanics beyond that line are its own interpretation, recorded
  as proposed V2-ADR-056 through V2-ADR-061 for review rather than assumed
  silently: reroll regenerates the entire offer through the existing
  `generateOffer` RNG step; banish permanently excludes one *identity* (not
  just the shown card) and replaces only that card's own slot; both charges
  are persistent per-run state independent of the transient offer
  (V2-ADR-049); both actions consume RNG at their own recorded tick exactly
  like `choose-upgrade` already does, which does not weaken V2-ADR-050 (that
  ADR forbids RNG consumption at the real-time-driven *timeout* specifically,
  not at any explicit player-driven command). It scopes the World/replay
  layer, the offer mutation and resolution systems, runtime wiring, and two
  new presentation controls; it excludes keyboard shortcuts, granting more
  than one charge, and the remaining ability/passive identities
  (`V2-106`/`V2-107`/`V2-401`). Implementation has not started.

### V2-105 — reroll and banish (2026-08-24)

- V2-105 implemented all six proposed decisions from the task brief as
  written (V2-ADR-056 through V2-ADR-061, none revised during
  implementation): `World` gains four new per-run stores —
  `rerollCharges`, `banishCharges` (`Uint8Array`, `0`/`1`, gated by the
  existing `ComponentMask.LevelUpOffer` bit, no new bit added) and
  `bannedCandidateKind`/`bannedCandidateCode` (the single per-run ban,
  since only one banish is ever possible) — cleared by `clearSlot` on both
  the `destroyEntity` and `reset` paths. `WorldSnapshot`'s schema version
  moved 4 → 5; `WorldSnapshotWriter`, `WorldStateValidator` (two new
  validators, `validateOfferCharges` and `validateBanishState`, mirroring
  `validateLevelUpOffer`'s ownership-and-pairing shape), and `StateHasher`
  (four new per-slot hashed bytes, in the same fixed field order
  documented in `hashWorld`) were all extended to cover them.
- `RunCommand` became a three-member discriminated union:
  `choose-upgrade` (unchanged), `reroll-offer` (no `choiceIndex` field —
  a reroll replaces the whole offer, not one slot), and `banish-offer`
  (`choiceIndex` required). `ProgressionSystem.resolveUpgrade`'s parameter
  type was narrowed to `RunCommand & { type: 'choose-upgrade' }` so the
  union compiles without a runtime type guard at that call site.
- `CommandRecorder` previously rejected any two commands sharing a tick.
  That invariant had to relax: reroll, banish, and the eventual
  `choose-upgrade` can all legally land on the *same* tick, because no
  simulation tick advances while the lifecycle is paused for a level-up
  (V2-ADR-059). The new rule is narrower, not weaker: ticks must be
  non-decreasing across the whole recording, and the same command *type*
  may never repeat at the same tick (a second `choose-upgrade` at an
  already-resolved tick is exactly as invalid as before). `assertCommand`
  now validates `reroll-offer`'s absent `choiceIndex` and `banish-offer`'s
  present, range-checked one.
- `LevelUpOfferSystem` gained `rerollChargesOf`/`banishChargesOf` (read),
  and `reroll`/`banish` (validate-then-mutate, mirroring V2-104's
  `resolveUpgrade` order). Both share one extracted `offerablePool` helper
  that filters the run's single ban out of the same
  ability/passive-registry enumeration `generateOffer` already used, so
  a banned identity is excluded from every future `generateOffer` and
  `reroll` call, not just the offer open at ban time. `banish` replaces
  only the targeted slot from that filtered pool, tolerates an empty
  replacement pool (V2-ADR-061 — MVP-1's real content is exactly one
  ability and one passive identity, so banishing either can legally empty
  a slot), and redraws the default index only when it pointed at the
  banished slot.
- `ProgressionSystem.resetPlayer` now initializes both charges to `1` and
  clears any stale ban. New `rerollOffer`/`banishOffer` methods validate
  lifecycle phase and charge availability, record the command, then mutate
  — the same validate-record-mutate order `resolveUpgrade` already uses,
  so a rejected reroll/banish leaves nothing recorded or changed. One
  deviation from the brief's own interface stub, recorded rather than
  silently assumed: both methods take an explicit `rng: DeterministicRng`
  parameter (defaulted like `step`'s), because regenerating/redrawing an
  offer consumes RNG and `ProgressionSystem` owns no RNG instance of its
  own — the brief's interface listing omitted it.
- `GameV2Runtime` gained `rerollOffer()`/`banishOffer(choiceIndex)` (both
  phase-guarded, neither resumes the clock — the level-up stays paused so
  the player can still choose from the changed offer) and two new
  `readout()` fields, `rerollCharges`/`banishCharges`. `ReplayRunner`'s
  command-application loop changed from a `Map<tick, command>` (one
  command per tick) to a sequential cursor over `recording.commands`
  applying every command whose tick matches the current paused tick,
  dispatching on `type`, until a `choose-upgrade` resumes the run — this
  is what makes multiple same-tick commands replayable at all. The
  existing `'run recording is missing the upgrade command for paused
  tick'` and `'...never landed on a paused tick'` error messages and their
  tests were preserved unchanged.
- `LevelUpOverlay.tsx` gained a single "Reroll" control and one "Banish"
  control per occupied card, both reading the existing `revealing` boolean
  (V2-ADR-060 — no second timing rule) and hidden entirely (not merely
  disabled) once their charge reaches `0`. Neither handler touches
  `elapsedMs`/`TOTAL_MS`; `GameV2App.tsx` wires `rerollCharges`/
  `banishCharges` state and `onReroll`/`onBanish` callbacks that call the
  runtime and re-sync from `readout()`, mirroring the existing
  `handleChoose` pattern.
- `tests/game-v2/support/scriptedRun.ts` gained an optional
  `useRerollAndBanish` flag: when set, the scripted run rerolls, then
  banishes the offer slot that does *not* hold the kind it intends to
  choose (banishing the intended kind would make it permanently
  unofferable and break the very choice the script makes) before
  resolving — this is what let `ReplayRunner.test.ts` prove real
  cross-FPS determinism for both new command types together rather than
  asserting it from unit-level pieces alone.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (34 files,
  719 tests, up from the 32 files and 657 tests of the accepted V2-104
  checkpoint — two new files, `CommandRecorder.test.ts` and
  `GameV2RuntimeOffer.test.ts`), `npm run typecheck`, `npm run
  check:architecture` (89 baseline singleton files), `npm run
  check:reset-coverage` (89 singletons: 29 wired, 60 exempt), `npm run
  check:ui-contract`, focused ESLint (0 errors; one
  `prefer-optional-chain` warning in `ReplayRunner.ts` autofixed) and
  Prettier on every changed/new file, `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed — the pre-existing MVP-0 flow is unaffected since it never
  rerolls or banishes).
- The `WorldSnapshot.test.ts` hard-coded FNV-1a golden moved from
  `e8776b68` to `ccf580c0`, a direct, expected consequence of `hashWorld`
  now hashing four new per-slot bytes and the fixture gaining matching
  reroll/banish/ban fixture values; forward/reverse write-order
  independence still holds (both orders produce the new value).
- A deliberate mutation pass ran against every mutant the task brief's
  Step 6 named, each introduced, confirmed to fail its target test(s),
  then restored to its exact prior source and re-verified green (`git
  diff` confirmed zero residual production diff after the pass; a grep
  for the pass's own inline markers found none left behind). Kills:
  spending the reroll charge before validating offer-open (4 focused
  failures in `LevelUpOfferSystem.test.ts`); spending the banish charge
  before validating the index (5); `ProgressionSystem.rerollOffer`
  recording before validating lifecycle phase (2) and `banishOffer`
  recording before validating the index (1); disabling the ban filter in
  `offerablePool` so a banished identity reappears (3, across
  `LevelUpOfferSystem.test.ts` and `ProgressionSystem.test.ts`); the
  reveal window accepting a reroll click (2) and a banish click (2), each
  mutated at both the JSX `disabled` attribute and the handler's own
  guard simultaneously, since either alone left the other as a redundant
  defense that would have hidden the mutant; and `CommandRecorder`
  accepting an out-of-range `banish-offer` index or a `reroll-offer`
  carrying a stray `choiceIndex` (5).
- One mutant class needed a stronger test than first written. A reroll
  click that calls `setElapsedMs(0)` self-corrects within one
  `TICK_INTERVAL_MS` (100 ms), because `LevelUpOverlay`'s interval
  unconditionally recomputes `elapsedMs` from `Date.now() - startedAt`
  every tick — so an assertion that advances fake timers by a full
  interval before checking (the first version written) cannot observe a
  one-off reset at all; it passed whether or not the mutation was present.
  Replaced with a synchronous check of the rendered countdown text
  immediately after `fireEvent.click` (no further `advance()` call, so no
  interval tick has run yet) for both reroll and banish, which does kill
  the mutant. This is recorded as a real methodology defect this
  checkpoint found in its own first draft, not a defect in the shipped
  component.
- Implementation and tests are committed at `841160a2` (24 files: every
  `game-v2/**` and `tests/game-v2/**` path this task touched). The
  pre-existing unrelated working-tree changes listed under "Known
  Pre-existing Working-tree Changes" below were left untouched and remain
  uncommitted. The branch is not pushed past this commit.
- All five acceptance criteria in the task brief are met with evidence
  above: (1) one reroll and one banish per run, a further attempt at
  either throws and mutates nothing — proved by the charge-spent tests in
  `LevelUpOfferSystem.test.ts`/`ProgressionSystem.test.ts`/
  `GameV2RuntimeOffer.test.ts`; (2) cross-FPS replay determinism for both
  new command types together — proved by `ReplayRunner.test.ts`'s new
  scripted-reroll-and-banish scenario at 30/60/120 FPS; (3) neither
  control usable during reveal, neither changes the 13-second deadline —
  proved by `LevelUpOverlay.test.tsx`, including the synchronous
  countdown check; (4) a banished identity never reoffered, including by
  a later reroll — proved by the ban-filter tests in both system test
  files; (5) every Step 5 gate passes and the mutation pass has no
  survivor among the brief's named mutants — evidence above. `V2-105` is
  accepted.
- `V2-106` (three starting weapons) implemented per its task brief
  (`docs/game-v2/tasks/V2-106-three-starting-weapons.md`):
  - `AbilityDefinition` gained `startEligible: boolean`, validated as a real
    boolean by `createAbilityRegistry` (V2-ADR-062).
  - Two new start-eligible AUTO identities, `heavy-projectile` (cadence
    traded for burst: double `starter-projectile`'s Tier 1 damage and
    cooldown) and `rapid-projectile` (burst traded for cadence: half Tier 1
    damage and cooldown), each with three authored tiers and their own
    `AbilityTierEffect` union member, reusing `WeaponSystem`'s existing
    single-target auto-fire pipeline unchanged (V2-ADR-063). Both open at the
    identical Tier 1 damage-per-tick baseline as the starter weapon by
    construction, not by chance — pinned in `Mvp0Config.test.ts`.
  - `WeaponSystem.starterSlotIndex` now resolves the fixed autonomous slot
    (index 0) by occupancy rather than by a hardcoded
    `STARTER_PROJECTILE.id` lookup, so it fires whatever identity a
    production-constructed world holds there (V2-ADR-064). `resetPlayer`
    still assigns `starter-projectile` unconditionally; no starting-weapon
    selection screen exists (V2-ADR-065, out of scope, no task ID yet).
  - `MVP1_ABILITY_REGISTRY` grew from one identity to three. Because
    `LevelUpOfferSystem` already enumerates every registered identity
    generically (V2-ADR-065's stated rationale, confirmed by reading
    `LevelUpOfferSystem.ts`), both new identities became real mid-run offer
    candidates with no offer-system code change — this had real knock-on
    effects on tests, documented below.
  - Test coverage added/extended: `AbilityRegistry.test.ts` (startEligible
    validation, pairwise distinctness by code/tag/numeric tuning per tier),
    `Mvp0Config.test.ts` (derived-constant proofs, shared Tier 1 DPS
    baseline, tunnel-safety margins, decreasing kill-period sequences),
    `AbilityLoadoutSystem.test.ts` (full three-tier reachability for both
    new identities through the real `MVP1_ABILITY_REGISTRY`-backed system),
    `WeaponSystem.test.ts` (firing each new identity from a directly
    constructed world in slot 0, tier-by-tier, plus a starter-projectile
    non-regression check).
  - Knock-on test fixes required because the offerable ability pool grew
    from one to three: `ProgressionSystem.test.ts` (the "nothing offerable"
    exhaustion test now exhausts all three abilities, not just the starter;
    the reroll-candidate-count test now expects a full `OFFER_CANDIDATE_COUNT`
    instead of a stale hardcoded `2`; several tests that generically picked
    "the ability offer" now use a `starterDamageOf`-dependent assertion, so
    they exhaust `heavy-projectile`/`rapid-projectile` first via a new
    `excludeNonStarterAbilitiesFromOffer` test helper so the offer
    deterministically contains only the starter as an ability candidate) and
    `tests/game-v2/support/scriptedRun.ts` (the shared `SCENARIO_SEED`
    constant changed from `0x5eed` to `9` — still an arbitrary fixed seed,
    chosen so the default scripted run's first level-up offer naturally
    includes `starter-projectile`, the identity the player already holds, in
    both the plain path and the reroll+banish path; the old seed's random
    3-of-4 draw happened to exclude it, which broke `Mvp0Runtime.test.ts`
    and `ReplayRunner.test.ts` assertions that assume an "ability" offer
    upgrades the starter weapon specifically).
  - Verification: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
    (34 files, 742 tests, all green), full root `npx vitest run` (376 files,
    4013 tests, all green), `npm run typecheck`, `npm run check:architecture`,
    `npm run check:reset-coverage`, `npm run check:ui-contract`,
    `npm run check:event-contract`, `npm run check:director-manifest`,
    `npm run lint` (clean on every file this task touched; pre-existing
    `.delegate/` parsing errors are unrelated and untouched), `npm run
    format` (no changes needed), `npm run build`, and
    `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
    (2 passed).
  - Manual mutation spot-check: reverting `starterSlotIndex` to the old
    by-id lookup makes 4 of the new `WeaponSystem.test.ts` tests fail with
    `player holds no starter weapon`, confirming they are not vacuous;
    restoring the fix returns the suite to green.
  - Implementation and tests are committed at `ecd2f13f` (16 files: every
    `game-v2/**` and `tests/game-v2/**` path this task touched, plus the task
    brief and this checkpoint/decision-log/master-plan documentation). Staged
    content was verified file-by-file before committing; no unrelated
    pre-existing working-tree change was included. Pre-commit hooks
    (`eslint --fix`, `prettier --write`, `vitest related`, `check:ui-contract`)
    passed. `docs/game-v2/tasks/V2-106-three-starting-weapons.md` keeps its
    steps unchecked per this project's convention of leaving task briefs as
    the static plan record (see `V2-105`'s brief, which is also still
    unchecked despite being closed).
  - All five acceptance criteria in the task brief are met with evidence
    above: (1) `MVP1_ABILITY_REGISTRY` holds exactly three `startEligible:
    true` identities, pairwise distinct by code and by `AbilityTierEffect`
    shape, each with three authored tiers — proved by
    `AbilityRegistry.test.ts`; (2) each new identity's three-tier progression
    is provable end-to-end through `AbilityLoadoutSystem` exactly like
    `starter-projectile` — proved by the new production-registry describe
    block in `AbilityLoadoutSystem.test.ts`; (3) `WeaponSystem` fires
    correctly from any of the three identities in slot 0, not only the
    starter — proved by `WeaponSystem.test.ts`'s new describe block and the
    manual mutation spot-check; (4) no regression to existing
    starter-projectile/`resetPlayer`/MVP-0 e2e behavior — proved by the full
    green suite and e2e run; (5) every Step 4 gate passes with no mutation
    survivor among the brief's named mutants. `V2-106` is accepted.
- Scope decision for `V2-107`: the user chose a narrow "registry + loadout
  only" scope (over a medium option adding real active-ability input plus
  one new AUTO mechanic, and a full option building five distinct new
  mechanics), confirmed via `AskUserQuestion`. The task brief
  (`docs/game-v2/tasks/V2-107-initial-ability-set.md`) records this and the
  resulting preflight decisions (V2-ADR-066…V2-ADR-068).
- `V2-107` (initial ability set) implemented per its task brief:
  - `AbilityIdentityId` grew to eight members; `AbilityTierEffect` gained
    five new discriminated union members
    (`NeedleProjectileTierEffect`/`FlickerProjectileTierEffect`/`LanceProjectileTierEffect`/`CannonProjectileTierEffect`/`SiegeProjectileTierEffect`),
    all sharing the same validation rule as the existing three (factored
    into one `assertProjectileTierEffectFields` helper).
  - Five new mid-run-only `AbilityDefinition`s (`needle-projectile`,
    `flicker-projectile`, `lance-projectile`, `cannon-projectile`,
    `siege-projectile`), all `activation: 'auto'`, `startEligible: false`,
    reusing `WeaponSystem`'s unchanged single-target pipeline exactly as
    `heavy-projectile`/`rapid-projectile` already do (V2-ADR-063, extended
    by V2-ADR-066). Each is `starter-projectile`'s own Tier 1 damage and
    cooldown scaled by one multiplier `N` (`1/10`, `1/5`, `3/2`, `5/2`, `4`),
    so all eight identities open at the identical Tier 1 damage-per-tick
    baseline by construction — pinned once for all eight in
    `Mvp0Config.test.ts` rather than five independent bespoke proofs.
    `MVP1_ABILITY_REGISTRY` grew from three identities to the full eight
    design §6.1 specifies.
  - No `activation: 'active'` content was added (V2-ADR-067) and
    `WeaponSystem`/`resetPlayer`/`World.weaponCooldownTicksRemaining` are
    unchanged (V2-ADR-068) — both deliberate narrow-scope boundaries, not
    oversights. While scoping this task, a previously unstated latent risk
    surfaced and is now recorded in V2-ADR-068: because the offer system
    does not exclude a second `auto`-activation identity from being offered
    once one is already held, a player could already pick up e.g.
    `heavy-projectile` mid-run (a `V2-106` capability) and have it sit
    permanently un-fired in a non-zero slot. This was always latent in
    `V2-106`'s design (`weaponCooldownTicksRemaining` was already
    entity-scoped, not per-ability-slot), not introduced by `V2-107`, and is
    covered by the same deferral V2-ADR-064 already recorded.
  - Test coverage added: `AbilityRegistry.test.ts` (five new identities'
    registry content, plus a combined "all eight identities" describe block
    covering pairwise distinctness and the shared Tier 1 DPS-baseline
    invariant), `Mvp0Config.test.ts` (one parametrized block proving the
    single V2-ADR-066 formula for all five, rather than five bespoke
    blocks), `AbilityLoadoutSystem.test.ts` (a real four-ability-slot
    combination test drawing from the full eight-identity production
    registry — the actual "four-slot combination" proof `V2-100`'s own
    combination test could only give generically with five synthetic test
    identities), `WeaponSystem.test.ts` (parametrized firing proof for all
    five new identities, tier 1 through tier 3).
  - Ripple fixes from the offerable-ability pool growing from three to
    eight (same category as `V2-106`'s own ripple, compounded):
    - `ProgressionSystem.test.ts`: `excludeNonStarterAbilitiesFromOffer`
      changed from holding-and-maxing two identities to holding-and-maxing
      three, because with eight registered identities only filling *all
      four* ability slots (not merely holding two of them) closes the
      free-slot escape hatch `isOfferable` grants any un-held identity; the
      "nothing offerable" exhaustion test and the "empty choiceIndex"
      banish test needed the same fix; one test seeding an offer directly
      via `DeterministicRng(1)` needed the same exclusion helper so its
      passive assertion stays reachable regardless of RNG.
    - `tests/game-v2/support/scriptedRun.ts`: rather than continuing to hunt
      for a `SCENARIO_SEED` whose natural offer draw happens to contain
      specific identities (empirically no longer tractable — most seeds now
      miss the single passive identity entirely in a 3-of-9 draw), the
      fixture itself was made robust: a new exported
      `resolveOfferChoiceIndex(runtime, desiredKind)` prefers
      `starter-projectile` for the ability path and rerolls once
      (production-legitimate, consumes the real charge) if the preferred
      candidate is missing, and the "an ability upgrade happened" check is
      now a generic `abilitySlots` before/after diff instead of a hardcoded
      `weaponDamage === STARTER_WEAPON_DAMAGE_TIER_2` comparison. This is a
      permanent fix, not a seed re-pick: it stays correct as the registry
      keeps growing in later tasks. `Mvp0Runtime.test.ts`'s own
      `chooseAbilityUpgrade` helper (a separate live re-drive path, not a
      recorded-command replay) was changed to delegate to the same shared
      `resolveOfferChoiceIndex`, because two different offer-choice policies
      between a live run and a live re-drive of its own frames would
      consume RNG differently and desync entity-generation counts between
      them — this was caught by a real test failure
      (`replays an identical world after reset...` expected 17, got 13)
      before being fixed this way.
    - `ReplayRunner.test.ts`: the "replays a recorded passive choice" test's
      assumption that `commands[0]` is always `choose-upgrade` no longer
      holds when a reroll precedes it; fixed to find the `choose-upgrade`
      command generically.
    - `e2e/game-v2-walking-skeleton.spec.ts`: the fixed-seed (`12345`)
      browser test's assertion that both an ability and a passive candidate
      are simultaneously visible in the same offer no longer holds; the
      passive-specific assertion was dropped (starter-projectile's own
      visibility assertion, and the subsequent click/weaponDamage
      assertions, still hold for this seed).
  - Verification: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
    (34 files, 801 tests, all green), full root `npx vitest run` (376 files,
    4072 tests, all green), `npm run typecheck`, `npm run check:architecture`,
    `npm run check:reset-coverage`, `npm run check:ui-contract`,
    `npm run check:event-contract`, `npm run check:director-manifest`,
    `npm run lint` (clean on every file this task touched; pre-existing
    `.delegate/` parsing errors are unrelated and untouched), `npm run
    format` (no unwanted changes), `npm run build`, and
    `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
    (2 passed, after the offer-assertion fix above).
  - Manual mutation spot-checks: a duplicated ability code
    (`needle-projectile` mutated to code `1`, colliding with
    `starter-projectile`) is caught at module load by
    `createAbilityRegistry`'s duplicate-code guard; a non-integer Tier 3
    cooldown (`siege-projectile`'s formula mutated from `* 2/3` to `/ 7`) is
    caught at module load by `assertAbilityTierEffect`'s integer guard.
    Restoring both fixes returns the suite to green.
  - Implementation and tests are committed at `a43d8c1c` (17 files: every
    `game-v2/**` and `tests/game-v2/**` path this task touched, the e2e
    ripple fix, the task brief, and this checkpoint/decision-log/master-plan
    documentation). Staged content was verified file-by-file before
    committing; no unrelated pre-existing working-tree change was included.
    Pre-commit hooks (`eslint --fix`, `prettier --write`, `vitest related`,
    `check:ui-contract`) passed.
  - All five acceptance criteria in the task brief are met with evidence
    above: (1) `MVP1_ABILITY_REGISTRY` holds exactly eight identities, three
    `startEligible: true` and five `startEligible: false`, pairwise distinct
    by code and by `AbilityTierEffect` shape, each with three authored tiers
    — proved by `AbilityRegistry.test.ts`; (2) all four ability slots can be
    filled from the full eight, each independently advanced — proved by the
    new combination tests in `AbilityLoadoutSystem.test.ts`; (3)
    `WeaponSystem` fires correctly for each of the five new identities in
    slot 0 — proved by `WeaponSystem.test.ts`'s new describe block and the
    manual mutation spot-checks; (4) no regression to any V2-106-or-earlier
    behavior — proved by the full green suite, e2e run, and the
    entity-generation-desync fix; (5) every Step 5 gate passes with no
    mutation survivor among the brief's named mutants. `V2-107` is accepted.
- Scope decision for `V2-108`: the user chose stats-only archetype variety
  (over adding a genuinely new movement/behavior variant), confirmed via
  `AskUserQuestion`. The task brief
  (`docs/game-v2/tasks/V2-108-basic-enemy-composition.md`) records this and
  the resulting preflight decisions (V2-ADR-069…V2-ADR-071).
- `V2-108` (basic enemy composition) implemented per its task brief:
  - No per-entity "which archetype" store was added (V2-ADR-069): a new
    `game-v2/contracts/EnemyArchetype.ts` (`EnemyDefinition`,
    `assertEnemyDefinition`) and `game-v2/config/EnemyRegistry.ts` register
    three archetypes — `grunt` (the unchanged MVP-0 baseline, cost `2`),
    `swarmling` (half health/damage/xp, `1.5x` speed, `0.75x` radius, cost
    `1`), `brute` (`1.5x` health/damage/xp, `0.6x` speed, `1.25x` radius,
    cost `2` — an equal-cost sidegrade to `grunt`, not a strict upgrade).
    `EnemySystem.spawnEnemy` gained an optional `definition` parameter
    defaulting to `GRUNT_ENEMY`, so all ~27 existing call sites across
    `game-v2/**`/`tests/game-v2/**` are unaffected.
  - A new `game-v2/systems/EnemyComposer.ts` spends a per-interval budget
    greedily against the registry, allocation-free (writes into a
    caller-owned reused array). `MVP0_ENEMY_SPAWN_BUDGET` is fixed at
    `grunt`'s own cost (V2-ADR-070): a composition that draws `grunt` or
    `brute` reproduces today's exact one-enemy-per-interval cadence exactly,
    and a composition that draws `swarmling` spends the identical budget on
    two weaker enemies whose combined health and damage equal one `grunt`'s
    — MVP-0's calibrated balance stays intact while every archetype becomes
    individually reachable within one budget window.
  - `GameV2Runtime.spawnDueEnemy` now spends the budget through the composer
    each cadence tick instead of always spawning exactly one grunt, bounded
    by the existing free-slot/live-enemy caps — realizing the "two bounds…
    neither reachable from a gameplay test yet" limitation the method's own
    prior docstring already named.
  - Test coverage added: `EnemyArchetype.test.ts`, `EnemyRegistry.test.ts`
    (including `createEnemyRegistry`'s empty/duplicate/malformed rejection),
    `Mvp0Config.test.ts` (archetype derivation formulas, budget, pick
    bound), `EnemySystem.test.ts` (definition parameter, non-cross-
    contamination between two spawned archetypes), `EnemyComposer.test.ts`
    (budget-respect, determinism, reachability across a continuously-
    advancing RNG stream, narrowing once pricier archetypes stop fitting),
    and a new `tests/game-v2/integration/EnemyComposition.test.ts` proving
    live archetype diversity through the real production cadence via
    `runtime.checkpoint()` inspection — not just the composer/registry in
    isolation.
  - A genuine RNG-methodology finding from writing `EnemyComposer.test.ts`:
    this project's shared `DeterministicRng` (xorshift32) has a weak first
    draw for small sequential seeds immediately after construction —
    `new DeterministicRng(seed).nextInt(3)` returns `0` for every seed from
    `1` to at least `20`, because xorshift32's first iteration barely mixes
    a small seed's low bit count. Tests that reseed fresh per iteration with
    small sequential integers (an easy pattern to reach for) can therefore
    look like they exercise variety while actually always drawing the same
    outcome; the fix used here was a single continuously-advancing RNG
    across many draws, matching how the production spawn cadence actually
    reuses one stream. This is a pre-existing characteristic of the shared
    RNG, not something this task introduced or fixed — noted here as a
    reusable lesson for future test-writing against `DeterministicRng`, not
    an action item.
  - Ripple fixes from `EnemyComposer` consuming the shared RNG stream every
    spawn-cadence tick, even for a single-archetype outcome (V2-ADR-071):
    `SCENARIO_SEED` in `tests/game-v2/support/scriptedRun.ts` was re-picked
    (from `9` to `50`) and re-verified against the plain path, the passive
    path, the reroll+banish path, and (newly) the dash-prevented-damage
    health comparison in `Mvp0Runtime.test.ts`, which had never depended on
    offer content before but broke once enemy composition shifted contact
    timing for the old seed. `e2e/game-v2-walking-skeleton.spec.ts`'s fixed
    seeded-run URL was likewise re-picked (from `12345` to `50`) and
    re-verified against the real browser flow.
  - Verification: `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1`
    (38 files, 841 tests, all green), full root `npx vitest run` (380
    files; 4111/4112 tests green — the one failure,
    `tests/components/landing/LandingPriceFeed.test.tsx`, is a pre-existing,
    unrelated legacy landing-page test that fails identically in isolation
    on a clean checkout of this file, confirmed via `git diff --stat`
    showing zero changes to it or anything it imports), `npm run typecheck`,
    `npm run check:architecture`, `npm run check:reset-coverage`,
    `npm run check:ui-contract`, `npm run check:event-contract`,
    `npm run check:director-manifest`, `npm run lint` (clean on every file
    this task touched), `npm run format` (no unwanted changes), `npm run
    build`, and
    `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
    (2 passed, after the seed re-selection above).
  - Manual mutation spot-checks: widening `EnemyComposer`'s affordable-count
    check to ignore the remaining budget makes 7 of 10
    `EnemyComposer.test.ts` tests fail (the composer's own corrupt-pick
    guard fires, since the ordinal-selection loop and the affordable count
    go out of sync); reverting `GameV2Runtime.spawnDueEnemy` to always spawn
    the hardcoded grunt regardless of the composed batch makes the new
    diversity assertion in `EnemyComposition.test.ts` fail. Restoring both
    fixes returns the suite to green.
  - Implementation and tests are committed at `94a48e7a` (21 files: every
    `game-v2/**` and `tests/game-v2/**` path this task touched, the e2e
    ripple fix, the task brief, and this checkpoint/decision-log/master-plan
    documentation). Staged content was verified file-by-file before
    committing; no unrelated pre-existing working-tree change was included.
    Pre-commit hooks (`eslint --fix`, `prettier --write`, `vitest related`,
    `check:ui-contract`) passed.
  - All five acceptance criteria in the task brief are met with evidence
    above: (1) three archetypes registered, pairwise distinct, each a
    derived multiple of the unchanged grunt baseline — proved by
    `EnemyRegistry.test.ts`/`Mvp0Config.test.ts`; (2) every pre-`V2-108`
    `spawnEnemy` caller unaffected by the optional `definition` parameter —
    proved by the full existing `EnemySystem.test.ts` suite passing
    unchanged; (3) `EnemyComposer` never exceeds budget, is deterministic,
    and reaches every archetype — proved by `EnemyComposer.test.ts` and the
    manual mutation spot-check; (4) a live run provably spawns more than one
    distinct archetype bounded by the existing caps — proved by
    `EnemyComposition.test.ts` and its own mutation spot-check; (5) every
    Step 5 gate passes with no mutation survivor. `V2-108` is accepted.

- `V2-109` (market-independent Convergence): the task brief was written to
  `docs/game-v2/tasks/V2-109-market-independent-convergence.md` after the
  user confirmed three scope decisions in conversation — kill-only progress
  source, a signal-only threshold action (no boss/run-state transition,
  since no boss exists yet), and enforcing both the minimum and maximum
  envelope bounds. Four proposed decisions were recorded:
  `V2-ADR-072` (the 8-12 minute envelope and the existing Tier 1/Tier 2
  kill-period ratio both equal 1.5, so one derived kill-count target,
  `CONVERGENCE_KILLS_TO_THRESHOLD = 480`, satisfies both bounds exactly with
  no free parameter), `V2-ADR-073` (Convergence state lives directly on the
  player's `World` row, mirroring `xp`/`level`, not a new component or a
  second checkpoint authority), `V2-ADR-074` (the reached signal is
  `(tick >= MIN) && (convergence >= THRESHOLD || tick >= MAX)`, latched
  once true — the meter stays kill-only honest while the gate still gets an
  unconditional ceiling override), and `V2-ADR-075` (accrual uses
  `combatResult.killXp`, not a flat per-kill count, so `V2-108` composition
  variance cannot break the derived envelope).
- Step 1 added the four derived config constants to `Mvp0Config.ts`
  (`CONVERGENCE_MIN_CYCLE_TICKS = 28_800`, `CONVERGENCE_MAX_CYCLE_TICKS =
  43_200`, `CONVERGENCE_KILLS_TO_THRESHOLD = 480`, `CONVERGENCE_THRESHOLD =
  2400`). RED command
  `npx vitest run tests/game-v2/config/Mvp0Config.test.ts --pool=forks --maxWorkers=1`
  failed 4 of 53 with the constants undefined; GREEN passed 53/53.
- Step 2 bumped `WORLD_SNAPSHOT_SCHEMA_VERSION` from 5 to 6 and added
  `convergence: Float32Array` / `convergenceReached: Uint8Array` to `World`,
  `WorldSnapshot`, `WorldSnapshotWriter`, `WorldStateValidator` (a new
  `validateConvergenceState` pins the reached flag to `0`/`1`, with no
  component-ownership requirement per V2-ADR-073), and `StateHasher`. TypeScript's
  existing exhaustiveness check on `AUTHORITATIVE_WORLD_STORE_SCHEMA` caught
  every ripple point at compile time. The one golden-hash pin in
  `WorldSnapshot.test.ts` shifted from `ccf580c0` to `c72df511` (two new
  hashed per-slot bytes) and was recomputed and pinned, with a mutation-
  sensitivity case added per new field so a future no-op hash regression is
  caught. Full suite after this step: 39 files, 846 tests (1 pre-existing
  golden-hash assertion updated deliberately).
- Step 3 added `ConvergenceSystem` (`game-v2/systems/ConvergenceSystem.ts`)
  and `ConvergenceStepResult`. RED command
  `npx vitest run tests/game-v2/systems/ConvergenceSystem.test.ts --pool=forks --maxWorkers=1`
  failed on module resolution; GREEN passed 18/18, covering `resetPlayer`
  validation, XP-batch accumulation, multi-tick accrual, the lethal-tick
  exemption (mirroring `ProgressionSystem`'s V2-ADR-027 precedent), the
  min-tick floor at its exact boundary tick, the max-tick ceiling firing
  unconditionally even with convergence far below threshold, latch
  idempotency (no re-fire), scratch-object reuse, and malformed-input
  rejection (non-integer/negative/over-capacity `killCount`, non-finite XP,
  invalid context, missing `Player` component).
- Step 4 wired `ConvergenceSystem` into `GameV2Runtime`'s fixed tick order
  (after `ProgressionSystem.step`, reading the same `combat` result both
  already consume), added `resetPlayer` alongside the other four, added
  `convergenceProgress`/`convergenceReached` to `GameV2RuntimeReadout`, and
  wired construction in `createMvp0Runtime.ts`. Two existing runtime-fixture
  test files (`GameV2RuntimeBounds.test.ts`, `GameV2RuntimeOffer.test.ts`)
  needed a `convergenceSystem` dependency added, caught by `tsc`.
  `tests/game-v2/integration/ConvergenceEnvelope.test.ts` proves the
  envelope through the real production tick order, not just the isolated
  system: (1) a short real scripted run (`driveScriptedRun`) shows
  `convergenceProgress > 0` after a real kill; (2) that same short run's
  tick stays under the min-cycle floor with `convergenceReached` still
  false; (3) a dedicated production-path run survives the full
  `CONVERGENCE_MAX_CYCLE_TICKS` (43,200 ticks) and observes
  `convergenceReached` flip via the real tick order. The first survival
  policy tried (flee directly away from the nearest enemy every tick) died
  around tick 1,940-2,600 from encirclement — reacting only to the single
  nearest enemy can walk the player into a second one, and `readout()`
  exposes no other enemy positions to plan around. The policy that
  survives the full 43,200 ticks is a continuous slow-rotating drift
  (`PLAYER_MOVE_SPEED` exceeds every archetype's speed, so nothing spawned
  behind ever catches up) plus a defensive dash when something closes to
  `1.3` units, verified empirically the same way `SCENARIO_SEED` was
  (V2-108's own precedent). Full suite after this step: 40 files, 867 tests.
- Step 5 verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (40 files, 867
  tests), `npm run typecheck`, `npm run check:architecture` (89 baseline
  singleton files — `ConvergenceSystem` is constructed per-runtime, not a
  singleton, so no whitelist entry was needed), `npm run check:reset-coverage`
  (89 singletons: 29 wired, 60 exempt, unchanged), `npm run check:ui-contract`,
  `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed). Focused ESLint on every changed/new file: 0 errors, 0 warnings.
- Step 6 mutation pass: five mutants, each applied to the real
  `ConvergenceSystem.ts`, confirmed to fail the focused 18-test suite, then
  restored and reverified green. Dropping the min-tick AND-condition failed
  1 test; dropping the max-tick OR-condition failed 2; replacing the
  `killXp` summation with a flat per-kill increment failed 3; removing the
  lethal-tick early return failed 1; letting the latch re-fire after
  already being reached failed 1. The file was re-read after every restore
  to confirm it matched the pre-mutation implementation.
- An independent review (`/code-review high`, 8 parallel finder agents,
  ~19 minutes, 203k tokens, 324 tool calls) ran against the branch diff.
  Its scope was the whole branch rather than only the `V2-109` working-tree
  change, so most of its 10 findings are pre-existing debt in already-closed
  `V2-100`-`V2-108` work — none are defects in `ConvergenceSystem.ts`,
  `ConvergenceStepResult.ts`, the Convergence config constants,
  `GameV2Runtime`'s Convergence wiring, or the new test files. The one
  finding that touches a file `V2-109` extended (`StateHasher.ts`) is a
  structural observation, not a bug: `hashWorld` hand-lists every field with
  no compile-time exhaustiveness check the way `WorldStateValidator`'s
  `AssertNever` mechanism has, so a future field could be silently left out
  of the anti-cheat hash. `V2-109`'s own two fields are present and
  mutation-tested into the hash; the risk is about future drift, not this
  task's addition. The other 9 findings are logged for triage separately
  and are out of `V2-109`'s scope: a real unacknowledged duplicate-offer bug
  in `LevelUpOfferSystem.banish()` (and `WorldStateValidator` not catching
  the resulting duplicate state), `WeaponSystem`'s single-fixed-slot firing
  gap (already documented as V2-ADR-068), `ProgressionSystem`'s defaulted
  (rather than required) RNG parameters (already documented as deferred), a
  weakened `ReplayRunner.test.ts` assertion, a narrowed e2e smoke spec, an
  unread `AbilitySlot.startEligible` field, a double-scan inefficiency in
  `ProgressionSystem.step`, and `LevelUpOverlay`'s wall-clock timer
  (deliberate per V2-ADR-050, not an oversight).
- `V2-109` is accepted. The commit is `3dfd5f06` — 22 files, exactly the
  task's own set, staged deliberately to exclude every pre-existing
  unrelated working-tree change listed below. Pre-commit hooks (ESLint
  fix, Prettier, `vitest related --run`, `check:ui-contract`) all passed
  during the commit.

## Verification Required

1. Nothing from MVP-0 remains open. Every Critical and Important review finding
   is fixed, mutation-proved, and re-verified, and the three deferred findings
   are assigned to later blocks.
2. `V2-100` through `V2-104` are accepted and closed (`V2-104` at `7116c729`,
   current HEAD). Re-run the last GREEN command before touching code:
   `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (expect 32 files,
   657 tests),
   `npm run typecheck`, `npm run check:architecture`, `npm run check:reset-coverage`,
   `npm run check:ui-contract`, `npm run build`, and
   `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
   (expect 2 passed). All were last confirmed green on 2026-08-24, on HEAD
   `7116c729`.

## Known MVP-0 Limitations

- ~~One level-up exists per run~~ — closed by `V2-112`. The prediction that
  `V2-104` would resolve it was wrong: `V2-104` shipped and the cap stayed at
  `2`. `MVP1_MAX_PLAYER_LEVEL` is now derived and a fully capped build is
  reachable through play.

- XP pickups had no lifetime and no magnet, so they accumulated for the whole
  run with `MVP0_WORLD_CAPACITY = 512` as the only bound. Closed by `V2-112`
  (V2-ADR-083): pickups now expire after `XP_PICKUP_LIFETIME_TICKS = 180`.
  There is still no magnet.
- One runtime is one run identity, so the game-over restart replays the same
  seed. A different run needs a reload, which is correct for a `?seed=` session
  and a wart for an unseeded one.
- The `/game-v2` surface stays behind the V2 entry boundary. No production
  cutover was made and the legacy demo remains authoritative.

## Deferred Review Findings

Accepted as real, deliberately out of V2-014 scope, and carried forward:

- `RunRecording` carries no `finalHash`, so `ReplayRunner` is advisory rather
  than self-verifying: a recording with tampered frames replays "successfully"
  and only a caller holding the expected hash catches it. This matters when
  the artifact becomes the anti-cheat replay path, not before.
- `tests/game-v2/architecture/GameV2Boundary.test.ts` is a denylist of eight
  module paths, not a boundary. `game-v2/**` is currently clean by the much
  stronger standard of importing only `@/game-v2/**`, `react`, and `three`;
  inverting the guard to an allowlist would enforce the property it protects.
- Replay determinism holds within one engine but not provably across engines:
  `Math.hypot`, `Math.cos`, and `Math.sin` are implementation-approximated in
  ECMA-262. V2-407 wants a Node-versus-browser comparison, and `Math.hypot` is
  replaceable with an exactly-specified `Math.sqrt` form.

## Review-Finding Cleanup (post-V2-109, no task ID)

At the user's request, 6 of the 9 findings from `V2-109`'s `/code-review
high` pass (see that task's changelog entry) were fixed and TDD-verified in
one follow-up pass. Not a numbered V2-1xx task — pre-existing debt on
already-closed `V2-100`-`V2-108` work, fixed directly rather than briefed.

- **`LevelUpOfferSystem.banish()` duplicate-offer bug (real, confirmed).**
  The redraw pool excluded only the permanent per-run ban, not the
  identities already occupying the offer's other two untouched slots, so a
  banish could duplicate a sibling candidate in the same offer. Fixed by
  excluding sibling `(kind, code)` pairs from the redraw pool, keyed as
  `kind * 256 + code` (collision-free: `offerCandidateCode` is `Uint8Array`,
  0..255). A property-style test sweeping seeds first had to be fixed
  itself: small sequential seeds (1000-1029) all collapsed onto the same
  `DeterministicRng` draw because xorshift32 mixes a small seed weakly on
  its first output — real for any small seed, harmless for production (run
  seeds are large uint32 values), but it silently passed against the
  pre-fix code until seeds were spread across the full uint32 range via a
  multiplicative hash. RED confirmed against the reverted pre-fix code
  before the fix was restored.
- **`WorldStateValidator` didn't reject the duplicate-offer state above.**
  `validateLevelUpOffer` checked kind/code pairing, ownership, and the
  default index, but never pairwise distinctness. Added the same
  `kind * 256 + code` key check. RED confirmed against the reverted
  pre-fix validator.
- **`ProgressionSystem.step`/`rerollOffer`/`banishOffer`'s `rng` parameter
  now required, not defaulted to `new DeterministicRng(1)`.** Production
  already always passed the real RNG explicitly (`GameV2Runtime.ts`); the
  default was a latent footgun for any future second call site. ~46 test
  call sites across `ProgressionSystem.test.ts` needed an explicit
  `new DeterministicRng(1)` added — done with a small balanced-paren-aware
  Node script (deleted after use) rather than by hand, then formatted and
  typechecked.
- **`ReplayRunner.test.ts`'s passive-choice test strengthened.** The
  `choiceIndex` bounds check (`0..2`) was true by construction for any
  `OfferCandidateIndex` and proved nothing about which candidate replayed.
  Replaced with a captured-before-dispose readout assertion
  (`moveSpeedLevel === 1`, `moveSpeed === PASSIVE_MOVE_SPEED_BY_LEVEL[1]`)
  tied to the exact state the hash comparison is taken from.
- **`e2e/game-v2-walking-skeleton.spec.ts` reroll/banish coverage —
  partial, deliberately.** Added visibility/enabled assertions for the
  reroll button and every banish button on the level-up card (a real gap:
  nothing previously checked these controls render at all). Did not add a
  full click-through: rerolling or banishing regenerates the offer from
  the complete ability pool, which is not guaranteed to still contain
  `starter-projectile`, and every assertion for the rest of this scripted
  run depends on that specific identity. The actual reroll/banish *logic*
  is already exhaustively covered by `LevelUpOfferSystem.test.ts` and
  `ReplayRunner.test.ts`'s "replays a recorded reroll and banish" test — a
  smoke e2e spec re-proving business logic already proven elsewhere was
  judged not worth the added CI time (this file is the chromium smoke
  gate).
- **`ProgressionSystem.step`'s double `world.masks.length` scan for XP
  pickups collapsed to one, behavior-preserving.** The original scanned
  once to validate/sum existing pickups' overlap, then again to destroy
  them. Existing-pickup overlap is now recorded (slot index) during the
  validation scan into a reused `Uint16Array` sized `MAX_WORLD_CAPACITY`;
  newly-spawned kill pickups have overlap recomputed once right after
  creation (cheap — `killCount` is bounded by
  `COMBAT_KILL_BUFFER_CAPACITY`); one final small loop destroys exactly the
  recorded slots. The "validate everything before mutating anything"
  atomicity the original two-pass structure protected is preserved: kill
  validation still fully completes before any pickup is created, and
  pickup creation still fully completes before any destruction. A new
  combined test (existing leftover pickup + newly-spawned overlapping
  pickup destroyed in the same tick) was added and mutation-killed twice
  (recording disabled at each of the two record sites independently, both
  caught by existing plus the new test).
- **`StateHasher.ts` gained a compile-time-only exhaustiveness guard.**
  `hashWorld` is a hand-written function that must call the exact
  `hash.f32`/`hash.u8`/etc. method per field's real byte layout, so it
  cannot iterate `WorldSnapshot` generically the way
  `WorldStateValidator`'s schema-array validation does — a future field
  added to `WorldSnapshot` without a corresponding `hashWorld` line would
  compile cleanly and silently ship a field the anti-cheat replay hash
  never covers. `HASHED_WORLD_FIELDS` (exported, `as const satisfies
  ReadonlyArray<keyof WorldSnapshot>`) plus an `AssertNever`-based
  `HashedWorldFieldCoverage` type, mirroring `WorldStateValidator`'s own
  pattern, makes that a `tsc` error instead. Verified load-bearing by
  temporarily removing one field from the list and confirming `tsc` failed
  with the expected error, then restoring it.
- **Left alone, deliberately — each is an already-accepted decision, not a
  hidden defect, and "fixing" it means either reversing that decision or
  building a genuinely new deferred feature:** `WeaponSystem`'s
  single-fixed-slot autonomous firing (V2-ADR-068, no task ID assigned yet
  for generalizing it); `AbilitySlot.startEligible` having no reader today
  (V2-ADR-062, explicitly deferred until a starting-weapon-selection
  screen exists, itself deferred to MVP-4); `LevelUpOverlay`'s wall-clock
  `setInterval` timer (V2-ADR-050, deliberately outside simulation
  authority so RNG resolution never depends on real-time). Flagged to the
  user for an explicit decision rather than silently reversed or expanded.
- Full verification after all six fixes: `npx vitest run tests/game-v2
  --pool=forks --maxWorkers=1` (40 files, 869 tests, up from 867 by two new
  tests — the `LevelUpOfferSystem` duplicate-offer sweep and the
  `ProgressionSystem` combined-destroy regression test), `npm run
  typecheck`, `npm run check:architecture`, `npm run check:reset-coverage`,
  `npm run check:event-contract`, `npm run check:ui-contract`, focused
  ESLint on all nine changed files (0 errors, 2 warnings found and fixed —
  an unexported type-only-used `const` and one `prefer-optional-chain`
  suggestion), `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed). Committed as `374cec0e`, "fix(game-v2): close 6 code-review
  findings from V2-109 review pass" (current local `HEAD`, not yet pushed).
  Re-verified before commit: all six checks above rerun clean plus
  `npm run typecheck`, `npm run check:architecture`,
  `npm run check:reset-coverage`, `npm run check:ui-contract` all passing,
  and pre-commit hooks (ESLint fix, Prettier, `vitest related --run`,
  `check:ui-contract`) passed during the commit itself.

## V2-111 — Concurrent Autonomous Weapon Slots

Opened at the user's request after the three findings deliberately left
unfixed in the `374cec0e` cleanup were re-examined. Two of them stay
closed as correct decisions (`AbilitySlot.startEligible` is correct data
waiting on an MVP-4 UI per V2-ADR-062; `LevelUpOverlay`'s wall-clock timer
is the determinism guarantee of V2-ADR-050/V2-ADR-054, which moving it
into simulation time would break). The third turned out to be a live
player-facing defect and became this task.

- **The defect.** `WeaponSystem` fired ability slot `0` only
  (`AUTONOMOUS_WEAPON_SLOT_INDEX`) and owned one cooldown counter keyed by
  the player's *world* slot. All eight registered identities are
  `activation: 'auto'` and `AbilityLoadoutSystem.isOfferable` does not
  filter by activation, so any identity is offerable while a slot is free.
  `resetPlayer` always seats `starter-projectile` in slot `0`, so every
  other identity landed in slot `1`-`3` where nothing read it. With
  `MVP0_MAX_PLAYER_LEVEL = 2` there is one level-up per run, so that single
  pick is the player's whole build decision and seven of eight identities
  made it a no-op. V2-ADR-068 recorded this and assigned it no task ID.
- **The masked crash.** Fixing the firing model alone would have converted
  the silent dead pick into an in-frame throw.
  `MVP0_MAX_LIVE_PROJECTILES = 16` was derived for MVP-0's single 30-tick
  starter weapon (`ceil(90 / 30) + 1 = 4`, with headroom); `V2-107` then
  authored `needle-projectile` (fastest cadence `2` ticks, implying 46
  concurrent projectiles; even Tier 1's cadence `3` implies 31) without
  revisiting it. Only the single-slot defect kept those identities
  unreachable. `RenderSnapshotWriter` throws when `projectileCount >
  projectileCapacity` and the loop cancels itself on a throw (V2-ADR-035),
  so this is run-ending. The capacity re-derivation was therefore in scope.
- New decisions: V2-ADR-076 (per-ability-slot cooldown storage, schema
  `6 → 7`), V2-ADR-077 (every occupied `auto` slot fires in ascending slot
  order against one lazily resolved target), V2-ADR-078 (registry-derived
  `MVP1_MAX_LIVE_PROJECTILES`), V2-ADR-079 (whole-tick capacity guard).
- `MVP1_MAX_LIVE_PROJECTILES` lives in the new
  `game-v2/config/ProjectileCapacity.ts`, not in `Mvp0Config.ts`:
  `AbilityRegistry.ts` already imports its cadence constants from
  `Mvp0Config.ts`, so deriving it there would close an import cycle. Its
  value is `86` — `needle` 46 + `flicker` 24 + `rapid` 10 + `starter` 6,
  the four fastest authored cadences. Worst-case world use is
  `86 + 32 + 1 = 119` of `MVP0_WORLD_CAPACITY = 512`, pinned by a test.
- `weaponCooldownTicksRemaining` moved from `Uint16Array(capacity)` to
  `Uint16Array(capacity * ABILITY_SLOT_COUNT)` on the existing
  `abilityStoreIndex` stride, so no new stride rule exists.
  `WorldStateValidator` gained a `stridedUint16` group (covered by the same
  `AssertNever` exhaustiveness mechanism), `StateHasher.hashWorld` moved
  the field into its per-ability-slot loop, and the checkpoint golden
  shifted `c72df511 → 9760ebe8` — recomputed and re-pinned alongside an
  explicit `WORLD_SNAPSHOT_SCHEMA_VERSION === 7` assertion.
- `step` is now two passes with preallocated scratch: pass 1 advances each
  occupied `auto` slot's cadence and records which are ready, mutating
  nothing; the whole-tick `freeSlotCount >= readyCount` guard runs before
  the first `fire()`; pass 2 fires and re-arms. A `NOT_AN_AUTO_SLOT`
  sentinel keeps an empty or `active` slot from committing a stale scratch
  value left by an earlier tick.
- The slot-`0` guard was reframed rather than dropped: `step` now throws
  `player holds no autonomous weapon` when *no* slot holds one, so a
  missing `resetPlayer` still fails loudly (the defect class V2-012's
  review found in `CombatSystem`) while an empty slot `0` no longer
  silences a weapon held elsewhere.
- Two existing tests were passing for reasons the change invalidated, and
  both were fixed rather than adjusted around.
  `ProgressionSystem.test.ts`'s integration test parked heavy/rapid/needle
  in slots 1-3 at max tier to keep them out of the offer pool — which now
  makes them fire, so the enemy took 30 damage per tick instead of 10. The
  exclusion moved to an injected starter-only registry (V2-ADR-039's
  pattern), and `createHarness` gained an optional registry parameter.
  `WeaponSystem.test.ts`'s `resetPlayer` test wrote
  `weaponCooldownTicksRemaining[slot]` directly, which after the stride
  change lands in an arbitrary cell; it now seeds and asserts all four.
- **Mutation pass, 9 mutants, all killed** (failures against the full
  890-test Game V2 suite): fire only slot `0` 8; descending slot order 1;
  share one cooldown counter across slots 3; fire `active` slots too
  0 → **2 after strengthening**; per-fire instead of whole-tick capacity
  guard 2; clear only ability entry `0` in `clearSlot` 3; revert
  `MVP1_MAX_LIVE_PROJECTILES` to `16` 3; drop the `+ 1` from
  `concurrentProjectilesFor` 1; remove the `NOT_AN_AUTO_SLOT` sentinel
  0 → **1 after strengthening**.
- Two mutants survived the first pass and the tests were strengthened
  until they died, rather than being recorded as unreachable. The
  `activation !== 'auto'` filter is unreachable through the production
  registry because no identity is `active` today, so a new block injects an
  `active` identity (V2-ADR-039's pattern) and pins both that it never
  fires and that an all-`active` loadout throws. The scratch sentinel is
  unreachable with one player, so a new test steps two players through one
  `WeaponSystem` instance and proves the armed player's leftover cadence
  never writes into the starter-only player's empty slots. All three
  mutated production files were restored byte-identically, verified by
  sha256 against pre-mutation copies and by `git diff --stat`.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (42 files,
  890 tests, up from 869 by 21 new tests), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files),
  `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt),
  `npm run check:ui-contract`, focused ESLint on all 16 changed files
  (clean), focused Prettier (clean), `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed).
- `npm run lint` reports 6 errors, all of them
  `Parsing error: ... was not found by the project service` inside
  `.delegate/runs/**`. That directory is user-owned untracked orchestrator
  tooling listed below under known pre-existing working-tree changes; it
  was already present at the start of this session and no `V2-111` file is
  involved. Filtering `.delegate` out leaves zero lint problems.

## V2-112 — Repeating Level Curve

Opened after `V2-111`, when scoping `V2-110` (the MVP-1 evidence gate)
surfaced that its Done-When could not be met. Brief:
`docs/game-v2/tasks/V2-112-repeating-level-curve.md`.

- **The defect.** `ProgressionSystem.step`'s level-up branch was literally
  single-shot — `playerLevel === PLAYER_STARTING_LEVEL && nextPlayerXp >=
  LEVEL_2_XP_THRESHOLD`, with `MVP0_MAX_PLAYER_LEVEL = 2`. One pick per run
  means no build, so design §5.1's four-slot cap, §5.2's three-tier path, and
  §5.3's five-level passive path were reachable only through injected-registry
  contract tests (V2-ADR-039), never through play. MVP-1's stated goal is
  "prove that constrained builds create meaningful play", so `V2-110` would
  have certified a milestone whose central claim was unmet. `PROGRESS.md`
  predicted `V2-104` would resolve this; `V2-104` shipped and the cap stayed
  at `2`, so the prediction was wrong.
- The user chose to open this as its own task before `V2-110`, targeting a
  curve that lets a player fill their slots.
- New decisions: V2-ADR-080 (registry-derived level cap), V2-ADR-081 (one
  level-up per tick, surplus retained), V2-ADR-082 (computed `LEVEL_XP_STEP`),
  V2-ADR-083 (XP pickup lifetime).
- **Two brief assumptions were wrong, both caught by a failing test rather
  than review.** The brief derived 42 picks / level 43 / step 2 from
  `ABILITY_SLOT_COUNT * ABILITY_MAX_TIER + PASSIVE_SLOT_COUNT *
  PASSIVE_MAX_LEVEL`. In fact MVP-1 registers only **one** passive identity
  (`MOVE_SPEED_PASSIVE`; `V2-401` authors the other nine in MVP-4), so six
  empty passive slots contribute one slot's worth of picks — 25 phantom picks
  — and design §5.1 **grants** the starting weapon rather than offering it, so
  its Tier 1 costs no card — one more. Both overcounts made
  `LevelUpOfferSystem.generateOffer` throw `no offerable candidates exist`
  mid-run. The corrected derivation is keyed off live registry sizes:
  `min(4, 8) * 3 - 1 + min(6, 1) * 5 = 16` picks, `MVP1_MAX_PLAYER_LEVEL = 17`.
- `LEVEL_XP_STEP` is **computed**, not written down: the largest integer step
  for which a capped build costs no more than `CONVERGENCE_THRESHOLD`. Today
  that is `19` (2360 XP = 472 of the 480-kill Convergence baseline, so the
  build finishes just before the boss threshold arrives); `20` costs 2480 and
  overshoots. When `V2-401` lands the ten passives it re-derives itself to 41
  picks / level 42 / step 2 with no edit.
- The curve lives in the new `game-v2/config/LevelCurve.ts`, not
  `Mvp0Config.ts`: it reads the registries, which already import from that
  module, so deriving it there would close an import cycle — the same
  constraint `ProjectileCapacity.ts` solved the same way in `V2-111`.
- **A third gap surfaced and had to be closed here (V2-ADR-083).** With
  repeated level-ups the player kills far more, and XP pickups had no
  lifetime — `PROGRESS.md` already recorded this as MVP-1 work. Runs now got
  long enough to fill `MVP0_WORLD_CAPACITY = 512`, at which point
  `WeaponSystem` threw `entity capacity exhausted` mid-frame and ended the
  run. `XP_PICKUP_LIFETIME_TICKS` is derived as the time to cross the visible
  arena at base move speed (`18 / 6 = 3` seconds, 180 ticks): a pickup older
  than that was already unreachable from where the player stood when it
  dropped. `V2-112` could not land green without it, so it was folded in
  rather than deferred.
- `projectileLifetimeTicksRemaining` was renamed to `lifetimeTicksRemaining`
  and is now shared by projectiles and XP pickups. A rename changes no bytes,
  so `WORLD_SNAPSHOT_SCHEMA_VERSION` stays `7` and the checkpoint golden is
  untouched — deliberately chosen over adding a second store, which would have
  forced another schema bump and golden-hash churn.
- **A real determinism defect was found and fixed in the test harness.**
  `Mvp0Runtime.test.ts`'s re-drive helpers resolved every level-up with
  `resolveOfferChoiceIndex`, while `driveScriptedRun` uses that only for the
  first card and falls back to any candidate afterwards. Two policies consume
  RNG differently, so a re-drive desynced from the run whose frames it was
  replaying (replay stopped at tick 574 against a reference of 720). The
  file's own comment had warned about exactly this trap. Both now share one
  `createScriptedUpgradeChooser` carrying the same first/later split.
- Test ripples were re-pointed at the new contract, never weakened. The
  recorded-command count assertions moved from a magic `1`/`3` to
  `run.upgradesResolved` — strictly stronger, since they now also catch a card
  resolved without recording anything. `ReplayRunner`'s orphan-command test
  kept every real command and moved its orphan to the run's final tick (which
  ends in `game-over` and therefore never pauses), because "the run pauses
  exactly once" stopped being true.
- **Mutation pass, 9 mutants, all killed** (failures against the full 902-test
  suite): revert to the single-shot branch 3; drop the max-level guard 1;
  discard surplus XP 2; flat threshold 8; forget the granted starting weapon
  4; slot capacity instead of registry size 8; pickups never expire 1;
  collection and expiry recorded together 0 → **1 after strengthening**; no
  lifetime on spawn 5. The one survivor was a same-tick collect-and-expire
  double-free that no test reached; a new test pins that such a pickup is
  collected (XP kept) and destroyed exactly once, asserted via `activeCount`.
  All three mutated production files were restored byte-identically, verified
  by sha256.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (44 files, 902
  tests, up from 890 by 12 new tests), `npm run typecheck`,
  `npm run check:architecture`, `npm run check:reset-coverage`,
  `npm run check:event-contract`, `npm run check:ui-contract`,
  `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed). `npm run lint`'s only errors remain the pre-existing
  `.delegate/**` parsing errors described under `V2-111`.

## V2-110 — MVP-1 Evidence Gate

Brief: `docs/game-v2/tasks/V2-110-mvp1-evidence-gate.md`. Every MVP-1 LEGO
block (`V2-100`..`V2-109`, `V2-111`, `V2-112`) was already individually
accepted; this task is the master plan's own evidence gate (Operating Rule 4:
"a milestone closes only with a playable build and evidence"), not new
gameplay.

- **Two real evidence gaps, both surfaced while scoping this task.** Build
  diversity had been proven only through hand-assembled systems —
  `FullBuild.test.ts` (`V2-112`) drives `ProgressionSystem` directly with
  synthetic kill batches, and `ConcurrentWeapons.test.ts` (`V2-111`)
  hand-composes `CombatSystem`/`WeaponSystem`/`ProgressionSystem` in a bespoke
  loop — neither drives `GameV2Runtime`/`createMvp0Runtime` itself. And
  `e2e/game-v2-walking-skeleton.spec.ts` proved only the *first* level-up in a
  real browser, never a second, so `V2-112`'s repeating curve was unproven
  outside headless tests.
- New `tests/game-v2/integration/Mvp1CoreLoop.test.ts` drives the real
  production tick order with an empirically-tuned survival/collection policy
  (nearest-XP-pickup seeking, falling back to `ConvergenceEnvelope.test.ts`'s
  already-proven drift-and-defensive-dash survival policy when nothing is
  dropped) until `playerLevel === MVP1_MAX_PLAYER_LEVEL`. The scenario
  (seed `1110`) reaches the cap at tick `29815`; `FRAME_SAFETY_CAP = 45_000`
  is a documented ~1.5x safety net against a genuine stall, not a derived
  value. One canonical run is cached and shared across the build-diversity and
  replay assertions (mirroring `ReplayRunner.test.ts`'s own
  `buildScenarioRecording` cache), since the scenario itself takes several
  seconds; a fresh run drives the separate reset assertion.
- **A real ordering defect was found and fixed while writing this test, not
  assumed away.** The level counter advances the instant the XP threshold is
  crossed, at the same tick the run pauses for that level's card — so a
  cap check placed *before* the pending-offer resolution check exits one
  command short of `MVP1_TOTAL_BUILD_PICKS`, leaving the final ability/passive
  slot unresolved. This is a test-harness ordering bug, not a production
  defect: `ProgressionSystem`'s own contract (`V2-ADR-081`) is unaffected. RED
  reproduced it directly: `moveSpeedLevel` reached `4` instead of
  `PASSIVE_MAX_LEVEL = 5`, and `ReplayRunner.run` threw `run recording is
  missing the upgrade command for paused tick 29815`. The fix resolves any
  pending level-up offer before evaluating the cap-break condition. A
  deliberate mutation restoring the buggy order reproduced both failures
  exactly; restoring the fix returned the file to green.
- A second mutation check disabled the periodic live-projectile-damage
  sampling (`occupiedAbilitySlots >= 99` instead of `>= 2`) and confirmed
  `observedDistinctDamageSignatures.size` drops to `0`, failing the
  build-diversity assertion — proving that assertion is load-bearing rather
  than vacuously true.
- Concurrent-firing evidence reads `runtime.checkpoint().world` (a
  `WorldSnapshot`, already exposed for replay/hash purposes — no new runtime
  API was added) and filters live `Projectile`-masked slots by
  `ComponentMask`, mirroring `ConcurrentWeapons.test.ts`'s own
  `liveProjectileDamages` technique but applied to the real runtime's
  snapshot instead of a hand-built `World`. Sampling is throttled to every
  20th tick once at least two ability slots are occupied, since `checkpoint()`
  copies the whole world and the scenario runs ~30,000 ticks; unthrottled
  sampling made the file take ~66s instead of ~16s with no change in what the
  assertion proves.
- `e2e/game-v2-walking-skeleton.spec.ts`'s existing seeded-run test was
  extended (not forked into a second spec) to resolve a second level-up after
  the first, deliberately toward a *new* ability identity — the offer button
  is matched by `/^ability: (?!starter-projectile)/i` rather than any
  offerable candidate, so the resumed HUD genuinely gains a second occupied
  `game-v2-hud-ability-1` slot rather than only advancing the starter's tier.
  A production-legitimate reroll (the run's one unspent charge) is the
  fallback if the drawn offer happens to contain no non-starter ability
  candidate. A headless peek at the real production offer for the existing
  seed `50` confirmed the second offer already contains two non-starter
  ability candidates (`cannon-projectile`, `flicker-projectile`) alongside the
  passive, so the reroll fallback path is not expected to fire for this seed,
  but is real production behavior rather than a theoretical guard.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (45 files, 905
  tests, up from 44 files/902 tests by exactly the three new
  `Mvp1CoreLoop.test.ts` tests), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files — nothing new was
  added), `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt,
  unchanged), `npm run check:ui-contract`, `npm run check:event-contract`,
  focused ESLint on every changed file (one `no-unnecessary-condition`
  warning found and fixed — an unnecessary optional-chain on an
  already-non-null value), focused Prettier (clean), `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed, the extended seeded-run test included).
- No `game-v2/**` production file was modified: every gap this task closed
  was a test/evidence gap, not a gameplay defect, matching the brief's scope
  decision.
- All six acceptance criteria in the task brief are met with the evidence
  above: (1) a real `GameV2Runtime` run reaches a fully capped build through
  play; (2) two-or-more distinct AUTO identities are proven firing
  concurrently within that run via the live-projectile-damage sampling; (3)
  the full-build recording replays to the identical final state hash
  (`ReplayRunner.run(recording, 60).finalHash === runtime.snapshotHash()`);
  (4) a reset after a full-build run leaves no residual ability, passive,
  offer, or Convergence state (`readout()` matches `EMPTY_READOUT` exactly);
  (5) a real browser session reaches a second level-up and a second HUD
  ability slot becomes visible; (6) every Step 5 gate passes and both
  mutation checks confirm their assertions are load-bearing. `V2-110` is
  accepted, closing MVP-1.

## V2-200 — Canonical Market Snapshot

Brief: `docs/game-v2/tasks/V2-200-canonical-market-snapshot.md`. First MVP-2
task, opened after `V2-110`.

- **A real infrastructure constraint was checked before scoping, not
  assumed.** The master plan's Done-When read "BTC/ETH/SOL normalize to one
  finite, versioned contract," but `services/market/SSEMarketService.ts` and
  every service under `railway-market-aggregator/src/` are single-asset
  (BTC) today — no `asset`/`symbol` parameter exists anywhere in the
  Binance/Coinbase subscriptions, indicator calculation, or SSE payload
  shape. Building real ETH/SOL live streams is a separate
  `railway-market-aggregator` change (new WS subscriptions, new indicator
  instances, a new payload shape, a separate deploy), not a client-side Game
  V2 task. Put to the user directly via `AskUserQuestion`; chosen: **BTC
  only**, reusing `SSEMarketService` unchanged. ETH/SOL is deferred to an
  unassigned follow-up task that first extends `railway-market-aggregator`.
  New decision: `V2-ADR-084`.
- `game-v2/contracts/MarketSnapshot.ts` adds the frozen, versioned
  `MarketSnapshot` contract (`MARKET_SNAPSHOT_SCHEMA_VERSION = 1`):
  `MarketAsset` (`'BTC'` today), `RsiState`
  (`'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT'`, matching
  `railway-market-aggregator`'s `RSICalculator`), `TrendDirection`
  (`'UP' | 'DOWN' | 'NEUTRAL'`, matching `indicatorService.ts`'s own
  server-side derivation), `WhaleTier` (`0 | 1 | 2 | 3`, matching
  `VolumeAnalyzer`), and the snapshot fields themselves. It deliberately
  excludes every legacy gameplay-multiplier field `SSEMarketUpdate` carries
  (`spawnRateMultiplier`, `enemyAggroMultiplierLong`,
  `enemyAggroMultiplierShort`) — design §7.1: "old frontend gameplay
  multipliers, difficulty services, and Director ownership are not reused."
  New decision: `V2-ADR-085`.
- `game-v2/market/MarketFeedSource.ts` declares the raw `MarketFeedUpdate`
  shape and the injected `MarketFeedSource` port
  (`connect(onUpdate)`/`disconnect()`), mirroring the existing
  `RendererPort`/`IntentSource` pattern. `game-v2/market/MarketSnapshotAdapter.ts`
  adds the pure `normalizeMarketUpdate(update, asset)` — returns `null`
  rather than throwing on any field that cannot be represented validly — and
  the `MarketSnapshotAdapter` class (`start()`/`stop()`/`latest()`/
  `subscribe()`) that drives a `MarketFeedSource`, publishes normalized
  snapshots, and silently keeps the last known valid snapshot when a raw
  update is rejected. New decision: `V2-ADR-086` — every other Game V2
  validator (`WorldStateValidator`, `assertEnemyDefinition`,
  `assertAbilityTierEffect`) throws on invalid input because invalid
  internal state is a defect that must not run; a live external feed is
  different, and one malformed SSE payload is an expected, recoverable
  condition (design §7.5's "existing market effects transition to
  neutral"), not a broken invariant.
- `game-v2/market/BtcMarketFeedSource.ts` is the single production wrapper —
  `createBtcMarketFeedSource(): MarketFeedSource` — and the only file under
  `game-v2/**` importing `SSEMarketService`/`types/crypto`, confirmed via a
  direct `grep` sweep of `game-v2/**` rather than assumed.
- `TrendDirection` normalizes the client-side synthetic-fallback's
  inconsistent `'SIDEWAYS'` spelling (a pre-existing legacy quirk:
  `SSEMarketService.emitSyntheticUpdate` uses `'SIDEWAYS'` while the real
  server path in `indicatorService.ts` only ever emits `'UP'`/`'DOWN'`/
  `'NEUTRAL'`) to `'NEUTRAL'`, rather than propagating a fourth enum member
  for the same concept. New decision: `V2-ADR-087`.
- Test coverage: `tests/game-v2/market/MarketSnapshotAdapter.test.ts` (28
  tests — one valid-input case, `isSynthetic` defaulting, the
  `'SIDEWAYS'` → `'NEUTRAL'` normalization, one independent rejection case
  per invalid field via a parametrized `it.each`, and the adapter's
  publish/keep-last-valid/unsubscribe/stop behavior against a fake injected
  `MarketFeedSource`) and `tests/game-v2/market/BtcMarketFeedSource.test.ts`
  (3 tests — the wrapper delegates to a mocked `SSEMarketService`
  correctly; `SSEMarketService`'s own reconnect/fallback/data-gap behavior
  is already covered by `tests/services/market/SSEMarketService.test.ts` and
  not re-tested here).
- Mutation spot-check: temporarily removing the `price` finite/positive
  check from `normalizeMarketUpdate` failed exactly the 3 price-rejection
  `it.each` rows plus the adapter's keep-last-valid-snapshot test (4 of 28),
  with every other test unaffected — confirming each field's rejection
  branch is independently proven rather than incidentally covered.
  Production restored byte-identically and reverified green.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (47 files, 936
  tests, up from 45 files/905 tests by exactly the two new market test
  files), `npx vitest run tests/services/market/SSEMarketService.test.ts --pool=forks --maxWorkers=1`
  (26 tests, unaffected), `npm run typecheck`, `npm run check:architecture`
  (89 baseline singleton files — `MarketSnapshotAdapter` is constructed
  per-caller, not a singleton, so no whitelist entry was needed),
  `npm run check:reset-coverage` (89 singletons: 29 wired, 60 exempt,
  unchanged — nothing in this task is wired into `GameV2Runtime`'s reset
  path, matching the brief's explicit out-of-scope), `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all six changed/new
  files (clean), focused Prettier (clean), and `npm run build`.
- All six acceptance criteria in the task brief are met with the evidence
  above: (1) `MarketSnapshot` is frozen, versioned, and every field is
  validated before construction; (2) `normalizeMarketUpdate` rejects
  invalid input by returning `null`, proven per field; (3) `MarketSnapshot`
  excludes every legacy gameplay-multiplier field; (4) exactly one file
  (`BtcMarketFeedSource.ts`) imports `SSEMarketService`/`types/crypto`,
  confirmed by `grep`; (5) no `game-v2/systems/**`/`game-v2/runtime/**` file
  imports `game-v2/market/**` or `MarketSnapshot`, confirmed by `grep`; (6)
  every Step 5 gate passes and the mutation check confirms load-bearing
  assertions. `V2-200` is accepted.

## V2-201 — Locked Position Context

Brief: `docs/game-v2/tasks/V2-201-locked-position-context.md`.

- **Scoping surfaced that the legacy game already has this UI.** The user
  pointed out `components/screens/MainMenu.tsx` already has a full
  BTC/ETH/SOL selector, LONG/SHORT buttons, `LEVERAGE_OPTIONS`, and a live
  `price` prop — `/game-v2` has none of that and starts a run immediately on
  mount. Rather than deferring the selection step again behind an invisible
  URL-param contract (the initially-proposed narrow scope), the task became:
  build a real Game V2-owned selection screen now, reusing the established
  UX idea (not the legacy component, which is tied to legacy state
  `game-v2/**` may not import). Confirmed via `AskUserQuestion`.
- Two further scope boundaries decided while writing the brief: BTC only
  (matching `V2-200`'s own `V2-ADR-084`), and `PositionContext` is **not**
  threaded into `RuntimeCheckpoint`/the replay hash in this task
  (`V2-ADR-089`) — nothing reads it for a gameplay effect yet (`V2-202`'s
  job), so hashing it now would ripple every existing golden hash in the
  Game V2 suite for a field with no consumer, mirroring the
  `WORLD_SNAPSHOT_SCHEMA_VERSION` ripple `V2-109`/`V2-111` each caused.
  `V2-202` picks this up alongside its own hash ripple.
- `game-v2/contracts/PositionContext.ts`: `PositionSide`, `LeverageMode`
  (`1 | 5 | 10 | 25 | 50`, `LEVERAGE_MODES`), the frozen `PositionContext`
  type, `createPositionContext` (throws on invalid input — unlike `V2-200`'s
  `normalizeMarketUpdate`, this is fed by already-validated UI state, not
  parsed external bytes, so invalid input here is a real internal defect,
  `V2-ADR-091`), and `UNSPECIFIED_POSITION_CONTEXT` (a deliberately
  non-price-shaped placeholder, `entryPrice: 1`, for headless/test
  composition that never locked a real position). `createPositionContext`
  takes a loosely-typed `PositionContextInput` (`side: string`,
  `leverage: number`) rather than the exact narrow union, mirroring
  `assertEnemyDefinition`'s `unknown`-input pattern — otherwise `tsc` flags
  the runtime guards as "always false" against the already-narrow type.
- `game-v2/runtime/GameV2Runtime.ts`: `GameV2RuntimeDependencies` gains a
  required `positionContext`; the class exposes `public get
  positionContext()`, mirroring the existing `runIdentity` getter exactly —
  not part of `GameV2RuntimeReadout`/`checkpoint()` (see the hash-deferral
  decision above). `game-v2/runtime/createMvp0Runtime.ts`:
  `Mvp0RuntimeOptions.positionContext` is optional, defaulting to
  `UNSPECIFIED_POSITION_CONTEXT` — the *only* place the default applies, so
  `GameV2RuntimeDependencies` itself stays non-optional (no silent default
  at the lowest layer) while every pre-existing headless/test call site
  (`ReplayRunner.ts`'s default factory, `scriptedRun.ts`, every integration
  test) needed zero changes. Only two test files construct
  `new GameV2Runtime({...})` directly, bypassing that default layer —
  `GameV2RuntimeBounds.test.ts`/`GameV2RuntimeOffer.test.ts` each gained one
  line (`positionContext: UNSPECIFIED_POSITION_CONTEXT`).
- `game-v2/ui/PositionSelectScreen.tsx`: the new screen. BTC-fixed asset
  display, LONG/SHORT toggle, five leverage buttons, live price (or a
  "Connecting to market…" state), a Start button disabled until a price
  exists — inventing a placeholder price a player could mistake for real
  data would defeat the point of locking a genuine entry price. Mirrors
  `LevelUpOverlay.tsx`'s conventions exactly (`data-testid` everywhere,
  `role="dialog"`/`aria-*`, plain semantic HTML, reused `level-up-*` CSS
  classes for the dialog chrome plus new `position-select-*` classes for
  the controls).
- `game-v2/GameV2App.tsx` restructured into two stages. `'select'`: a new
  effect drives a `MarketSnapshotAdapter` (injectable via a new
  `createMarketFeedSource` prop, mirroring the existing `createRenderer`
  prop) for the live price; no runtime exists yet. `'run'`: today's
  existing canvas/HUD/level-up/game-over tree, now constructed with the
  locked `PositionContext`. Restart-after-death disposes the runtime
  (via the effect's own cleanup, triggered by the `appStage` change — no
  explicit `dispose()` call needed in the handler) and returns to
  `'select'` rather than calling `runtime.reset()`/`runtime.start()` on the
  same instance — each run locks its own fresh position (`V2-ADR-088`). A
  `?entryPrice=<number>` URL override (`resolveEntryPriceOverride`, added
  next to `resolveRunIdentity` in `createMvp0Runtime.ts` rather than in the
  component file, which avoids an unrelated `react-refresh/only-export-components`
  lint warning) unblocks Start without a live connection — confirmed by
  reading `SSEMarketService.getMarketBaseUrl()`, which resolves to the same
  origin in dev mode, so the Vite-only e2e/dev harness this project's e2e
  conventions already establish cannot reach a real SSE stream
  (`V2-ADR-090`).
- Test coverage: `PositionContext.test.ts` (10 tests — valid input; one
  rejection per invalid field; every documented leverage mode accepted;
  `UNSPECIFIED_POSITION_CONTEXT` itself validates through the real
  constructor rather than being a hand-written literal);
  `PositionSelectScreen.test.tsx` (5 tests — BTC shown, connecting state,
  live price display, side/leverage toggling, `onStart` called with the
  current selection, all five leverage options render);
  `GameV2App.test.tsx`'s existing tests updated to click through the
  selection screen first (a new `startRun()` helper), plus a new test
  asserting the position-select screen shows before any run and a new test
  asserting the selected side/leverage/live-price reach the locked runtime
  position. A dedicated `GameV2AppRestart.test.tsx` (new file, not added to
  `GameV2App.test.tsx`) mocks `createMvp0Runtime` to start already
  `game-over` — reaching a real game-over takes hundreds of combat ticks
  (impractical in jsdom, and `vi.mock` is module-wide, which would have
  broken every other `GameV2App.test.tsx` test using the real runtime) —
  and proves restart returns to selection, resets the side/leverage
  defaults, and locks a genuinely new `PositionContext` (not the same
  object, a different entry price) on the next Start.
- `Mvp0Runtime.test.ts` gained one test proving the `positionContext` getter
  returns exactly what was constructed, and that it defaults to
  `UNSPECIFIED_POSITION_CONTEXT` when omitted.
- **A real defect was found and fixed while adapting the existing
  StrictMode double-mount test.** Its old assertion (`probe.created === 2`)
  assumed the runtime is created during the tree's *initial* commit, which
  React 19 StrictMode double-invokes. Since the runtime is now created by a
  *later* state transition (Start clicked, `appStage` flips to `'run'`),
  StrictMode does not double-invoke that effect — only the `'select'`
  stage's market-feed effect runs during the initial commit. The test was
  corrected (`probe.created === 1`, `probe.disposed === 0` before unmount)
  rather than the assumption being carried over silently; this is expected,
  correct React behavior, not a regression.
- Mutation spot-checks, each restored and reverified green: removing
  `createPositionContext`'s `side` validation failed exactly the 1
  dedicated `rejects invalid side` test; removing `PositionSelectScreen`'s
  `disabled={livePrice === null}` gate failed exactly the connecting-state
  test's `toBeDisabled()` assertion; removing `GameV2App`'s
  `setAppStage('select')` restart line failed the entire
  `GameV2AppRestart.test.tsx` test (the position-select overlay never
  reappeared).
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (50 files, 955
  tests, up from 48 files/946 tests by the two new UI/restart test files
  plus the `PositionContext`/`Mvp0Runtime` additions), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files — nothing new
  was added), `npm run check:reset-coverage` (89 singletons: 29 wired, 60
  exempt, unchanged), `npm run check:ui-contract`, `npm run check:event-contract`,
  focused ESLint on every changed/new file (one warning found and fixed —
  `resolveEntryPriceOverride` moved out of the component file to avoid a
  Fast Refresh lint warning; one more found and fixed —
  `no-unnecessary-condition` on `createPositionContext`'s narrow input
  type, fixed by loosening the input type per `assertEnemyDefinition`'s own
  precedent), focused Prettier (clean), `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed, after adding `&entryPrice=65000` to the seeded URL and
  clicking through the selection screen in `openSeededRun`).
- All six acceptance criteria in the task brief are met with the evidence
  above: (1) a real selection screen locks the position before any run
  starts, with `GameV2Runtime` exposing it read-only and no mutator
  anywhere; (2) restart returns to selection and locks a fresh position,
  proved by `GameV2AppRestart.test.tsx`; (3) every pre-existing
  headless/test call site kept working unmodified via the documented
  default, confirmed by the unchanged full suite; (4) the hash-deferral to
  `V2-202` is recorded here and in `MASTER_PLAN.md`, not silently dropped;
  (5) the real browser e2e spec selects and starts a run; (6) every gate
  passes and all three mutation checks confirm their assertions are
  load-bearing. `V2-201` is accepted.

## V2-202 — Five Lethality Profiles

Brief: `docs/game-v2/tasks/V2-202-five-lethality-profiles.md`.

- **Two scope questions were put to the user directly, and the answer on
  the first overturned the initial recommendation.** Design §7.3 lists
  seven `CombatLethalityProfile` fields; only three
  (`playerMaxHealth`/`playerArmor`/`enemyDamageMultiplier`) have a real
  gameplay reader today — no encounter system exists before `V2-207`, no
  economy/liquidation system before `V2-306`, and no regen/heal mechanic
  exists anywhere in `game-v2/**`. The narrower "only build the three real
  fields" option was recommended (mirroring `V2-200`/`V2-201`'s own
  precedent of deferring what has no consumer); the user chose the wider
  option instead — model all seven now, four as documented placeholders.
  Armor mechanic: percentage reduction,
  `finalDamage = rawDamage * enemyDamageMultiplier * (1 - playerArmor)`,
  one composer, confirmed via `AskUserQuestion`.
- **Reconciling "model placeholders" with this project's hard "derived, not
  felt" rule for numeric constants.** A field with no reader is only
  acceptable per this project's own precedent (`AbilitySlot.startEligible`,
  V2-ADR-062) when the *data itself* is well-defined, not when the value is
  arbitrary. Rather than inventing four numbers, each placeholder was tied
  to a real existing constant or an alias of an already-derived field:
  `encounterPressureLimit = MVP0_MAX_LIVE_ENEMIES`,
  `encounterComplexityLimit = MVP0_ENEMY_SPAWN_BUDGET`,
  `liquidationDistance = playerMaxHealth` (an alias, pending real
  price-distance math), `rewardCeiling = leverage` (an alias, pending
  `V2-306`+'s run-points economy). None of the five profiles differs on
  these four fields today — that absence of differentiation is itself
  honest, not hidden, since nothing exists yet to justify differentiating
  them.
- `game-v2/contracts/CombatLethalityProfile.ts`: the frozen type and
  `assertCombatLethalityProfile`, mirroring `assertEnemyDefinition`'s
  `unknown`-input validation pattern.
- `game-v2/config/LethalityRegistry.ts`: `resolveIncomingDamage` (the
  single composer — one multiplication by `enemyDamageMultiplier`, one
  reduction by `(1 - playerArmor)`, a safety floor at zero) and the five
  authored `CombatLethalityProfile`s. `playerMaxHealth(leverage) =
  round(PLAYER_MAX_HEALTH / leverage)` is the only dial that varies with
  leverage; `enemyDamageMultiplier`/`playerArmor` stay fixed at `1`/`0`
  across every mode. This is what makes "no double scaling" true by
  construction rather than by cross-checking two independently varying
  multipliers, and it makes `1×` reproduce `PLAYER_MAX_HEALTH = 100`
  exactly — non-negotiable, since `UNSPECIFIED_POSITION_CONTEXT` has
  `leverage: 1` and every pre-existing headless/test call site depends on
  that default reproducing today's constants byte-for-byte.
  `incomingDamageEnvelope` is computed from the enemy registry's own
  authored min/max contact damage run through the same composer, not a
  separately hand-authored range, so it cannot drift from what the
  composer actually produces. `V2-405` (MVP-4) is the task whose explicit
  job is tuning these five profiles for real balance; this task derives
  the mechanism and the `1×` anchor, not the final numbers.
- `game-v2/systems/CombatSystem.ts`: the constructor gains an optional
  third `profile` parameter, defaulting to the leverage-`1` profile,
  mirroring the existing `candidateProvider`/`killCapacity` optional-
  parameter pattern (V2-ADR-039's injected-dependency precedent). `resetPlayer`
  now sets health/maxHealth from `profile.playerMaxHealth` instead of the
  hardcoded `PLAYER_MAX_HEALTH` constant; `resolveContactDamage` routes raw
  `world.contactDamage` through `resolveIncomingDamage` before applying it.
  All 40 pre-existing `CombatSystem.test.ts` tests pass unmodified,
  confirming the default profile is byte-identical to pre-task behavior.
- **A real determinism gap was found while implementing, not assumed away
  — closing the `V2-ADR-089` deferral `V2-201` explicitly flagged.** Once
  leverage changes `playerMaxHealth`, a replay that reconstructed the
  runtime with the default leverage-`1` profile regardless of what the
  live run actually locked would silently desync from tick one for any
  non-default leverage. `RunRecording` gains `positionContext`
  (`RUN_RECORDING_SCHEMA_VERSION` `1 → 2`); `GameV2Runtime.exportRecording()`
  includes the locked position; `ReplayRunner`'s `ReplayRuntimeFactory`
  gains a `positionContext` parameter, and `assertRecording` re-validates
  it through the real `createPositionContext` constructor (not a shape
  check) before the first tick, so a forged/corrupt recording is rejected
  early rather than surfacing as a confusing lethality-resolution failure.
  This is carried by `RunRecording` exactly like `RunIdentity`'s seed
  already is — `PositionContext` is runtime-construction input, not `World`
  state — which is what let this close **without** the `World`/
  `WorldSnapshot`/`StateHasher` schema bump `V2-ADR-089` expected might be
  unavoidable. No existing golden hash changed.
- `game-v2/runtime/createMvp0Runtime.ts` resolves the profile from
  `positionContext.leverage` and constructs `CombatSystem` with it.
- Two `no-unnecessary-condition` lint warnings surfaced and were fixed
  properly rather than suppressed: `resolveLethalityProfile`'s not-found
  guard was checking a `Record<LeverageMode, ...>` index, which `tsc`
  treats as always-present for a value already narrowed to the
  `LeverageMode` union — fixed by switching the throwing lookup to a `Map`
  (`Map.get`'s return type always includes `| undefined` regardless of key
  narrowness), mirroring `AbilityRegistry.byId`'s identical precedent for
  the same reason. `assertCombatLethalityProfile`'s nested
  `incomingDamageEnvelope` null/shape check had the same issue for the
  opposite reason — the enclosing `Partial<CombatLethalityProfile>` cast
  only promises "right shape or `undefined`," making a `null` check on it
  look statically unreachable — fixed by reading that one nested field as
  `unknown` before checking it, rather than loosening the cast strategy
  for the whole function.
- Test coverage: `CombatLethalityProfile.test.ts` (24 tests — valid input;
  one rejection per invalid field); `LethalityRegistry.test.ts` (12 tests —
  all five profiles registered and pairwise distinct; `1×` exact-equals
  today's constants; `enemyDamageMultiplier`/`playerArmor` fixed across
  every mode; `playerMaxHealth` strictly decreases as leverage rises; every
  placeholder field's derivation formula; the composer's no-double-scaling
  math and safety floor); 3 new tests appended to `CombatSystem.test.ts`
  (profile-driven `resetPlayer`, profile-driven contact-damage resolution,
  default-profile backward compatibility); `LethalityProfile.test.ts` (3
  tests, real production path — two different leverage modes produce
  different `playerMaxHealth` through the live `GameV2Runtime`; a
  non-default-leverage recording replays to the identical final hash; a
  recording with a tampered `positionContext` is rejected).
- **Mutation pass, 5 mutants, all killed, one test strengthened rather
  than accepted as a survivor.** Dropping `resolveIncomingDamage`'s
  multiplier term failed 2 tests; dropping its armor term failed 3;
  dropping its safety floor (`Math.max(0, ...)`) survived the first pass —
  every authored profile keeps `playerArmor` inside the validator's `0..1`
  bound, where the floor never binds, and `resolveIncomingDamage` itself
  does not re-validate its `Pick`-shaped input against that bound. The
  test was strengthened with an out-of-range `playerArmor: 1.5` case
  (`resolveIncomingDamage` takes any object matching its narrow shape, not
  only a validated `CombatLethalityProfile`), which then caught it
  (`expected -50 to be +0`). Reverting `CombatSystem.resetPlayer` to the
  hardcoded `PLAYER_MAX_HEALTH` constant failed 2 tests. Reverting
  `ReplayRunner` to reconstruct with `UNSPECIFIED_POSITION_CONTEXT`
  regardless of the recording's actual `positionContext` was caught by the
  *pre-existing* initial-hash mismatch check with no dedicated assertion
  needed — real defense-in-depth from `V2-014`'s own design, not a gap
  this task had to patch. All five mutated files were restored and
  reverified green after each mutant.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (53 files, 997
  tests, up from 50 files/955 tests before this task: three new files —
  `CombatLethalityProfile.test.ts` (24), `LethalityRegistry.test.ts` (12),
  `LethalityProfile.test.ts` (3) — plus 3 tests appended to the existing
  `CombatSystem.test.ts`), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files — nothing new
  was added), `npm run check:reset-coverage` (89 singletons: 29 wired, 60
  exempt, unchanged), `npm run check:ui-contract`, `npm run check:event-contract`,
  focused ESLint on all eleven changed/new files (clean after the two
  `no-unnecessary-condition` fixes above), focused Prettier (clean),
  `npm run build`, and
  `npx playwright test e2e/game-v2-walking-skeleton.spec.ts --project=chromium --workers=1 --reporter=list`
  (2 passed, unmodified — the seeded run stays at leverage `1` via the
  selection screen's own default).
- All six acceptance criteria in the task brief are met with the evidence
  above: (1) `CombatLethalityProfile` covers all seven design fields,
  validated and frozen, five profiles pairwise distinct, `1×` exact-equals
  today's behavior; (2) `resolveIncomingDamage` is the single composer, no
  other code path scales incoming damage; (3) `CombatSystem` consumes the
  locked profile for both player health and incoming contact damage; (4)
  replay is deterministic for every leverage mode with no `World`/
  `WorldSnapshot`/`StateHasher` schema change; (5) every pre-existing
  headless/test call site kept working unmodified, confirmed by the
  unchanged 40-test `CombatSystem.test.ts` baseline; (6) every gate passes
  and all five mutation checks confirm their assertions are load-bearing.
  `V2-202` is accepted.

## V2-203 — Indicator-Event State Machine

Brief: `docs/game-v2/tasks/V2-203-indicator-event-state-machine.md`.

- **Mechanism only, no concrete content — deliberately, and unlike
  `V2-202`'s placeholder fields, with no invented numbers at all.** Design
  §7.4 lists Trend/Breakout, Volatility Surge, and Volume/Whale as the
  first three indicator families (`V2-204`/`V2-205`/`V2-206`, not yet
  built) and a primary/support composer (`V2-207`, not yet built) that
  would give a profile's `priority`/`outputKind`/`compatibleWith` fields a
  real reader. This mirrors `V2-100`'s ability-slot mechanism existing
  before `V2-102`/`V2-106`/`V2-107` authored real abilities, and
  `EnemyComposer`'s mechanism existing before `EnemyRegistry`'s
  archetypes. Unlike `V2-202`'s four placeholder fields (which needed
  numbers derived from *something* real because they were meant to be
  gameplay-affecting quantities), `priority`/`outputKind`/`compatibleWith`
  here need no invented values — they are plain carried metadata a
  concrete profile's future author sets meaningfully; this task authors no
  concrete profile at all (V2-ADR-102).
- **The state machine is built with real, concrete numeric
  threshold/hysteresis math, not injected boolean-predicate callbacks**
  (V2-ADR-099) — unlike `V2-200`/`V2-201`'s real infrastructure blockers
  (single-asset `SSEMarketService`, no full SSE dev/e2e server), threshold
  crossing is pure arithmetic on a `number`, so there was no reason to
  abstract it away. This lets the state machine's own test suite directly
  prove design's own worked example rather than deferring that proof to a
  later task.
- `game-v2/contracts/IndicatorEventProfile.ts`: `IndicatorEventDirection`
  (`'below' | 'above'`) and the frozen `IndicatorEventProfile` type
  covering every design-listed field, with `assertIndicatorEventProfile`
  enforcing the `entryThreshold`/`exitThreshold`/`direction` relationship
  (e.g. `'below'` requires `exitThreshold >= entryThreshold`) so a profile
  cannot be authored with an internally contradictory recovery direction.
- `game-v2/market/IndicatorEventStateMachine.ts`: the derived mechanism.
  `CONFIRMING` failing its entry condition reverts directly to `ARMED`
  with no cooldown (V2-ADR-100) — no event was ever confirmed, so there is
  nothing to protect against re-triggering. `COOLDOWN → ARMED` requires
  both `cooldownTicks` to have elapsed *and* the sample to have crossed
  the rearm threshold (`exitThreshold ± hysteresis`), whichever gate
  resolves later (V2-ADR-101) — this dual gate is the literal mechanism
  that prevents design's own worked example
  (`26 → 24 → 28 → 23` cannot spam a second activation) from spamming: the
  second dip below the entry threshold at `23` is simply irrelevant, since
  `COOLDOWN` only watches for the timer and the rearm threshold, never the
  entry condition again. `step(sample, tick)` takes a raw `(number,
  number)` pair rather than the ECS `StepContext`, which carries
  `intent: PlayerIntent` — a false dependency for a market-domain
  mechanism with no player/`World` relationship (V2-ADR-103).
- A same-tick fallthrough (each stage's `if` block, not `else if`) lets a
  fresh `ARMED → CONFIRMING` transition be evaluated against the same
  tick's sample immediately, which is what makes `confirmationTicks: 0`
  promote to `ACTIVE` on the very tick it arms. This is provably safe for
  every adjacent stage pair: entry and exit conditions are mutually
  exclusive by the validated threshold relationship for any single sample
  (a sample that satisfies entry for `'below'`, i.e.
  `sample < entryThreshold`, can never also satisfy exit,
  `sample >= exitThreshold >= entryThreshold`, in the same step), so a
  fresh `CONFIRMING → ACTIVE` promotion can never immediately re-satisfy
  the exit condition on the same sample.
- Test coverage: `IndicatorEventProfile.test.ts` (22 tests — valid input
  for both directions; one rejection per invalid field, including the
  entry/exit/direction relationship; a wider active window where
  `exitThreshold` differs from `entryThreshold`; caller mutation of the
  input `compatibleWith` array does not leak into the frozen output);
  `IndicatorEventStateMachine.test.ts` (16 tests, organized one `describe`
  per named Done-When property — arm/stay-armed; confirm/confirmation-
  failure/instant-promotion; active-to-cooldown; design's own worked
  example; the dual-gate cooldown property proven both ways (timer alone
  insufficient, rearm alone insufficient, both together sufficient); the
  full cycle mirrored for the `'above'` direction; reset; malformed-input
  rejection including the monotonic-tick guard).
- **Two test-authoring bugs were found and fixed while writing the test
  suite, not implementation bugs.** The first "promotes to ACTIVE..." test
  and the "above-direction" test both had miscounted tick arithmetic
  (an extra unneeded `step()` call in one case, a boundary-value
  misunderstanding in the other — the rearm threshold comparison is
  inclusive, `sample <= exitThreshold - hysteresis` for `'above'`, so a
  sample landing exactly on the boundary does satisfy rearm, contrary to
  the test's original comment). Both were corrected to match the real,
  verified behavior rather than the implementation being bent to match a
  wrong test expectation.
- **Mutation pass, 5 mutants, 4 killed, 1 confirmed genuinely
  unreachable and honestly reported rather than claimed killed.**
  `CONFIRMING` failure entering `COOLDOWN` instead of `ARMED` failed 1
  test. Dropping the rearm term from the `COOLDOWN → ARMED` gate (timer
  alone) failed 3 tests. Dropping the timer term (rearm alone) failed 2
  tests. Reintroducing an entry-condition check inside `COOLDOWN` (spam
  protection removed) failed exactly the dedicated worked-example test —
  the state after the second dip became `CONFIRMING` instead of staying
  `COOLDOWN`. Removing `reset()`'s explicit clearing of
  `confirmationTicksHeld`/`cooldownTicksElapsed` **survived** the full
  suite: both counters are already unconditionally re-zeroed at their own
  natural transition entry points (arming, and entering `COOLDOWN`)
  regardless of what `reset()` does, so no external call sequence can ever
  observe a stale value — `reset()`'s only externally observable effect is
  returning to `ARMED` and clearing the monotonic-tick guard, which a
  separate test does verify. The explicit clears were kept anyway as a
  defensive guard against a future refactor of those entry points
  silently turning this into a real bug, mirroring `CombatSystem`'s own
  documented `health <= 0` defensive-guard precedent, rather than being
  silently deleted or the finding being hidden.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (55 files,
  1035 tests, up from 53 files/997 tests before this task by the two new
  test files' 38 tests), `npm run typecheck`, `npm run check:architecture`
  (89 baseline singleton files — nothing new was added, the state machine
  is constructed per-caller, not a singleton), `npm run check:reset-coverage`
  (89 singletons: 29 wired, 60 exempt, unchanged), `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all four changed/new
  files (clean), focused Prettier (clean), and `npm run build`. No e2e run
  was needed: this task touches nothing under `game-v2/GameV2App.tsx` or
  `game-v2/runtime/**`.
- All six acceptance criteria in the task brief are met with the evidence
  above: (1) `IndicatorEventProfile` validates every design-listed field
  and the threshold/direction relationship; (2) the five-stage cycle is
  implemented with both gates independently required to leave `COOLDOWN`;
  (3) design's own worked example is proven by a dedicated property test;
  (4) `reset()` returns the machine to a state indistinguishable from
  fresh, verified by the observable state/tick-guard behavior (the
  counter-clearing itself is unreachable, honestly reported above, not
  claimed as proven); (5) nothing outside
  `game-v2/contracts/**`/`game-v2/market/**` was touched, confirmed by the
  file diff; (6) every gate passes and 4 of 5 mutation checks confirm
  load-bearing assertions, with the 5th's unreachability independently
  confirmed rather than assumed. `V2-203` is accepted.

## V2-204 — Trend/Breakout Family

Brief: `docs/game-v2/tasks/V2-204-trend-breakout-family.md`.

- **The first concrete content family, so it also defines the shared
  `EncounterOutput` contract other families extend.** Design §6.2 names
  the full output taxonomy (`SPAWN | WORLD_EVENT | LOOT_EVENT | HYBRID`)
  but no family had authored any concrete profile or output shape yet.
  `V2-208`/`V2-209`/`V2-210` (the tasks that actually wire an output into a
  real spawn/hazard/loot system) are listed *after* `V2-207` in the master
  plan, confirming this task's job is the family's data only — mirrors how
  `V2-108`'s enemy archetypes existed before `EnemyComposer` wired them
  into a live spawn cadence.
- **Every authored numeric constant traces to a real existing value, none
  invented, matching every prior MVP-2 task's rigor.** The load-bearing
  find: `trendStrength` is provably bounded `[0, 1]`, not assumed —
  `railway-market-aggregator/src/services/indicatorService.ts` computes it
  as `Math.abs((rsi - 50) / 50)`, and `rsi` is validated to `[0, 100]` by
  `V2-200`'s own `normalizeMarketUpdate`. The entry threshold
  (`TREND_BREAKOUT_ENTRY_THRESHOLD = 0.5`) is the literal midpoint of that
  proven range, and hysteresis (`0.25`) is derived as half of it. This
  meant no `AskUserQuestion` was needed for the core trigger math, unlike
  `V2-202`'s leverage-profile derivation, which had no comparable anchor
  to work from until `PLAYER_MAX_HEALTH` was chosen as the `1×` reference
  point.
- `TREND_BREAKOUT_CONFIRMATION_TICKS`/`TREND_BREAKOUT_COOLDOWN_TICKS` (1
  and 10 real seconds) derive from `SIMULATION_HZ`, matching every other
  tick-count constant in this codebase. `TREND_BREAKOUT_SPAWN_BUDGET` is
  `MVP0_ENEMY_SPAWN_BUDGET` times a stated multiplier (`4`) — the
  multiplier itself, like the 10-second cooldown, is chosen with stated
  reasoning rather than derived by pure arithmetic (mirrors `V2-108`'s own
  archetype-multiplier precedent); `V2-405` (MVP-4) owns final tuning.
- `game-v2/contracts/EncounterOutput.ts`: `EncounterOutputKind` (the full
  four-member design enum) and the one concrete variant this task
  authors, `SpawnEncounterOutput`. `EncounterOutput` is a union starting
  with just this variant — `WORLD_EVENT`/`LOOT_EVENT`/`HYBRID` get their
  own shape only when `V2-205`/`V2-206` need one, rather than this task
  guessing their content.
- `game-v2/config/TrendBreakoutFamily.ts`: the derived constants and
  `TREND_BREAKOUT_PROFILE`, an `IndicatorEventProfile` built on `V2-203`'s
  mechanism (`direction: 'above'`, since a breakout is `trendStrength`
  crossing above the threshold).
- `game-v2/market/TrendBreakoutEncounter.ts`: wraps one
  `IndicatorEventStateMachine`, samples `MarketSnapshot.trendStrength` each
  step, and produces a `SpawnEncounterOutput` themed by `trendDirection`
  exactly on the activation tick. A real, provable invariant guards
  against a `'NEUTRAL'` direction at activation:
  `trendStrength > 0.5 ⇒ |rsi - 50| > 25 ⇒ rsi < 25 ∨ rsi > 75`, both far
  outside the `[45, 55]` band `indicatorService.ts` uses to derive
  `'NEUTRAL'` — unreachable through the real pipeline, guarded defensively
  anyway, mirroring `CombatSystem`'s own `health <= 0` precedent.
- Test coverage: `EncounterOutput.test.ts` (10 tests — valid input, one
  rejection per invalid field); `TrendBreakoutFamily.test.ts` (6 tests —
  every derivation formula pinned by exact equality, the profile itself
  validates); `TrendBreakoutEncounter.test.ts` (7 tests — no output while
  `ARMED`; exactly one bullish-themed output for `'UP'`; bearish-themed for
  `'DOWN'`; no output on any tick before or after the exact activation
  tick; no output while `COOLDOWN` even when the entry condition is met
  again — re-verifying `V2-203`'s own anti-spam property through the real
  wrapper, not just the raw mechanism; the `'NEUTRAL'`-direction guard;
  `reset()`).
- One test-authoring bug was found and fixed while writing the suite (not
  an implementation bug): the first "no output while ARMED" test called a
  `stayArmed` helper covering ticks 0-9, then re-drove ticks 0-9 again in
  a second loop — the state machine's monotonic-tick guard correctly
  rejected the tick reuse. Fixed by removing the redundant first pass.
- **Mutation pass, 4 mutants, all caught — one caught via a different,
  less-clear exception type than intended, confirming the value of the
  explicit guard it targeted.** Producing output on every `ACTIVE` tick
  instead of only the activation tick failed 1 test. Reversing the
  `'UP'`/`'DOWN'` theme mapping failed 2 tests. Reverting
  `TREND_BREAKOUT_SPAWN_BUDGET` to the raw `MVP0_ENEMY_SPAWN_BUDGET`
  (multiplier dropped) failed the dedicated constant-derivation test (the
  encounter-level test didn't catch it, since it imports the same mutated
  constant and compares against itself — the derivation test is what's
  actually supposed to catch this class of mutant, and it did). Removing
  the explicit `'NEUTRAL'`-direction guard still threw — `assertSpawnEncounterOutput`'s
  own `themeId` validation caught the resulting `undefined` theme lookup
  downstream — but as a generic `TypeError` rather than the intended
  diagnostic `RangeError`, which the test's specific exception-type
  assertion correctly flagged as a mismatch. This confirmed the explicit
  guard earns its place: defense-in-depth exists without it, but with a
  materially worse error message for whoever would hit it.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (58 files,
  1058 tests, up from 55 files/1035 tests before this task by the three
  new test files' 23 tests), `npm run typecheck`,
  `npm run check:architecture` (89 baseline singleton files — nothing new
  was added, the encounter is constructed per-caller), `npm run check:reset-coverage`
  (89 singletons: 29 wired, 60 exempt, unchanged), `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all six changed/new
  files (clean), focused Prettier (clean), and `npm run build`. No e2e run
  was needed: this task touches nothing under `game-v2/GameV2App.tsx` or
  `game-v2/runtime/**`.
- All five acceptance criteria in the task brief are met with the evidence
  above: (1) `EncounterOutput`/`SpawnEncounterOutput` validate and freeze
  correctly; (2) `TREND_BREAKOUT_PROFILE` and every derived constant are
  pinned by exact-equality tests tracing to a real existing value; (3)
  `TrendBreakoutEncounter` produces exactly one themed, bounded output per
  activation and `null` otherwise, including through `COOLDOWN`'s
  anti-spam property; (4) nothing outside
  `game-v2/contracts/**`/`game-v2/config/**`/`game-v2/market/**` was
  touched, confirmed by the file diff; (5) every gate passes and all four
  mutation checks confirm load-bearing assertions. `V2-204` is accepted.

## V2-205 — Volatility Surge Family

Brief: `docs/game-v2/tasks/V2-205-volatility-surge-family.md`.

- **A stronger real-value anchor than `V2-204` had available, found by
  reading the legacy calculator rather than deriving a range midpoint.**
  `atrPercent` has no proven upper bound the way `trendStrength` did
  (`(atr / close) * 100`, non-negative, but no ceiling any validator
  enforces), so `V2-204`'s midpoint strategy did not apply. Reading
  `railway-market-aggregator/src/indicators/ATRCalculator.ts` surfaced
  something better: `getSpawnRateMultiplier` already classifies
  `atrPercent` into four real, already-calibrated tiers — Calm (`< 0.005`),
  Normal (`< 0.015`), Volatile (`< 0.03`), Chaos (`>= 0.03`). The entry
  threshold (`0.03`) and hysteresis-derived rearm threshold (`0.015`) both
  reuse these real tier boundaries directly, rather than inventing a
  fraction of an unbounded range.
- **This required distinguishing "reusing an indicator classification
  fact" from "reusing the excluded legacy gameplay multiplier," a
  real judgment call, not a rubber-stamp.** `V2-ADR-085` (`V2-200`)
  already excluded `getSpawnRateMultiplier`'s *return value*
  (`spawnRateMultiplier`) from `MarketSnapshot` as a legacy
  gameplay-multiplier output. The *tier boundaries* the same function
  switches on are a different kind of fact — real, already-tuned
  indicator classification cutoffs, the same class of value `V2-200`'s own
  `rsiState` (`OVERSOLD`/`NEUTRAL`/`OVERBOUGHT`) already carries through
  from real RSI threshold boundaries. Reusing the boundary numbers is not
  reusing the multiplier pipeline design excludes.
- `game-v2/contracts/EncounterOutput.ts` (modified): adds
  `WorldEventEncounterOutput` (`kind: 'WORLD_EVENT'`, `hazardId`,
  `telegraphTicks`) and `assertWorldEventEncounterOutput`;
  `EncounterOutput` becomes `SpawnEncounterOutput | WorldEventEncounterOutput`.
  No hazard-effect payload (no arena-region shape, no damage/DoT numbers)
  — no hazard system exists yet to consume one (`V2-209`), matching
  `V2-204`'s own precedent of staying minimal until a real consumer needs
  more.
- `game-v2/config/VolatilitySurgeFamily.ts`: the derived constants and
  `VOLATILITY_SURGE_PROFILE`. Confirmation/cooldown durations (1 and 10
  real seconds) reuse `V2-204`'s own derived values verbatim — no
  family-specific reason to differ, keeping the "why this number" story
  simple until `V2-405` tunes per-family balance.
  `VOLATILITY_SURGE_TELEGRAPH_TICKS` (2 real seconds via `SIMULATION_HZ`)
  is chosen with stated reasoning, like `V2-204`'s spawn-budget multiplier
  — no hazard/telegraph constant exists yet to anchor to.
- `game-v2/market/VolatilitySurgeEncounter.ts`: wraps one
  `IndicatorEventStateMachine`, samples `MarketSnapshot.atrPercent` each
  step, and produces a `WorldEventEncounterOutput` exactly on the
  activation tick. Simpler than `TrendBreakoutEncounter`: no direction-
  theming branch, so no `'NEUTRAL'`-style defensive guard was needed here.
- Test coverage: `EncounterOutput.test.ts` gained a full
  `assertWorldEventEncounterOutput` describe block (10 tests — valid
  input, one rejection per invalid field), existing `SpawnEncounterOutput`
  tests unaffected; `VolatilitySurgeFamily.test.ts` (6 tests — every
  derivation pinned by exact equality, including confirming `0.03 - 0.015`
  is exact in IEEE754 rather than assuming it and reaching for
  `toBeCloseTo`); `VolatilitySurgeEncounter.test.ts` (5 tests, mirroring
  `TrendBreakoutEncounter.test.ts`'s shape — no output while `ARMED`;
  exactly one bounded output on the activation tick; no output on any
  tick before or after it; no output while `COOLDOWN` even when the entry
  condition is met again, re-verifying `V2-203`'s anti-spam property
  through the real wrapper; `reset()`). All tick-math loops matched their
  first-try-correct form on the first attempt, applying the exact
  arm-to-promotion counting rule `V2-204`'s own two test-authoring bugs
  established.
- **Mutation pass, 3 mutants, all caught — a narrower but complete set
  than `V2-204`'s, since this encounter has less branching logic (no
  theme-direction mapping to get wrong).** Producing output on every
  `ACTIVE` tick instead of only the activation tick failed 1 test.
  Reverting the entry threshold to a felt value (`0.05`) failed 2 tests
  (the entry-threshold pin itself, and the hysteresis pin since it is
  derived from the entry threshold). Reverting `telegraphTicks` to a raw
  tick count (`30`) instead of the `SIMULATION_HZ`-derived value failed 1
  test. The brief's fourth planned target ("cooldown anti-spam property
  broken") was recognized as redundant with the first mutant before
  attempting it: this file has no anti-spam logic of its own to break —
  it is entirely inherited from `IndicatorEventStateMachine`, already
  exhaustively mutation-tested in `V2-203` — so forcing a fourth,
  artificial mutant here would have tested the same code path twice
  rather than covering new surface area.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (60 files,
  1079 tests, up from 58 files/1058 tests before this task by the two new
  test files plus the `EncounterOutput.test.ts` additions, 21 tests
  total), `npm run typecheck`, `npm run check:architecture` (89 baseline
  singleton files — nothing new was added), `npm run check:reset-coverage`
  (89 singletons: 29 wired, 60 exempt, unchanged), `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all six changed/new
  files (clean), focused Prettier (clean), and `npm run build`. No e2e run
  was needed: this task touches nothing under `game-v2/GameV2App.tsx` or
  `game-v2/runtime/**`.
- All five acceptance criteria in the task brief are met with the
  evidence above: (1) `WorldEventEncounterOutput` validates and freezes
  correctly, existing `SpawnEncounterOutput` behavior unaffected; (2)
  `VOLATILITY_SURGE_PROFILE` and every derived constant are pinned by
  exact-equality tests tracing to a real existing value (the
  `ATRCalculator` tier boundaries or `SIMULATION_HZ`); (3)
  `VolatilitySurgeEncounter` produces exactly one bounded output per
  activation and `null` otherwise, including through `COOLDOWN`'s
  anti-spam property; (4) nothing outside
  `game-v2/contracts/**`/`game-v2/config/**`/`game-v2/market/**` was
  touched, confirmed by the file diff; (5) every gate passes and all
  three mutation checks confirm load-bearing assertions. `V2-205` is
  accepted.

## V2-206 — Volume/Whale Family

Brief: `docs/game-v2/tasks/V2-206-volume-whale-family.md`. Last of the
three indicator families.

- **The strongest real anchor of the three families, because the server
  already does the classification, not just the calibration.**
  `V2-204`/`V2-205` each needed a threshold picked against a *continuous*
  field (`trendStrength`, `atrPercent`). `MarketSnapshot.whaleTier` is
  different in kind: `railway-market-aggregator/src/indicators/VolumeAnalyzer.ts`
  already reduces real z-score cutoffs (`BABY_WHALE >= 1.5σ`,
  `WHALE >= 2.0σ`, `MEGA_WHALE >= 2.5σ`) into a discrete `0..3` tier before
  `MarketSnapshot` ever sees it. `V2-203`'s mechanism works on any
  `number`, so `whaleTier` is sampled directly — no derivation of a new
  threshold on a continuous range was needed at all, the strongest of the
  three families' anchor arguments.
- **A genuine, reasoned departure from the other two families' shared
  confirmation-tick pattern, not a copy-paste.** `V2-204`/`V2-205` both use
  a `SIMULATION_HZ`-tick (1-second) confirmation window, because a trend
  or an elevated ATR reading is a *sustained* condition worth confirming.
  A whale spike is not: it is a momentary statistical outlier, and
  `VolumeAnalyzer`'s own anti-spam mechanism
  (`whaleCooldownMs = 30000`, a genuine existing constant) is a flat
  cooldown after one spike, never a sustained-holding requirement. This
  confirmed `VOLUME_WHALE_CONFIRMATION_TICKS = 0` (instant activation) is
  the right derivation for this family, not an oversight of the pattern
  the other two established.
- `VOLUME_WHALE_COOLDOWN_TICKS` reuses `VolumeAnalyzer`'s own real
  `whaleCooldownMs` constant directly (converted from milliseconds to
  ticks), rather than an independently narratively-justified duration like
  `V2-204`/`V2-205`'s 10-second cooldowns — a real anchor existed for this
  exact family, so it was used instead of inventing a new one.
- `game-v2/contracts/EncounterOutput.ts` (modified): adds
  `LootEventEncounterOutput` (`kind: 'LOOT_EVENT'`, `lootTierId`,
  `lootValue`) and `assertLootEventEncounterOutput`; `EncounterOutput`
  becomes the three-member union `SpawnEncounterOutput |
  WorldEventEncounterOutput | LootEventEncounterOutput`, completing
  design §6.2's taxonomy except `HYBRID` (line 187 — combines the other
  three under one budget; has no owning task yet, so deliberately not
  modeled, matching `V2-204`'s own reasoning for leaving unowned variants
  unauthored). `lootValue` is the triggering `whaleTier` itself, a real
  pass-through, not an invented loot value — no loot/economy system exists
  yet (`V2-306`+, MVP-3) to price a lootbox against.
- `game-v2/config/VolumeWhaleFamily.ts`: the derived constants and
  `VOLUME_WHALE_PROFILE`.
- `game-v2/market/VolumeWhaleEncounter.ts`: wraps one
  `IndicatorEventStateMachine`, samples `MarketSnapshot.whaleTier` each
  step, and produces a `LootEventEncounterOutput` themed and valued by the
  triggering tier exactly on the activation tick. A defensive
  `whaleTier !== 2 && whaleTier !== 3` guard exists ahead of the theme
  lookup — provably stronger than `V2-204`'s `'NEUTRAL'`-direction guard,
  which was unreachable only through the *real server pipeline*: here the
  guard is unreachable through the *type system itself* (`WhaleTier` is
  exactly `0 | 1 | 2 | 3`, and only `2`/`3` can satisfy the `> 1` entry
  condition), confirmed empirically by mutation-removing it and finding
  `tsc` itself fails to compile (`LOOT_TIER_BY_WHALE_TIER[snapshot.whaleTier]`
  can no longer index a `Record<2 | 3, string>` with an ungoverned
  `WhaleTier`) rather than merely a test failing at runtime.
- Test coverage: `EncounterOutput.test.ts` gained a full
  `assertLootEventEncounterOutput` describe block (9 tests — valid input,
  one rejection per invalid field), existing variants unaffected;
  `VolumeWhaleFamily.test.ts` (6 tests — every derivation pinned by exact
  equality, including the `whaleCooldownMs -> ticks` conversion);
  `VolumeWhaleEncounter.test.ts` (6 tests — no output for `NONE`/
  `BABY_WHALE`; instant activation with no confirmation delay for both
  `WHALE` and `MEGA_WHALE`, themed and valued correctly; no output on the
  tick after activation; no output while `COOLDOWN` even when a second
  whale tier is met, re-verifying `V2-203`'s anti-spam property through
  the real wrapper; `reset()`). One redundant/trivial test assertion
  (hardcoded `1 > 1`/`2 > 1`/`3 > 1` comparisons, all `no-unnecessary-condition`
  lint warnings since both sides were literals) was simplified to a single
  constant-value pin, with the real tier-activation behavior left to
  `VolumeWhaleEncounter.test.ts`'s own end-to-end proof rather than
  re-derived in the config test.
- **Mutation pass, 4 mutants, all caught — the fourth caught by `tsc`
  itself rather than a test, confirmed empirically rather than assumed.**
  Producing output on every `ACTIVE` tick instead of only the activation
  tick failed 1 test. Reversing the `WHALE`/`MEGA_WHALE` theme mapping
  failed 2 tests. Hardcoding `lootValue` instead of passing through the
  real `whaleTier` failed 2 tests. Reverting the cooldown-ticks derivation
  to an unrelated raw value failed the dedicated constant-derivation test.
  Removing the defensive tier guard was verified empirically rather than
  assumed unreachable (mirroring `V2-203`'s own honest-reporting
  precedent for its `reset()` finding): it does not even compile —
  `npm run typecheck` itself is the gate that catches this mutant, a
  stronger guarantee than any runtime test could give.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (62 files,
  1101 tests, up from 60 files/1079 tests before this task by the two new
  test files plus the `EncounterOutput.test.ts` additions, 22 tests
  total), `npm run typecheck`, `npm run check:architecture` (89 baseline
  singleton files — nothing new was added), `npm run check:reset-coverage`
  (89 singletons: 29 wired, 60 exempt, unchanged), `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all six changed/new
  files (clean after simplifying the one trivial-comparison test), focused
  Prettier (clean), and `npm run build`. No e2e run was needed: this task
  touches nothing under `game-v2/GameV2App.tsx` or `game-v2/runtime/**`.
- All five acceptance criteria in the task brief are met with the
  evidence above: (1) `LootEventEncounterOutput` validates and freezes
  correctly, existing variants unaffected; (2) `VOLUME_WHALE_PROFILE` and
  every derived constant are pinned by exact-equality tests tracing to a
  real existing value (`VolumeAnalyzer`'s z-score tiers and
  `whaleCooldownMs`); (3) `VolumeWhaleEncounter` activates instantly on a
  single qualifying tick and produces exactly one themed, valued output
  per activation, `null` otherwise, including through the cooldown's
  anti-spam property; (4) nothing outside
  `game-v2/contracts/**`/`game-v2/config/**`/`game-v2/market/**` was
  touched, confirmed by the file diff; (5) every gate passes and all four
  mutation checks confirm load-bearing assertions, one via `tsc` itself.
  `V2-206` is accepted.

## V2-207 — Primary/Support Composer

- Task brief: `docs/game-v2/tasks/V2-207-primary-support-composer.md`.
  Governing decisions: V2-ADR-122 through V2-ADR-127.
- `game-v2/market/EncounterComposer.ts`: a pure, stateless `compose`
  function. Given the set of `EncounterCandidate`s that produced an
  output on this exact tick, it selects at most one primary (highest
  `profile.priority`, deterministic ascending-`profile.id` tie-break,
  V2-ADR-124) and, among the rest, at most one support whose id appears
  in the primary's own `compatibleWith` (checked directionally against
  the primary only, not bidirectionally — V2-ADR-125), same tie-break.
  Every other candidate is dropped, never queued (V2-ADR-122). Writes
  into a caller-owned `out: ComposedEncounter` object rather than
  allocating, mirroring `EnemyComposer`'s own precedent.
- `game-v2/market/MarketEncounterDirector.ts`: owns all three real
  encounters (`TrendBreakoutEncounter`, `VolatilitySurgeEncounter`,
  `VolumeWhaleEncounter`) plus one `EncounterComposer`. `step(snapshot,
  tick)` steps all three against the same `MarketSnapshot` and returns
  this tick's composed result — the first piece of code in this
  milestone that wires all three real families together. Allocates a
  fresh `ComposedEncounter` per call rather than writing into a
  caller-owned scratch object (V2-ADR-127), since market encounters step
  at the ~1 Hz `MarketSnapshot` cadence, not the 60 Hz RAF loop the
  project's allocation-discipline rule targets. `reset()` clears all
  three underlying encounters.
- This is the first task to give `IndicatorEventProfile`'s `priority`
  and `compatibleWith` fields a reader — both have existed since
  `V2-203` with none. No new `compatibleWith` content is authored
  (V2-ADR-126): all three real families still declare
  `compatibleWith: []`, a deliberate deferral of a real game-design
  judgment call (which families feel thematically compatible together)
  with no derivable anchor, matching `V2-204`'s `WORLD_EVENT`/`LOOT_EVENT`
  and `V2-205`'s `HYBRID` deferrals. Today's real behavior therefore
  always resolves primary-only, but the mechanism is proven correct
  against all four cases (zero/one/two-compatible/two-incompatible/
  three-with-one-compatible-pair) via synthetic test profiles.
- "A merged event consumes the cooldown/rearm state of every source
  profile it uses" requires no new bookkeeping in the composer
  (V2-ADR-123): each candidate's own `IndicatorEventStateMachine`
  already transitioned to `COOLDOWN` when it produced this tick's
  output, entirely independent of whatever the composer ultimately
  selects.
- `tests/game-v2/market/EncounterComposer.test.ts` (10 tests, synthetic
  `IndicatorEventProfile`/`EncounterOutput` fixtures via
  `assertIndicatorEventProfile`/`assertSpawnEncounterOutput`): zero
  candidates; single candidate; compatible pair yields primary+support;
  incompatible pair drops the loser; three candidates with only one
  compatible pair still yield at most primary+support; equal-priority
  ties resolve by ascending id (both for primary and for support
  selection); strictly higher priority overrides id ordering; support
  compatibility is checked directionally against the primary only
  (V2-ADR-125, proven with an asymmetric `compatibleWith` pair);
  statelessness across consecutive `compose` calls (a rejected candidate
  is never remembered on a later call).
- `tests/game-v2/market/MarketEncounterDirector.test.ts` (4 tests, real
  `MarketSnapshot` sequences): a single qualifying family (Volatility
  Surge, held past its 60-tick confirmation window) yields primary-only
  with the correct real `WORLD_EVENT` output; two real families
  activating on the identical tick yield primary-only with the loser
  silently dropped — proven with a deliberate tick-alignment trick
  (`TrendBreakoutEncounter` needs 60 ticks to confirm while
  `VolumeWhaleEncounter` activates instantly at `confirmationTicks: 0`,
  so holding `whaleTier: 0` until exactly tick 60 makes both real
  families activate simultaneously; the ascending-id tie-break correctly
  picks `'trend-breakout'` over `'volume-whale'`); a calm tick composes
  `{ primary: null, support: null }`; `reset()` clears all three
  encounters, proven by a fresh activation cycle needing the full
  confirmation duration again without a monotonic-tick violation.
- **Mutation pass, 4 mutants, all caught.** Removing the
  `compatibleWith` check in support selection failed 5 tests. Reversing
  the tie-break comparison direction failed 3 tests. Disabling the
  primary-selection preference loop failed 2 tests. Removing
  `volatilitySurge.reset()` from `MarketEncounterDirector.reset()`
  failed 1 test — notably via a `RangeError` (the monotonic-tick guard
  inside `IndicatorEventStateMachine`) rather than a silent logic
  mismatch, an even stronger signal than a plain assertion failure.
- Verification, each run separately and each passing:
  `npx vitest run tests/game-v2 --pool=forks --maxWorkers=1` (64 files,
  1115 tests, up from 62 files/1101 tests before this task by the two
  new test files), `npm run typecheck`, `npm run check:architecture`,
  `npm run check:reset-coverage`, `npm run check:ui-contract`,
  `npm run check:event-contract`, focused ESLint on all four
  new files (clean), focused Prettier (clean), and `npm run build`
  (succeeded, 1m 16s). No e2e run was needed: this task touches nothing
  under `game-v2/GameV2App.tsx` or `game-v2/runtime/**`.
- All five acceptance criteria in the task brief are met with the
  evidence above: (1) `EncounterComposer.compose` selects at most one
  primary and one compatible support, deterministically, statelessly,
  every other candidate dropped; (2) `MarketEncounterDirector` drives
  all three real families together and composes their outputs
  correctly, including today's real always-incompatible case; (3)
  `priority`/`compatibleWith` are read by real logic for the first
  time; (4) nothing outside `game-v2/market/**` was touched, confirmed
  by the file diff, and no wiring into `GameV2Runtime` was added; (5)
  every gate passes and the mutation pass leaves no survivor.
  `V2-207` is accepted.

## Exact Next Action

MVP-1 is fully closed. MVP-2 (Market Vertical Slice) is in progress:
`V2-200` through `V2-207` are all accepted — all three indicator-event
families are done and now compose together through
`MarketEncounterDirector`/`EncounterComposer`, though neither is wired
into `GameV2Runtime` yet. Per `MASTER_PLAN.md`, `V2-208` (Spawn output
consumption) and `V2-209` (World-event output consumption) both depend
on `V2-207` and are now reachable for the first time, as is the
still-unassigned `LOOT_EVENT`-consumption task. These are the first
MVP-2 tasks that have to reach into `GameV2Runtime`/the ECS world rather
than staying isolated under `game-v2/market/**` and
`game-v2/contracts/**` — worth scoping carefully, including confirming
how each consumption path locates or spawns the relevant ECS entities
and whether any new singleton needs `check:architecture`/
`check:reset-coverage` registration.

ETH/SOL multi-asset support remains a real, unassigned gap: it is not on
the critical path for `V2-201`..`V2-213` since every one of those blocks
can be evidenced against BTC alone, but it must be opened before MVP-2's own
Done-When ("BTC/ETH/SOL normalize...") can be called fully met at the
milestone level — flag this to the user rather than silently letting it slip
through MVP-2's evidence gate (`V2-213`).

All 9 findings from `V2-109`'s `/code-review high` pass are resolved and none
remain open: 6 were fixed in the `374cec0e` cleanup, `WeaponSystem`'s
single-fixed-slot firing gap became `V2-111`, and the remaining 2 stay closed
as correct standing decisions rather than defects — `AbilitySlot.startEligible`
has no reader because the pre-run selection UI it serves is deferred to MVP-4
(V2-ADR-062), and `LevelUpOverlay`'s wall-clock timer is deliberately outside
simulation authority so a live timeout never consumes RNG at an instant
replay cannot reproduce (V2-ADR-050, V2-ADR-054).

Do not deploy, cut over production, or replace the legacy demo. Do not
push the branch without explicit instruction.

## Known Pre-existing Working-tree Changes

These changes predate the Game V2 documentation commit and are user-owned. Do
not stage, edit, revert, or include them in a Game V2 commit:

- `skills-lock.json` — modified.
- `docs/design/CORE_REDESIGN_V1.md`, `docs/design/AGENT_ORCHESTRATION_ROADMAP.md`,
  `docs/design/AGENT_ORCHESTRATION_V1.md` — untracked.
- `public/sitemap.xml` — build-generated modification.
- `public/docs/**` — build-generated/untracked documentation copies (this
  mirror regenerates from whatever is in `docs/**` on every `npm run build`,
  including this file and `DECISIONS.md` — expect it to show as modified
  after any verification run and leave it alone regardless).
- `e2e/storage-state.json` — regenerates a timestamp field on every Playwright
  run; not meaningful content.
- `package.json`, `.gitignore` — unrelated `delegate:*` script/ignore entries
  from a separate orchestrator tooling effort.
- `.delegate/`, `scripts/delegate/`, `tests/delegate/` — untracked, that same
  separate orchestrator tooling effort.
- `tests/services/combat/BulletTrailBuffer.test.ts`,
  `tests/services/director/SeededRng.test.ts`,
  `tests/services/patterns/decorators/buffs/` — untracked, unrelated to
  Game V2.

## Resume Protocol

Any new agent or session must:

1. Read the design spec.
2. Read `MASTER_PLAN.md` and this checkpoint.
3. Inspect Git status and verify the known pre-existing changes.
4. Locate the active task ID and its acceptance criteria.
5. Run the last listed verification before modifying code.
6. Update this file before stopping.
