# Game V2 Progress Checkpoint

> This file is updated at every stopping point. It must describe repository
> reality, not intended progress.

## Current State

| Field | Value |
|---|---|
| Branch | `codex/threejs-gameplay-v2` |
| Phase | MVP-0 implementation |
| Active task | `V2-000` |
| Status | `In Progress` — isolated entry boundary |
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

## Verification Required

1. Install approved Three.js dependencies.
2. Execute Task 1 / V2-000 test-first.
3. Run task-scoped spec and quality review before V2-001.

## Exact Next Action

Install the approved dependencies, generate the Task 1 SDD brief, and dispatch
the isolated-entry implementer.

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
