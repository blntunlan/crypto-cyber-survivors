# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` |
| Phase | MVP-0 runtime foundation |
| Active task | `V2-007` |
| Status | `In Review` — fixed top-down orthographic camera implementation is ready |
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

## Verification Required

1. Independently review V2-007 fixed top-down orthographic camera implementation.
2. Confirm framing, invalid-input atomicity, immutable combat orientation, and
   absence of renderer/simulation/global authority coupling.

## Exact Next Action

Generate a review package for the V2-007 implementation and dispatch an
independent reviewer from the accepted V2-006 checkpoint.

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
