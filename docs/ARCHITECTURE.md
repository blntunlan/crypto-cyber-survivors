# General Architecture

Status: live
Owner: Core Engineering

## GC-free runtime rules

Crypto Survivors is built around one non-negotiable constraint: the render loop must stay allocation-light and predictable.

Core rules:

1. Do not allocate new objects or arrays inside the hot loop unless there is no practical alternative.
2. Reuse pooled entities through `PoolManager`.
3. Keep frame state in refs or service singletons, not React state.
4. Use `TimeService` instead of raw timers when pause-aware behavior matters.

## Communication model

Services communicate through `EventBus` and shared runtime state rather than direct UI coupling.

- Combat, audio, VFX, and progression emit events.
- React screens subscribe at a lower rate than the loop.
- Runtime services keep authoritative mutable state outside React.

## Runtime phases

The engine loop is no longer a single monolithic update function. `GameLoopCoordinator` executes explicit phases so behavior is easier to audit and profile:

1. difficulty
2. input
3. combat
4. spawn
5. physics
6. effects
7. portal
8. metrics

## Data and backend topology

- Client render: React 19 + Canvas 2D
- State management: Zustand 5 for settings, progress, and session UI state
- Market delivery: Railway APIs and streaming endpoints
- Runtime persistence: IndexedDB/localStorage queues plus Railway session and telemetry endpoints
- Auth and selected legacy integrations: Supabase clients still exist in parts of the identity flow

## Core boundaries

- `App.tsx` owns bootstrapping and screen-level orchestration.
- `components/GameEngine.tsx` owns the hot loop.
- `services/difficulty/**` owns rule evaluation and shared difficulty context.
- `services/market/**` owns streaming, runtime snapshots, and sync queues.
- `services/gameplay/**` owns reward math, portals, session-facing gameplay state, and loop phases.
- `services/auth/**` owns nickname, profile, and session bootstrap flows.
