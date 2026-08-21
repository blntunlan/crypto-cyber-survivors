# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` |
| Phase | MVP-0 runtime foundation |
| Active task | `V2-003` |
| Status | `In Progress` — lifecycle and reset contract |
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

## Verification Required

1. Execute V2-003 lifecycle/reset contract test-first.
2. Prove legal transitions, illegal-transition rejection, reset epoch behavior,
   idempotent dispose, and post-dispose command rejection.
3. Run task-scoped spec and quality review before V2-004.

## Exact Next Action

Generate the Task 4 SDD brief and dispatch a fresh lifecycle implementer from
the accepted V2-002 head.

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
