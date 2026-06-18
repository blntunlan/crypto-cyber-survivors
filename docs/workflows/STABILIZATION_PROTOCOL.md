# Stabilization Protocol

> **Status** live
> Owner: Engineering

## Purpose

This protocol prevents feature work, refactoring, and debugging from collapsing into one large unstable change.

- Baseline must stay green before new work starts.
- Feature work must be a vertical slice with a clear owner path.
- Refactoring is allowed only when it is required for the slice or scheduled as a separate task.
- Runtime gameplay state must be scoped through `GameRuntime`; new session state must not be hidden behind new global singletons.

## Work Modes

| Mode | Allowed Work | Not Allowed |
|---|---|---|
| Stabilization | Fix broken gates, contract mismatches, lifecycle leaks | New gameplay features |
| Feature Slice | Add one player-visible behavior end to end | Opportunistic architecture rewrites |
| Refactor | Move one boundary to the target architecture | Feature behavior changes |

## Green Baseline

Run these before declaring a task complete:

```terminal
npm run check:baseline
```

If any gate fails, stop feature work and switch to Stabilization mode.

The baseline command expands to typecheck, architecture guardrails, lint, unit tests, and production build.

## Feature Slice Rules

- Define the smallest player-visible outcome before editing.
- Touch only the files required for that slice.
- Add or update tests at the same boundary as the changed behavior.
- Do not introduce a new singleton for session state.
- Do not add a second compute path for market, difficulty, rewards, or spawn behavior.
- New singleton files are blocked by `npm run check:architecture`; existing singleton debt is tracked in `config/architecture/singleton-whitelist.json`.

## Runtime Rules

- `GameRuntime` owns game-session services.
- App-wide services may stay global only when they do not carry per-run gameplay state.
- Market gameplay consumers must use the runtime snapshot contract.
- Supabase remains sync/audit; it must not become live gameplay authority.
- Contract boundaries must normalize external or legacy data before entering runtime types.

## Stop Conditions

Stop and re-scope when any of these happens:

- A fix requires unrelated files outside the slice.
- A second broken gate appears after fixing the first.
- A feature needs both gameplay behavior and architecture migration.
- Tests require broad mock rewrites to pass.
- The same state is being computed or stored in two places.

When stopped, write the actual blocking condition, choose Stabilization or Refactor mode, and complete that before returning to feature work.
