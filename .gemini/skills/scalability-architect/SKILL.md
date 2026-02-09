---
name: scalability-architect
description: Enforces architectural discipline, GC-free performance, and decoupled service design. Use when adding new game features, refactoring core services, or optimizing performance. Supports /turbo and /ultrathink modes.
---

# Scalability Architect

## Overview
This skill ensures **Crypto Survivors** remains performant and maintainable as it scales. It enforces the "Engineering & Scalability Discipline" (docs/SCALABILITY_DISCIPLINE.md).

## Agent Modes
The user can specify a mode via keywords in their prompt:
- **/turbo**: Optimized for speed. Focus on GC-free implementation but skip deep audits.
- **/ultrathink**: Optimized for stability. Perform deep architectural audit, strict TDD, and full validation.
See [agent-modes.md](references/agent-modes.md) for details.

## Core Mandates

### 1. GC-Free hot-paths
Any code in `GameEngine`, `renderers`, or physics services MUST NOT allocate memory.
- No `new`, `[]`, `{}`, `.map()`, `.filter()`, or string concatenation in the loop.
- Use [gc-free-patterns.md](references/gc-free-patterns.md) for examples.
- **MANDATORY**: Use `PoolManager.getInstance().spawn()` for all entities.

### 2. Decoupled Services
Services MUST communicate via `EventBus`.
- Avoid direct service-to-service calls to prevent circular dependencies.
- Logic should be data-driven via `config/`.

### 3. Feature-Based Slicing
Large features should be organized in `features/` directory following the pattern:
`features/<name>/[services, components, hooks, types]`.

### 4. TDD & Isolation
- New features require tests with >70% coverage.
- Singletons MUST have a `reset()` method for test isolation.
- Use MSW for any network mocking.

## Workflow

1. **Detection**: Identify if the task involves the Game Loop or Core Services.
2. **Mode Selection**: Check for `/turbo` or `/ultrathink`. Default to balanced discipline.
3. **Audit**: If `/ultrathink`, trace memory and complexity ($O(N)$).
4. **Implementation**:
   - Update `config/` first.
   - Implement Logic (Service).
   - Register with `PoolManager` and `SpatialGrid` if applicable.
   - Implement UI (React components).
5. **Verification**:
   - Run `npm test`.
   - Run `npm run lint`.
   - Sync documentation using `code-doc-sync`.

## References
- [GC-Free Patterns](references/gc-free-patterns.md)
- [Agent Modes (/turbo, /ultrathink)](references/agent-modes.md)